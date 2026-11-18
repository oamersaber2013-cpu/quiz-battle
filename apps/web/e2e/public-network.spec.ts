import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("a public frontend never falls back to the visitor's local network", async ({ page, baseURL, request }) => {
  const publicOrigin = "https://public-quiz.example.invalid";
  const localRequests: string[] = [];
  const apiRequests: string[] = [];
  const browserErrors: string[] = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  let finishing = false;
  const upstreamSockets: WebSocket[] = [];
  const assetCache = new Map<string, Promise<{ status: number; contentType: string; body: Buffer }>>();
  page.on("request", request => {
    const url = new URL(request.url());
    if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || /^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)) {
      localRequests.push(`${url.origin}${url.pathname}`);
    }
    if (url.pathname === "/api/games/active") apiRequests.push(`${url.origin}${url.pathname}`);
  });
  // Serve the real compiled/dev frontend under a public browser origin. Only
  // the test runner proxies assets to the local server; browser code sees the
  // public origin and must never infer a loopback API from missing configuration.
  await page.routeWebSocket(/\/_next\/webpack-hmr/, socket => {
    const target = new URL(socket.url());
    const upstream = new WebSocket(`${baseURL!.replace(/^http/, "ws")}${target.pathname}${target.search}`);
    upstreamSockets.push(upstream);
    const pending: (string | Buffer)[] = [];
    upstream.onopen = () => pending.splice(0).forEach(message => upstream.send(message));
    upstream.onmessage = async event => { if (!finishing) socket.send(typeof event.data === "string" ? event.data : Buffer.from(await event.data.arrayBuffer())); };
    upstream.onerror = () => { if (!finishing) void socket.close().catch(() => {}); };
    socket.onMessage(message => { if (upstream.readyState === WebSocket.OPEN) upstream.send(message); else pending.push(message); });
    socket.onClose(() => upstream.close());
  });
  await page.route("**/*", async route => {
    try {
      if (finishing || page.isClosed()) { await route.abort(); return; }
      const url = new URL(route.request().url());
      if (url.pathname === "/api/games/active") {
        await route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": publicOrigin }, body: "[]" });
      } else if (url.origin === publicOrigin) {
        const target = `${baseURL}${url.pathname}${url.search}`;
        const load = async () => {
          const response = await request.get(target, { headers: route.request().headers() });
          return { status: response.status(), contentType: response.headers()["content-type"] || "application/octet-stream", body: await response.body() };
        };
        let asset = assetCache.get(target);
        if (!asset) {
          asset = load();
          if (url.pathname.startsWith("/_next/static/")) assetCache.set(target, asset);
        }
        const response = await asset;
        if (finishing || page.isClosed()) { await route.abort(); return; }
        await route.fulfill(response);
      } else {
        await route.abort();
      }
    } catch (error) {
      if (!finishing && !page.isClosed()) throw error;
    }
  });
  try {
    await page.goto(`${publicOrigin}/spectate`);
    await expect(page.getByRole("heading", { name: /Watch Live Matches|شاهد المعارك المباشرة/ })).toBeVisible();
    await expect(page.getByText(/No active battles at the moment|لا توجد معارك نشطة/)).toBeVisible();
    expect(browserErrors).toEqual([]);
    expect(apiRequests).toHaveLength(1);
    expect(localRequests).toEqual([]);
  } finally {
    finishing = true;
    await page.unrouteAll({ behavior: "wait" });
    upstreamSockets.forEach(socket => socket.close());
  }
});

import { expect, test, type Page } from "@playwright/test";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const player = { userId: "account-fixture", username: "KnowledgeKeeper", token: "fixture-account-token", isGuest: true, role: "free", balanceQar: 25 };
const statistics = { memberSince: "2026-01-01T00:00:00Z", achievements: [], totalGames: 2, wins: 1, totalScore: 500, totalAnswers: 4, correctAnswers: 2,
  history: [{ id: "fixture-result", mode: "classic", endedAt: "2026-11-18T10:00:00Z", playerCount: 2, score: 300, rank: 1 }] };

async function identity(page: Page, language: "en" | "ar", signedIn = false) {
  await page.addInitScript(({ language, state }) => localStorage.setItem("quiz-battle-storage", JSON.stringify({ version: 0, state: { ...state, language } })), {
    language, state: signedIn ? player : { userId: null, token: null },
  });
}

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.route("https://fonts.gstatic.com/**", route => route.abort());
});

test("keeps login errors focused and permits a valid existing short password", async ({ page }, testInfo) => {
  await identity(page, "en");
  let requests = 0;
  await page.route("**/api/auth/login", async route => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    requests++;
    expect(route.request().postDataJSON()).toMatchObject({ email: "player@example.invalid", password: "short" });
    await route.fulfill({ status: requests === 1 ? 401 : 200, headers: cors, json: requests === 1 ? { error: "Invalid credentials" } : { ...player, isGuest: false } });
  });
  await page.goto("/login");
  await expect(page.locator("main")).toHaveAttribute("aria-busy", "false", { timeout: 20000 });
  await page.getByLabel("Email address").fill("player@example.invalid");
  await expect(page.getByLabel("Email address")).toHaveAttribute("autocomplete", "username");
  await page.getByLabel("Email address").press("Tab");
  await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const error = page.locator("main").getByRole("alert");
  await expect(error).toBeFocused();
  await expect(error).toContainText("Check your email and password");
  await expect(page.getByLabel("Email address")).toHaveValue("player@example.invalid");
  await testInfo.attach(`login-error-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(requests).toBe(2);
});

test("localizes Arabic registration and validates confirmation before sending", async ({ page }, testInfo) => {
  await identity(page, "ar");
  let requests = 0;
  await page.route("**/api/auth/register", async route => { if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors }); requests++; await route.fulfill({ status: 201, headers: cors, json: { ...player, username: "محارب_123", isGuest: false } }); });
  await page.goto("/register");
  await expect(page.locator("main")).toHaveAttribute("aria-busy", "false", { timeout: 20000 });
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
  await page.getByLabel("اسم اللاعب", { exact: true }).fill("محارب_123");
  await page.getByLabel("البريد الإلكتروني").fill("player@example.invalid");
  await page.getByLabel("كلمة المرور", { exact: true }).fill("strong-password");
  await page.getByLabel("تأكيد كلمة المرور").fill("different-password");
  await page.getByRole("button", { name: "إنشاء حساب", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toBeFocused();
  await expect(page.getByLabel("تأكيد كلمة المرور")).toHaveAttribute("aria-invalid", "true");
  expect(requests).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await testInfo.attach(`arabic-register-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  await page.getByLabel("تأكيد كلمة المرور").fill("strong-password");
  await page.getByRole("button", { name: "إنشاء حساب", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(requests).toBe(1);
});

test("recovers statistics from an error and shows real history and account balance", async ({ page }, testInfo) => {
  await identity(page, "en", true);
  let requests = 0;
  await page.route("**/api/user/stats", async route => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization" } });
    requests++;
    await route.fulfill({ status: requests === 1 ? 503 : 200, headers: { "Access-Control-Allow-Origin": "*" }, json: requests === 1 ? { error: "Unavailable" } : statistics });
  });
  await page.goto("/stats");
  await expect(page.locator("main")).toHaveAttribute("aria-busy", "false", { timeout: 20000 });
  await expect(page.locator("main").getByRole("alert")).toContainText("Statistics could not be loaded");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("50%", { exact: true })).toBeVisible();
  await expect(page.locator('a[href="/results/fixture-result"]')).toContainText("Classic");
  await testInfo.attach(`statistics-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page.getByText("25 QAR", { exact: true })).toBeVisible();
  await expect(page.getByText("Purchases are currently unavailable.", { exact: true })).toBeVisible();
  await expect(page.locator('a[href="/store"]')).toHaveCount(0);
});

test("leaving an in-flight sign-in keeps the guest session after the response arrives", async ({ page }) => {
  await identity(page, "en");
  let releaseResponse!: () => void;
  const delayed = new Promise<void>(resolve => { releaseResponse = resolve; });
  await page.route("**/api/auth/login", async route => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    await delayed;
    await route.fulfill({ headers: cors, json: { ...player, isGuest: false } });
  });
  await page.goto("/login");
  await page.getByLabel("Email address").fill("player@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("example-pass");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Please wait…" })).toBeDisabled();
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page.getByRole("heading", { name: "Create your account", exact: true })).toBeVisible();
  const completed = page.waitForEvent("requestfinished", { predicate: req => req.method() === "POST" && req.url().endsWith("/api/auth/login"), timeout: 2000 }).catch(() => undefined);
  releaseResponse();
  await completed;
  await expect(page).toHaveURL(/\/register$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("quiz-battle-storage")!).state.token)).toBeNull();
});

for (const destination of ["/profile", "/stats"]) {
  test(`returns to ${destination} after signing in from the Arabic account page`, async ({ page }) => {
    await identity(page, "ar");
    await page.route("**/api/auth/login", route => route.fulfill({ headers: cors, json: { ...player, isGuest: false } }));
    await page.route("**/api/user/stats", route => route.fulfill({ headers: cors, json: statistics }));
    await page.goto(destination);
    await page.getByRole("link", { name: "تسجيل الدخول", exact: true }).press("Enter");
    await page.getByLabel("البريد الإلكتروني").fill("player@example.invalid");
    await page.getByLabel("كلمة المرور", { exact: true }).fill("test-password");
    await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).press("Enter");
    await expect(page).toHaveURL(new RegExp(destination + "$"));
    await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: player.username })).toBeVisible();
  });
}

test("fits a maximum-length warrior name in narrow Arabic statistics", async ({ page }) => {
  const username = "W".repeat(20);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addInitScript(state => localStorage.setItem("quiz-battle-storage", JSON.stringify({ version: 0, state })), {
    ...player, username, language: "ar",
  });
  await page.route("**/api/user/stats", route => route.fulfill({ headers: cors, json: statistics }));
  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: username })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("distinguishes an empty match list from a network error and retries guest entry", async ({ page }, testInfo) => {
  await identity(page, "en");
  let games: unknown[] = [];
  let guestRequests = 0;
  await page.route("**/api/games/active", route => route.fulfill({ headers: cors, json: games }));
  await page.route("**/api/auth/guest", route => { if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors }); guestRequests++; return route.fulfill({ status: guestRequests === 1 ? 503 : 200, headers: cors, json: guestRequests === 1 ? { error: "Unavailable" } : player }); });
  await page.goto("/spectate");
  await expect(page.locator("main")).toHaveAttribute("aria-busy", "false", { timeout: 20000 });
  await expect(page.getByRole("heading", { name: "The arena is quiet" })).toBeVisible();
  games = [{ gameId: "watch-fixture", mode: "conquest", difficulty: "sage", status: "question", playerCount: 2, maxPlayers: 8, currentRound: 0, totalRounds: 12 }];
  await page.getByRole("button", { name: "Refresh matches" }).click();
  await expect(page.getByText("Territory draft", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Watch Conquest", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toBeFocused();
  await testInfo.attach(`spectate-error-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  await page.getByRole("button", { name: "Watch Conquest", exact: true }).click();
  await expect(page).toHaveURL(/\/(lobby|game)\/watch-fixture\?spectate=true$/);
  expect(guestRequests).toBe(2);
});

test("leaving a pending spectator entry keeps the player on Home", async ({ page }) => {
  await identity(page, "en");
  await page.route("**/api/games/active", route => route.fulfill({ headers: cors, json: [{
    gameId: "waiting-match", mode: "survival", difficulty: "novice", status: "question", playerCount: 2, maxPlayers: 8, currentRound: 1, totalRounds: 3,
  }] }));
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/auth/guest", async route => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    await delayed;
    await route.fulfill({ headers: cors, json: player });
  });
  await page.goto("/spectate");
  await page.getByRole("button", { name: "Watch Survival" }).click();
  await expect(page.getByRole("button", { name: "Watch Survival" })).toBeDisabled();
  await page.getByRole("link", { name: "Home — Sword of Knowledge" }).click();
  await expect(page).toHaveURL(/\/$/);
  const completed = page.waitForEvent("requestfinished", { predicate: req => req.method() === "POST" && req.url().endsWith("/api/auth/guest"), timeout: 2000 }).catch(() => undefined);
  release();
  await completed;
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("quiz-battle-storage")!).state.token)).toBeNull();
  await expect(page).toHaveURL(/\/$/);
});

test("does not claim a verified purchase from a checkout return URL", async ({ page }, testInfo) => {
  await identity(page, "en");
  await page.goto("/success?session_id=unverified-fixture");
  await expect(page.locator("main")).toHaveAttribute("aria-busy", "false", { timeout: 20000 });
  await expect(page.getByRole("heading", { name: "Purchase not confirmed" })).toBeVisible();
  await expect(page.getByText("Payment Successful!", { exact: true })).toHaveCount(0);
  await testInfo.attach(`purchase-status-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  await page.goto("/cancel");
  await expect(page.getByRole("heading", { name: "Checkout closed" })).toBeVisible();
  await page.goto("/store");
  await expect(page.getByRole("heading", { name: "The Royal Treasury" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Purchase/ })).toHaveCount(0);
});

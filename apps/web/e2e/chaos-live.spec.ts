import { devices, expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const api = process.env.PLAYWRIGHT_LIVE_API;
test.skip(process.env.PLAYWRIGHT_LIVE_CHAOS !== "1" || !api,
  "Enable PLAYWRIGHT_LIVE_CHAOS=1 and set PLAYWRIGHT_LIVE_API for an authorized real Chaos match.");
test.use({ serviceWorkers: "block", trace: "off", screenshot: "only-on-failure" });

type Received = { name: string; data: any; at: number };
function observe(page: Page) {
  const events: Received[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const record = (payload: string) => {
    for (const frame of payload.split("\x1e")) {
      if (!frame.startsWith("42[")) continue;
      try { const [name, data] = JSON.parse(frame.slice(2)); events.push({ name, data, at: Date.now() }); } catch { /* Engine.IO acknowledgements are not game events. */ }
    }
  };
  page.on("websocket", socket => socket.on("framereceived", ({ payload }) => record(String(payload))));
  page.on("response", response => {
    if (response.request().method() === "GET" && response.url().includes("/socket.io/?")) void response.text().then(record).catch(() => {});
  });
  return { events, errors };
}
async function received(events: Received[], name: string, match: (data: any) => boolean = () => true) {
  let found: Received | undefined;
  await expect.poll(() => Boolean(found = events.find(event => event.name === name && match(event.data))),
    { timeout: 30000, intervals: [30, 60, 120] }).toBe(true);
  return found!;
}

test("finishes a real Arabic Chaos match with host ballot, power, spectator and saved-score recovery", async ({ page, browser, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "The authorized live run creates exactly three guests once in the phone project.");
  test.setTimeout(180000);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);
  const stamp = String(Date.now()).slice(-7);
  const origin = new URL(baseURL!).origin;
  const hostResponse = await page.request.post(`${api}/api/auth/guest`, { headers: { Origin: origin }, data: { username: `فوضى مضيف ${stamp}` } });
  expect(hostResponse.status()).toBe(200);
  const hostIdentity = { ...await hostResponse.json(), isGuest: true, language: "ar" };
  const created = await page.request.post(`${api}/api/games`, {
    headers: { Origin: origin, Authorization: `Bearer ${hostIdentity.token}` },
    data: { mode: "chaos", difficulty: "novice", rounds: 2, categories: ["general"], language: "ar" },
  });
  expect(created.status()).toBe(201);
  const room = await created.json();
  expect(room.totalRounds).toBe(2);
  const host = observe(page);
  const peerContext = await browser.newContext({ ...devices["Pixel 7"], locale: "ar-QA", serviceWorkers: "block" });
  const watcherContext = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 320, height: 844 }, locale: "ar-QA", serviceWorkers: "block" });
  const peer = await peerContext.newPage();
  const watcher = await watcherContext.newPage();
  const other = observe(peer);
  const audience = observe(watcher);
  let phase = "enter host lobby";
  for (const target of [page, peer, watcher]) {
    target.setDefaultTimeout(15000);
    target.setDefaultNavigationTimeout(30000);
  }
  const overflow = async (target: Page) => expect(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const artifactDir = process.env.PLAYWRIGHT_CHAOS_ARTIFACT_DIR;
  if (artifactDir) await mkdir(artifactDir, { recursive: true });
  try {
    await page.addInitScript(identity => localStorage.setItem("quiz-battle-storage", JSON.stringify({ version: 0, state: identity })), hostIdentity);
    await page.goto(`${baseURL}/lobby/${room.gameId}`);
    await expect(page.getByRole("heading", { name: "غرفة المعركة", exact: true })).toBeVisible();
    phase = "join peer from fresh invite";
    await peer.goto(`${baseURL}/?join=${room.joinCode}&lang=ar`);
    await peer.getByRole("textbox", { name: "ادخل اسمك", exact: true }).fill(`فوضى لاعب ${stamp}`);
    await peer.getByRole("button", { name: "انضم إلى الغرفة", exact: true }).tap();
    await peer.waitForURL(`**/lobby/${room.gameId}`, { timeout: 30000 });
    const peerIdentity = await peer.evaluate(() => JSON.parse(localStorage.getItem("quiz-battle-storage")!).state);
    // Navigation can precede the socket join. Starting a solo lobby here adds a
    // bot and makes the intended two-player proof invalid.
    phase = "wait for two connected human participants";
    await expect(page.getByText(`فوضى لاعب ${stamp}`, { exact: true })).toBeVisible();
    await expect(peer.getByText(`فوضى مضيف ${stamp}`, { exact: true })).toBeVisible();
    const roster = await received(host.events, "game:playerJoined", data => data.player?.userId === peerIdentity.userId);
    expect(roster.data.player.isConnected).toBe(true);
    await expect(peer.getByRole("button", { name: "ابدأ المعركة", exact: true })).toHaveCount(0);
    phase = "enter spectator lobby";
    const watcherResponse = await page.request.post(`${api}/api/auth/guest`, { headers: { Origin: origin }, data: { username: `فوضى مشاهد ${stamp}` } });
    expect(watcherResponse.status()).toBe(200);
    const watcherIdentity = { ...await watcherResponse.json(), isGuest: true, language: "ar" };
    await watcherContext.addInitScript(identity => localStorage.setItem("quiz-battle-storage", JSON.stringify({ version: 0, state: identity })), watcherIdentity);
    await watcher.goto(`${baseURL}/lobby/${room.gameId}?spectate=true`);
    await received(audience.events, "game:stateSync", data => data.room.gameId === room.gameId);
    await expect(watcher.getByRole("button", { name: "ابدأ المعركة", exact: true })).toHaveCount(0);
    phase = "confirm both player inventories";
    await page.getByRole("button", { name: "ابدأ المعركة", exact: true }).tap();
    for (const target of [page, peer]) {
      await target.getByRole("button", { name: /وقت إضافي/ }).tap();
      await target.getByRole("button", { name: "تأكيد الاختيار", exact: true }).tap();
    }
    await expect(watcher.getByRole("button", { name: "تأكيد الاختيار", exact: true })).toHaveCount(0);
    let ballotDuration = 0;
    let dramaTrigger = "tab visibility";
    for (let round = 1; round <= 2; round++) {
      phase = `round ${round} question`;
      const questionEvent = await received(host.events, "game:question", data => data.round === round);
      const question = questionEvent.data.question;
      for (const target of [page, peer, watcher]) {
        await expect(target.getByText(question.text, { exact: true })).toBeVisible();
        await overflow(target);
      }
      const hostAnswer = page.locator('[data-chaos-answer="0"]');
      const peerAnswer = peer.locator('[data-chaos-answer="0"]');
      await expect(watcher.locator('[data-chaos-answer="0"]')).toBeDisabled();
      await page.waitForTimeout(Math.max(0, 350 - (Date.now() - questionEvent.at)));
      if (round === 1) {
        phase = "activate Time Warp and trigger peer visibility drama";
        const beforeTime = Number((await page.getByRole("timer", { name: "الوقت المتبقي للإجابة" }).textContent())!.replace(/[^0-9]/g, ""));
        await page.getByRole("button", { name: /وقت إضافي/ }).tap();
        await received(host.events, "game:powerUpApplied", data => data.type === "time_warp" && data.sourceUserId === hostIdentity.userId);
        await expect(page.locator('[data-power-notice="time_warp"]')).toHaveCount(1);
        await expect.poll(async () => Number((await page.getByRole("timer", { name: "الوقت المتبقي للإجابة" }).textContent())!.replace(/[^0-9]/g, ""))).toBeGreaterThan(beforeTime + 2);
        await peer.bringToFront();
        await peer.waitForTimeout(150);
        await page.bringToFront();
        if (!await peer.evaluate(() => document.hidden)) {
          // Chromium headless keeps all tabs visible. Exercise the peer's real
          // visibility listener with the same lifecycle event, then restore it.
          dramaTrigger = "headless peer visibility event";
          await peer.evaluate(() => {
            const descriptor = Object.getOwnPropertyDescriptor(document, "hidden");
            Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
            try { document.dispatchEvent(new Event("visibilitychange")); }
            finally {
              if (descriptor) Object.defineProperty(document, "hidden", descriptor);
              else Reflect.deleteProperty(document, "hidden");
            }
          });
        }
        const drama = await received(host.events, "chaos:state", data => data.pendingDrama?.playerId === peerIdentity.userId);
        phase = "host ballot and answer/reload recovery";
        await expect(peer.getByRole("button", { name: "ابدأ التصويت", exact: true })).toHaveCount(0);
        await expect(watcher.getByRole("button", { name: "ابدأ التصويت", exact: true })).toHaveCount(0);
        await page.getByRole("button", { name: "ابدأ التصويت", exact: true }).tap();
        const ballot = await received(host.events, "chaos:votingStart", data => data.dramaEventId === drama.data.pendingDrama.id);
        expect(ballot.data.duration).toBe(5000);
        await expect(peer.getByRole("button", { name: /سامح|خفض النقاط/ })).toHaveCount(0);
        await expect(watcher.getByRole("button", { name: /سامح|خفض النقاط/ })).toHaveCount(0);
        await hostAnswer.tap();
        await page.getByRole("button", { name: /سامح/ }).tap();
        await expect(page.getByText(/تم التصويت!/)).toBeVisible();
        const syncCount = host.events.filter(event => event.name === "game:stateSync").length;
        await page.reload();
        await expect.poll(() => host.events.filter(event => event.name === "game:stateSync").length).toBeGreaterThan(syncCount);
        const latest = host.events.filter(event => event.name === "game:stateSync").at(-1)!;
        expect(latest.data.room.selectedAnswer).toBe(0);
        expect(latest.data.room.chaos.votingSession.hasVoted).toBe(true);
        await expect(page.locator('[data-chaos-answer="0"]')).toBeDisabled();
        const settled = await received(host.events, "chaos:votingComplete", data => data.dramaEventId === ballot.data.dramaEventId);
        ballotDuration = settled.at - ballot.at;
        expect(ballotDuration).toBeGreaterThanOrEqual(4500);
        expect(ballotDuration).toBeLessThan(15000);
        expect(settled.data.result).toBe("FORGIVE");
        expect(settled.data.scorePenalty).toBe(0);
        await peerAnswer.tap();
      } else {
        await Promise.all([hostAnswer.tap(), peerAnswer.tap()]);
      }
      await expect.poll(() => host.events.filter(event => event.name === "game:answerResult" && event.data.userId === hostIdentity.userId).length).toBe(round);
      if (round === 1) {
        phase = "review first round";
        const reveal = host.events.filter(event => event.name === "game:answerResult" && event.data.userId === hostIdentity.userId).at(-1)!;
        await expect(page.locator(`[data-player-score="${hostIdentity.userId}"]`)).toHaveText(reveal.data.newScore.toLocaleString("ar"));
        await page.getByRole("button", { name: "مراجعة السؤال", exact: true }).tap();
        const review = page.getByRole("dialog", { name: /مراجعة السؤال/ });
        await expect(review.getByText(question.text, { exact: true })).toBeVisible();
        await expect(review.getByText(question.options[0], { exact: true }).first()).toBeVisible();
        const reviewImage = await page.screenshot({ scale: "css" });
        await testInfo.attach("Chaos Arabic phone review", { body: reviewImage, contentType: "image/png" });
        if (artifactDir) await writeFile(join(artifactDir, "chaos-live-review-320.png"), reviewImage);
        await page.keyboard.press("Escape");
      }
    }
    phase = "compare persisted results with actual reveals";
    await page.waitForURL(`**/results/${room.gameId}`, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /^الترتيب النهائي/ })).toBeVisible();
    const savedResponse = await page.request.get(`${api}/api/results/${room.gameId}`, { headers: { Authorization: `Bearer ${hostIdentity.token}` } });
    expect(savedResponse.status()).toBe(200);
    const saved = await savedResponse.json();
    expect(saved).toMatchObject({ mode: "chaos", language: "ar", totalRounds: 2 });
    expect(saved.results).toHaveLength(2);
    for (const result of saved.results) {
      const reveals = host.events.filter(event => event.name === "game:answerResult" && event.data.userId === result.userId);
      expect(reveals).toHaveLength(2);
      expect(result.totalAnswers).toBe(2);
      expect(result.correctAnswers).toBe(reveals.filter(event => event.data.correct).length);
      expect(result.score).toBe(reveals.at(-1)!.data.newScore);
    }
    await page.reload();
    await expect(page.getByRole("heading", { name: /^الترتيب النهائي/ })).toBeVisible();
    for (const result of saved.results) {
      const row = page.locator('section[aria-labelledby="final-standings"] li').filter({ hasText: result.username });
      await expect(row.getByText(result.score.toLocaleString("ar"), { exact: true })).toBeVisible();
    }
    await overflow(page);
    const standingsImage = await page.screenshot({ fullPage: true, scale: "css" });
    await testInfo.attach("Chaos Arabic saved standings", { body: standingsImage, contentType: "image/png" });
    const proof = JSON.stringify({ gameId: room.gameId, ballotDuration, dramaTrigger,
      results: saved.results.map(({ username, score, totalAnswers, correctAnswers }: any) => ({ username, score, totalAnswers, correctAnswers })) }, null, 2);
    await testInfo.attach("Chaos measured match", { body: Buffer.from(proof), contentType: "application/json" });
    if (artifactDir) {
      await writeFile(join(artifactDir, "chaos-live-standings-320.png"), standingsImage);
      await writeFile(join(artifactDir, "chaos-live-measured-match.json"), proof);
    }
    console.log(proof);
    expect(host.errors).toEqual([]);
    expect(other.errors).toEqual([]);
    expect(audience.errors).toEqual([]);
  } catch (error) {
    const safeEvents = (events: Received[]) => events.slice(-20).map(({ name, data }) => ({ name, round: data?.round,
      status: data?.room?.status, players: data?.room?.players?.map(({ userId, isConnected, isBot }: any) => ({ userId, isConnected, isBot })) }));
    const diagnostic = JSON.stringify({ phase, urls: [page.url(), peer.url(), watcher.url()],
      events: { host: safeEvents(host.events), peer: safeEvents(other.events), spectator: safeEvents(audience.events) },
      errors: { host: host.errors, peer: other.errors, spectator: audience.errors } }, null, 2);
    await testInfo.attach("Chaos bounded phase diagnostic", { body: Buffer.from(diagnostic), contentType: "application/json" });
    console.log(diagnostic);
    throw error;
  } finally {
    await peerContext.close().catch(() => {});
    await watcherContext.close().catch(() => {});
  }
});

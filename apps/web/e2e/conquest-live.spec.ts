import { expect, test } from "@playwright/test";
import { io, type Socket } from "socket.io-client";

const api = process.env.PLAYWRIGHT_LIVE_API;
test.use({ serviceWorkers: "block", trace: "off" });
test.skip(process.env.PLAYWRIGHT_LIVE_CONQUEST !== "1" || !api,
  "Enable PLAYWRIGHT_LIVE_CONQUEST=1 and set PLAYWRIGHT_LIVE_API for an authorized live match.");

test("plays two Arabic Conquest draft rounds with a real peer and restores the locked answer", async ({ page, request, baseURL }, testInfo) => {
  test.setTimeout(180000);
  if (testInfo.project.name === "chromium") await page.setViewportSize({ width: 1440, height: 900 });
  const authHeaders = { Origin: baseURL! };
  const identity = async (username: string) => {
    const response = await request.post(`${api}/api/auth/guest`, { headers: authHeaders, data: { username } });
    expect(response.status()).toBe(200);
    return response.json();
  };
  const host = await identity("اختبار الغزو");
  const guest = await identity("المنافس التجريبي");
  const created = await request.post(`${api}/api/games/`, {
    headers: { ...authHeaders, Authorization: `Bearer ${host.token}` },
    data: { mode: "conquest", difficulty: "novice", rounds: 2, categories: ["general"], language: "ar" },
  });
  expect(created.status()).toBe(201);
  const { gameId } = await created.json();
  const events: Array<{ name: string; data: any }> = [];
  const peer: Socket = io(api!, { transports: ["websocket"], reconnection: false,
    auth: { token: guest.token }, extraHeaders: authHeaders });
  const peerErrors: string[] = [];
  const next = async (name: string, matches: (data: any) => boolean = () => true) => {
    let found: { name: string; data: any } | undefined;
    await expect.poll(() => {
      const index = events.findIndex(event => event.name === name && matches(event.data));
      if (index >= 0) found = events.splice(index, 1)[0];
      return !!found;
    }, { timeout: 45000 }).toBe(true);
    return found!.data;
  };
  const receivedAt = new Map<string, number>();
  peer.onAny((name, data) => {
    if (name === "conquest:draftQuestion") receivedAt.set(data.question.id, performance.now());
    events.push({ name, data });
  });
  function checkClock(seconds: number, draft: { question: { id: string; timeLimit: number }; questionStartedAt: number; questionEndsAt: number }) {
    const arrival = receivedAt.get(draft.question.id);
    expect(arrival).toBeDefined();
    const limit = draft.question.timeLimit;
    expect(draft.questionEndsAt - draft.questionStartedAt).toBe(limit * 1000);
    const expected = Math.ceil(limit - (performance.now() - arrival!) / 1000);
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThanOrEqual(limit);
    expect(Math.abs(seconds - expected)).toBeLessThanOrEqual(2);
  }
  peer.on("conquest:draftPickTurn", (turn) => {
    if (turn.playerId === guest.userId) {
      peer.emit("conquest:selectDraftTerritory", { gameId, territoryId: turn.availableTerritories[0], turnId: turn.turnId },
        (result: { success: boolean }) => { if (!result.success) peerErrors.push("Peer draft pick was rejected"); });
    }
  });
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  try {
    await expect.poll(() => peer.connected, { timeout: 15000 }).toBe(true);
    expect((await peer.timeout(10000).emitWithAck("game:join", { gameId })).success).toBe(true);
    await page.addInitScript((user) => {
      if (!localStorage.getItem("quiz-battle-storage")) localStorage.setItem("quiz-battle-storage", JSON.stringify({
        version: 0, state: { userId: user.userId, username: user.username, token: user.token, isGuest: true, language: "ar" },
      }));
    }, host);
    await page.goto(`/lobby/${gameId}`);
    await page.getByRole("button", { name: /ابدأ المعركة/ }).click();
    const firstQuestion = await next("conquest:draftQuestion", data => data.round === 1);
    expect(events.some(event => event.name === "game:powerUpSelectStart")).toBe(false);
    const arena = page.getByRole("region", { name: "معركة الغزو" });
    const answers = arena.locator("button[data-answer-index]");
    const timer = arena.getByTestId("conquest-countdown");
    await expect(answers.first()).toBeEnabled();
    await expect(arena.getByText(/توزيع القواعد · الجولة 1/)).toBeVisible();
    await expect(arena.locator("details")).not.toHaveAttribute("open");
    await expect(page.getByText(/^0\s*\/\s*12$/)).toHaveCount(0);
    const initialSeconds = Number(await timer.textContent());
    checkClock(initialSeconds, firstQuestion);
    await expect.poll(async () => Number(await timer.textContent()), { timeout: 5000 }).toBeLessThan(initialSeconds);
    const contrast = await answers.first().evaluate(element => {
      const style = getComputedStyle(element);
      const luminance = (color: string) => {
        const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(value => {
          const channel = Number(value) / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const foreground = luminance(style.color), background = luminance(style.backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    await answers.first().click();
    await expect(answers.first()).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => answers.evaluateAll(buttons => buttons.every(button => (button as HTMLButtonElement).disabled))).toBe(true);
    await answers.first().evaluate(element => { (element as HTMLButtonElement).click(); (element as HTMLButtonElement).click(); });
    await page.reload();
    await expect(arena.getByRole("heading", { level: 2 })).toHaveText(firstQuestion.question.text);
    await expect(answers.first()).toBeDisabled();
    await expect(answers.first()).toHaveAttribute("aria-pressed", "true");
    const restoredSeconds = Number(await timer.textContent());
    expect(restoredSeconds).toBeLessThan(initialSeconds);
    await expect(page.getByText("Already answered", { exact: true })).toHaveCount(0);
    peer.emit("conquest:draftAnswer", { gameId, questionId: firstQuestion.question.id, round: 1,
      answerIndex: 1, responseTimeMs: Date.now() - firstQuestion.questionStartedAt });
    await expect.poll(async () => {
      if (await arena.getByText(/توزيع القواعد · الجولة 2/).isVisible()) return true;
      const choices = arena.locator('[aria-label="الأقاليم المتاحة"] button:enabled');
      if (await choices.count()) await choices.first().click();
      return false;
    }, { timeout: 30000, intervals: [100, 200, 500] }).toBe(true);
    await expect(answers.first()).toBeEnabled();
    await expect(answers.first()).toHaveAttribute("aria-pressed", "false");
    await expect(arena.locator("details")).not.toHaveAttribute("open");
    const secondQuestion = await next("conquest:draftQuestion", data => data.round === 2);
    const nextSeconds = Number(await timer.textContent());
    checkClock(nextSeconds, secondQuestion);
    await expect.poll(async () => Number(await timer.textContent()), { timeout: 5000 }).toBeLessThan(nextSeconds);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const questionBox = await arena.getByRole("heading", { level: 2 }).boundingBox();
    expect(questionBox!.y).toBeLessThan(450);
    expect(peerErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    await testInfo.attach(`Arabic Conquest round 2 ${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  } finally { peer.disconnect(); }
});

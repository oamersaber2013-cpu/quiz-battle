import { devices, expect, test, type Page } from "@playwright/test";
import { QuestionType } from "@quiz-battle/shared";
import { io } from "socket.io-client";

const api = process.env.PLAYWRIGHT_LIVE_API;
test.skip(process.env.PLAYWRIGHT_LIVE_CUSTOM !== "1" || !api,
  "Enable PLAYWRIGHT_LIVE_CUSTOM=1 and set PLAYWRIGHT_LIVE_API for an authorized real Custom match.");
test.use({ serviceWorkers: "block", trace: "off", screenshot: "only-on-failure" });

type Event = { name: string; data: any; receivedAt: number };
function observe(page: Page) {
  const events: Event[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const record = (payload: string) => {
    for (const frame of payload.split("\x1e")) {
      if (!frame.startsWith("42[")) continue;
      try {
        const [name, data] = JSON.parse(frame.slice(2));
        events.push({ name, data, receivedAt: Date.now() });
      } catch { /* Non-event Engine.IO frames are irrelevant. */ }
    }
  };
  page.on("websocket", socket => socket.on("framereceived", ({ payload }) => record(String(payload))));
  page.on("response", response => {
    if (response.request().method() === "GET" && response.url().includes("/socket.io/?")) {
      void response.text().then(record).catch(() => {});
    }
  });
  return { events, errors };
}

async function nextEvent(events: Event[], name: string, match: (data: any) => boolean = () => true) {
  let event: Event | undefined;
  await expect.poll(() => {
    event = events.find(item => item.name === name && match(item.data));
    return Boolean(event);
  }, { timeout: 30000, intervals: [30, 60, 100] }).toBe(true);
  return event!;
}

async function arabicHome(page: Page, username: string, baseURL: string) {
  await page.addInitScript(() => {
    if (!localStorage.getItem("quiz-battle-storage")) localStorage.setItem("quiz-battle-storage", JSON.stringify({
      version: 0, state: { language: "ar" },
    }));
  });
  await page.goto(baseURL);
  await page.getByRole("textbox", { name: "ادخل اسمك" }).fill(username);
}

async function chooseFirstAnswer(page: Page, question: any) {
  let answer;
  if (question.type === QuestionType.TrueFalse || question.options.every((option: string) => /^(true|false)$/i.test(option))) {
    answer = page.getByRole("button", { name: /صحيح/, exact: false });
  } else {
    answer = page.locator("button.answer-option").first();
  }
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await answer.tap();
  else await answer.click();
}

for (const extraTime of [false, true]) {
  test(`completes a real Arabic 5-second Custom match ${extraTime ? "with only Extra time" : "with all powers disabled"}`, async ({ page, browser, baseURL }, testInfo) => {
    test.setTimeout(180000);
    const rounds = extraTime ? 1 : 2;
    const stamp = String(Date.now()).slice(-8);
    const hostName = `مخصص مضيف ${stamp}`;
    const guestName = `مخصص لاعب ${stamp}`;
    const battleName = `تحدي مخصص ${stamp}`;
    const host = observe(page);
    const peerContext = await browser.newContext({ ...devices["Pixel 7"], locale: "ar-QA", serviceWorkers: "block" });
    const peer = await peerContext.newPage();
    expect(await peer.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);
    page.setDefaultTimeout(15000);
    peer.setDefaultTimeout(15000);
    const opponent = observe(peer);
    const overflow = async (target: Page) => expect(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const timing: Array<{ round: number; visibleAfterMs: number; firstTimer: string | null }> = [];
    let outsider: ReturnType<typeof io> | undefined;
    try {
      await arabicHome(page, hostName, baseURL!);
      await page.getByRole("button", { name: /إنشاء غرفة معركة/ }).click();
      await page.getByRole("radio", { name: /مخصص/ }).check();
      await page.getByRole("button", { name: "التالي →" }).click();
      await page.getByRole("button", { name: "التالي →" }).click();
      await page.getByRole("textbox", { name: "اسم المعركة" }).fill(battleName);
      await page.getByRole("spinbutton", { name: "عدد الجولات" }).fill(String(rounds));
      await page.getByRole("combobox", { name: "ثواني لكل سؤال" }).selectOption("5");
      await page.getByRole("combobox", { name: "قسم الأسئلة" }).selectOption("sports");
      await page.getByRole("spinbutton", { name: "الحد الأقصى للاعبين" }).fill("2");
      await page.getByRole("button", { name: "تعطيل جميع القوى" }).click();
      if (extraTime) await page.getByRole("checkbox", { name: "وقت إضافي", exact: true }).check();
      const created = page.waitForResponse(response => new URL(response.url()).pathname.replace(/\/$/, "") === "/api/games"
        && response.request().method() === "POST", { timeout: 60000 });
      await page.getByRole("button", { name: /إنشاء غرفة معركة/ }).click();
      const response = await created;
      expect(response.status()).toBe(201);
      const room = await response.json();
      const settings = { name: battleName, rounds, timePerQuestion: 5, difficulty: "novice",
        enabledPowerUps: extraTime ? ["time_warp"] : [], maxPlayers: 2, categoryFilter: "sports" };
      expect(room.customSettings).toEqual(settings);
      await page.waitForURL(`**/lobby/${room.gameId}`);
      await page.reload();
      await expect(page.getByRole("heading", { name: battleName })).toBeVisible();
      await expect(page.getByText(`${rounds} جولات · 5 ثانية لكل سؤال`, { exact: true })).toBeVisible();
      const summary = await (await page.request.get(`${api}/api/games/${room.gameId}`)).json();
      expect(summary).toMatchObject({ customSettings: settings, totalRounds: rounds, maxPlayers: 2 });
      await overflow(page);

      await arabicHome(peer, guestName, baseURL!);
      await peer.getByRole("button", { name: "انضمام عبر الكود", exact: true }).click();
      await peer.getByRole("textbox", { name: /كود الانضمام/ }).fill(room.joinCode);
      await peer.getByRole("button", { name: "انضم إلى الغرفة", exact: true }).click();
      await peer.waitForURL(`**/lobby/${room.gameId}`);
      await expect(page.getByText(guestName, { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "ابدأ المعركة", exact: true })).toBeEnabled();

      const outsiders = await page.request.post(`${api}/api/auth/guest`, { headers: { Origin: baseURL! }, data: { username: `مخصص زائد ${stamp}` } });
      expect(outsiders.status()).toBe(200);
      const identity = await outsiders.json();
      outsider = io(api!, { auth: { token: identity.token }, extraHeaders: { Origin: baseURL! }, reconnection: false });
      await expect.poll(() => outsider!.connected).toBe(true);
      expect(await outsider.timeout(10000).emitWithAck("game:join", { gameId: room.gameId })).toMatchObject({ success: false, error: "Game is full" });
      outsider.disconnect();

      await page.getByRole("button", { name: /ابدأ المعركة/ }).click();
      if (extraTime) {
        for (const target of [page, peer]) {
          const choice = target.getByRole("button", { name: /وقت إضافي/ });
          await expect(choice).toBeVisible();
          await choice.click();
          await target.getByRole("button", { name: "تأكيد الاختيار", exact: true }).click();
        }
        const offered = await nextEvent(host.events, "game:powerUpSelectStart");
        expect(offered.data.availablePowerUps).toEqual(["time_warp"]);
      }

      for (let round = 1; round <= rounds; round++) {
        const event = await nextEvent(host.events, "game:question", data => data.round === round);
        const question = event.data.question;
        expect(question.timeLimit).toBe(5);
        expect(question.category).toBe("sports");
        for (const key of ["correctIndex", "correctAnswer", "correctIndices", "correctOrder"]) expect(question).not.toHaveProperty(key);
        await expect(page.getByText(question.text, { exact: true })).toBeVisible({ timeout: round > 1 ? 1500 : 15000 });
        timing.push({ round, visibleAfterMs: Date.now() - event.receivedAt, firstTimer: await page.getByRole("timer").first().textContent() });
        await overflow(page);
        await overflow(peer);
        // Match the API's 200ms minimum response time instead of simulating an impossible instant tap.
        await page.waitForTimeout(Math.max(0, 350 - (Date.now() - event.receivedAt)));
        if (extraTime) {
          await page.getByRole("button", { name: /وقت إضافي/ }).click();
          await nextEvent(host.events, "game:powerUpApplied", data => data.type === "time_warp");
          const notice = page.locator('[data-power-notice="time_warp"]');
          await expect(notice).toHaveCount(1);
          await expect(notice).toContainText("استخدمت هذه القدرة");
          expect(await notice.evaluate(element => {
            const layer = element.parentElement!;
            return { position: getComputedStyle(layer).position, pointerEvents: getComputedStyle(layer).pointerEvents };
          })).toEqual({ position: "fixed", pointerEvents: "none" });
          await chooseFirstAnswer(peer, question);
          await expect.poll(async () => Number(await page.getByRole("timer").first().textContent())).toBeGreaterThan(5);
          await testInfo.attach("Custom mobile Extra time", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
          // The host answers after the configured base window to prove the server honors its personal extension.
          await page.waitForTimeout(Math.max(0, 5700 - (Date.now() - event.receivedAt)));
          await expect(page.locator("[data-power-notice]")).toHaveCount(0);
          await chooseFirstAnswer(page, question);
        } else {
          await Promise.all([chooseFirstAnswer(page, question), chooseFirstAnswer(peer, question)]);
          expect(host.events.some(item => item.name === "game:powerUpSelectStart")).toBe(false);
        }
      }

      await page.waitForURL(`**/results/${room.gameId}`, { timeout: 45000 });
      await peer.waitForURL(`**/results/${room.gameId}`, { timeout: 15000 });
      await expect(page.getByRole("heading", { name: /الترتيب النهائي/ })).toBeVisible();
      const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("quiz-battle-storage")!).state);
      const savedResponse = await page.request.get(`${api}/api/results/${room.gameId}`, { headers: { Authorization: `Bearer ${auth.token}` } });
      expect(savedResponse.status()).toBe(200);
      const saved = await savedResponse.json();
      expect(saved).toMatchObject({ mode: "custom", totalRounds: rounds, language: "ar" });
      expect(saved.results).toHaveLength(2);
      if (extraTime) {
        const hostResult = saved.results.find((result: any) => result.userId === auth.userId);
        expect(hostResult.avgAnswerTime).toBeGreaterThan(5000);
        expect(hostResult.avgAnswerTime).toBeLessThan(10000);
      }
      for (const result of saved.results) {
        expect(result.totalAnswers).toBe(rounds);
        const reveals = host.events.filter(item => item.name === "game:answerResult" && item.data.userId === result.userId);
        expect(reveals).toHaveLength(rounds);
        expect(result.correctAnswers).toBe(reveals.filter(item => item.data.correct).length);
        expect(result.score).toBe(reveals.reduce((sum, item) => sum + item.data.scoreDelta, 0));
      }
      await page.reload();
      await expect(page.getByRole("heading", { name: /الترتيب النهائي/ })).toBeVisible();
      await overflow(page);
      await overflow(peer);
      await testInfo.attach(`Custom ${extraTime ? "Extra time" : "disabled powers"} saved results`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
      await testInfo.attach("Custom match measured proof", { body: Buffer.from(JSON.stringify({ gameId: room.gameId, settings, timing,
        results: saved.results.map(({ username, score, totalAnswers, correctAnswers, avgAnswerTime }: any) => ({ username, score, totalAnswers, correctAnswers, avgAnswerTime })) }, null, 2)), contentType: "application/json" });
      expect(host.errors).toEqual([]);
      expect(opponent.errors).toEqual([]);
    } finally {
      await testInfo.attach("Custom received event audit", { body: Buffer.from(JSON.stringify(host.events.filter(event =>
        ["game:question", "game:answerResult", "game:powerUpSelectStart", "game:powerUpSelectEnd", "game:powerUpApplied", "game:end"].includes(event.name)), null, 2)), contentType: "application/json" });
      outsider?.disconnect();
      await peerContext.close();
    }
  });
}

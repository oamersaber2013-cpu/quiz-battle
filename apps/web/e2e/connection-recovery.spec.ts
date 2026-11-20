import { createServer } from "node:http";
import { Server } from "socket.io";
import { expect, test } from "@playwright/test";
import { Difficulty, GameMode, GameStatus, PowerUpType, QuestionType } from "@quiz-battle/shared";

test.use({ serviceWorkers: "block", trace: "off" });
test.skip(process.env.PLAYWRIGHT_CONNECTION_RECOVERY !== "1", "Enable the isolated local room fixture explicitly.");

test("keeps room drafts and accepted answers through a long offline period", async ({ page, context }, testInfo) => {
  test.setTimeout(90000);
  const ar = testInfo.project.name.includes("mobile");
  const userId = "recovery-viewer";
  const gameId = "connection-recovery";
  const startedAt = Date.now();
  const question = { id: "recovery-question", type: QuestionType.FillBlank,
    text: ar ? "عاصمة قطر هي [BLANK]" : "The capital of Qatar is [BLANK]", options: [],
    category: "general", difficulty: Difficulty.Novice, timeLimit: 180 };
  let selectedAnswer: string | null = null;
  let joined = 0;
  let answers = 0;
  let admitted = false;
  const http = createServer((_request, response) => { response.statusCode = 404; response.end(); });
  const io = new Server(http, { cors: { origin: true, credentials: true } });
  io.on("connection", socket => {
    socket.on("clock:sync", ack => ack({ serverNow: Date.now() }));
    socket.on("game:join", (request, ack) => {
      if (!admitted && request.password !== "local-fixture-key") {
        ack({ success: false, code: "PASSWORD_REQUIRED", error: "Room password required" });
        return;
      }
      admitted = true;
      joined++;
      socket.emit("game:stateSync", { room: {
        gameId, joinCode: "REJOIN", hostId: userId, mode: GameMode.Classic, difficulty: Difficulty.Novice,
        language: ar ? "ar" : "en", status: GameStatus.Question, currentRound: 1, totalRounds: 5, maxPlayers: 8,
        currentQuestion: question, questionStartedAt: startedAt, selectedAnswer, answeredAt: selectedAnswer ? startedAt + 1000 : null,
        players: [{ userId, username: ar ? "محارب التجربة" : "Fixture player", score: 0, rank: 1, streak: 0,
          isConnected: true, isEliminated: false, powerUpInventory: [PowerUpType.Shield] }],
      } });
      ack({ success: true });
    });
    socket.on("player:answer", request => { answers++; selectedAnswer = request.answer; });
  });
  try {
    await new Promise<void>((resolve, reject) => { http.once("error", reject); http.listen(3125, "127.0.0.1", resolve); });
    const pageErrors: string[] = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(language => localStorage.setItem("quiz-battle-storage", JSON.stringify({ version: 0, state: {
      userId: "recovery-viewer", username: "Fixture player", token: "local-recovery-fixture", isGuest: true, language,
    } })), ar ? "ar" : "en");
    await page.goto(`/game/${gameId}`);
    const password = page.getByLabel(ar ? "كلمة مرور الغرفة" : "Room password", { exact: true });
    await expect(password).toBeEditable({ timeout: 30000 });
    await password.fill("local-fixture-key");
    await page.getByRole("button", { name: ar ? "دخول الغرفة" : "Enter room", exact: true }).click();
    const answer = page.getByRole("textbox", { name: ar ? "إجابتك" : "Your answer", exact: true });
    const chat = page.getByRole("textbox", { name: ar ? "رسالة للغرفة" : "Message the room", exact: true });
    await expect(answer).toBeEnabled({ timeout: 30000 });
    await answer.fill(ar ? "الدو" : "Doh");
    await chat.fill(ar ? "سأعود حالًا" : "Back in a moment");
    await context.setOffline(true);
    await expect(page.getByRole("complementary", { name: ar ? "حالة الاتصال" : "Connection status" })).toBeVisible({ timeout: 30000 });
    await expect(answer).toBeDisabled();
    await expect(chat).toBeDisabled();
    await expect(answer).toHaveValue(ar ? "الدو" : "Doh");
    await expect(page.getByRole("button", { name: ar ? "أعد محاولة الاتصال" : "Retry connection", exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(new RegExp(`/game/${gameId}$`));
    await context.setOffline(false);
    await page.getByRole("button", { name: ar ? "أعد محاولة الاتصال" : "Retry connection", exact: true }).click();
    await expect(answer).toBeEnabled({ timeout: 30000 });
    await expect(answer).toHaveValue(ar ? "الدو" : "Doh");
    await expect(chat).toHaveValue(ar ? "سأعود حالًا" : "Back in a moment");
    expect(joined).toBeGreaterThanOrEqual(2);
    await answer.fill(ar ? "الدوحة" : "Doha");
    await page.getByRole("button", { name: ar ? "تأكيد الإجابة" : "Submit Answer", exact: true }).click();
    await expect.poll(() => answers).toBe(1);
    // A reload uses the same join/snapshot contract and must restore the accepted answer.
    await page.reload();
    await expect(answer).toHaveValue(ar ? "الدوحة" : "Doha", { timeout: 30000 });
    await expect(answer).toBeDisabled();
    await expect(page.getByRole("button", { name: ar ? "تأكيد الإجابة" : "Submit Answer", exact: true })).toBeDisabled();
    expect(answers).toBe(1);
    expect(pageErrors).toEqual([]);
  } finally {
    await context.setOffline(false);
    await page.goto("about:blank");
    await new Promise<void>(resolve => io.close(() => resolve()));
  }
});

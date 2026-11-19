import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { devices, expect, test } from "@playwright/test";
import {
  CHAOS_VOTE_OPTIONS, Difficulty, GameMode, GameStatus,
  type ChaosClientSnapshot, type ClientToServerEvents,
  type ServerToClientEvents, type SyncedGameRoom,
} from "@quiz-battle/shared";
import { Server } from "socket.io";

const fixtureEnabled = process.env.PLAYWRIGHT_CHAOS_FIXTURE === "1";
const fixturePort = 3125;
const gameId = "chaos-browser-room";
const userId = "browser-host";
const token = "playwright-chaos-fixture";
const questionId = "chaos-browser-question";
const dramaEventId = "chaos-browser-ballot";
const questionText = "ما عاصمة دولة قطر؟";

test.use({ serviceWorkers: "block" });
test.skip(!fixtureEnabled, "Build with NEXT_PUBLIC_API_URL=http://127.0.0.1:3125 and enable PLAYWRIGHT_CHAOS_FIXTURE=1.");

test("restores an Arabic Chaos answer and ballot after a browser reload", async ({ page, browser, baseURL }, testInfo) => {
  if (testInfo.project.name.includes("mobile")) await page.setViewportSize({ width: 320, height: 844 });
  const clock = Date.now();
  // Give the browser time to reload under CI load while exercising the real UI clock.
  const fixtureBallotDurationMs = 30000;
  const ballotEndsAt = clock + fixtureBallotDurationMs;
  const http = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(http, {
    cors: { origin: baseURL, credentials: true },
  });
  const joinedConnections = new Set<string>();
  const answers: Array<Parameters<ClientToServerEvents["player:answer"]>[0]> = [];
  const votes: Array<Parameters<ClientToServerEvents["chaos:vote"]>[0]> = [];
  let phase = GameStatus.Question;
  let score = 100;
  let watcherContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;

  const chaosSnapshot = (viewerId = userId): ChaosClientSnapshot => ({
    gameId, level: 35, state: "UNSTABLE", personality: "RANDOM", pendingDrama: null,
    activeTrap: null, evaluatingTrap: false,
    votingSession: {
      dramaEventId, targetPlayerId: "browser-guest", targetUsername: "ضيف التجربة",
      durationMs: fixtureBallotDurationMs, endsAt: ballotEndsAt,
      timeRemainingMs: Math.max(0, ballotEndsAt - Date.now()),
      totalVotes: 1 + votes.length, options: [...CHAOS_VOTE_OPTIONS],
      canVote: viewerId === userId && votes.length === 0, hasVoted: viewerId === userId && votes.length > 0,
    },
  });

  const roomSnapshot = (viewerId = userId): SyncedGameRoom => ({
    gameId, joinCode: "CHAOS1", hostId: userId, mode: GameMode.Chaos,
    difficulty: Difficulty.Novice, status: phase, language: "ar",
    currentRound: 2, totalRounds: 5, maxPlayers: 8,
    players: [{
      userId, username: "محارب التجربة", score, rank: 1, streak: 1,
      isEliminated: false, isConnected: true, powerUpInventory: [],
    }],
    currentQuestion: {
      id: questionId, text: questionText, options: ["الدوحة", "مسقط", "المنامة", "الكويت"],
      category: "geography", difficulty: Difficulty.Novice, timeLimit: 30,
    },
    questionStartedAt: clock - 1000,
    selectedAnswer: viewerId === userId ? answers[0]?.answer ?? null : null,
    answeredAt: viewerId === userId ? answers[0]?.timestamp ?? null : null,
    lastAnswerResult: phase === GameStatus.AnswerReveal && viewerId === userId ? { correct: true, correctIndex: 0 } : null,
    chaos: chaosSnapshot(viewerId),
  });

  io.use((socket, next) => {
    if (socket.handshake.auth.token !== token) return next(new Error("Unknown test identity"));
    next();
  });
  io.on("connection", (socket) => {
    socket.on("clock:sync", acknowledge => acknowledge({ serverNow: Date.now() }));
    const joinRoom: ClientToServerEvents["game:join"] = (request, acknowledge) => {
      if (request.gameId !== gameId) return acknowledge?.({ success: false });
      joinedConnections.add(socket.id);
      socket.emit("game:stateSync", { room: roomSnapshot(socket.handshake.auth.userId) });
      acknowledge?.({ success: true });
    };
    socket.on("game:join", joinRoom);
    socket.on("game:spectate", joinRoom);
    socket.on("player:answer", (answer) => answers.push(answer));
    socket.on("chaos:vote", (vote, acknowledge) => {
      votes.push(vote);
      socket.emit("chaos:state", chaosSnapshot(socket.handshake.auth.userId));
      acknowledge?.({ success: true });
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      http.once("error", reject);
      http.listen(fixturePort, "127.0.0.1", resolve);
    });

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
    await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
    await page.addInitScript((identity) => {
      if (!localStorage.getItem("quiz-battle-storage")) {
        localStorage.setItem("quiz-battle-storage", JSON.stringify({ state: identity, version: 0 }));
      }
    }, { userId, token, username: "محارب التجربة", isGuest: true, language: "ar" });
    await page.goto(`/game/${gameId}`);
    await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
    await expect(page.getByText(questionText, { exact: true })).toBeVisible();
    const ballotHeading = page.getByRole("heading", { name: /التصويت على العقاب/ });
    await expect(ballotHeading).toBeVisible();
    await expect(page.getByText("الأصوات: 1", { exact: true })).toBeVisible();
    const artifactDir = process.env.PLAYWRIGHT_CHAOS_ARTIFACT_DIR;
    await expect.poll(() => page.getByRole("button", { name: /الدوحة/ }).evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
    if (artifactDir) {
      await mkdir(artifactDir, { recursive: true });
      await page.screenshot({ path: join(artifactDir, `chaos-${testInfo.project.name}-question.png`), fullPage: true, scale: "css" });
    }
    const header = await page.locator("main header").first().boundingBox();
    const progress = await page.getByText("الجولة", { exact: true }).boundingBox();
    expect(progress!.y).toBeGreaterThan(header!.y + header!.height);

    const selected = page.getByRole("button", { name: /الدوحة/ });
    const other = page.getByRole("button", { name: /مسقط/ });
    const vote = page.getByRole("button", { name: /خفض النقاط/ });
    await expect(selected).toBeEnabled();
    await selected.click();
    await expect.poll(() => answers).toEqual([
      { gameId, questionId, answer: 0, answerIndex: 0, timestamp: expect.any(Number) },
    ]);
    await vote.click();
    await expect.poll(() => votes).toEqual([{ gameId, dramaEventId, vote: "REDUCE_SCORE" }]);
    await expect(page.getByText(/تم التصويت!/)).toBeVisible();
    await expect(page.getByText("الأصوات: 2", { exact: true })).toBeVisible();

    await page.reload();
    await expect.poll(() => joinedConnections.size).toBe(2);
    await expect(page.getByText(questionText, { exact: true })).toBeVisible();
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    await expect(selected).toBeDisabled();
    await expect(other).toHaveAttribute("aria-pressed", "false");
    await expect(other).toBeDisabled();
    await expect(ballotHeading).toBeVisible();
    await expect(page.getByText(/تم التصويت!/)).toBeVisible();
    await expect(page.getByText("الأصوات: 2", { exact: true })).toBeVisible();
    await expect(vote).toHaveCount(0);
    expect(answers).toHaveLength(1);
    expect(votes).toHaveLength(1);
    expect(pageErrors).toEqual([]);
    // Playwright considers an opacity-zero element visible while Framer Motion enters.
    for (const painted of [ballotHeading, selected]) {
      await expect.poll(() => painted.evaluate((element) => {
        for (let current: Element | null = element; current; current = current.parentElement) {
          if (Number(getComputedStyle(current).opacity) < 0.95) return false;
        }
        return true;
      })).toBe(true);
    }
    await testInfo.attach("Arabic Chaos after reconnect", {
      body: await page.screenshot({ fullPage: true }), contentType: "image/png",
    });

    phase = GameStatus.AnswerReveal;
    score = 320;
    for (const socket of io.sockets.sockets.values()) socket.emit("game:stateSync", { room: roomSnapshot(socket.handshake.auth.userId) });
    const reviewButton = page.getByRole("button", { name: "مراجعة السؤال", exact: true });
    await reviewButton.click();
    const dialog = page.getByRole("dialog", { name: /مراجعة السؤال/ });
    await expect(dialog.getByText(questionText, { exact: true })).toBeVisible();
    await expect(dialog.getByText("الدوحة", { exact: true })).toBeVisible();
    await expect(dialog.getByText("إجابتك", { exact: true })).toBeVisible();
    expect(await dialog.evaluate(element => getComputedStyle(element.parentElement!).position)).toBe("fixed");
    const close = dialog.getByRole("button", { name: "إغلاق مراجعة السؤال", exact: true });
    await expect(close).toBeFocused();
    const closeBounds = await close.boundingBox();
    expect(closeBounds!.width).toBeGreaterThanOrEqual(44);
    expect(closeBounds!.height).toBeGreaterThanOrEqual(44);
    await page.setViewportSize({ width: 320, height: 480 });
    expect(await dialog.evaluate(element => getComputedStyle(element).overflowY)).toBe("auto");
    expect(await dialog.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
    await dialog.evaluate(element => { element.scrollTop = element.scrollHeight; });
    if (artifactDir) await page.screenshot({ path: join(artifactDir, "chaos-review-320-scroll.png"), scale: "css" });
    await dialog.getByRole("button", { name: "متابعة", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.setViewportSize({ width: 393, height: 852 });
    await reviewButton.click();
    await expect(dialog).toBeVisible();
    if (artifactDir) await page.screenshot({ path: join(artifactDir, "chaos-review-393.png"), scale: "css" });
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "متابعة", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(reviewButton).toBeFocused();

    watcherContext = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 320, height: 844 }, serviceWorkers: "block" });
    await watcherContext.addInitScript(identity => localStorage.setItem("quiz-battle-storage", JSON.stringify({ version: 0, state: identity })), {
      userId: "browser-watcher", token, username: "مشاهد التجربة", isGuest: true, language: "ar",
    });
    const watcher = await watcherContext.newPage();
    await watcher.goto(`${baseURL}/game/${gameId}?spectate=true`);
    await expect(watcher.getByText(questionText, { exact: true })).toBeVisible();
    await expect(watcher.getByRole("button", { name: /الدوحة/ })).toBeDisabled();
    await expect(watcher.getByRole("button", { name: /خفض النقاط|سامح|ابدأ التصويت|مراجعة السؤال/ })).toHaveCount(0);
    await expect(watcher.locator(`[data-player-score="${userId}"]`)).toHaveText((320).toLocaleString("ar"));
    expect(await watcher.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (artifactDir) await watcher.screenshot({ path: join(artifactDir, "chaos-spectator-reveal-320.png"), fullPage: true, scale: "css" });
  } finally {
    await watcherContext?.close();
    await new Promise<void>((resolve) => io.close(() => resolve()));
  }
});

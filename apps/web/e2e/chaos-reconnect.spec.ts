import { createServer } from "node:http";
import { expect, test } from "@playwright/test";
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

test("restores an Arabic Chaos answer and ballot after a browser reload", async ({ page, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "The loopback fixture runs once in the desktop project.");
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

  const chaosSnapshot = (): ChaosClientSnapshot => ({
    gameId, level: 35, state: "UNSTABLE", personality: "RANDOM", pendingDrama: null,
    activeTrap: null, evaluatingTrap: false,
    votingSession: {
      dramaEventId, targetPlayerId: "browser-guest", targetUsername: "ضيف التجربة",
      durationMs: fixtureBallotDurationMs, endsAt: ballotEndsAt,
      timeRemainingMs: Math.max(0, ballotEndsAt - Date.now()),
      totalVotes: 1 + votes.length, options: [...CHAOS_VOTE_OPTIONS],
      canVote: votes.length === 0, hasVoted: votes.length > 0,
    },
  });

  const roomSnapshot = (): SyncedGameRoom => ({
    gameId, joinCode: "CHAOS1", hostId: userId, mode: GameMode.Chaos,
    difficulty: Difficulty.Novice, status: GameStatus.Question, language: "ar",
    currentRound: 2, totalRounds: 5, maxPlayers: 8,
    players: [{
      userId, username: "محارب التجربة", score: 100, rank: 1, streak: 1,
      isEliminated: false, isConnected: true, powerUpInventory: [],
    }],
    currentQuestion: {
      id: questionId, text: questionText, options: ["الدوحة", "مسقط", "المنامة", "الكويت"],
      category: "geography", difficulty: Difficulty.Novice, timeLimit: 30,
    },
    questionStartedAt: clock - 1000,
    selectedAnswer: answers[0]?.answer ?? null,
    answeredAt: answers[0]?.timestamp ?? null,
    chaos: chaosSnapshot(),
  });

  io.use((socket, next) => {
    if (socket.handshake.auth.token !== token) return next(new Error("Unknown test identity"));
    next();
  });
  io.on("connection", (socket) => {
    socket.on("game:join", (request, acknowledge) => {
      if (request.gameId !== gameId) return acknowledge?.({ success: false });
      joinedConnections.add(socket.id);
      socket.emit("game:stateSync", { room: roomSnapshot() });
      acknowledge?.({ success: true });
    });
    socket.on("player:answer", (answer) => answers.push(answer));
    socket.on("chaos:vote", (vote, acknowledge) => {
      votes.push(vote);
      socket.emit("chaos:state", chaosSnapshot());
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
  } finally {
    await new Promise<void>((resolve) => io.close(() => resolve()));
  }
});

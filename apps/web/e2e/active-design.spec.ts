import { createServer } from "node:http";
import { Server } from "socket.io";
import { expect, test } from "@playwright/test";
import { CONQUEST_TERRITORIES, CHAOS_VOTE_OPTIONS, Difficulty, GameMode, GameStatus, PowerUpType } from "@quiz-battle/shared";

test.use({ serviceWorkers: "block", trace: "off" });
test.skip(process.env.PLAYWRIGHT_ACTIVE_DESIGN !== "1", "Enable the local active-screen fixture explicitly.");

test("reviews active screens across desktop, tablet and mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One fixture owns port 3125; viewport sizes are exercised below.");
  test.setTimeout(180000);
  const userId = "ui-host";
  const powers = [PowerUpType.Shield, PowerUpType.FiftyFifty, PowerUpType.Freeze, PowerUpType.DoubleDown, PowerUpType.Sandstorm, PowerUpType.TimeWarp];
  const players = (ar: boolean) => [
    { userId, username: ar ? "ليلى المنصوري" : "Layla Al Mansouri", score: 1850, rank: 2, streak: 2, isConnected: true, isEliminated: false, powerUpInventory: powers.slice(0, 3) },
    { userId: "ui-peer", username: ar ? "عمر السالم" : "Omar Al Salem", score: 2400, rank: 1, streak: 3, isConnected: true, isEliminated: false, powerUpInventory: [] },
    { userId: "ui-third", username: ar ? "نور الهاشمي" : "Nour Al Hashemi", score: 900, rank: 3, streak: 0, isConnected: false, isEliminated: false, powerUpInventory: [] },
  ];
  const question = (ar: boolean) => ({ id: "visual-question", category: "geography", difficulty: Difficulty.Novice, timeLimit: 30,
    text: ar ? "ما المدينة التي تُعرف بمدينة الأضواء، ويمر بها نهر السين؟" : "Which city is known as the City of Light and stands on the River Seine?",
    options: ar ? ["باريس", "برشلونة", "روما", "أمستردام"] : ["Paris", "Barcelona", "Rome", "Amsterdam"],
  });
  const http = createServer((request, response) => {
    response.setHeader("Access-Control-Allow-Origin", request.headers.origin || "*");
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.setHeader("Content-Type", "application/json");
    if (request.method === "OPTIONS") { response.end(); return; }
    if (request.url?.startsWith("/api/results/")) {
      const id = request.url.split("/").pop()!;
      const ar = id.includes("-ar");
      response.end(JSON.stringify({ gameId: id, mode: GameMode.Classic, difficulty: Difficulty.Novice, language: ar ? "ar" : "en", totalRounds: 5, endedAt: new Date().toISOString(),
        results: players(ar).sort((a, b) => b.score - a.score).map((player, index) => ({ ...player, rank: index + 1, correctAnswers: 3, totalAnswers: 5, avgAnswerTime: 4200, xpEarned: 0 })) }));
    } else { response.statusCode = 404; response.end("{}"); }
  });
  const io = new Server(http, { cors: { origin: true, credentials: true } });
  const joinedRooms: string[] = [];
  io.on("connection", socket => {
    socket.on("clock:sync", ack => ack({ serverNow: Date.now() }));
    const join = ({ gameId }: { gameId: string }, ack: (result: { success: boolean }) => void) => {
      joinedRooms.push(gameId);
      const ar = gameId.includes("-ar");
      const conquest = gameId.includes("conquest") || gameId.includes("invasion");
      const mode = conquest ? GameMode.Conquest : gameId.includes("chaos") ? GameMode.Chaos : GameMode.Classic;
      const startedAt = Date.now() - 2000;
      const roomPlayers = conquest ? players(ar).slice(0, 2) : players(ar);
      const status = gameId.includes("lobby") ? GameStatus.Lobby : gameId.includes("powers") ? GameStatus.PowerUpSelect : GameStatus.Question;
      socket.emit("game:stateSync", { room: {
        gameId, joinCode: "SAIF42", hostId: userId, mode, difficulty: Difficulty.Novice, language: ar ? "ar" : "en", status,
        maxPlayers: 8, currentRound: status === GameStatus.Lobby ? 0 : 2, totalRounds: 5, players: roomPlayers,
        currentQuestion: status === GameStatus.Question && !conquest ? question(ar) : null, questionStartedAt: startedAt, selectedAnswer: null, answeredAt: null,
        ...(status === GameStatus.PowerUpSelect ? { powerUpSelection: { availablePowerUps: powers, selectedPowerUps: [PowerUpType.Shield, PowerUpType.FiftyFifty], maxSelections: 3, timeLeft: 28, isSelecting: true } } : {}),
        ...(mode === GameMode.Chaos ? { chaos: { gameId, level: 35, state: "UNSTABLE", personality: "RANDOM", pendingDrama: null, activeTrap: null, evaluatingTrap: false,
          votingSession: { dramaEventId: "design-ballot", targetPlayerId: "ui-peer", targetUsername: ar ? "عمر السالم" : "Omar Al Salem", durationMs: 30000, endsAt: Date.now() + 30000,
            timeRemainingMs: 30000, totalVotes: 1, options: [...CHAOS_VOTE_OPTIONS], canVote: true, hasVoted: false } } } : {}),
      } });
      if (gameId.includes("conquest")) socket.emit("conquest:state", {
        territories: Object.fromEntries(CONQUEST_TERRITORIES.slice(0, 12).map((territory, index) => [String(territory.id), index === 0 ? userId : index === 1 ? "ui-peer" : null])),
        fortHealth: { [userId]: 3, "ui-peer": 3 }, fortTerritoryId: { [userId]: "0", "ui-peer": "1" }, turnOrder: [userId, "ui-peer"], currentTurnIndex: 0,
        phase: "draft", eliminatedPlayers: [], currentBattle: null, rebuildSession: null,
        draftPhase: { currentRound: 2, question: question(ar), questionStartedAt: startedAt, questionEndsAt: startedAt + 30000, selectedAnswer: null, answeredAt: null,
          answered: 1, totalPlayers: 2, pickOrder: [], currentPickerIndex: 0, availableTerritories: CONQUEST_TERRITORIES.slice(2, 12).map(territory => String(territory.id)), picksRemaining: {}, pickTurnId: null, pickEndsAt: null },
      });
      if (gameId.includes("invasion")) socket.emit("invasion:state", {
        territories: CONQUEST_TERRITORIES.slice(0, 12).map((territory, index) => ({ ...territory, ownerId: index < 6 ? userId : "ui-peer", troopCount: 100 })),
        currentRound: 2, totalRounds: 5, phase: "selection", currentQuestion: question(ar), questionStartedAt: startedAt, selectedAnswer: 0, answeredAt: startedAt + 500,
        currentTurn: userId, picksRemaining: 2, selectableTerritories: [6, 7, 8, 9, 10, 11], lastRanking: [{ playerId: userId, playerName: players(ar)[0].username, rank: 1, picks: 2, responseTimeMs: 500 }],
        selectionPhase: { isActive: true, pickingPlayerId: userId, picksRemaining: 2 },
      });
      ack?.({ success: true });
    };
    socket.on("game:join", join);
    socket.on("game:spectate", join);
    socket.on("game:message", ({ message }) => socket.emit("game:message", { userId, username: "Layla", message }));
    socket.on("game:selectPowerUp", (_request, ack) => ack?.({ success: true }));
    socket.on("game:confirmPowerUpSelection", (_request, ack) => ack?.({ success: true }));
    socket.on("conquest:draftAnswer", (_request, ack) => ack?.({ success: true }));
  });
  try {
    await new Promise<void>((resolve, reject) => { http.once("error", reject); http.listen(3125, "127.0.0.1", resolve); });
    const pageErrors: string[] = [];
    const socketTargets = new Set<string>();
    page.on("request", request => { const url = new URL(request.url()); if (url.pathname.startsWith("/socket.io")) socketTargets.add(url.origin); });
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.route("https://fonts.googleapis.com/**", route => route.abort());
    await page.route("https://fonts.gstatic.com/**", route => route.abort());
    const screens = [
      ["lobby", "en", 1440, 900], ["lobby", "ar", 320, 844], ["lobby", "ar", 390, 844], ["lobby", "ar", 834, 1112],
      ["powers", "en", 1440, 900], ["powers", "ar", 390, 844], ["powers", "ar", 834, 1112],
      ["question", "en", 1440, 900], ["question", "ar", 390, 844], ["question", "ar", 834, 1112],
      ["conquest", "ar", 1440, 900], ["conquest", "ar", 390, 844], ["conquest", "ar", 834, 1112],
      ["invasion", "ar", 1440, 900], ["invasion", "ar", 390, 844],
      ["chaos", "ar", 1440, 900], ["chaos", "ar", 390, 844],
      ["results", "en", 1440, 900], ["results", "ar", 390, 844], ["results", "ar", 834, 1112],
    ] as const;
    for (const [stage, language, width, height] of screens) {
      await page.setViewportSize({ width, height });
      await page.addInitScript((locale) => localStorage.setItem("quiz-battle-storage", JSON.stringify({ version: 0, state: { userId: "ui-host", username: "Layla", token: "local-design-fixture", isGuest: true, language: locale } })), language);
      const path = stage === "lobby" ? "lobby" : stage === "results" ? "results" : "game";
      await page.goto(`/${path}/design-${stage}-${language}`);
      const visible = stage === "results" ? page.getByRole("heading", { name: /Final Standings|الترتيب النهائي/ })
        : stage === "lobby" ? page.getByRole("heading", { name: /Battle Lobby|غرفة المعركة/ })
        : stage === "powers" ? page.getByRole("heading", { name: /Choose your powers|اختر قواك/ })
        : stage === "invasion" ? page.getByText(/Your turn|دورك/, { exact: false })
        : page.getByText(question(language === "ar").text, { exact: true }).first();
      await expect(visible).toBeVisible({ timeout: 30000 }).catch(error => { throw new Error(`${error.message}\n${JSON.stringify({ socketTargets: [...socketTargets], joinedRooms, pageErrors })}`); });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (stage === "question") {
        const answers = page.locator("button.answer-option");
        await expect(answers).toHaveCount(4);
        await answers.first().click();
        await expect(answers.first()).toHaveAttribute("aria-pressed", "true");
      }
      if (stage === "powers" && language === "en") {
        await page.getByRole("button", { name: "Confirm selection", exact: true }).click();
        await expect(page.getByText("Waiting for other players...", { exact: true })).toBeVisible();
      }
      if (stage === "lobby" && language === "en") {
        const chat = page.getByRole("textbox", { name: "Message the room", exact: true });
        await chat.fill("Ready when you are."); await chat.press("Enter");
        await expect(page.getByText("Ready when you are.", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Copy code", exact: true }).focus();
        await expect(page.getByRole("button", { name: "Copy code", exact: true })).toHaveCSS("outline-width", "3px");
      }
      await page.screenshot({ path: testInfo.outputPath(`${stage}-${language}-${width}.png`), fullPage: true, animations: "disabled" });
    }
    expect(pageErrors).toEqual([]);
  } finally { await new Promise<void>(resolve => io.close(() => resolve())); }
});

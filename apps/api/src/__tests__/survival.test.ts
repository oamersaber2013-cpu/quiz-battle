jest.mock("@quiz-battle/db", () => ({ prisma: {} }));
jest.mock("../lib/analytics", () => ({ trackEvent: jest.fn(async () => {}) }));
jest.mock("../lib/gamePersistence", () => ({ saveGameSession: jest.fn(async () => {}) }));
jest.mock("../lib/aiBots", () => ({ getBotInfo: jest.fn(), removeBots: jest.fn() }));
jest.mock("../lib/questions", () => ({ ...jest.requireActual("../lib/questions"), fetchQuestions: jest.fn(), clearUsedQuestions: jest.fn() }));

import { Difficulty, GameMode, GameStatus, PowerUpType, QuestionType } from "@quiz-battle/shared";
import { fetchQuestions } from "../lib/questions";
import { handlePlayerAnswer, handlePowerUp, removeActiveGame, setActiveGame, startGame } from "../lib/gameOrchestrator";
import { saveGameSession } from "../lib/gamePersistence";
import { SafeRedis } from "../lib/redis";

describe("Survival completion", () => {
  const emit = jest.fn();
  const io = { to: jest.fn(() => ({ emit })) } as any;
  const redis = new SafeRedis(null);
  let game: any;
  let running: Promise<void> | undefined;

  beforeEach(() => {
    jest.useFakeTimers({ now: 100000 });
    emit.mockClear();
    jest.mocked(saveGameSession).mockClear();
    running = undefined;
    const player = (id: string) => ({ userId: id, username: id, score: 0, rank: 0, streak: 0,
      isConnected: true, isEliminated: false, powerUpInventory: [] });
    game = { gameId: "survival-regression", joinCode: "SURVIV", hostId: "host", mode: GameMode.Survival,
      difficulty: Difficulty.Scholar, language: "en", status: GameStatus.Lobby,
      currentRound: 0, totalRounds: 3, maxPlayers: 8, players: { host: player("host"), guest: player("guest") },
      questions: [], questionStartTime: 0, answersThisRound: {}, lastAnswerByPlayer: {}, activeEffects: [] };
    jest.mocked(fetchQuestions).mockResolvedValue(Array.from({ length: 3 }, (_, index) => ({
      id: `survival-${index + 1}`, category: "general", difficulty: Difficulty.Scholar, type: QuestionType.MultipleChoice,
      text: "Survival question", options: ["Correct", "Wrong"], correctIndex: 0, timeLimit: 1,
    })));
    setActiveGame(game.gameId, game);
  });

  afterEach(async () => {
    await jest.advanceTimersByTimeAsync(20000);
    await running;
    removeActiveGame(game.gameId);
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("gives only the player who spent 50:50 the eliminated choices", async () => {
    const room = game.gameId;
    const tabs = ["host", "guest", "spectator"].map((id) => ({
      data: { userId: id === "spectator" ? "host" : id },
      rooms: new Set(id === "spectator" ? [room, room + "_spectators"] : [room]),
      emit: jest.fn(),
    }));
    const clients = new Map(tabs.map((tab, i) => [String(i), tab]));
    const server = { to: io.to, sockets: { adapter: { rooms: new Map([[room, new Set(clients.keys())]]) }, sockets: clients } };
    game.status = GameStatus.Question;
    game.currentRound = 1;
    game.questionStartTime = Date.now();
    game.questions = [{ id: "q", type: QuestionType.MultipleChoice, options: ["A", "B", "C", "D"], correctIndex: 0, timeLimit: 30 }];
    game.players.host.powerUpInventory = [PowerUpType.FiftyFifty];
    expect(await handlePowerUp(game, server as any, redis, "host", PowerUpType.FiftyFifty)).toMatchObject({ success: true });
    const hidden = game.fiftyFiftyByUser.host;
    expect(hidden).toHaveLength(2);
    expect(hidden).not.toContain(0);
    expect(tabs[0].emit).toHaveBeenCalledWith("game:powerUpApplied", expect.objectContaining({ eliminatedIndices: hidden }));
    for (const tab of tabs.slice(1)) {
      expect(tab.emit).toHaveBeenCalledWith("game:powerUpApplied", expect.not.objectContaining({ eliminatedIndices: expect.anything() }));
    }
  });

  it("finishes when elimination leaves one survivor from a multiplayer start", async () => {
    running = startGame(io, redis, game.gameId);
    await jest.advanceTimersByTimeAsync(5500);
    await handlePlayerAnswer(game, io, redis, "host", "survival-1", 0, Date.now());
    await handlePlayerAnswer(game, io, redis, "guest", "survival-1", 1, Date.now());
    await jest.advanceTimersByTimeAsync(4500);
    expect(game.players.guest.isEliminated).toBe(true);
    expect(game.players.host.isEliminated).toBe(false);
    expect(emit.mock.calls.filter(([event]) => event === "game:question")).toHaveLength(1);
    expect(emit.mock.calls.filter(([event]) => event === "game:end")).toHaveLength(1);
    expect(saveGameSession).toHaveBeenCalledWith(expect.objectContaining({ winnerId: "host" }));
  });

  it("lets an originally solo survivor keep playing after a correct first round", async () => {
    delete game.players.guest;
    running = startGame(io, redis, game.gameId);
    await jest.advanceTimersByTimeAsync(5500);
    await handlePlayerAnswer(game, io, redis, "host", "survival-1", 0, Date.now());
    await jest.advanceTimersByTimeAsync(4000);
    expect(game.currentRound).toBe(2);
    expect(emit.mock.calls.filter(([event]) => event === "game:question")).toHaveLength(2);
    expect(emit.mock.calls.filter(([event]) => event === "game:end")).toHaveLength(0);
  });

  it("ranks the surviving player ahead of an eliminated higher scorer", async () => {
    game.players.guest.score = 10000;
    jest.mocked(fetchQuestions).mockResolvedValue([{
      id: "survival-1", category: "general", difficulty: Difficulty.Scholar, type: QuestionType.MultipleChoice,
      text: "Survival question", options: ["Correct", "Wrong"], correctIndex: 0, timeLimit: 1,
    }]);
    running = startGame(io, redis, game.gameId);
    await jest.advanceTimersByTimeAsync(5500);
    await handlePlayerAnswer(game, io, redis, "host", "survival-1", 0, Date.now());
    await handlePlayerAnswer(game, io, redis, "guest", "survival-1", 1, Date.now());
    await jest.advanceTimersByTimeAsync(4500);
    expect(game.finalResults[0]).toMatchObject({ userId: "host", rank: 1 });
    expect(game.finalResults[1]).toMatchObject({ userId: "guest", rank: 2, score: 10000 });
  });

  it.each(["wrong", "missing"])("honors a round shield for a %s answer when elimination settles after the deadline", async answer => {
    running = startGame(io, redis, game.gameId);
    await jest.advanceTimersByTimeAsync(5500);
    expect(await handlePowerUp(game, io, redis, "host", PowerUpType.Shield)).toEqual({ success: true });
    if (answer === "wrong") {
      await handlePlayerAnswer(game, io, redis, "host", "survival-1", 1, Date.now());
    } else {
      await handlePlayerAnswer(game, io, redis, "guest", "survival-1", 0, Date.now());
    }
    await jest.advanceTimersByTimeAsync(2000);
    expect(game.players.host.isEliminated).toBe(false);
    expect(game.activeEffects.some((effect: any) => effect.type === PowerUpType.Shield)).toBe(false);
    if (answer === "wrong") {
      expect(game.players.guest.isEliminated).toBe(true);
    } else {
      await jest.advanceTimersByTimeAsync(2500);
      expect(game.currentRound).toBe(2);
      await handlePlayerAnswer(game, io, redis, "host", "survival-2", 1, Date.now());
      await handlePlayerAnswer(game, io, redis, "guest", "survival-2", 0, Date.now());
      await jest.advanceTimersByTimeAsync(4500);
      expect(game.players.host.isEliminated).toBe(true);
      expect(game.finalResults.map((result: any) => result.userId)).toEqual(["guest", "host"]);
      expect(game.finalResults.find((result: any) => result.userId === "host").totalAnswers).toBe(1);
    }
  });

  it("does not consume a late shield after my deadline while another player's extra time keeps the round open", async () => {
    running = startGame(io, redis, game.gameId);
    await jest.advanceTimersByTimeAsync(5500);
    game.players.guest.powerUpInventory.push(PowerUpType.TimeWarp);
    expect(await handlePowerUp(game, io, redis, "guest", PowerUpType.TimeWarp)).toEqual({ success: true });
    await jest.advanceTimersByTimeAsync(700);
    expect(game.status).toBe(GameStatus.Question);
    expect(await handlePowerUp(game, io, redis, "host", PowerUpType.Shield)).toMatchObject({ success: false });
    expect(game.players.host.powerUpInventory).toContain(PowerUpType.Shield);
  });

  it("does not carry an unused previous-round shield into the next elimination", async () => {
    running = startGame(io, redis, game.gameId);
    await jest.advanceTimersByTimeAsync(5500);
    await handlePowerUp(game, io, redis, "host", PowerUpType.Shield);
    await handlePlayerAnswer(game, io, redis, "host", "survival-1", 0, Date.now());
    await handlePlayerAnswer(game, io, redis, "guest", "survival-1", 0, Date.now());
    await jest.advanceTimersByTimeAsync(4000);
    expect(game.currentRound).toBe(2);
    expect(game.activeEffects.some((effect: any) => effect.type === PowerUpType.Shield)).toBe(false);
    await handlePlayerAnswer(game, io, redis, "host", "survival-2", 1, Date.now());
    await handlePlayerAnswer(game, io, redis, "guest", "survival-2", 0, Date.now());
    await jest.advanceTimersByTimeAsync(4500);
    expect(game.players.host.isEliminated).toBe(true);
    expect(game.finalResults[0].userId).toBe("guest");
  });
});

jest.mock("@quiz-battle/db", () => ({ prisma: {} }));
jest.mock("../lib/analytics", () => ({ trackEvent: jest.fn(async () => {}) }));
jest.mock("../lib/gamePersistence", () => ({ saveGameSession: jest.fn(async () => {}) }));
jest.mock("../lib/aiBots", () => ({ getBotInfo: jest.fn(), removeBots: jest.fn() }));
jest.mock("../lib/questions", () => ({ fetchQuestions: jest.fn(), clearUsedQuestions: jest.fn() }));

import { Difficulty, GameMode, GameStatus, QuestionType } from "@quiz-battle/shared";
import { fetchQuestions } from "../lib/questions";
import { handlePlayerAnswer, removeActiveGame, setActiveGame, startGame } from "../lib/gameOrchestrator";
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
});

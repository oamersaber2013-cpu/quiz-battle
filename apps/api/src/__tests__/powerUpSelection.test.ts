jest.mock("@quiz-battle/db", () => ({ prisma: {} }));
jest.mock("../lib/analytics", () => ({ trackEvent: jest.fn(async () => {}) }));
jest.mock("../lib/gamePersistence", () => ({ saveGameSession: jest.fn(async () => {}) }));
jest.mock("../lib/questions", () => ({
  ...jest.requireActual("../lib/questions"),
  fetchQuestions: jest.fn(async () => [{
    id: "question", text: "Question", options: ["A", "B", "C", "D"], correctIndex: 0,
    timeLimit: 15, category: "general", difficulty: "novice",
  }]),
  clearUsedQuestions: jest.fn(),
}));

import { Difficulty, GameMode, GameStatus, PowerUpType } from "@quiz-battle/shared";
import type { PlayerState } from "@quiz-battle/shared";
import {
  confirmPowerUpSelection, getActiveGame, handlePowerUp, handlePowerUpSelection, removeActiveGame, setActiveGame, startGame,
  startPowerUpSelectionPhase,
} from "../lib/gameOrchestrator";
import { SafeRedis } from "../lib/redis";

describe("Power-up selection through the first round", () => {
  const gameId = "power-up-room";
  const emit = jest.fn();
  const io = { to: () => ({ emit }) } as any;
  const redis = new SafeRedis(null);
  const defaults = [PowerUpType.FiftyFifty, PowerUpType.Shield, PowerUpType.Freeze];

  beforeEach(() => {
    jest.useFakeTimers({ now: 100_000 });
    emit.mockClear();
  });

  afterEach(async () => {
    await jest.advanceTimersByTimeAsync(60_000);
    removeActiveGame(gameId);
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  function installGame(secondPlayer: "guest" | "bot" = "guest") {
    const player = (userId: string): PlayerState => ({
      userId, username: userId, score: 0, rank: 0, streak: 0,
      isConnected: true, isEliminated: false, powerUpInventory: [],
    });
    const players: Record<string, PlayerState> = {
      host: player("host"),
      [secondPlayer]: { ...player(secondPlayer), isBot: secondPlayer === "bot" },
    };
    setActiveGame(gameId, {
      gameId, joinCode: "POWER1", hostId: "host", mode: GameMode.Classic, language: "en",
      difficulty: Difficulty.Novice, status: GameStatus.Lobby, currentRound: 0, totalRounds: 1,
      maxPlayers: 8, players, questions: [], activeEffects: [], answersThisRound: {},
      lastAnswerByPlayer: {}, questionStartTime: 0,
    });
    return players;
  }

  function begin(secondPlayer: "guest" | "bot" = "guest") {
    const players = installGame(secondPlayer);
    startPowerUpSelectionPhase(io, redis, gameId);
    return players;
  }

  it("starts a solo battle as soon as its human confirms and preserves the exact choices", async () => {
    const players = begin("bot");
    expect(handlePowerUpSelection(gameId, "host", PowerUpType.TimeWarp).success).toBe(true);
    expect(confirmPowerUpSelection(io, redis, gameId, "host").success).toBe(true);

    await jest.advanceTimersByTimeAsync(0);
    expect(emit.mock.calls.filter(([event]) => event === "game:powerUpSelectEnd")).toHaveLength(1);
    expect(emit).toHaveBeenCalledWith("game:countdown", { seconds: 5 });
    await jest.advanceTimersByTimeAsync(5_000);
    expect(emit).toHaveBeenCalledWith("game:question", expect.objectContaining({ round: 1 }));
    expect(players.host.powerUpInventory).toEqual([PowerUpType.TimeWarp]);
    expect(players.bot.powerUpInventory).toEqual(defaults);
    expect(emit).toHaveBeenCalledWith("game:stateSync", expect.objectContaining({
      room: expect.objectContaining({ players: expect.arrayContaining([
        expect.objectContaining({ userId: "host", powerUpInventory: [PowerUpType.TimeWarp] }),
      ]) }),
    }));

    const game = getActiveGame(gameId)!;
    expect(await handlePowerUp(game, io, redis, "host", PowerUpType.Shield)).toMatchObject({ success: false });
    expect(await handlePowerUp(game, io, redis, "host", PowerUpType.TimeWarp)).toEqual({ success: true });
    expect(players.host.powerUpInventory).toEqual([]);
    expect(game.activeEffects).toContainEqual(expect.objectContaining({
      type: PowerUpType.TimeWarp, sourceUserId: "host", expiresAt: game.questionStartTime + 20_000,
    }));
  });

  it("waits for all humans, locks confirmed selections, and keeps each player's inventory", async () => {
    const players = begin();
    handlePowerUpSelection(gameId, "host", PowerUpType.DoubleDown);
    handlePowerUpSelection(gameId, "guest", PowerUpType.Sandstorm);
    expect(confirmPowerUpSelection(io, redis, gameId, "host").success).toBe(true);
    await jest.advanceTimersByTimeAsync(1_000);
    expect(emit).not.toHaveBeenCalledWith("game:powerUpSelectEnd", expect.anything());
    expect(handlePowerUpSelection(gameId, "host", PowerUpType.Freeze).success).toBe(false);
    expect(confirmPowerUpSelection(io, redis, gameId, "guest").success).toBe(true);
    await jest.advanceTimersByTimeAsync(5_000);
    expect(emit.mock.calls.filter(([event]) => event === "game:powerUpSelectEnd")).toHaveLength(1);
    expect(players.host.powerUpInventory).toEqual([PowerUpType.DoubleDown]);
    expect(players.guest.powerUpInventory).toEqual([PowerUpType.Sandstorm]);
  });

  it("uses the existing deadline and keeps defaults for an unselected human", async () => {
    const players = begin();
    handlePowerUpSelection(gameId, "host", PowerUpType.TimeWarp);
    confirmPowerUpSelection(io, redis, gameId, "host");
    await jest.advanceTimersByTimeAsync(29_999);
    expect(emit).not.toHaveBeenCalledWith("game:powerUpSelectEnd", expect.anything());
    await jest.advanceTimersByTimeAsync(5_001);
    expect(emit.mock.calls.filter(([event]) => event === "game:powerUpSelectEnd")).toHaveLength(1);
    expect(emit).toHaveBeenCalledWith("game:question", expect.objectContaining({ round: 1 }));
    expect(players.host.powerUpInventory).toEqual([PowerUpType.TimeWarp]);
    expect(players.guest.powerUpInventory).toEqual(defaults);
  });

  it("still grants starter inventory when invoked without a selection phase", async () => {
    const players = installGame();
    const running = startGame(io, redis, gameId);
    await jest.advanceTimersByTimeAsync(5_000);
    expect(players.host.powerUpInventory).toContain(PowerUpType.TimeWarp);
    expect(players.host.powerUpInventory).toHaveLength(6);
    await jest.advanceTimersByTimeAsync(20_000);
    await running;
  });
});

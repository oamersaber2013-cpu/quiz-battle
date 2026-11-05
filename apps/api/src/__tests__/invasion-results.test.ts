jest.mock("@quiz-battle/db", () => ({ prisma: {} }));
jest.mock("../lib/analytics", () => ({ trackEvent: jest.fn(async () => {}) }));
jest.mock("../lib/gamePersistence", () => ({ saveGameSession: jest.fn(async () => {}) }));
jest.mock("../lib/aiBots", () => ({ removeBots: jest.fn(), getBotInfo: jest.fn() }));
jest.mock("../lib/questions", () => ({
  fetchQuestions: jest.fn(async () => [{ id: "invasion-last", text: "Question", options: ["A", "B"], correctIndex: 1, timeLimit: 15 }]),
  clearUsedQuestions: jest.fn(),
}));

import { Difficulty, GameMode, GameStatus } from "@quiz-battle/shared";
import { getActiveGame, removeActiveGame, setActiveGame } from "../lib/gameOrchestrator";
import { createInvasionGame, deleteInvasionGame, getInvasionState, startInvasionRound } from "../lib/invasionOrchestrator";
import { saveGameSession } from "../lib/gamePersistence";

describe("Invasion completed results bridge", () => {
  const emit = jest.fn();
  const io = { to: jest.fn(() => ({ emit })) } as any;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(100000);
    emit.mockClear();
    (saveGameSession as jest.Mock).mockClear();
    setActiveGame("invasion-result", {
      gameId: "invasion-result", joinCode: "MAP", hostId: "host", mode: GameMode.Conquest,
      difficulty: Difficulty.Sage, language: "ar", status: GameStatus.Question,
      players: {
        host: { userId: "host", username: "Host", score: 900, streak: 0, rank: 0, isConnected: true, isEliminated: false, powerUpInventory: [] },
        player: { userId: "player", username: "Player", score: 100, streak: 0, rank: 0, isConnected: true, isEliminated: false, powerUpInventory: [] },
      },
      questions: [], currentRound: 0, totalRounds: 10, maxPlayers: 8,
      questionStartTime: 0, answersThisRound: {}, lastAnswerByPlayer: {}, activeEffects: [],
    });
    createInvasionGame("invasion-result", ["host", "player"], { totalRounds: 1 });
    getInvasionState("invasion-result")!.territories.forEach((territory, index) => {
      territory.ownerId = index < 8 ? "player" : "host";
    });
  });
  afterEach(() => {
    deleteInvasionGame("invasion-result");
    removeActiveGame("invasion-result");
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("persists actual territory standings exactly once before clearing the invasion", async () => {
    await startInvasionRound("invasion-result", io, {} as any);
    await jest.advanceTimersByTimeAsync(18000);
    expect(saveGameSession).toHaveBeenCalledTimes(1);
    const saved = (saveGameSession as jest.Mock).mock.calls[0][0];
    expect(saved).toMatchObject({ gameId: "invasion-result", hostId: "host", mode: GameMode.Conquest, language: "ar", totalRounds: 1 });
    expect(saved.players).toEqual([
      expect.objectContaining({ userId: "player", score: 8, rank: 1, correctAnswers: 0, totalAnswers: 0 }),
      expect.objectContaining({ userId: "host", score: 4, rank: 2, correctAnswers: 0, totalAnswers: 0 }),
    ]);
    expect(getActiveGame("invasion-result")!.finalResults).toEqual(saved.players);
    expect(getInvasionState("invasion-result")).toBeUndefined();
    expect(emit.mock.calls.filter(([event]) => event === "game:end")).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(1000);
    expect(saveGameSession).toHaveBeenCalledTimes(1);
  });
});

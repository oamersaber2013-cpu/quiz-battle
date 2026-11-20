jest.mock("../lib/questions", () => ({ fetchQuestions: jest.fn() }));

import { Difficulty } from "@quiz-battle/shared";
import { fetchQuestions } from "../lib/questions";
import { fillWithBots, removeBots } from "../lib/aiBots";
import {
  createInvasionGame,
  createInvasionGameFromConquest,
  deleteInvasionGame,
  getInvasionState,
  INVASION_GAMES,
  recordAnswer,
  selectTerritory,
  startInvasionRound,
} from "../lib/invasionOrchestrator";

describe("Invasion round integrity", () => {
  const emit = jest.fn();
  const io = { to: jest.fn(() => ({ emit })) } as any;
  const questions = fetchQuestions as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-11-04T12:00:00Z"));
    emit.mockClear();
    questions.mockReset().mockResolvedValue([{
      id: "question-1", text: "Test", options: ["A", "B", "C", "D"],
      correctIndex: 1, timeLimit: 15,
    }]);
    createInvasionGame("room", ["host", "player"]);
  });

  afterEach(() => {
    removeBots("room");
    for (const id of INVASION_GAMES.keys()) deleteInvasionGame(id);
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("locks each participant's first answer and rejects outsiders", async () => {
    await startInvasionRound("room", io);
    recordAnswer("room", "host", 0);
    recordAnswer("room", "host", 1);
    recordAnswer("room", "intruder", 1);
    expect(getInvasionState("room")!.playerResponses).toEqual({
      host: { answer: 0, isCorrect: false, responseTimeMs: 0 },
    });
  });

  it("rejects late, invalid and non-question-phase answers", async () => {
    await startInvasionRound("room", io);
    recordAnswer("room", "host", 99);
    recordAnswer("room", "host", Number.NaN);
    recordAnswer("room", "host", 1.5);
    expect(getInvasionState("room")!.playerResponses).toEqual({});
    jest.setSystemTime(Date.now() + 15001);
    recordAnswer("room", "host", 1);
    expect(getInvasionState("room")!.playerResponses).toEqual({});
    getInvasionState("room")!.phase = "ranking";
    recordAnswer("room", "player", 1);
    expect(getInvasionState("room")!.playerResponses).toEqual({});
    expect(getInvasionState("room")!.answerStats).toEqual({
      host: { correctAnswers: 0, totalAnswers: 0, totalResponseTimeMs: 0 },
      player: { correctAnswers: 0, totalAnswers: 0, totalResponseTimeMs: 0 },
    });
  });

  it("keeps cumulative accepted answer stats when a new Invasion round resets responses", async () => {
    await startInvasionRound("room", io);
    jest.advanceTimersByTime(400);
    recordAnswer("room", "host", 0);
    recordAnswer("room", "host", 1);
    await jest.advanceTimersByTimeAsync(17600);
    expect(getInvasionState("room")!.currentRound).toBe(2);
    expect(getInvasionState("room")!.playerResponses).toEqual({});
    jest.advanceTimersByTime(600);
    recordAnswer("room", "host", 1);
    expect(getInvasionState("room")!.answerStats.host).toEqual({ correctAnswers: 1, totalAnswers: 2, totalResponseTimeMs: 1000 });
    expect(getInvasionState("room")!.answerStats.player).toEqual({ correctAnswers: 0, totalAnswers: 0, totalResponseTimeMs: 0 });
  });

  it("starts one question and one result timer for concurrent start requests", async () => {
    await Promise.all([
      startInvasionRound("room", io),
      startInvasionRound("room", io),
    ]);
    expect(questions).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls.filter(([event]) => event === "invasion:roundStart")).toHaveLength(1);
    expect(jest.getTimerCount()).toBe(1);
  });

  it("consumes a pick once and immediately revokes the exhausted player's turn", async () => {
    await startInvasionRound("room", io);
    recordAnswer("room", "host", 1);
    await jest.advanceTimersByTimeAsync(18000);
    const state = getInvasionState("room")!;
    expect(state.phase).toBe("selection");
    expect(selectTerritory("room", "host", 1, io)).toBe(true);
    expect(selectTerritory("room", "host", 2, io)).toBe(true);
    expect(selectTerritory("room", "host", 3, io)).toBe(true);
    expect(selectTerritory("room", "host", 4, io)).toBe(false);
    expect(state.territories.find(t => t.id === 4)!.ownerId).toBeNull();
    expect(state.lastRanking[0].picks).toBe(0);
  });

  it("consumes one pick on each timeout even after a successful pick", async () => {
    await startInvasionRound("room", io);
    recordAnswer("room", "host", 1);
    await jest.advanceTimersByTimeAsync(18000);
    selectTerritory("room", "host", 1, io);
    await jest.advanceTimersByTimeAsync(10000);
    expect(getInvasionState("room")!.selectionPhase.picksRemaining).toBe(1);
    await jest.advanceTimersByTimeAsync(10000);
    expect(getInvasionState("room")!.selectionPhase.isActive).toBe(false);
  });

  it("clears timers when deleting a game so a replacement room is untouched", async () => {
    await startInvasionRound("room", io);
    deleteInvasionGame("room");
    expect(jest.getTimerCount()).toBe(0);
    createInvasionGame("room", ["host", "player"]);
    await jest.advanceTimersByTimeAsync(20000);
    expect(getInvasionState("room")!.currentQuestion).toBeNull();
    expect(getInvasionState("room")!.phase).toBe("question");
  });

  it("transfers the same territory ids and owners from Conquest", () => {
    deleteInvasionGame("room");
    const ownership = Object.fromEntries(Array.from({ length: 12 }, (_, id) => [
      String(id), id % 2 === 0 ? "host" : "player",
    ]));
    createInvasionGameFromConquest("room", ["host", "player"], {}, ownership, {});
    expect(Object.fromEntries(getInvasionState("room")!.territories.map(t => [String(t.id), t.ownerId])))
      .toEqual(ownership);
  });

  it("keeps the room's Arabic language, difficulty and categories after the transition", async () => {
    deleteInvasionGame("room");
    createInvasionGameFromConquest("room", ["host", "player"], { host: "Host" }, {}, {}, {
      difficulty: Difficulty.Legend, language: "ar", categories: ["history"], totalRounds: 6,
    });
    await startInvasionRound("room", io);
    expect(questions).toHaveBeenCalledWith(Difficulty.Legend, 1, ["history"], undefined, "ar", "room", { singleChoiceOnly: true });
    expect(getInvasionState("room")!.totalRounds).toBe(6);
  });

  it("lets the solo-fill bot answer and spend its Invasion picks", async () => {
    deleteInvasionGame("room");
    const random = jest.spyOn(Math, "random").mockReturnValue(0.1);
    try {
      const [botId] = await fillWithBots(io, "room", 1, 2);
      createInvasionGame("room", ["host", botId]);
      await startInvasionRound("room", io);
      await jest.advanceTimersByTimeAsync(8000);
      expect(getInvasionState("room")!.playerResponses[botId]).toMatchObject({ answer: 1, isCorrect: true });
      await jest.advanceTimersByTimeAsync(13000);
      expect(getInvasionState("room")!.lastRanking.find(row => row.playerId === botId)?.picks).toBe(0);
      expect(getInvasionState("room")!.territories.filter(territory => territory.ownerId === botId).length).toBeGreaterThan(1);
      deleteInvasionGame("room");
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      random.mockRestore();
    }
  });
});

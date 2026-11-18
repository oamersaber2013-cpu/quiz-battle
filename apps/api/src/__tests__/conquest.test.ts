jest.mock("../lib/questions", () => ({
  fetchQuestions: jest.fn(async () => [{ id: "draft-q", text: "Question", options: ["A", "B"], correctIndex: 0, timeLimit: 15 }]),
}));

import { Difficulty } from "@quiz-battle/shared";
import { getConquestState, initConquestGame, processDraftRound, recordDraftAnswer, removeConquestGame, safeConquestState, selectDraftTerritory, startDraftRound } from "../lib/conquestOrchestrator";
import { INVASION_GAMES } from "../lib/invasionOrchestrator";
import { fillWithBots, removeBots } from "../lib/aiBots";
import { fetchQuestions } from "../lib/questions";

describe("Conquest territory draft", () => {
  const gameId = "conquest-regression";
  const broadcast = jest.fn();
  const io = { to: jest.fn(() => ({ emit: broadcast })) } as any;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(100000);
    await initConquestGame(io, gameId, ["host", "guest"], { host: "Host", guest: "Guest" }, Difficulty.Sage, "ar", undefined, 12);
  });
  afterEach(() => {
    removeConquestGame(gameId);
    removeBots(gameId);
    INVASION_GAMES.delete(gameId);
    jest.clearAllTimers();
    jest.useRealTimers();
    broadcast.mockClear();
  });

  it("reserves the preassigned forts and rejects stealing one during the draft", async () => {
    const state = getConquestState(gameId)!;
    expect(state.draftPhase!.availableTerritories).not.toContain(state.fortTerritoryId.guest);
    await processDraftRound(io, gameId);
    expect(selectDraftTerritory(io, gameId, "host", state.fortTerritoryId.guest).success).toBe(false);
    expect(state.territories[state.fortTerritoryId.guest]).toBe("guest");
  });

  it("keeps fort health at three when claiming ordinary territory", async () => {
    const state = getConquestState(gameId)!;
    await processDraftRound(io, gameId);
    const target = state.draftPhase!.availableTerritories.find(id => state.territories[id] === null)!;
    expect(selectDraftTerritory(io, gameId, "host", target).success).toBe(true);
    expect(state.fortHealth.host).toBe(3);
  });

  it("preserves ownership and starts Invasion when the final territory is claimed, without a client request", async () => {
    const state = getConquestState(gameId)!;
    await processDraftRound(io, gameId);
    const target = state.draftPhase!.availableTerritories.find(id => state.territories[id] === null)!;
    for (const id of state.activeTerritoryIds) if (id !== target && state.territories[id] === null) state.territories[id] = "guest";
    state.draftPhase!.availableTerritories = [target];
    expect(selectDraftTerritory(io, gameId, "host", target).success).toBe(true);
    expect(state.draftPhase).toBeNull();
    const invasion = INVASION_GAMES.get(gameId)!;
    expect(invasion).toBeDefined();
    expect(invasion.totalRounds).toBe(12);
    for (const territory of invasion.territories) expect(territory.ownerId).toBe(state.territories[String(territory.id)]);
    await jest.advanceTimersByTimeAsync(0);
    const events = broadcast.mock.calls.map(([event]) => event);
    expect(events.indexOf("invasion:init")).toBeGreaterThan(-1);
    expect(events.indexOf("invasion:state")).toBeGreaterThan(events.indexOf("invasion:init"));
    expect(events.indexOf("invasion:roundStart")).toBeGreaterThan(events.indexOf("invasion:state"));
    expect(events.filter(event => event === "invasion:roundStart")).toHaveLength(1);
  });

  it("rejects nonparticipants, invalid choices and repeated answers", () => {
    expect(recordDraftAnswer(gameId, "outsider", 0, 1).success).toBe(false);
    expect(recordDraftAnswer(gameId, "host", 99, 1).success).toBe(false);
    expect(recordDraftAnswer(gameId, "host", 0, 100).success).toBe(true);
    expect(recordDraftAnswer(gameId, "host", 1, 1).success).toBe(false);
  });

  it("ranks answers by server elapsed time rather than client-supplied speed", () => {
    jest.advanceTimersByTime(500);
    recordDraftAnswer(gameId, "host", 0, -10000);
    expect(getConquestState(gameId)!.draftPhase!.answers.get("host")!.responseTimeMs).toBe(500);
  });

  it("restores the actual draft deadline and only the viewer's accepted answer", () => {
    jest.advanceTimersByTime(4000);
    recordDraftAnswer(gameId, "host", 0, 1);
    const state = getConquestState(gameId)!;
    const snapshot = (safeConquestState as any)(state, "host");
    expect(snapshot.draftPhase).toMatchObject({ questionStartedAt: 100000, questionEndsAt: 115000, selectedAnswer: 0, answeredAt: 104000, answered: 1 });
    expect(snapshot.draftPhase.question).not.toHaveProperty("correctIndex");
    expect((safeConquestState as any)(state, "guest").draftPhase.selectedAnswer).toBeNull();
    expect(safeConquestState(state).draftPhase).not.toHaveProperty("selectedAnswer");
  });

  it("acknowledges the same answer retry without changing its original response time", () => {
    jest.advanceTimersByTime(400);
    expect(recordDraftAnswer(gameId, "host", 0, 1).success).toBe(true);
    jest.advanceTimersByTime(400);
    expect(recordDraftAnswer(gameId, "host", 0, 1).success).toBe(true);
    expect(getConquestState(gameId)!.draftPhase!.answers.get("host")!.responseTimeMs).toBe(400);
    expect(recordDraftAnswer(gameId, "host", 1, 1).success).toBe(false);
  });

  it("rejects stale draft identities and answers exactly at the deadline", () => {
    expect((recordDraftAnswer as any)(gameId, "host", 0, 1, { questionId: "old-question", round: 0 }).success).toBe(false);
    expect(getConquestState(gameId)!.draftPhase!.answers.size).toBe(0);
    jest.advanceTimersByTime(15000);
    expect(recordDraftAnswer(gameId, "host", 0, 1).success).toBe(false);
  });

  it("issues a new pick identity after every claim and rejects a delayed previous click", async () => {
    await processDraftRound(io, gameId);
    const state = getConquestState(gameId)!;
    const firstTurn = (safeConquestState(state).draftPhase as any).pickTurnId;
    expect(firstTurn).toEqual(expect.any(String));
    const [first, second] = state.draftPhase!.availableTerritories;
    expect((selectDraftTerritory as any)(io, gameId, "host", first, firstTurn).success).toBe(true);
    expect((selectDraftTerritory as any)(io, gameId, "host", second, firstTurn).success).toBe(false);
    expect(state.territories[second]).toBeNull();
  });

  it("broadcasts the accepted count and starts picks when every player has answered", () => {
    const expected = { questionId: "draft-q", round: 1 };
    recordDraftAnswer(gameId, "host", 0, 1, expected, io);
    expect(broadcast.mock.calls.filter(([event]) => event === "conquest:state").slice(-1)[0][1].draftPhase.answered).toBe(1);
    expect(getConquestState(gameId)!.phase).toBe("draft");
    recordDraftAnswer(gameId, "guest", 1, 1, expected, io);
    expect(getConquestState(gameId)!.phase).toBe("draft_selection");
    expect(recordDraftAnswer(gameId, "host", 0, 1, expected, io).success).toBe(true);
    const snapshot = safeConquestState(getConquestState(gameId)!);
    expect(snapshot.draftPhase).toMatchObject({ pickEndsAt: 110000 });
    jest.advanceTimersByTime(4000);
    expect(safeConquestState(getConquestState(gameId)!).draftPhase!.pickEndsAt).toBe(110000);
  });

  it("starts at most one new draft question when fetches overlap", async () => {
    const count = jest.mocked(fetchQuestions).mock.calls.length;
    await Promise.all([startDraftRound(io, gameId), startDraftRound(io, gameId)]);
    expect(jest.mocked(fetchQuestions).mock.calls.length - count).toBe(1);
  });

  it("lets the actual solo-fill bot answer and claim its allotted territories", async () => {
    removeConquestGame(gameId);
    jest.spyOn(Math, "random").mockReturnValue(0.1);
    try {
      const [botId] = await fillWithBots(io, gameId, 1, 2);
      await initConquestGame(io, gameId, ["host", botId], { host: "Host", [botId]: "Bot" }, Difficulty.Sage, "ar");
      await jest.advanceTimersByTimeAsync(8000);
      const state = getConquestState(gameId)!;
      expect(state.draftPhase!.answers.has(botId)).toBe(true);
      await processDraftRound(io, gameId);
      const before = Object.values(state.territories).filter(owner => owner === botId).length;
      await jest.advanceTimersByTimeAsync(8000);
      expect(Object.values(state.territories).filter(owner => owner === botId).length).toBeGreaterThan(before);
    } finally {
      jest.restoreAllMocks();
    }
  });

  it("does not process the same draft question twice", async () => {
    await processDraftRound(io, gameId);
    const count = broadcast.mock.calls.filter(([event]) => event === "conquest:draftRanking").length;
    await processDraftRound(io, gameId);
    expect(broadcast.mock.calls.filter(([event]) => event === "conquest:draftRanking")).toHaveLength(count);
  });

  it("clears draft timers when the room is removed", () => {
    removeConquestGame(gameId);
    expect(jest.getTimerCount()).toBe(0);
  });
});

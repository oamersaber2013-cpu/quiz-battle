jest.mock("../lib/questions", () => ({
  fetchQuestions: jest.fn(async () => [{ id: "draft-q", text: "Question", options: ["A", "B"], correctIndex: 0, timeLimit: 15 }]),
}));

import { Difficulty } from "@quiz-battle/shared";
import { getConquestState, initConquestGame, processDraftRound, recordDraftAnswer, removeConquestGame, selectDraftTerritory } from "../lib/conquestOrchestrator";
import { INVASION_GAMES } from "../lib/invasionOrchestrator";

describe("Conquest territory draft", () => {
  const gameId = "conquest-regression";
  const broadcast = jest.fn();
  const io = { to: jest.fn(() => ({ emit: broadcast })) } as any;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(100000);
    await initConquestGame(io, gameId, ["host", "guest"], { host: "Host", guest: "Guest" }, Difficulty.Sage, "ar");
  });
  afterEach(() => {
    removeConquestGame(gameId);
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

  it("completes immediately after the last unclaimed territory and preserves owners", async () => {
    const state = getConquestState(gameId)!;
    await processDraftRound(io, gameId);
    const target = state.draftPhase!.availableTerritories.find(id => state.territories[id] === null)!;
    for (const id of state.activeTerritoryIds) if (id !== target && state.territories[id] === null) state.territories[id] = "guest";
    state.draftPhase!.availableTerritories = [target];
    expect(selectDraftTerritory(io, gameId, "host", target).success).toBe(true);
    expect(state.draftPhase).toBeNull();
    const invasion = INVASION_GAMES.get(gameId)!;
    expect(invasion).toBeDefined();
    for (const territory of invasion.territories) expect(territory.ownerId).toBe(state.territories[String(territory.id)]);
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

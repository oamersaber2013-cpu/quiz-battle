import { createElement } from "react";
import { ConquestClientState } from "@quiz-battle/shared";
import { ConquestGame } from "@/components/ConquestGame";
import { useGameStore } from "@/store/gameStore";

const { act, create } = require("react-test-renderer") as {
  act: (callback: () => void) => void;
  create: (element: ReturnType<typeof createElement>) => {
    root: { findByProps: (props: Record<string, unknown>) => unknown };
    unmount: () => void;
  };
};

const mockSocket = { on: jest.fn(), off: jest.fn(), emit: jest.fn() };
jest.mock("@/lib/socket", () => ({ getSocket: () => mockSocket, emitConquestAttack: jest.fn() }));
jest.mock("@/lib/sounds", () => ({ soundManager: { play: jest.fn() } }));
jest.mock("@/components/ConquestGame.module.css", () => new Proxy({}, { get: (_target, name) => String(name) }));
jest.mock("framer-motion", () => ({ motion: { div: "div" }, AnimatePresence: "div" }));
jest.mock("@/components/WorldMap", () => ({
  WorldMap: () => require("react").createElement("div", { "data-testid": "conquest-map" }),
  SoundEffects: jest.fn().mockImplementation(() => ({ playVictory: jest.fn(), playDefeat: jest.fn() })),
  VICTORY_STATEMENTS: [],
  DEFEAT_STATEMENTS: [],
  TERRITORIES: [],
}));

function draftState(overrides: Partial<NonNullable<ConquestClientState["draftPhase"]>> = {}): ConquestClientState {
  return {
    territories: { "0": null, "1": null }, fortHealth: {}, fortTerritoryId: {},
    turnOrder: ["player-1", "player-2"], currentTurnIndex: 0, phase: "draft",
    eliminatedPlayers: [], currentBattle: null, rebuildSession: null,
    draftPhase: {
      currentRound: 1, question: { id: "draft-1", text: "عاصمة قطر؟", options: ["الدوحة", "مسقط"], timeLimit: 30 },
      questionStartedAt: Date.now() - 10000, questionEndsAt: Date.now() + 20000,
      selectedAnswer: null, answeredAt: null, answered: 0, totalPlayers: 2,
      pickOrder: [], currentPickerIndex: 0, availableTerritories: ["0", "1"], picksRemaining: {},
      ...overrides,
    },
  };
}

describe("Conquest draft controls", () => {
  let rendered: any;
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-11-18T08:00:00Z"));
    mockSocket.emit.mockClear();
    useGameStore.getState().resetGame();
    useGameStore.setState({
      userId: "player-1", gameId: "battle-1", language: "ar",
      players: [{ userId: "player-1", username: "محارب", score: 0, rank: 1, streak: 0, isEliminated: false, isConnected: true, powerUpInventory: [] }],
      conquestState: draftState(),
    });
  });
  afterEach(() => {
    act(() => rendered?.unmount());
    rendered = undefined;
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("allows my answer after another player answers and locks every option during submission", () => {
    useGameStore.getState().setConquestState(draftState({ answered: 1 }));
    act(() => { rendered = create(createElement(ConquestGame)); });
    const choices = () => rendered.root.findAllByType("button").filter((node: any) => node.props["data-answer-index"] !== undefined);
    expect(choices()).toHaveLength(2);
    expect(choices()[0].props.disabled).toBe(false);
    act(() => {
      choices()[0].props.onClick();
      choices()[1].props.onClick();
    });
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit).toHaveBeenCalledWith("conquest:draftAnswer", expect.objectContaining({ questionId: "draft-1", round: 1, answerIndex: 0 }), expect.any(Function));
    expect(choices().every((node: any) => node.props.disabled)).toBe(true);
    act(() => mockSocket.emit.mock.calls[0][2]({ success: true }));
    expect(useGameStore.getState().conquestState?.draftPhase?.selectedAnswer).toBe(0);
  });

  it("restores my selected answer and counts down from the original server deadline", () => {
    useGameStore.getState().setConquestState(draftState({ selectedAnswer: 1, answeredAt: Date.now() - 5000, answered: 1 }));
    act(() => { rendered = create(createElement(ConquestGame)); });
    expect(rendered.root.findByProps({ "data-testid": "conquest-countdown" }).children.join("")).toContain("20");
    const selected = rendered.root.findByProps({ "data-answer-index": 1 });
    expect(selected.props["aria-pressed"]).toBe(true);
    expect(selected.props.disabled).toBe(true);
    act(() => jest.advanceTimersByTime(3000));
    expect(rendered.root.findByProps({ "data-testid": "conquest-countdown" }).children.join("")).toContain("17");
  });

  it("preserves my answer on broad snapshots and clears it for the next draft round", () => {
    useGameStore.getState().setConquestState(draftState({ selectedAnswer: 1, answeredAt: Date.now() }));
    const broad = draftState({ answered: 2 });
    delete broad.draftPhase!.selectedAnswer;
    delete broad.draftPhase!.answeredAt;
    useGameStore.getState().setConquestState(broad);
    expect(useGameStore.getState().conquestState?.draftPhase?.selectedAnswer).toBe(1);
    broad.draftPhase!.currentRound = 2;
    useGameStore.getState().setConquestState({ ...broad, draftPhase: { ...broad.draftPhase! } });
    expect(useGameStore.getState().conquestState?.draftPhase?.selectedAnswer).toBeUndefined();
  });

  it("lets an unaccepted submission retry after a failed acknowledgment", () => {
    act(() => { rendered = create(createElement(ConquestGame)); });
    const choice = () => rendered.root.findByProps({ "data-answer-index": 0 });
    act(() => choice().props.onClick());
    act(() => mockSocket.emit.mock.calls[0][2]({ success: false, error: "Try again" }));
    expect(choice().props.disabled).toBe(false);
    expect(useGameStore.getState().conquestState?.draftPhase?.selectedAnswer).toBeNull();
  });

  it("ignores an old timeout acknowledgment after a retry", () => {
    act(() => { rendered = create(createElement(ConquestGame)); });
    const choice = (index: number) => rendered.root.findByProps({ "data-answer-index": index });
    act(() => choice(0).props.onClick());
    const oldAcknowledgment = mockSocket.emit.mock.calls[0][2];
    act(() => jest.advanceTimersByTime(5000));
    act(() => choice(1).props.onClick());
    act(() => oldAcknowledgment({ success: true }));
    expect(useGameStore.getState().conquestState?.draftPhase?.selectedAnswer).toBeNull();
    act(() => mockSocket.emit.mock.calls[1][2]({ success: true }));
    expect(useGameStore.getState().conquestState?.draftPhase?.selectedAnswer).toBe(1);
  });

  it("uses the current draft picker and turn id for accessible territory choices", () => {
    const selection = draftState({
      pickOrder: ["player-1", "player-2"], currentPickerIndex: 0,
      pickTurnId: "pick-current", pickEndsAt: Date.now() + 15000,
      picksRemaining: { "player-1": 1 }, availableTerritories: ["0"],
    });
    selection.phase = "draft_selection";
    selection.currentTurnIndex = 1;
    useGameStore.getState().setConquestState(selection);
    act(() => { rendered = create(createElement(ConquestGame)); });
    const choice = rendered.root.findAllByType("button")[0];
    expect(choice.props.disabled).toBe(false);
    act(() => {
      choice.props.onClick();
      choice.props.onClick();
    });
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit).toHaveBeenCalledWith("conquest:selectDraftTerritory", { gameId: "battle-1", territoryId: "0", turnId: "pick-current" }, expect.any(Function));
  });
});

it("keeps the React hook order stable as Conquest state loads, clears and reloads", () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  useGameStore.getState().resetGame();
  useGameStore.setState({ userId: "player-1", language: "ar", conquestState: null });
  let rendered: ReturnType<typeof create> | undefined;
  const loaded: ConquestClientState = {
    territories: {},
    fortHealth: { "player-1": 3 },
    fortTerritoryId: {},
    turnOrder: ["player-1"],
    currentTurnIndex: 0,
    phase: "select_target",
    eliminatedPlayers: [],
    currentBattle: null,
    rebuildSession: null,
    draftPhase: null,
  };
  try {
    act(() => { rendered = create(createElement(ConquestGame)); });
    act(() => { useGameStore.getState().setConquestState(loaded); });
    expect(rendered!.root.findByProps({ "data-testid": "conquest-map" })).toBeTruthy();
    act(() => { useGameStore.getState().setConquestState(null); });
    act(() => { useGameStore.getState().setConquestState(loaded); });
    expect(rendered!.root.findByProps({ "data-testid": "conquest-map" })).toBeTruthy();
    expect(error).not.toHaveBeenCalled();
  } finally {
    act(() => rendered?.unmount());
    warn.mockRestore();
    error.mockRestore();
  }
});

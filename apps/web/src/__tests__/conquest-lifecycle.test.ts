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
jest.mock("framer-motion", () => ({ motion: { div: "div" }, AnimatePresence: "div" }));
jest.mock("@/components/WorldMap", () => ({
  WorldMap: () => require("react").createElement("div", { "data-testid": "conquest-map" }),
  SoundEffects: jest.fn().mockImplementation(() => ({ playVictory: jest.fn(), playDefeat: jest.fn() })),
  VICTORY_STATEMENTS: [],
  DEFEAT_STATEMENTS: [],
  TERRITORIES: [],
}));

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

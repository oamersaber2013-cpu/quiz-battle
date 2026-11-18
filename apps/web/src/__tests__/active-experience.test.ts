import { createElement } from "react";
import { PowerUpType } from "@quiz-battle/shared";
import { PowerUpSelection } from "@/components/PowerUpSelection";
import { ChatWindow } from "@/components/ChatWindow";
import { useGameStore } from "@/store/gameStore";
const { act, create } = require("react-test-renderer");
const mockSocket = { emit: jest.fn(), on: jest.fn(), off: jest.fn() };
jest.mock("@/lib/socket", () => ({ getSocket: () => mockSocket }));
let view: any;
const text = (value: any): string => typeof value === "string" ? value : Array.isArray(value) ? value.map(text).join("") : value?.props ? text(value.props.children) : "";
const button = (label: string) => view.root.findAllByType("button").find((item: any) => text(item.props.children).includes(label));
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  useGameStore.getState().resetGame();
  useGameStore.setState({ gameId: "ui-room", userId: "host", language: "en", powerUpSelection: {
    isSelecting: true, availablePowerUps: [PowerUpType.Shield, PowerUpType.FiftyFifty, PowerUpType.Freeze, PowerUpType.DoublePick],
    selectedPowerUps: [], maxSelections: 2, timeLeft: 30, allSelections: {},
  } });
});
afterEach(() => {
  act(() => view?.unmount()); view = undefined;
  jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); jest.clearAllMocks();
});
it("keeps selection limits and confirmation events while presenting an explicit waiting phase", () => {
  act(() => { view = create(createElement(PowerUpSelection)); });
  expect(button("Double pick").props.disabled).toBe(true);
  act(() => button("Shield").props.onClick());
  act(() => button("50/50").props.onClick());
  expect(button("Freeze").props.disabled).toBe(true);
  expect(useGameStore.getState().powerUpSelection.selectedPowerUps).toEqual([PowerUpType.Shield, PowerUpType.FiftyFifty]);
  act(() => button("Confirm selection").props.onClick());
  expect(JSON.stringify(view.toJSON())).toContain("Waiting for other players");
  act(() => jest.advanceTimersByTime(10000));
  expect(mockSocket.emit.mock.calls.filter(([event]) => event === "game:confirmPowerUpSelection")).toEqual([["game:confirmPowerUpSelection", { gameId: "ui-room" }]]);
});
it("restores the confirmed Arabic waiting view without re-confirming on its local clock", () => {
  useGameStore.setState({ language: "ar", powerUpSelection: { ...useGameStore.getState().powerUpSelection, isSelecting: false, selectedPowerUps: [PowerUpType.Shield] } });
  act(() => { view = create(createElement(PowerUpSelection)); });
  expect(JSON.stringify(view.toJSON())).toContain("في انتظار بقية اللاعبين");
  act(() => jest.advanceTimersByTime(35000));
  expect(mockSocket.emit).not.toHaveBeenCalled();
});
it("shows a read-only preparation state to a spectator", () => {
  act(() => { view = create(createElement(PowerUpSelection, { isSpectating: true })); });
  expect(JSON.stringify(view.toJSON())).toContain("Players are choosing their powers");
  expect(view.root.findAllByType("button")).toHaveLength(0);
  act(() => jest.advanceTimersByTime(35000));
  expect(mockSocket.emit).not.toHaveBeenCalled();
});
it("sends chat from a labelled Arabic form and clears the field without submitting blanks", () => {
  useGameStore.setState({ language: "ar" });
  act(() => { view = create(createElement(ChatWindow, { gameId: "ui-room" })); });
  const form = () => view.root.findByType("form");
  act(() => form().props.onSubmit({ preventDefault: jest.fn() }));
  expect(mockSocket.emit).not.toHaveBeenCalled();
  const input = view.root.findByProps({ "aria-label": "رسالة للغرفة" });
  act(() => input.props.onChange({ target: { value: "مرحباً بالفريق" } }));
  act(() => form().props.onSubmit({ preventDefault: jest.fn() }));
  expect(mockSocket.emit).toHaveBeenCalledWith("game:message", { gameId: "ui-room", message: "مرحباً بالفريق" });
  expect(view.root.findByType("input").props.value).toBe("");
});

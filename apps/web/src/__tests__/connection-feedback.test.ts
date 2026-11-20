import { createElement } from "react";
import { io } from "socket.io-client";
import { Difficulty, GameMode, GameStatus, QuestionType } from "@quiz-battle/shared";
import GamePage from "@/app/game/[gameId]/page";
import LobbyPage from "@/app/lobby/[gameId]/page";
import { disconnectSocket } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";

const { act, create } = require("react-test-renderer");
const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockSpectating = false;
jest.mock("socket.io-client", () => ({ io: jest.fn() }));
jest.mock("next/navigation", () => ({
  useParams: () => ({ gameId: "recovery-room" }), useRouter: () => mockRouter,
  useSearchParams: () => ({ get: () => mockSpectating ? "true" : null }),
}));
jest.mock("next/link", () => ({ __esModule: true, default: (props: any) => require("react").createElement("a", props, props.children) }));
jest.mock("@/lib/sounds", () => ({ soundManager: { play: jest.fn(), playModeSound: jest.fn() } }));
jest.mock("framer-motion", () => ({ motion: { div: "div", button: "button", span: "span" }, AnimatePresence: "div", Reorder: { Group: "reorder-group", Item: "reorder-item" } }));
jest.mock("@/components/ConquestGame", () => ({ ConquestGame: () => null }));
jest.mock("@/components/InvasionGame", () => ({ InvasionGame: () => null }));
jest.mock("@/components/ChaosGame", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/PowerUpEffects", () => ({ PowerUpEffects: () => null }));

class RecoverySocket {
  connected = true;
  auth = {};
  handlers = new Map<string, Set<(...args: any[]) => void>>();
  emit = jest.fn(); connect = jest.fn(() => this);
  disconnect = jest.fn(() => { this.connected = false; this.dispatch("disconnect"); });
  removeAllListeners = jest.fn(() => this.handlers.clear());
  on(event: string, handler: (...args: any[]) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler); return this;
  }
  off(event: string, handler: (...args: any[]) => void) { this.handlers.get(event)?.delete(handler); return this; }
  dispatch(event: string, ...args: any[]) { this.handlers.get(event)?.forEach(handler => handler(...args)); }
}
let socket: RecoverySocket;
let view: any;
const text = (node: any): string => typeof node === "string" ? node : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";
const latestJoin = () => socket.emit.mock.calls.filter(([event]) => event === "game:join").at(-1)!;
const join = () => act(() => latestJoin()[2]({ success: true }));
const initialQuestion = { id: "same-question", text: "The capital is [BLANK]", options: [], type: QuestionType.FillBlank, category: "general", difficulty: Difficulty.Novice, timeLimit: 60 };
beforeEach(() => {
  jest.useFakeTimers(); jest.spyOn(console, "warn").mockImplementation(() => {});
  mockSpectating = false;
  socket = new RecoverySocket(); (io as jest.Mock).mockImplementation((_url, options) => { socket.auth = options.auth; return socket; });
  useGameStore.getState().resetGame();
  useGameStore.setState({ userId: "player-1", username: "Warrior", token: "fixture", isGuest: true, language: "en", soundEnabled: false, isConnected: true });
  useGameStore.getState().setGame({ gameId: "recovery-room", joinCode: "ABC123", hostId: "player-1", mode: GameMode.Classic, difficulty: Difficulty.Novice });
  useGameStore.getState().setQuestion(initialQuestion, 1, 5);
});
afterEach(() => {
  act(() => view?.unmount()); view = undefined; disconnectSocket();
  jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); jest.clearAllMocks();
});

it("keeps the live question and typed draft visible through an outage and same-question rejoin", () => {
  act(() => { view = create(createElement(GamePage)); }); join();
  act(() => view.root.findByProps({ "aria-label": "Your answer" }).props.onChange({ target: { value: "Do" } }));
  act(() => { socket.connected = false; socket.dispatch("disconnect", "transport close"); });
  expect(view.root.findByProps({ value: "Do" })).toBeDefined();
  expect(JSON.stringify(view.toJSON())).toContain("Reconnecting");
  expect(view.root.findByType("fieldset").props.disabled).toBe(true);
  act(() => jest.advanceTimersByTime(11000));
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(view.root.findAllByType("button").some((node: any) => text(node.props.children).includes("Retry connection"))).toBe(true);
  act(() => { socket.connected = true; socket.dispatch("connect"); });
  expect(latestJoin()[1]).toEqual({ gameId: "recovery-room" });
  join();
  expect(view.root.findByProps({ value: "Do" })).toBeDefined();
  expect(view.root.findByType("fieldset").props.disabled).toBe(false);
});

it("retains a lobby chat draft and pauses start while the room reconnects", () => {
  useGameStore.setState({ status: GameStatus.Lobby });
  act(() => { view = create(createElement(LobbyPage)); }); join();
  act(() => view.root.findByProps({ "aria-label": "Message the room" }).props.onChange({ target: { value: "Ready soon" } }));
  act(() => { socket.connected = false; socket.dispatch("disconnect"); });
  expect(view.root.findByProps({ value: "Ready soon" })).toBeDefined();
  expect(view.root.findByType("fieldset").props.disabled).toBe(true);
  act(() => { socket.connected = true; socket.dispatch("connect"); }); join();
  expect(view.root.findByProps({ value: "Ready soon" })).toBeDefined();
  expect(view.root.findByType("fieldset").props.disabled).toBe(false);
});

it("offers an initial connection retry without discarding a direct room URL", () => {
  socket.connected = false;
  act(() => { view = create(createElement(GamePage)); });
  act(() => jest.advanceTimersByTime(10000));
  expect(mockRouter.replace).not.toHaveBeenCalled();
  const retry = view.root.findAllByType("button").find((node: any) => text(node.props.children).includes("Retry connection"));
  expect(retry).toBeDefined();
  act(() => retry.props.onClick());
  expect(socket.connect).toHaveBeenCalled();
});

it("keeps a private-room password challenge interactive while membership is pending", () => {
  act(() => { view = create(createElement(LobbyPage)); });
  act(() => latestJoin()[2]({ success: false, code: "PASSWORD_REQUIRED", error: "Password required" }));
  expect(view.root.findByProps({ type: "password" })).toBeDefined();
  expect(view.root.findByType("fieldset").props.disabled).toBe(false);
});

it.each(["en", "ar"] as const)("localizes an expired direct room in %s", language => {
  useGameStore.setState({ language });
  act(() => { view = create(createElement(GamePage)); });
  act(() => latestJoin()[2]({ success: false, error: "Game not found" }));
  const message = useGameStore.getState().toasts.at(-1)?.message;
  expect(message).toBe(language === "ar" ? "انتهت صلاحية الغرفة أو لم تعد موجودة." : "This room has expired or no longer exists.");
  expect(mockRouter.replace).toHaveBeenCalledWith("/");
});

it.each([false, true])("preserves a fresh visitor's Arabic room and spectator intent (spectating=%s)", spectating => {
  mockSpectating = spectating;
  useGameStore.setState({ userId: null, token: null, language: "ar" });
  act(() => { view = create(createElement(LobbyPage)); });
  expect(mockRouter.replace).toHaveBeenCalledWith(`/?room=recovery-room&lang=ar${spectating ? "&spectate=true" : ""}`);
  expect(io).not.toHaveBeenCalled();
});

it("restores the server's accepted answer before enabling the rejoined room", () => {
  act(() => { view = create(createElement(GamePage)); }); join();
  const questionStartedAt = useGameStore.getState().questionStartedAt;
  act(() => { socket.connected = false; socket.dispatch("disconnect"); });
  act(() => {
    socket.connected = true; socket.dispatch("connect");
    socket.dispatch("game:stateSync", { room: {
      gameId: "recovery-room", joinCode: "ABC123", hostId: "player-1", mode: GameMode.Classic,
      difficulty: Difficulty.Novice, language: "en", status: GameStatus.Question, currentRound: 1, totalRounds: 5, maxPlayers: 8,
      currentQuestion: initialQuestion, questionStartedAt, selectedAnswer: "Doha", answeredAt: Date.now(), players: [],
    } });
  });
  expect(view.root.findByType("fieldset").props.disabled).toBe(true);
  expect(useGameStore.getState().selectedAnswer).toBe("Doha");
  join();
  expect(view.root.findByProps({ "aria-label": "Your answer" }).props.value).toBe("Doha");
  expect(view.root.findByProps({ "aria-label": "Your answer" }).props.disabled).toBe(true);
  expect(useGameStore.getState().questionStartedAt).toBe(questionStartedAt);
});

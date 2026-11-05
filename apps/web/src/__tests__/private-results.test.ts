import { createElement } from "react";
import { Difficulty, GameMode } from "@quiz-battle/shared";
import ResultsPage from "@/app/results/[gameId]/page";
import LobbyPage from "@/app/lobby/[gameId]/page";
import HomePage from "@/app/page";
import GamePage from "@/app/game/[gameId]/page";
import { useGameStore } from "@/store/gameStore";
import { subscribeGameRoom } from "@/lib/socket";

const { act, create } = require("react-test-renderer");
const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockRoomCallbacks: any;
let mockSpectating = false;
const mockFetch = jest.fn();
jest.mock("next/navigation", () => ({
  useParams: () => ({ gameId: "saved-battle" }),
  useRouter: () => mockRouter,
  useSearchParams: () => ({ get: () => mockSpectating ? "true" : null }),
}));
jest.mock("next/link", () => ({ __esModule: true, default: (props: any) => require("react").createElement("a", props, props.children) }));
jest.mock("@/lib/socket", () => ({
  connectSocket: jest.fn(() => ({ connected: true })),
  subscribeGameRoom: jest.fn((_socket, _id, _spectating, callbacks) => {
    mockRoomCallbacks = callbacks;
    return jest.fn();
  }),
}));
jest.mock("@/lib/sounds", () => ({ soundManager: { play: jest.fn() } }));
jest.mock("framer-motion", () => ({ motion: { div: "div", button: "button", span: "span" }, AnimatePresence: "div" }));
jest.mock("@/components/ChatWindow", () => ({ ChatWindow: () => null }));
jest.mock("@/components/CustomModeBuilder", () => ({ CustomModeBuilder: () => null }));
jest.mock("@/components/ModeVisualSelector", () => ({ ModeVisualSelector: () => null }));
jest.mock("@/components/ConquestGame", () => ({ ConquestGame: () => null }));
jest.mock("@/components/InvasionGame", () => ({ InvasionGame: () => null }));
jest.mock("@/components/ChaosGame", () => ({ __esModule: true, default: () => null }));

let view: any;
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);
  mockSpectating = false;
  useGameStore.getState().resetGame();
  useGameStore.getState().setAuth({ userId: "player-1", username: "Warrior", token: "saved-token", isGuest: true });
  useGameStore.setState({ language: "en" });
});
afterEach(() => {
  act(() => view?.unmount());
  view = undefined;
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
  mockFetch.mockReset();
});

const savedResults = {
  gameId: "saved-battle", mode: GameMode.Classic, difficulty: Difficulty.Novice,
  language: "ar", totalRounds: 8, endedAt: "2026-11-05T10:00:00Z",
  results: [{ userId: "player-1", username: "محارب محفوظ", score: 1500, rank: 1, correctAnswers: 6, totalAnswers: 8, avgAnswerTime: 900, xpEarned: 20 }],
};
function text(node: any): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  return node?.props ? text(node.props.children) : "";
}
function click(label: string) {
  const button = view.root.findAllByType("button").find((item: any) => text(item.props.children).includes(label));
  expect(button).toBeDefined();
  act(() => { button.props.onClick(); });
}

it("reloads participant results with the saved auth token and server room language", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => savedResults });
  await act(async () => { view = create(createElement(ResultsPage)); });
  expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/results/saved-battle"), expect.objectContaining({ headers: { Authorization: "Bearer saved-token" } }));
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(JSON.stringify(view.toJSON())).toContain("محارب محفوظ");
  expect(view.root.findByType("main").props.dir).toBe("rtl");
});

it("does not show another room's cached standings when the server rejects access", async () => {
  useGameStore.setState({ gameId: "another-battle", finalResults: [{ ...savedResults.results[0], username: "PRIVATE CACHED NAME" }] });
  mockFetch.mockResolvedValue({ ok: false, status: 403 });
  await act(async () => { view = create(createElement(ResultsPage)); });
  const content = JSON.stringify(view.toJSON());
  expect(content).not.toContain("PRIVATE CACHED NAME");
  expect(content).toContain("participants");
});

it("labels Conquest scores as territories without displaying invented quiz statistics", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ...savedResults, mode: GameMode.Conquest, language: "en", results: [{ ...savedResults.results[0], correctAnswers: 0, totalAnswers: 0, avgAnswerTime: 0 }] }) });
  await act(async () => { view = create(createElement(ResultsPage)); });
  const content = JSON.stringify(view.toJSON());
  expect(content).toContain("Territories");
  expect(content).not.toContain("Accuracy");
  expect(content).not.toContain("Avg Speed");
});

it.each([false, true])("prompts and retries a password challenge without storing the secret (spectating=%s)", (spectating) => {
  mockSpectating = spectating;
  act(() => { view = create(createElement(LobbyPage)); });
  act(() => mockRoomCallbacks.onError("Room password required", "PASSWORD_REQUIRED"));
  const password = view.root.findByProps({ type: "password" });
  act(() => password.props.onChange({ target: { value: "  secret spaces  " } }));
  act(() => view.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() }));
  expect(subscribeGameRoom).toHaveBeenLastCalledWith(expect.anything(), "saved-battle", spectating, expect.anything(), { password: "  secret spaces  " });
  expect(JSON.stringify(useGameStore.getState())).not.toContain("secret spaces");
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

it("prompts on a direct game URL before rendering cached room content", () => {
  act(() => { view = create(createElement(GamePage)); });
  act(() => mockRoomCallbacks.onError("Room password required", "PASSWORD_REQUIRED"));
  expect(view.root.findByProps({ type: "password" })).toBeDefined();
  expect(JSON.stringify(view.toJSON())).toContain("Private room");
});

it("offers private-room creation with an exact ephemeral password", async () => {
  mockFetch.mockImplementation(async (url: string) => url.includes("/purchase/status")
    ? { ok: true, json: async () => ({ hasPurchased: true, shortGames: 3, longGames: 2, price: 35 }) }
    : { ok: true, json: async () => ({ gameId: "new-private", joinCode: "ABC123" }) });
  await act(async () => { view = create(createElement(HomePage)); });
  click("Create Battle Room");
  click("Next →");
  click("Next →");
  const privacy = view.root.findByProps({ type: "checkbox", name: "privateRoom" });
  act(() => privacy.props.onChange({ target: { checked: true } }));
  const password = view.root.findByProps({ type: "password" });
  act(() => password.props.onChange({ target: { value: "  private key  " } }));
  await act(async () => { click("Create Battle Room"); });
  const request = mockFetch.mock.calls.find((call: any[]) => call[0].endsWith("/api/games"));
  expect(JSON.parse(request[1].body)).toMatchObject({ isPrivate: true, password: "  private key  " });
  expect(JSON.stringify(useGameStore.getState())).not.toContain("private key");
});

it("shows a retry state while saved results are temporarily unavailable", async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValueOnce({ ok: true, json: async () => savedResults });
  await act(async () => { view = create(createElement(ResultsPage)); });
  expect(JSON.stringify(view.toJSON())).toContain("retry shortly");
  await act(async () => { click("Retry"); });
  expect(JSON.stringify(view.toJSON())).toContain("محارب محفوظ");
  expect(mockFetch).toHaveBeenCalledTimes(2);
});

it("does not request private results without authenticated browser credentials", async () => {
  useGameStore.setState({ userId: null, token: null });
  await act(async () => { view = create(createElement(ResultsPage)); });
  expect(mockFetch).not.toHaveBeenCalled();
  expect(JSON.stringify(view.toJSON())).toContain("Sign in with the account");
});

it("ignores an old result response after the authenticated browser user changes", async () => {
  let resolveOldRequest!: (response: unknown) => void;
  mockFetch.mockImplementationOnce(() => new Promise((resolve) => { resolveOldRequest = resolve; }))
    .mockResolvedValueOnce({ ok: false, status: 403 });
  await act(async () => { view = create(createElement(ResultsPage)); });
  await act(async () => useGameStore.getState().setAuth({ userId: "outsider", username: "Outsider", token: "other-token" }));
  await act(async () => resolveOldRequest({ ok: true, json: async () => savedResults }));
  expect(JSON.stringify(view.toJSON())).not.toContain("محارب محفوظ");
  expect(JSON.stringify(view.toJSON())).toContain("participants");
});

it("keeps an incorrect or rate-limited password challenge on the Arabic entry screen", () => {
  useGameStore.setState({ language: "ar" });
  act(() => { view = create(createElement(LobbyPage)); });
  act(() => mockRoomCallbacks.onError("incorrect", "INVALID_PASSWORD"));
  expect(view.root.findByType("main").props.dir).toBe("rtl");
  expect(JSON.stringify(view.toJSON())).toContain("غير صحيحة");
  act(() => mockRoomCallbacks.onError("limited", "RATE_LIMITED"));
  expect(JSON.stringify(view.toJSON())).toContain("انتظر دقيقة");
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

it("enforces the UTF-8 password limit while allowing exact whitespace", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ hasPurchased: true }) });
  await act(async () => { view = create(createElement(HomePage)); });
  click("Create Battle Room"); click("Next →"); click("Next →");
  act(() => view.root.findByProps({ type: "checkbox", name: "privateRoom" }).props.onChange({ target: { checked: true } }));
  const createButton = () => view.root.findAllByType("button").find((button: any) => text(button.props.children).includes("Create Battle Room"));
  expect(createButton().props.disabled).toBe(true);
  act(() => view.root.findByProps({ type: "password" }).props.onChange({ target: { value: "ع".repeat(37) } }));
  expect(createButton().props.disabled).toBe(true);
  act(() => view.root.findByProps({ type: "password" }).props.onChange({ target: { value: "  key  " } }));
  expect(createButton().props.disabled).toBe(false);
});

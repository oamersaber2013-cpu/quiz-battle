import { createElement } from "react";
import { GameStatus } from "@quiz-battle/shared";
import SpectatePage from "@/app/spectate/page";
import { useGameStore } from "@/store/gameStore";

const { act, create } = require("react-test-renderer");
const mockRouter = { push: jest.fn() };
const mockFetch = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
jest.mock("next/link", () => ({ __esModule: true, default: (props: any) => require("react").createElement("a", props, props.children) }));
jest.mock("framer-motion", () => ({ motion: { div: "div" }, AnimatePresence: "div" }));

let view: any;
const room = { gameId: "public-room", mode: "conquest", difficulty: "novice", status: GameStatus.PowerUpSelect,
  playerCount: 2, maxPlayers: 8, currentRound: 0, totalRounds: 12 };

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);
  mockFetch.mockResolvedValue({ ok: true, json: async () => [room] });
  useGameStore.setState({ language: "ar", userId: null, token: null });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { lang: "en", dir: "ltr" } } });
});
afterEach(() => {
  act(() => view?.unmount());
  view = undefined;
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
  mockFetch.mockReset();
  delete (globalThis as any).document;
});

it("localizes the Arabic spectator list and document direction", async () => {
  await act(async () => { view = create(createElement(SpectatePage)); });
  const text = JSON.stringify(view.toJSON());
  for (const label of ["شاهد المعارك المباشرة", "اختيار القدرات", "مبتدئ", "اللاعبون", "مشاهدة"])
    expect(text).toContain(label);
  expect(document.documentElement).toMatchObject({ lang: "ar", dir: "rtl" });
});

it("creates a guest identity before taking an anonymous visitor to spectate", async () => {
  await act(async () => { view = create(createElement(SpectatePage)); });
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ userId: "guest-viewer", username: "Viewer", token: "viewer-token", isGuest: true }) });
  const watch = view.root.findAllByType("button").find((button: any) => button.props["aria-label"] === "مشاهدة الغزو");
  await act(async () => { await watch.props.onClick(); });
  expect(mockFetch).toHaveBeenLastCalledWith(expect.stringContaining("/api/auth/guest"), expect.objectContaining({ method: "POST" }));
  expect(useGameStore.getState()).toMatchObject({ userId: "guest-viewer", token: "viewer-token", isGuest: true });
  expect(mockRouter.push).toHaveBeenCalledWith("/lobby/public-room?spectate=true");
});

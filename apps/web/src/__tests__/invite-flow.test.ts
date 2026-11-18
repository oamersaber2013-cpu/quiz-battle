import { createElement } from "react";
import { GameMode, GameStatus } from "@quiz-battle/shared";
import HomePage from "@/app/page";
import LobbyPage from "@/app/lobby/[gameId]/page";
import { AccountAuthForm } from "@/components/account/AccountAuthForm";
import { useGameStore } from "@/store/gameStore";

const { act, create } = require("react-test-renderer");
const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockFetch = jest.fn();
const mockClipboard = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ gameId: "invited-room" }),
  useSearchParams: () => ({ get: () => null }),
}));
jest.mock("next/link", () => ({ __esModule: true, default: (props: any) => require("react").createElement("a", props, props.children) }));
jest.mock("@/hooks/useDocumentLocale", () => ({ useDocumentLocale: jest.fn() }));
jest.mock("@/hooks/useGameConnection", () => ({ useGameConnection: () => ({ joining: false }) }));
jest.mock("@/lib/socket", () => ({ connectSocket: jest.fn(), emitStartGame: jest.fn() }));
jest.mock("@/lib/sounds", () => ({ soundManager: { play: jest.fn() } }));
jest.mock("@/components/ChatWindow", () => ({ ChatWindow: () => null }));
jest.mock("@/components/CustomModeBuilder", () => ({ CustomModeBuilder: () => null }));

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
let view: any;
const text = (value: any): string => typeof value === "string" ? value : Array.isArray(value) ? value.map(text).join("") : value?.props ? text(value.props.children) : "";
const button = (label: string) => view.root.findAllByType("button").find((item: any) => text(item.props.children).includes(label));
function location(search: string) {
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    location: { origin: "https://quiz.example", protocol: "https:", hostname: "quiz.example", search },
  } });
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);
  location("");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: { writeText: mockClipboard } } });
  useGameStore.getState().resetGame();
  useGameStore.setState({ userId: null, token: null, username: "Warrior", isGuest: false, language: "en" });
});
afterEach(() => {
  act(() => view?.unmount()); view = undefined;
  jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); jest.clearAllMocks(); mockFetch.mockReset();
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else delete (globalThis as any).window;
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator); else delete (globalThis as any).navigator;
});

it("keeps a copied invitation on a fresh Arabic phone until the guest explicitly joins", async () => {
  location("?join=ab12cd&lang=ar");
  await act(async () => { view = create(createElement(HomePage)); });
  const code = view.root.findByProps({ "aria-labelledby": "join-code-heading" });
  expect(code.props.value).toBe("AB12CD");
  expect(view.root.findByType("main").props.dir).toBe("rtl");
  expect(mockFetch).not.toHaveBeenCalled();
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ userId: "guest-1", username: "زائر_12", token: "fixture-token", isGuest: true }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ gameId: "invited-room" }) });
  act(() => view.root.findByProps({ id: "player-name" }).props.onChange({ target: { value: "زائر" } }));
  await act(async () => view.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() }));
  expect(mockFetch.mock.calls[1][0]).toBe("https://quiz.example/api/games/join/AB12CD");
  expect(mockRouter.push).toHaveBeenCalledWith("/lobby/invited-room");
  expect(useGameStore.getState().username).toBe("زائر_12");
});

it("resumes an older direct room invitation after choosing a guest name", async () => {
  location("?room=older-room&lang=en&spectate=true");
  await act(async () => { view = create(createElement(HomePage)); });
  expect(text(view.root.findByType("h1").props.children)).toBe("Join invited room");
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ userId: "guest-1", username: "Guest", token: "fixture-token", isGuest: true }) });
  await act(async () => view.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() }));
  expect(mockRouter.push).toHaveBeenCalledWith("/lobby/older-room?spectate=true");
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("normalizes copied room-code whitespace and directional marks without truncating invalid codes", () => {
  act(() => { view = create(createElement(HomePage)); });
  act(() => button("Join with Code").props.onClick());
  const code = () => view.root.findByProps({ "aria-labelledby": "join-code-heading" });
  act(() => code().props.onChange({ target: { value: " \u200fab12cd\n " } }));
  expect(code().props.value).toBe("AB12CD");
  expect(button("Join room").props.disabled).toBe(false);
  act(() => code().props.onChange({ target: { value: "AB12CDX" } }));
  expect(button("Join room").props.disabled).toBe(true);
});

it("exposes a selectable invitation link when browser clipboard access fails", async () => {
  useGameStore.setState({ userId: "host", hostId: "host", gameId: "invited-room", joinCode: "AB12CD", status: GameStatus.Lobby, mode: GameMode.Classic, language: "ar" });
  mockClipboard.mockRejectedValueOnce(new Error("Clipboard blocked"));
  await act(async () => { view = create(createElement(LobbyPage)); });
  await act(async () => button("نسخ رابط الدعوة").props.onClick());
  const link = view.root.findByProps({ "aria-label": "رابط الدعوة" });
  expect(link.props.value).toBe("https://quiz.example/?join=AB12CD&lang=ar");
  expect(link.props.readOnly).toBe(true);
  expect(text(view.root.findByProps({ role: "alert" }).props.children)).toContain("حدد الرابط");
});

it.each(["en", "ar"] as const)("explains guest rate limits in %s without discarding the invitation", async language => {
  location(`?join=AB12CD&lang=${language}`);
  mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
  await act(async () => { view = create(createElement(HomePage)); });
  await act(async () => view.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() }));
  expect(text(view.root.findByProps({ role: "alert" }).props.children)).toContain(language === "ar" ? "انتظر دقيقة" : "Wait a minute");
  expect(view.root.findByProps({ "aria-labelledby": "join-code-heading" }).props.value).toBe("AB12CD");
  expect(mockRouter.push).not.toHaveBeenCalled();
});

it("keeps malformed invite targets on the entry screen instead of accepting a redirect URL", async () => {
  location("?room=https%3A%2F%2Foutside.example%2F&lang=ar");
  await act(async () => { view = create(createElement(HomePage)); });
  expect(text(view.root.findByProps({ role: "alert" }).props.children)).toContain("6 خانات");
  expect(button("انضم إلى الغرفة").props.disabled).toBe(true);
  expect(mockFetch).not.toHaveBeenCalled();
  expect(mockRouter.push).not.toHaveBeenCalled();
});

it("does not navigate to an undefined room when a lookup response is malformed", async () => {
  location("?join=AB12CD");
  useGameStore.getState().setAuth({ userId: "signed-player", username: "Player", token: "fixture-token" });
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  await act(async () => { view = create(createElement(HomePage)); });
  await act(async () => view.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() }));
  expect(text(view.root.findByProps({ role: "alert" }).props.children)).toContain("try again");
  expect(mockRouter.push).not.toHaveBeenCalled();
});

it("uses the phone share sheet without including a password and treats cancellation as neutral", async () => {
  const share = jest.fn().mockRejectedValueOnce(Object.assign(new Error("Cancelled"), { name: "AbortError" }));
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: { writeText: mockClipboard }, share } });
  useGameStore.setState({ userId: "host", hostId: "host", gameId: "invited-room", joinCode: "AB12CD", status: GameStatus.Lobby, mode: GameMode.Classic });
  await act(async () => { view = create(createElement(LobbyPage)); });
  await act(async () => button("Share invitation").props.onClick());
  expect(share).toHaveBeenCalledWith({ title: "Sword of Knowledge", text: "Join my battle. Room code: AB12CD", url: "https://quiz.example/?join=AB12CD&lang=en" });
  expect(view.root.findAllByProps({ role: "alert" })).toHaveLength(0);
});

it("carries the validated invitation when the visitor chooses Sign In", async () => {
  location("?join=AB12CD&lang=ar");
  await act(async () => { view = create(createElement(HomePage)); });
  const signIn = view.root.findAllByType("a").find((link: any) => link.props.href.startsWith("/login"));
  expect(new URL(signIn.props.href, "https://quiz.example").searchParams.get("returnTo")).toBe("/?join=AB12CD&lang=ar");
});

it.each([
  ["en", "join=AB12CD", false], ["en", "join=AB12CD", true],
  ["en", "room=older-room", false], ["en", "room=older-room", true],
  ["ar", "join=AB12CD", false], ["ar", "join=AB12CD", true],
  ["ar", "room=older-room", false], ["ar", "room=older-room", true],
] as const)("names the %s invitation action for %s (spectating=%s)", async (language, target, spectating) => {
  location(`?${target}&lang=${language}${spectating ? "&spectate=true" : ""}`);
  await act(async () => { view = create(createElement(HomePage)); });
  const submit = view.root.findByProps({ type: "submit" });
  expect(text(submit.props.children)).toBe(spectating
    ? (language === "ar" ? "شاهد المعركة" : "Watch match")
    : (language === "ar" ? "انضم إلى الغرفة" : "Join room"));
  expect(text(view.root.findByProps({ id: "join-code-help" }).props.children)).toContain(language === "ar" ? "اختر اسمك" : "Choose your name");
  if (target.startsWith("join=")) {
    expect(text(view.root.findByProps({ id: "join-code-heading" }).props.children)).toBe(language === "ar" ? "كود الانضمام" : "Join Code");
  }
});

it.each(["login", "register"] as const)("returns to the invitation after successful %s and keeps the cross-auth link", async mode => {
  const target = "/?room=older-room&lang=en&spectate=true";
  location(`?returnTo=${encodeURIComponent(target)}`);
  await act(async () => { view = create(createElement(AccountAuthForm, { mode })); });
  const otherMode = mode === "login" ? "/register" : "/login";
  const switchLink = view.root.findAllByType("a").find((link: any) => link.props.href.startsWith(otherMode));
  expect(new URL(switchLink.props.href, "https://quiz.example").searchParams.get("returnTo")).toBe(target);
  if (mode === "register") {
    act(() => view.root.findByProps({ id: "account-name" }).props.onChange({ target: { value: "InviteUser" } }));
    act(() => view.root.findByProps({ id: "account-confirmation" }).props.onChange({ target: { value: "test-password" } }));
  }
  act(() => view.root.findByProps({ id: "account-email" }).props.onChange({ target: { value: "player@example.invalid" } }));
  act(() => view.root.findByProps({ id: "account-password" }).props.onChange({ target: { value: "test-password" } }));
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ userId: "signed-player", username: "Player", token: "fixture-token" }) });
  await act(async () => view.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() }));
  expect(mockRouter.push).toHaveBeenCalledWith(target);
});

it.each(["https://outside.example/", "//outside.example/", "/game/other-room", "/?join=AB12CD&lang=en&redirect=https://outside.example", "/?join=AB12CD&join=CD34EF&lang=en"])("ignores an unsafe or unrelated auth return destination: %s", async target => {
  location(`?returnTo=${encodeURIComponent(target)}`);
  await act(async () => { view = create(createElement(AccountAuthForm, { mode: "login" })); });
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ userId: "signed-player", username: "Player", token: "fixture-token" }) });
  await act(async () => view.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() }));
  expect(mockRouter.push).toHaveBeenCalledWith("/");
});

import { createElement } from "react";
import { Difficulty, GameMode, type SavedGameResults } from "@quiz-battle/shared";
import ResultsPage from "@/app/results/[gameId]/page";
import StatsPage from "@/app/stats/page";
import { useGameStore } from "@/store/gameStore";

const { act, create } = require("react-test-renderer");
const mockRouter = { push: jest.fn() };
const mockFetch = jest.fn();
const mockWriteText = jest.fn();
jest.mock("next/navigation", () => ({ useParams: () => ({ gameId: "completed-battle" }), useRouter: () => mockRouter }));
jest.mock("next/link", () => ({ __esModule: true, default: (props: any) => require("react").createElement("a", props, props.children) }));

const saved: SavedGameResults = {
  gameId: "completed-battle", mode: GameMode.Classic, difficulty: Difficulty.Novice, language: "en", totalRounds: 3, endedAt: "2026-11-18T10:00:00Z",
  results: [
    { userId: "me", username: "First player", score: 800, rank: 1, correctAnswers: 2, totalAnswers: 3, avgAnswerTime: 1250, xpEarned: 20 },
    { userId: "peer", username: "Second player", score: 600, rank: 2, correctAnswers: 1, totalAnswers: 3, avgAnswerTime: 2300, xpEarned: 10 },
  ],
};
const statistics = {
  memberSince: "2026-01-01T00:00:00Z", achievements: [], totalGames: 2, wins: 1, totalScore: 9008, totalAnswers: 18, correctAnswers: 9,
  history: [
    { id: "completed-battle", mode: "classic", endedAt: saved.endedAt, playerCount: 2, score: 800, rank: 1 },
    { id: "completed-conquest", mode: "conquest", endedAt: saved.endedAt, playerCount: 2, score: 8, rank: 2 },
  ],
};
let view: any;
let previousNavigator: PropertyDescriptor | undefined;
function text(node: any): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  return node ? text(node.props?.children ?? node.children) : "";
}
const content = () => text(view.toJSON());
const button = (label: string) => view.root.findAllByType("button").find((item: any) => text(item).includes(label));
const mountResults = async (data = saved) => {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => data });
  await act(async () => { view = create(createElement(ResultsPage)); });
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);
  previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: { writeText: mockWriteText } } });
  useGameStore.getState().resetGame();
  useGameStore.setState({ userId: "me", token: "participant-token", username: "First player", language: "en", balanceQar: 25 });
});
afterEach(() => {
  act(() => view?.unmount());
  view = undefined;
  if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
  else delete (globalThis as any).navigator;
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockWriteText.mockReset();
});

it("uses saved ranks rather than response array order for the winner and standings", async () => {
  await mountResults({ ...saved, results: [...saved.results].reverse() });
  expect(view.root.findByType("h1").props.children).toBe("Victory!");
  expect(view.root.findAllByType("li").map(text)).toEqual([expect.stringContaining("First player"), expect.stringContaining("Second player")]);
  expect(saved.results.map(result => result.rank)).toEqual([1, 2]);
});

it.each(["en", "ar"] as const)("identifies equal top scores without changing recorded ranks (%s)", async language => {
  const results = saved.results.map(result => ({ ...result, score: 800 }));
  await mountResults({ ...saved, language, results });
  expect(view.root.findByType("h1").props.children).toBe(language === "ar" ? "تعادل في أعلى رصيد" : "Top score tied");
  expect(content()).not.toContain(language === "ar" ? "حقق النصر" : "claimed victory");
  expect(view.root.findAllByType("li").map((row: any) => row.findAllByType("span")[0].props["aria-label"]))
    .toEqual([1, 2].map(rank => `${language === "ar" ? "المركز" : "Rank"} ${new Intl.NumberFormat(language).format(rank)}`));
  expect(results.map(result => result.rank)).toEqual([1, 2]);
  expect(view.root.findByType("main").props.dir).toBe(language === "ar" ? "rtl" : "ltr");
});

it.each(["en", "ar"] as const)("keeps a Survival champion and eliminated participants visible when points are equal (%s)", async language => {
  await mountResults({ ...saved, mode: GameMode.Survival, language, results: saved.results.map(result => ({ ...result, score: 0 })) });
  expect(view.root.findByType("h1").props.children).toBe(language === "ar" ? "انتصار!" : "Victory!");
  expect(view.root.findAllByType("li")).toHaveLength(2);
  expect(content()).toContain("Second player");
});

it("shows measured Conquest answers alongside territory standings", async () => {
  await mountResults({ ...saved, mode: GameMode.Conquest, results: saved.results.map(result => ({ ...result, score: 8, correctAnswers: 12, totalAnswers: 15, avgAnswerTime: 1200 })) });
  expect(content()).toContain("Territories");
  expect(content()).toContain("80%");
  expect(content()).toMatch(/12\s*\/\s*15/);
  expect(content()).toContain("1.2");
});

it("retains account identity and result language when starting another battle", async () => {
  useGameStore.setState({ gameId: saved.gameId, finalResults: saved.results });
  await mountResults({ ...saved, language: "ar" });
  act(() => button("العب مجدداً").props.onClick());
  expect(mockRouter.push).toHaveBeenCalledWith("/");
  expect(useGameStore.getState()).toMatchObject({ gameId: null, userId: "me", token: "participant-token", balanceQar: 25, language: "ar" });
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("links to statistics in the result language without clearing the completed match", async () => {
  useGameStore.setState({ gameId: saved.gameId, finalResults: saved.results });
  await mountResults({ ...saved, language: "ar" });
  const link = view.root.findAllByType("a").find((item: any) => item.props.href === "/stats");
  expect(text(link)).toBe("إحصائياتي");
  act(() => link.props.onClick());
  expect(useGameStore.getState()).toMatchObject({ gameId: saved.gameId, finalResults: saved.results, language: "ar" });
});

it("announces clipboard failure and reports success only after the copy completes", async () => {
  await mountResults();
  let rejectCopy!: (reason: Error) => void;
  mockWriteText.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectCopy = reject; }));
  let pending!: Promise<void>;
  act(() => { pending = button("Share Result").props.onClick(); });
  expect(button("Copying").props.disabled).toBe(true);
  expect(content()).not.toContain("Copied!");
  await act(async () => { rejectCopy(new Error("Permission denied")); await pending; });
  expect(view.root.findByProps({ role: "status" }).props.children).toBe("Could not copy your result. Try again.");
  mockWriteText.mockResolvedValueOnce(undefined);
  await act(async () => { await button("Share Result").props.onClick(); });
  expect(view.root.findByProps({ role: "status" }).props.children).toBe("Copied!");
  expect(mockWriteText).toHaveBeenLastCalledWith(expect.stringContaining("Sword of Knowledge"));
});

it("lets a participant retry a stalled saved-results request", async () => {
  mockFetch.mockImplementationOnce(() => new Promise(() => {}));
  await act(async () => { view = create(createElement(ResultsPage)); });
  expect(view.root.findByType("main").props["aria-busy"]).toBe("true");
  act(() => jest.advanceTimersByTime(20000));
  expect(content()).toContain("retry shortly");
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => saved });
  await act(async () => { button("Retry").props.onClick(); });
  expect(content()).toContain("First player");
  expect(mockFetch).toHaveBeenCalledTimes(2);
});

it.each(["en", "ar"] as const)("keeps history units distinct and offers another battle from statistics (%s)", async language => {
  useGameStore.setState({ language });
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => statistics });
  await act(async () => { view = create(createElement(StatsPage)); });
  const links = view.root.findAllByType("a");
  expect(text(links.find((link: any) => link.props.href === "/results/completed-battle"))).toContain(language === "ar" ? "نقطة" : "points");
  expect(text(links.find((link: any) => link.props.href === "/results/completed-conquest"))).toContain(language === "ar" ? "أقاليم" : "territories");
  expect(content()).toContain(language === "ar" ? "الإجابات المُرسلة" : "Answers submitted");
  expect(content()).not.toContain(new Intl.NumberFormat(language).format(statistics.totalScore));
  expect(links.find((link: any) => text(link) === (language === "ar" ? "ابدأ معركة" : "Start a battle")).props.href).toBe("/");
});

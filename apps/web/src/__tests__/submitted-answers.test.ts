import { createElement } from "react";
import { Difficulty, GameMode, GameStatus, QuestionType, PowerUpType } from "@quiz-battle/shared";
import GamePage from "@/app/game/[gameId]/page";
import { emitAnswer, emitPowerUp } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";

const { act, create } = require("react-test-renderer");
const mockSocket = { connected: true, on: jest.fn(), off: jest.fn(), emit: jest.fn() };
let mockSpectating = false;
const mockRouter = { push: jest.fn(), replace: jest.fn() };
jest.mock("@/lib/socket", () => ({ getSocket: () => mockSocket, emitAnswer: jest.fn(), emitInvasionAnswer: jest.fn(), emitPowerUp: jest.fn() }));
jest.mock("@/lib/sounds", () => ({ soundManager: { play: jest.fn(), playModeSound: jest.fn() } }));
jest.mock("@/hooks/useGameConnection", () => ({ useGameConnection: () => ({ joining: false }) }));
jest.mock("next/navigation", () => ({
  useParams: () => ({ gameId: "battle-1" }),
  useRouter: () => mockRouter,
  useSearchParams: () => ({ get: () => mockSpectating ? "true" : null }),
}));
jest.mock("next/link", () => ({ __esModule: true, default: (props: any) => require("react").createElement("a", props, props.children) }));
jest.mock("framer-motion", () => ({
  motion: { div: "div", button: "button", span: "span" },
  AnimatePresence: "div",
  Reorder: { Group: "reorder-group", Item: "reorder-item" },
}));
jest.mock("@/components/ChatWindow", () => ({ ChatWindow: () => null }));
jest.mock("@/components/ConquestGame", () => ({ ConquestGame: () => null }));
jest.mock("@/components/InvasionGame", () => ({ InvasionGame: () => null }));
jest.mock("@/components/ChaosGame", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/PowerUpEffects", () => ({ PowerUpEffects: () => null }));
jest.mock("@/components/PowerUpSelection", () => ({ PowerUpSelection: () => null }));

let view: any;
const originalWindow = globalThis.window;
beforeAll(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { addEventListener: jest.fn(), removeEventListener: jest.fn() },
  });
});
afterAll(() => Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow }));
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  mockSpectating = false;
  mockSocket.connected = true;
  useGameStore.getState().resetGame();
  useGameStore.setState({ userId: "player-1", language: "en", soundEnabled: false });
  useGameStore.getState().setGame({ gameId: "battle-1", joinCode: "ABC123", mode: GameMode.Classic, difficulty: Difficulty.Novice });
});
afterEach(() => {
  act(() => view?.unmount());
  view = undefined;
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

function renderQuestion(type: QuestionType, extra: Record<string, unknown> = {}) {
  useGameStore.getState().setQuestion({
    id: "question-1", type, text: "Choose an answer", options: ["Alpha", "Beta", "Gamma"],
    category: "general", difficulty: Difficulty.Novice, timeLimit: 30, ...extra,
  }, 1, 8);
  act(() => { view = create(createElement(GamePage)); });
}
function text(node: any): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  return node?.props ? text(node.props.children) : "";
}
function click(label: string) {
  const button = view.root.findAllByType("button").find((item: any) => text(item.props.children).includes(label));
  expect(button).toBeDefined();
  act(() => button.props.onClick());
}

it.each([GameMode.Classic, GameMode.Chaos, GameMode.Conquest])("keeps a %s spectator in the completed live room and uses server placements", mode => {
  mockSpectating = true;
  const common = { correctAnswers: 1, totalAnswers: 1, avgAnswerTime: 500, xpEarned: 12 };
  useGameStore.setState({ mode });
  useGameStore.getState().setFinalResults([
    { ...common, userId: "runner-up", username: "Runner-up", score: 7, rank: 2 },
    { ...common, userId: "winner", username: "Winner", score: 7, rank: 1 },
  ]);
  act(() => { view = create(createElement(GamePage)); });
  const rows = view.root.findAllByType("li");
  expect(rows.map((row: any) => text(row.props.children))).toEqual([expect.stringContaining("Winner"), expect.stringContaining("Runner-up")]);
  expect(text(rows[0].props.children)).toContain(mode === GameMode.Conquest ? "territories" : "pts");
  expect(view.root.findByProps({ href: "/spectate" })).toBeDefined();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(mockRouter.push).not.toHaveBeenCalled();
});

it("takes a participant to their durable result after the game ends", () => {
  useGameStore.getState().setFinalResults([]);
  act(() => { view = create(createElement(GamePage)); });
  expect(mockRouter.replace).toHaveBeenCalledWith("/results/battle-1");
});

it("submits the actual typed text through the game page and preserves it in the store", () => {
  renderQuestion(QuestionType.FillBlank, { text: "The capital is [BLANK]", options: [] });
  act(() => view.root.findByType("input").props.onChange({ target: { value: "  Doha  " } }));
  click("Submit Answer");
  expect(emitAnswer).toHaveBeenCalledWith("battle-1", "question-1", "Doha");
  expect(useGameStore.getState().selectedAnswer).toBe("Doha");
});

it.each([GameMode.Classic, GameMode.Survival, GameMode.Custom])("makes a running five-second second round immediately playable in %s", mode => {
  useGameStore.setState({ mode });
  useGameStore.getState().setQuestion({ id: "round-two", text: "Second round question", options: ["Alpha", "Beta"],
    type: QuestionType.MultipleChoice, category: "general", difficulty: Difficulty.Novice, timeLimit: 5 }, 2, 8);
  act(() => { view = create(createElement(GamePage)); });
  expect(JSON.stringify(view.toJSON())).toContain("Second round question");
  act(() => jest.advanceTimersByTime(1000));
  expect(useGameStore.getState().timeLeft).toBe(4);
  click("Alpha");
  expect(emitAnswer).toHaveBeenCalledWith("battle-1", "round-two", 0);
});

it.each(["en", "ar"] as const)("explains Survival elimination and disables remaining powers in %s", language => {
  renderQuestion(QuestionType.MultipleChoice);
  const eliminated = { userId: "player-1", username: "Eliminated player", score: 9000, rank: 2, streak: 0, isConnected: true, isEliminated: true, powerUpInventory: [PowerUpType.Shield] };
  const survivor = { ...eliminated, userId: "survivor", username: "Remaining player", score: 500, rank: 1, isEliminated: false };
  act(() => useGameStore.setState({ mode: GameMode.Survival, language, players: [eliminated, survivor], currentPlayer: eliminated }));
  const content = JSON.stringify(view.toJSON());
  expect(content).toContain(language === "ar" ? "أُقصيت من المنافسة" : "You are out of the competition");
  const shield = view.root.findAllByType("button").find((node: any) => text(node.props.children).includes(language === "ar" ? "الدرع" : "Shield"));
  expect(shield.props.disabled).toBe(true);
  act(() => shield.props.onClick());
  expect(emitPowerUp).not.toHaveBeenCalled();
  const scoreboard = view.root.findAllByType("section").find((node: any) => node.props["aria-label"] === (language === "ar" ? "لوحة النتائج" : "Scoreboard"));
  expect(scoreboard.findAllByType("li").map((node: any) => text(node.props.children))[0]).toContain("Remaining player");
});

it.each(["en", "ar"] as const)("exposes a single Chaos power and submits a chosen live target in %s", async language => {
  (emitPowerUp as jest.Mock).mockResolvedValue({ success: true });
  const own = { userId: "player-1", username: "Own player", score: 0, rank: 1, streak: 0, isConnected: true, isEliminated: false, powerUpInventory: [PowerUpType.Freeze] };
  const target = { ...own, userId: "active-peer", username: "Active rival", powerUpInventory: [] };
  useGameStore.setState({ mode: GameMode.Chaos, language, players: [own, target, { ...target, userId: "offline", username: "Offline rival", isConnected: false }], currentPlayer: own });
  renderQuestion(QuestionType.MultipleChoice);
  const freeze = view.root.findAllByType("button").find((node: any) => text(node.props.children).includes(language === "ar" ? "التجميد" : "Freeze"));
  expect(freeze).toBeDefined();
  expect(text(freeze.props.children)).toContain(language === "ar" ? "٥ ثوانٍ" : "5 seconds");
  act(() => freeze.props.onClick());
  expect(JSON.stringify(view.toJSON())).not.toContain("Offline rival");
  const targetButton = view.root.findAllByType("button").find((node: any) => text(node.props.children).includes("Active rival"));
  expect(targetButton).toBeDefined();
  await act(async () => { await targetButton.props.onClick(); });
  expect(emitPowerUp).toHaveBeenCalledWith("battle-1", PowerUpType.Freeze, "active-peer");
});

it.each(["spectator", "frozen", "eliminated", "expired", "offline"])("blocks a Chaos power for a %s", reason => {
  mockSpectating = reason === "spectator";
  const own = { userId: "player-1", username: "Own", score: 0, rank: 1, streak: 0, isConnected: true, isEliminated: reason === "eliminated", powerUpInventory: [PowerUpType.TimeWarp] };
  useGameStore.setState({ mode: GameMode.Chaos, players: [own], currentPlayer: own });
  renderQuestion(QuestionType.MultipleChoice);
  if (reason === "frozen") act(() => useGameStore.setState({ activeEffects: [{ type: PowerUpType.Freeze, sourceUserId: "peer", targetUserId: "player-1", expiresAt: Date.now() + 5000 }] }));
  if (reason === "expired") act(() => useGameStore.setState({ timeLeft: 0 }));
  if (reason === "offline") mockSocket.connected = false;
  const power = view.root.findAllByType("button").find((node: any) => text(node.props.children).includes("Extra time"));
  expect(power).toBeDefined();
  if (reason !== "offline") expect(power.props.disabled).toBe(true);
  act(() => power.props.onClick());
  expect(emitPowerUp).not.toHaveBeenCalled();
});

it("prevents repeat activation while awaiting the server and displays an exhausted Chaos inventory", async () => {
  let resolve!: (value: { success: boolean }) => void;
  (emitPowerUp as jest.Mock).mockReturnValue(new Promise(result => { resolve = result; }));
  const own = { userId: "player-1", username: "Own", score: 0, rank: 1, streak: 0, isConnected: true, isEliminated: false, powerUpInventory: [PowerUpType.TimeWarp] };
  useGameStore.setState({ mode: GameMode.Chaos, players: [own], currentPlayer: own });
  renderQuestion(QuestionType.MultipleChoice);
  click("Extra time"); click("Extra time");
  expect(emitPowerUp).toHaveBeenCalledTimes(1);
  expect(useGameStore.getState().currentPlayer?.powerUpInventory).toEqual([PowerUpType.TimeWarp]);
  await act(async () => { resolve({ success: true }); });
  act(() => useGameStore.getState().updatePlayer("player-1", { powerUpInventory: [] }));
  expect(JSON.stringify(view.toJSON())).toContain("You have used all your selected powers");
});

it("submits every selected index rather than converting a multi-select answer to zero", () => {
  renderQuestion(QuestionType.MultiSelect);
  click("Alpha");
  click("Gamma");
  click("Confirm 2 Answers");
  expect(emitAnswer).toHaveBeenCalledWith("battle-1", "question-1", [0, 2]);
  expect(useGameStore.getState().selectedAnswer).toEqual([0, 2]);
});

it("submits the displayed ordering unchanged", () => {
  renderQuestion(QuestionType.Ordering);
  const group = view.root.findByType("reorder-group");
  const items = group.props.values;
  const ordered = [items.find((item: any) => item.originalIndex === 2), items.find((item: any) => item.originalIndex === 0), items.find((item: any) => item.originalIndex === 1)];
  act(() => group.props.onReorder(ordered));
  click("Confirm Order");
  expect(emitAnswer).toHaveBeenCalledWith("battle-1", "question-1", [2, 0, 1]);
  expect(useGameStore.getState().selectedAnswer).toEqual([2, 0, 1]);
});

it("reorders through named buttons and submits the actual order", () => {
  renderQuestion(QuestionType.Ordering);
  const group = () => view.root.findByType("reorder-group");
  const originalItems: Array<{ text: string; originalIndex: number }> = group().props.values;
  const moveUp = view.root.findByProps({ "aria-label": `Move ${originalItems[1].text} up` });
  act(() => moveUp.props.onClick({ currentTarget: null }));
  expect(view.root.findByProps({ "aria-label": `Move ${originalItems[1].text} up` }).props["aria-disabled"]).toBe(true);
  expect(text(view.root.findByProps({ role: "status" }).props.children)).toContain("position 1");

  click("Confirm Order");
  expect(emitAnswer).toHaveBeenCalledWith(
    "battle-1",
    "question-1",
    [originalItems[1], originalItems[0], ...originalItems.slice(2)].map((item) => item.originalIndex)
  );
});

it("keeps an ordering answer editable when a freeze rejects submission", () => {
  renderQuestion(QuestionType.Ordering);
  act(() => useGameStore.setState({ activeEffects: [{ type: PowerUpType.Freeze, sourceUserId: "other", targetUserId: "player-1", expiresAt: Date.now() + 5000 }] }));
  click("Confirm Order");
  expect(emitAnswer).not.toHaveBeenCalled();
  act(() => useGameStore.setState({ activeEffects: [] }));
  click("Confirm Order");
  expect(emitAnswer).toHaveBeenCalledTimes(1);
});

it("restores an Arabic submitted text answer and clears it for the next question", () => {
  useGameStore.setState({ language: "ar" });
  renderQuestion(QuestionType.FillBlank, { text: "العاصمة هي [BLANK]", options: [] });
  act(() => useGameStore.setState({ selectedAnswer: "الدوحة" }));
  expect(view.root.findByType("input").props.value).toBe("الدوحة");
  expect(view.root.findByType("input").props.disabled).toBe(true);
  act(() => useGameStore.getState().setQuestion({ ...useGameStore.getState().currentQuestion!, id: "question-2" }, 1, 8));
  expect(view.root.findByType("input").props.value).toBe("");
  expect(view.root.findByType("input").props.disabled).toBe(false);
});

it("restores every submitted multi-select choice and the exact submitted ordering", () => {
  renderQuestion(QuestionType.MultiSelect);
  act(() => useGameStore.setState({ selectedAnswer: [0, 2] }));
  const options = view.root.findAllByType("button");
  const alpha = options.find((button: any) => text(button.props.children).includes("Alpha"));
  const gamma = options.find((button: any) => text(button.props.children).includes("Gamma"));
  expect(text(alpha.props.children)).toContain("✓");
  expect(text(gamma.props.children)).toContain("✓");
  expect(alpha.props.disabled).toBe(true);
  act(() => useGameStore.getState().setQuestion({ ...useGameStore.getState().currentQuestion!, id: "question-2", type: QuestionType.Ordering }, 1, 8));
  act(() => useGameStore.setState({ selectedAnswer: [2, 0, 1] }));
  expect(view.root.findByType("reorder-group").props.values.map((item: any) => item.originalIndex)).toEqual([2, 0, 1]);
});

it("uses server text correctness and reveal metadata without hidden answer fields in the question", () => {
  renderQuestion(QuestionType.FillBlank, { text: "The capital is [BLANK]", options: [] });
  act(() => useGameStore.setState({ selectedAnswer: "doha", status: GameStatus.AnswerReveal, lastAnswerResult: { correct: true, correctIndex: -1, correctAnswer: "Doha" } }));
  expect(JSON.stringify(view.toJSON())).toContain("Correct Answer!");
});

it("reveals multi-select choices using correctIndices supplied by the server", () => {
  renderQuestion(QuestionType.MultiSelect);
  act(() => useGameStore.setState({ selectedAnswer: [0], status: GameStatus.AnswerReveal, lastAnswerResult: { correct: false, correctIndex: -1, correctIndices: [0, 2] } }));
  const content = JSON.stringify(view.toJSON());
  expect(content).toContain("Correct Answers:");
  expect(content).toContain("Gamma");
  expect(content).not.toContain("undefined");
});

it("rejects duplicate submission and input after the server answer window closes", () => {
  renderQuestion(QuestionType.MultiSelect);
  click("Alpha");
  click("Confirm 1 Answer");
  click("Confirm 1 Answer");
  expect(emitAnswer).toHaveBeenCalledTimes(1);
  act(() => useGameStore.getState().setQuestion({ ...useGameStore.getState().currentQuestion!, id: "question-2" }, 1, 8));
  act(() => useGameStore.setState({ timeLeft: 0 }));
  click("Beta");
  expect(emitAnswer).toHaveBeenCalledTimes(1);
});

it.each([QuestionType.ImageQuestion, QuestionType.AudioQuestion, QuestionType.TrueFalse])("applies the spectator and freeze guard to %s choices", (type) => {
  mockSpectating = true;
  renderQuestion(type);
  if (type === QuestionType.TrueFalse) {
    const choice = view.root.findAllByType("button").find((button: any) => text(button.props.children).includes("The statement is true"));
    act(() => choice.props.onClick());
  } else click("Alpha");
  expect(emitAnswer).not.toHaveBeenCalled();
  mockSpectating = false;
  act(() => useGameStore.setState({ activeEffects: [{ type: PowerUpType.Freeze, sourceUserId: "other", targetUserId: "player-1", expiresAt: Date.now() + 5000 }] }));
  if (type === QuestionType.TrueFalse) {
    const choice = view.root.findAllByType("button").find((button: any) => text(button.props.children).includes("The statement is true"));
    act(() => choice.props.onClick());
  } else click("Alpha");
  expect(emitAnswer).not.toHaveBeenCalled();
});

it.each(["spectator", "frozen", "eliminated"])("disables dedicated answer controls for a %s while preserving a typed draft", reason => {
  mockSpectating = reason === "spectator";
  renderQuestion(QuestionType.FillBlank, { text: "The capital is [BLANK]", options: [] });
  if (reason !== "spectator") {
    act(() => view.root.findByType("input").props.onChange({ target: { value: "Doha" } }));
    act(() => useGameStore.setState(reason === "frozen"
      ? { activeEffects: [{ type: PowerUpType.Freeze, sourceUserId: "other", targetUserId: "player-1", expiresAt: Date.now() + 5000 }] }
      : { currentPlayer: { userId: "player-1", username: "Player", score: 0, rank: 1, streak: 0, isConnected: true, powerUpInventory: [], isEliminated: true } }));
  }
  const input = view.root.findByType("input");
  const submit = view.root.findAllByType("button").find((button: any) => text(button.props.children).includes("Submit Answer"));
  expect(input.props.disabled).toBe(true);
  expect(submit.props.disabled).toBe(true);
  act(() => input.props.onChange({ target: { value: "Edited while blocked" } }));
  act(() => submit.props.onClick());
  expect(view.root.findByType("input").props.value).toBe(reason === "spectator" ? "" : "Doha");
  expect(emitAnswer).not.toHaveBeenCalled();
  if (reason === "frozen") {
    act(() => useGameStore.setState({ activeEffects: [] }));
    expect(view.root.findByType("input").props.disabled).toBe(false);
    click("Submit Answer");
    expect(emitAnswer).toHaveBeenCalledWith("battle-1", "question-1", "Doha");
  }
});

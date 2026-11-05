import { createElement } from "react";
import { Difficulty, GameMode, GameStatus, QuestionType, PowerUpType } from "@quiz-battle/shared";
import GamePage from "@/app/game/[gameId]/page";
import { emitAnswer } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";

const { act, create } = require("react-test-renderer");
const mockSocket = { on: jest.fn(), off: jest.fn(), emit: jest.fn() };
let mockSpectating = false;
jest.mock("@/lib/socket", () => ({ getSocket: () => mockSocket, emitAnswer: jest.fn(), emitInvasionAnswer: jest.fn(), emitPowerUp: jest.fn() }));
jest.mock("@/lib/sounds", () => ({ soundManager: { play: jest.fn(), playModeSound: jest.fn() } }));
jest.mock("@/hooks/useGameConnection", () => ({ useGameConnection: () => ({ joining: false }) }));
jest.mock("next/navigation", () => ({
  useParams: () => ({ gameId: "battle-1" }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => ({ get: () => mockSpectating ? "true" : null }),
}));
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

it("submits the actual typed text through the game page and preserves it in the store", () => {
  renderQuestion(QuestionType.FillBlank, { text: "The capital is [BLANK]", options: [] });
  act(() => view.root.findByType("input").props.onChange({ target: { value: "  Doha  " } }));
  click("Submit Answer");
  expect(emitAnswer).toHaveBeenCalledWith("battle-1", "question-1", "Doha");
  expect(useGameStore.getState().selectedAnswer).toBe("Doha");
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

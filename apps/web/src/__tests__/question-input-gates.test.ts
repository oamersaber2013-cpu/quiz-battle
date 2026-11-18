import { createElement } from "react";
import { Difficulty, GameStatus, QuestionType } from "@quiz-battle/shared";
import { ImageQuestion } from "@/components/ImageQuestion";
import { AudioQuestion } from "@/components/AudioQuestion";
import { TrueFalseQuestion } from "@/components/TrueFalseQuestion";
import { MultiSelectQuestion } from "@/components/MultiSelectQuestion";
import { FillBlankQuestion } from "@/components/FillBlankQuestion";
import { OrderingQuestion } from "@/components/OrderingQuestion";

const { act, create } = require("react-test-renderer");
jest.mock("framer-motion", () => ({
  motion: { div: "div", button: "button", span: "span" },
  AnimatePresence: "div",
  Reorder: { Group: "reorder-group", Item: "reorder-item" },
}));

const question = {
  id: "gated-question", text: "Choose [BLANK]", options: ["Alpha", "Beta", "Gamma"],
  category: "general", difficulty: Difficulty.Novice, timeLimit: 30,
  imageUrl: "/media/question.webp", audioUrl: "/media/question.mp3",
};
const cases = [
  ["image", ImageQuestion, QuestionType.ImageQuestion],
  ["audio", AudioQuestion, QuestionType.AudioQuestion],
  ["true/false", TrueFalseQuestion, QuestionType.TrueFalse],
  ["multi-select", MultiSelectQuestion, QuestionType.MultiSelect],
  ["fill-blank", FillBlankQuestion, QuestionType.FillBlank],
  ["ordering", OrderingQuestion, QuestionType.Ordering],
] as const;
let view: any;
const text = (value: any): string => typeof value === "string" ? value : Array.isArray(value) ? value.map(text).join("") : value?.props ? text(value.props.children) : "";
beforeEach(() => jest.spyOn(console, "warn").mockImplementation(() => {}));
afterEach(() => { act(() => view?.unmount()); view = undefined; jest.restoreAllMocks(); });

it.each(cases)("blocks editing and submission in a disabled %s view", (_name, component, type) => {
  const submit = jest.fn();
  act(() => { view = create(createElement(component as any, {
    question: { ...question, type }, status: GameStatus.Question, timeLeft: 30,
    selectedAnswer: null, lastAnswerResult: null, language: "en", disabled: true,
    onAnswer: submit, onSubmit: submit,
  })); });
  const answerButtons = view.root.findAllByType("button").filter((button: any) => !text(button.props.children).includes("Tap to Listen"));
  expect(answerButtons.length).toBeGreaterThan(0);
  for (const button of answerButtons) {
    expect(button.props.disabled).toBe(true);
    act(() => button.props.onClick?.());
  }
  for (const input of view.root.findAllByType("input")) {
    expect(input.props.disabled).toBe(true);
    act(() => input.props.onChange({ target: { value: "edited answer" } }));
    expect(input.props.value).toBe("");
  }
  if (type === QuestionType.Ordering) {
    const group = view.root.findByType("reorder-group");
    const original = group.props.values;
    act(() => group.props.onReorder([...original].reverse()));
    expect(group.props.values).toEqual(original);
    expect(view.root.findAllByType("reorder-item").every((item: any) => item.props.dragListener === false)).toBe(true);
  }
  expect(submit).not.toHaveBeenCalled();
});

it.each(["en", "ar"] as const)("labels both inline and separate fill-blank inputs in %s", language => {
  for (const text of ["Choose [BLANK]", "Name the capital"]) {
    act(() => { view = create(createElement(FillBlankQuestion, {
      question: { ...question, text }, status: GameStatus.Question, timeLeft: 30,
      selectedAnswer: null, lastAnswerResult: null, language, onAnswer: jest.fn(),
    })); });
    const input = view.root.findByType("input");
    expect(input.props["aria-label"]).toBe(language === "ar" ? "إجابتك" : "Your answer");
    expect(view.root.findByProps({ id: input.props["aria-describedby"] })).toBeDefined();
    act(() => view.unmount()); view = undefined;
  }
});

it("keeps question audio available when answering is disabled", () => {
  act(() => { view = create(createElement(AudioQuestion, {
    question, status: GameStatus.Question, timeLeft: 30, selectedAnswer: null,
    lastAnswerResult: null, language: "en", disabled: true, onAnswer: jest.fn(),
  })); });
  expect(view.root.findByType("audio").props.src).toBe("/media/question.mp3");
  const playback = view.root.findAllByType("button").find((button: any) => text(button.props.children).includes("Tap to Listen"));
  expect(playback).toBeDefined();
  expect(playback.props.disabled).not.toBe(true);
});

import { createElement } from "react";
import { GameStatus } from "@quiz-battle/shared";
import { ImageQuestion } from "@/components/ImageQuestion";
import { AudioQuestion } from "@/components/AudioQuestion";
import { safeMediaUrl } from "@/lib/apiOrigin";

const { act, create } = require("react-test-renderer");
jest.mock("framer-motion", () => ({ motion: { div: "div", button: "button", span: "span" } }));
const publicPage = { origin: "https://quiz.example", hostname: "quiz.example", protocol: "https:" };

it.each(["http://127.0.0.1:4000/media/a", "https://192.168.1.4/a", "https://10.0.0.1/a", "//localhost/a", "https://[::1]/a"])("does not render question media that requests a visitor's local network: %s", source => {
  const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: publicPage } });
  const props = { question: { text: "Question", options: ["A", "B"], imageUrl: source, audioUrl: source }, status: GameStatus.Question,
    selectedAnswer: null, lastAnswerResult: null, language: "en" as const, onAnswer: jest.fn(), timeLeft: 15 };
  let view: any;
  try {
    act(() => { view = create(createElement("div", null, createElement(ImageQuestion, props), createElement(AudioQuestion, props))); });
    expect(view.root.findAllByType("img")).toHaveLength(0);
    expect(view.root.findAllByType("audio")).toHaveLength(0);
  } finally {
    act(() => view?.unmount());
    delete (globalThis as any).window;
    warning.mockRestore();
  }
});

it("preserves same-origin media, public HTTPS media and intentional loopback development", () => {
  expect(safeMediaUrl("/media/question.webp", publicPage)).toBe("/media/question.webp");
  expect(safeMediaUrl("https://cdn.example/question.mp3", publicPage)).toBe("https://cdn.example/question.mp3");
  expect(safeMediaUrl("http://127.0.0.1:4000/media/question.mp3", { origin: "http://localhost:3100", hostname: "localhost", protocol: "http:" })).toBe("http://127.0.0.1:4000/media/question.mp3");
});

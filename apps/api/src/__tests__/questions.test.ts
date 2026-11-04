jest.mock("@quiz-battle/db", () => ({ prisma: { question: { findMany: jest.fn() } } }));
jest.mock("../lib/cache", () => ({ getCachedQuestions: jest.fn(async () => null), cacheQuestions: jest.fn() }));

import { prisma } from "@quiz-battle/db";
import { Difficulty } from "@quiz-battle/shared";
import { cacheQuestions, getCachedQuestions } from "../lib/cache";
import { clearUsedQuestions, fetchQuestions } from "../lib/questions";

describe("database question delivery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.question.findMany as jest.Mock).mockResolvedValue([{
      id: "db-question-1", textEn: "Question in English", textAr: "سؤال بالعربية",
      optionsEnJson: '["First","Second"]', optionsArJson: '["الأول","الثاني"]',
      correctAnswer: "1", type: "multiple_choice", category: "general", difficulty: "sage",
    }]);
    clearUsedQuestions("question-regression");
  });

  it("reads the answer from the persisted correctAnswer column", async () => {
    const [question] = await fetchQuestions(Difficulty.Sage, 1, "general", undefined, "ar");
    expect(question.correctIndex).toBe(1);
    expect(question.text).toBe("سؤال بالعربية");
    expect(question.options).toEqual(["الأول", "الثاني"]);
  });

  it("separates Arabic and English caches", async () => {
    await fetchQuestions(Difficulty.Sage, 1, "general", undefined, "ar");
    const arabicKey = (getCachedQuestions as jest.Mock).mock.calls[0][0];
    await fetchQuestions(Difficulty.Sage, 1, "general", undefined, "en");
    const englishKey = (getCachedQuestions as jest.Mock).mock.calls[1][0];
    expect(arabicKey).not.toBe(englishKey);
    expect((cacheQuestions as jest.Mock).mock.calls[0][0]).toBe(arabicKey);
  });

  it("keeps stable question ids for room repeat detection through cache", async () => {
    const [question] = await fetchQuestions(Difficulty.Sage, 1, "general", undefined, "en", "question-regression");
    expect(question.id).toBe("db-question-1");
  });
});

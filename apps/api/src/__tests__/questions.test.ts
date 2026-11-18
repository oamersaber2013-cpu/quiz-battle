jest.mock("@quiz-battle/db", () => ({ prisma: { question: { findMany: jest.fn() } } }));
jest.mock("../lib/cache", () => ({ getCachedQuestions: jest.fn(async () => null), cacheQuestions: jest.fn() }));

import { prisma } from "@quiz-battle/db";
import { Difficulty, QuestionType } from "@quiz-battle/shared";
import { cacheQuestions, getCachedQuestions } from "../lib/cache";
import { clearUsedQuestions, fetchQuestions } from "../lib/questions";
import { QUESTION_BANK } from "../lib/questionBank";

describe("database question delivery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCachedQuestions as jest.Mock).mockResolvedValue(null);
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

  it("continues a configured Conquest match after exhausting the local Legend bank", async () => {
    (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
    const room = "exhausted-legend-room";
    clearUsedQuestions(room);
    const delivered = [];
    for (let round = 0; round < QUESTION_BANK[Difficulty.Legend].length + 7; round++) {
      const questions = await fetchQuestions(Difficulty.Legend, 1, "general", undefined, "ar", room, { singleChoiceOnly: true });
      expect(questions).toHaveLength(1);
      delivered.push(questions[0]);
    }
    expect(new Set(delivered.slice(0, QUESTION_BANK[Difficulty.Legend].length).map(question => question.text)).size).toBe(QUESTION_BANK[Difficulty.Legend].length);
    expect(new Set(delivered.map(question => question.id)).size).toBe(delivered.length);
    expect(delivered.every(question => question.correctIndex >= 0 && question.options[question.correctIndex])).toBe(true);
    clearUsedQuestions(room);
  });

  it("uses the default question pool for an empty category selection", async () => {
    const questions = await fetchQuestions(Difficulty.Sage, 1, [], undefined, "ar");
    expect(questions).toHaveLength(1);
    expect(questions[0].text).toBe("سؤال بالعربية");
  });

  it("fills a batch larger than the local bank without returning a shortened match", async () => {
    (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
    const count = QUESTION_BANK[Difficulty.Legend].length + 3;
    const room = "large-legend-batch";
    clearUsedQuestions(room);
    const questions = await fetchQuestions(Difficulty.Legend, count, "general", undefined, "ar", room, { singleChoiceOnly: true });
    expect(questions).toHaveLength(count);
    expect(new Set(questions.map(question => question.id)).size).toBe(count);
    clearUsedQuestions(room);
  });

  it.each([
    [QuestionType.FillBlank, "Paris", { correctAnswer: "Paris" }],
    [QuestionType.MultiSelect, "[0,2]", { correctIndices: [0, 2] }],
    [QuestionType.Ordering, "[2,0,1]", { correctOrder: [2, 0, 1] }],
  ])("delivers valid persisted %s answer metadata to the server", async (type, correctAnswer, expected) => {
    (prisma.question.findMany as jest.Mock).mockResolvedValue([{
      id: "typed-db", textEn: "Advanced Question", textAr: "سؤال متقدم",
      optionsEnJson: '["One","Two","Three"]', optionsArJson: '["واحد","اثنان","ثلاثة"]',
      correctAnswer, type,
    }]);
    const [question] = await fetchQuestions(Difficulty.Sage, 1, "general");
    expect(question.id).toBe("typed-db");
    expect(question).toMatchObject(expected);
  });

  it("filters advanced cached questions for the single-choice Conquest/Invasion protocol", async () => {
    (getCachedQuestions as jest.Mock).mockResolvedValue([
      { id: "advanced", text: "Question", options: ["A", "B"], type: QuestionType.MultiSelect, correctIndices: [0, 1] },
      { id: "single", text: "Question", options: ["A", "B"], type: QuestionType.MultipleChoice, correctIndex: 1 },
    ]);
    const [question] = await fetchQuestions(Difficulty.Sage, 1, "general", undefined, "en", undefined, { singleChoiceOnly: true });
    expect(question.id).toBe("single");
    expect(prisma.question.findMany).not.toHaveBeenCalled();
    expect((getCachedQuestions as jest.Mock).mock.calls[0][0]).toContain("single-choice");
  });

  it("decodes localized accepted text alternatives from database JSON", async () => {
    (prisma.question.findMany as jest.Mock).mockResolvedValue([{
      id: "localized-fill", textEn: "Capital?", textAr: "ما هي العاصمة؟", type: QuestionType.FillBlank,
      optionsEnJson: null, optionsArJson: null,
      correctAnswer: JSON.stringify({ en: ["Paris", "City of Paris"], ar: ["باريس"] }),
    }]);
    const [question] = await fetchQuestions(Difficulty.Sage, 1, "general", undefined, "ar");
    expect(question.correctAnswer).toBe("باريس");
    expect(question.acceptedAnswers).toEqual(["باريس"]);
    expect(question.options).toEqual([]);
  });
});

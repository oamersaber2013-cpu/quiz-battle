jest.mock("@quiz-battle/db", () => ({ prisma: { question: { findMany: jest.fn() } } }));
jest.mock("../lib/cache", () => ({ getCachedQuestions: jest.fn(async () => null), cacheQuestions: jest.fn() }));

import { prisma } from "@quiz-battle/db";
import { Difficulty, QuestionType, OFFLINE_CATEGORY_DIFFICULTIES, normalizeQuestionCategory } from "@quiz-battle/shared";
import { cacheQuestions, getCachedQuestions } from "../lib/cache";
import { clearUsedQuestions, fetchQuestions, hasCuratedQuestions } from "../lib/questions";
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

  it.each(Object.entries(OFFLINE_CATEGORY_DIFFICULTIES).flatMap(([category, grades]) =>
    grades.map(grade => [category, grade] as const)))
  ("delivers only real %s questions at %s without a paid provider", async (category, grade) => {
    (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
    const room = `category-${category}-${grade}`;
    clearUsedQuestions(room);
    const questions = await fetchQuestions(grade, 4, category, undefined, "ar", room);
    expect(questions).toHaveLength(4);
    expect(new Set(questions.map(question => question.id)).size).toBe(4);
    for (const question of questions) {
      expect(question.difficulty).toBe(grade);
      if (category !== "general") expect(normalizeQuestionCategory(question.category)).toBe(category);
      expect(question.text).toMatch(/[\u0600-\u06ff]/);
      expect(question.options[question.correctIndex]).toBeTruthy();
    }
    clearUsedQuestions(room);
  });

  it("rejects wrong-category cache entries instead of relabelling them", async () => {
    (getCachedQuestions as jest.Mock).mockResolvedValue([{ id: "wrong", text: "Wrong subject", options: ["A", "B"],
      category: "history", difficulty: Difficulty.Scholar, correctIndex: 0 }]);
    (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
    const questions = await fetchQuestions(Difficulty.Scholar, 2, "Science", undefined, "ar");
    expect(questions.every(question => normalizeQuestionCategory(question.category) === "science")).toBe(true);
    expect(questions.some(question => question.id === "wrong")).toBe(false);
  });

  it("cycles only the exhausted exact verified pool with fresh delivery identities", async () => {
    (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
    const room = "islamic-sage-exhaustion";
    clearUsedQuestions(room);
    const delivered = [];
    for (let round = 0; round < 5; round++) {
      const [question] = await fetchQuestions(Difficulty.Sage, 1, "islamic", undefined, "ar", room);
      delivered.push(question);
    }
    expect(new Set(delivered.slice(0, 2).map(question => question.text)).size).toBe(2);
    expect(new Set(delivered.map(question => question.id)).size).toBe(5);
    expect(delivered.every(question => question.category === "islamic" && question.difficulty === Difficulty.Sage)).toBe(true);
    clearUsedQuestions(room);
  });

  it("does not fill an unavailable category and grade with unrelated content", async () => {
    (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
    expect(await fetchQuestions(Difficulty.Legend, 2, "sports", undefined, "ar")).toEqual([]);
  });

  it.each([false, true])("replays an exhausted curated DB-only pool with a fresh identity (cache first: %s)", async cachedFirst => {
    (prisma.question.findMany as jest.Mock).mockResolvedValue([{
      id: "curated-fill-source", textEn: "Capital?", textAr: "ما هي العاصمة؟", type: QuestionType.FillBlank,
      category: "integration_fill_blank", difficulty: Difficulty.Sage,
      optionsEnJson: null, optionsArJson: null, correctAnswer: JSON.stringify({ en: ["Paris"], ar: ["باريس"] }),
    }]);
    const room = "curated-only-exhaustion";
    clearUsedQuestions(room);
    expect(await hasCuratedQuestions("integration_fill_blank", Difficulty.Sage, "ar")).toBe(true);
    expect(await hasCuratedQuestions("integration_fill_blank", Difficulty.Sage, "ar", true)).toBe(false);
    if (cachedFirst) (getCachedQuestions as jest.Mock).mockResolvedValue([{
      id: "curated-fill-source", text: "ما هي العاصمة؟", options: [], type: QuestionType.FillBlank,
      category: "integration_fill_blank", difficulty: Difficulty.Sage, timeLimit: 20,
      correctIndex: -1, correctAnswer: "باريس", acceptedAnswers: ["باريس"],
    }]);
    const [first] = await fetchQuestions(Difficulty.Sage, 1, "integration_fill_blank", undefined, "ar", room);
    const [second] = await fetchQuestions(Difficulty.Sage, 1, "integration_fill_blank", undefined, "ar", room);
    expect(first.id).toBe("curated-fill-source");
    expect(second.id).not.toBe(first.id);
    expect(second).toMatchObject({ category: "integration_fill_blank", difficulty: Difficulty.Sage,
      type: QuestionType.FillBlank, correctAnswer: "باريس", acceptedAnswers: ["باريس"] });
    clearUsedQuestions(room);
  });

  it("keeps replay IDs unique for a curated batch larger than its source pool without a room", async () => {
    (prisma.question.findMany as jest.Mock).mockResolvedValue([{
      id: "db-question-1", category: "curated-only", difficulty: Difficulty.Sage,
      textEn: "Question", textAr: "سؤال بالعربية", type: "multiple_choice", correctAnswer: "0",
      optionsEnJson: '["A","B"]', optionsArJson: '["ألف","باء"]',
    }]);
    const clock = jest.spyOn(Date, "now").mockReturnValue(100000);
    const random = jest.spyOn(Math, "random").mockReturnValue(0.5);
    const replayIds = new Set<string>();
    try {
      for (let batch = 0; batch < 10; batch++) {
        const questions = await fetchQuestions(Difficulty.Sage, 3, "curated-only", undefined, "ar");
        expect(questions).toHaveLength(3);
        expect(new Set(questions.map(question => question.id)).size).toBe(3);
        expect(questions[0].id).toBe("db-question-1");
        for (const question of questions.slice(1)) {
          expect(replayIds.has(question.id)).toBe(false);
          replayIds.add(question.id);
        }
      }
      expect(replayIds.size).toBe(20);
    } finally { clock.mockRestore(); random.mockRestore(); }
  });

  it("uses fresh exact offline questions before replaying a small curated pool", async () => {
    const questions = await fetchQuestions(Difficulty.Sage, 3, "general", undefined, "ar", "curated-plus-offline");
    expect(questions[0].id).toBe("db-question-1");
    expect(new Set(questions.map(question => question.text)).size).toBe(3);
    clearUsedQuestions("curated-plus-offline");
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
      { id: "advanced", category: "general", difficulty: Difficulty.Sage, text: "Question", options: ["A", "B"], type: QuestionType.MultiSelect, correctIndices: [0, 1] },
      { id: "single", category: "general", difficulty: Difficulty.Sage, text: "Question", options: ["A", "B"], type: QuestionType.MultipleChoice, correctIndex: 1 },
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

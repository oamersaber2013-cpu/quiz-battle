import type { PrismaClient } from "@prisma/client";
import { Difficulty, QuestionType } from "@quiz-battle/shared";
import { seedQuestions } from "../../../../packages/db/prisma/seed";

describe("Bilingual database seed", () => {
  it("writes the actual game enums and numeric answer strings for every seeded question", async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const db = { question: { upsert } } as unknown as Pick<PrismaClient, "question">;
    const log = jest.spyOn(console, "log").mockImplementation();
    try {
      await seedQuestions(db);
    } finally {
      log.mockRestore();
    }

    expect(upsert).toHaveBeenCalled();
    const creates = upsert.mock.calls.map(([args]) => args.create);
    expect(new Set(creates.map((q) => q.difficulty))).toEqual(
      new Set([Difficulty.Easy, Difficulty.Medium, Difficulty.Hard])
    );
    for (const question of creates) {
      expect(question.type).toBe(QuestionType.MultipleChoice);
      expect(question.correctAnswer).toMatch(/^[0-3]$/);
      expect(question).not.toHaveProperty("correctIndex");
      expect(JSON.parse(question.optionsEnJson)).toHaveLength(4);
      expect(JSON.parse(question.optionsArJson)).toHaveLength(4);
    }
  });
});

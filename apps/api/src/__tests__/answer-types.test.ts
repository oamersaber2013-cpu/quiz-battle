jest.mock("@quiz-battle/db", () => ({ prisma: {} }));
jest.mock("../lib/analytics", () => ({ trackEvent: jest.fn(async () => {}) }));
jest.mock("../lib/aiBots", () => ({ removeBots: jest.fn(), getBotInfo: jest.fn() }));
jest.mock("../lib/questions", () => ({
  fetchQuestions: jest.fn(), clearUsedQuestions: jest.fn(),
  applyFiftyFifty: jest.fn(), computePowerUpEffect: jest.fn(),
}));

import { Difficulty, GameMode, GameStatus, QuestionType } from "@quiz-battle/shared";
import { fetchQuestions } from "../lib/questions";
import { getViewerAnswerResult, handlePlayerAnswer, removeActiveGame, setActiveGame, startGame } from "../lib/gameOrchestrator";
import { SafeRedis } from "../lib/redis";

describe("Typed answers through a live round", () => {
  const emit = jest.fn();
  const io = { to: jest.fn(() => ({ emit })) } as any;
  const redis = new SafeRedis(null);
  let game: any;
  let running: Promise<void>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(100000);
    emit.mockClear();
    game = {
      gameId: "answer-room", joinCode: "TYPED", hostId: "human", mode: GameMode.Classic,
      difficulty: Difficulty.Sage, language: "en", status: GameStatus.Lobby,
      players: { human: { userId: "human", username: "Human", score: 0, streak: 0, rank: 0,
        isConnected: true, isEliminated: false, powerUpInventory: [] } },
      questions: [], currentRound: 0, totalRounds: 1, maxPlayers: 8,
      questionStartTime: 0, answersThisRound: {}, lastAnswerByPlayer: {}, activeEffects: [],
    };
    setActiveGame(game.gameId, game);
  });

  afterEach(async () => {
    await jest.advanceTimersByTimeAsync(35000);
    await running;
    removeActiveGame(game.gameId);
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function begin(type: QuestionType, key: Record<string, unknown>, options = ["One", "Two", "Three"]) {
    (fetchQuestions as jest.Mock).mockResolvedValue([{
      id: "typed-q", category: "general", difficulty: Difficulty.Sage, type,
      text: "Question", options, timeLimit: 15, correctIndex: -1, ...key,
    }]);
    running = startGame(io, redis, game.gameId);
    await jest.advanceTimersByTimeAsync(5500);
  }

  it.each([
    [QuestionType.FillBlank, { correctAnswer: "Paris", acceptedAnswers: ["City of Paris"] }, "  CITY  of Paris "],
    [QuestionType.MultiSelect, { correctIndices: [0, 2] }, [2, 0]],
    [QuestionType.Ordering, { correctOrder: [2, 0, 1] }, [2, 0, 1]],
  ])("awards points for the actual %s answer", async (type, key, answer) => {
    await begin(type as QuestionType, key);
    await handlePlayerAnswer(game, io, redis, "human", "typed-q", answer as any, Date.now());
    await jest.advanceTimersByTimeAsync(1000);
    const result = emit.mock.calls.find(([event]) => event === "game:answerResult")?.[1];
    expect(result?.correct).toBe(true);
    expect(result?.scoreDelta).toBeGreaterThan(0);
    expect(game.players.human.score).toBe(result.scoreDelta);
  });

  it("never broadcasts answer keys, alternatives or explanations with a question", async () => {
    await begin(QuestionType.FillBlank, {
      correctAnswer: "Paris", acceptedAnswers: ["City of Paris"], correctIndices: [0, 2], correctOrder: [2, 0, 1],
      explanation: "The answer is Paris", explanationEn: "Paris", explanationAr: "باريس",
    });
    const question = emit.mock.calls.find(([event]) => event === "game:question")![1].question;
    for (const field of ["correctIndex", "correctAnswer", "acceptedAnswers", "correctIndices", "correctOrder", "explanation", "explanationEn", "explanationAr"])
      expect(question).not.toHaveProperty(field);
    expect(question.text).toBe("Question");
  });

  it("rejects malformed multi-select answers before locking the player's valid submission", async () => {
    await begin(QuestionType.MultiSelect, { correctIndices: [0, 2] });
    for (const answer of [[0, 0, 2], [0, 99], ["0", 2], [], 0]) {
      await handlePlayerAnswer(game, io, redis, "human", "typed-q", answer as any, Date.now());
      expect(game.answersThisRound.human).toBeUndefined();
    }
    await handlePlayerAnswer(game, io, redis, "human", "typed-q", [0, 2] as any, Date.now());
    expect(game.answersThisRound.human).toBeDefined();
  });

  it("keeps legacy numeric multiple-choice answers and first-answer locking", async () => {
    await begin(QuestionType.MultipleChoice, { correctIndex: 1 });
    await handlePlayerAnswer(game, io, redis, "human", "typed-q", 1, Date.now());
    await handlePlayerAnswer(game, io, redis, "human", "typed-q", 0, Date.now());
    expect(game.answersThisRound.human.index).toBe(1);
    await jest.advanceTimersByTimeAsync(1000);
    const result = emit.mock.calls.find(([event]) => event === "game:answerResult")![1];
    expect(result.correct).toBe(true);
    expect(result.correctIndex).toBe(1);
  });

  it("requires the complete ordering rather than a duplicate, partial or reordered answer", async () => {
    await begin(QuestionType.Ordering, { correctOrder: [2, 0, 1] });
    for (const answer of [[2, 0], [2, 0, 0], [2, 0, 99]]) {
      await handlePlayerAnswer(game, io, redis, "human", "typed-q", answer, Date.now());
      expect(game.answersThisRound.human).toBeUndefined();
    }
    await handlePlayerAnswer(game, io, redis, "human", "typed-q", [0, 2, 1], Date.now());
    await jest.advanceTimersByTimeAsync(1000);
    const result = emit.mock.calls.find(([event]) => event === "game:answerResult")![1];
    expect(result.correct).toBe(false);
    expect(result.correctOrder).toEqual([2, 0, 1]);
    expect(result.scoreDelta).toBe(0);
  });

  it("does not let a client submit a correctness object instead of an answer", async () => {
    await begin(QuestionType.FillBlank, { correctAnswer: "Paris" }, []);
    await handlePlayerAnswer(game, io, redis, "human", "typed-q", { answer: "wrong", correct: true } as any, Date.now());
    expect(game.answersThisRound.human).toBeUndefined();
    await handlePlayerAnswer(game, io, redis, "human", "typed-q", "wrong", Date.now());
    await jest.advanceTimersByTimeAsync(1000);
    const result = emit.mock.calls.find(([event]) => event === "game:answerResult")![1];
    expect(result.correct).toBe(false);
    expect(result.correctAnswer).toBe("Paris");
    expect(result.scoreDelta).toBe(0);
  });

  it("reports the scored answer counts and keeps final results for reconnect", async () => {
    await begin(QuestionType.FillBlank, { correctAnswer: "Paris" }, []);
    await handlePlayerAnswer(game, io, redis, "human", "typed-q", "Paris", Date.now());
    await jest.advanceTimersByTimeAsync(5000);
    await running;
    const results = emit.mock.calls.find(([event]) => event === "game:end")![1].results;
    expect(results[0]).toMatchObject({ correctAnswers: 1, totalAnswers: 1, avgAnswerTime: 500 });
    expect(game.finalResults).toEqual(results);
  });

  it("restores the stored reveal only after scoring and never exposes it while answering", async () => {
    await begin(QuestionType.MultiSelect, { correctIndices: [0, 2] });
    expect(getViewerAnswerResult(game.gameId, "human")).toBeNull();
    await handlePlayerAnswer(game, io, redis, "human", "typed-q", [0, 2], Date.now());
    expect(getViewerAnswerResult(game.gameId, "human")).toBeNull();
    await jest.advanceTimersByTimeAsync(1000);
    const result = emit.mock.calls.find(([event]) => event === "game:answerResult")![1];
    expect(getViewerAnswerResult(game.gameId, "human")).toEqual({
      correct: true, correctIndex: -1, correctIndices: [0, 2], scoreDelta: result.scoreDelta, newScore: result.newScore,
    });
    expect(getViewerAnswerResult(game.gameId, "outsider")).toBeNull();
  });

  it("scores a bot's typed answer once through the same reveal as a human", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    game.players.human.isBot = true;
    await begin(QuestionType.Ordering, { correctOrder: [2, 0, 1] });
    await jest.advanceTimersByTimeAsync(3500);
    const result = emit.mock.calls.find(([event]) => event === "game:answerResult")![1];
    expect(result.correct).toBe(true);
    expect(game.players.human.score).toBe(result.scoreDelta);
    expect(game.players.human.streak).toBe(1);
  });

  it("requests only numeric-choice questions for the specialized Chaos interface", async () => {
    game.mode = GameMode.Chaos;
    await begin(QuestionType.MultipleChoice, { correctIndex: 1 });
    expect(fetchQuestions).toHaveBeenLastCalledWith(
      Difficulty.Sage, 1, undefined, undefined, "en", game.gameId, { singleChoiceOnly: true }
    );
  });
});

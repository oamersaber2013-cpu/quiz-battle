import { ClientQuestion, QuestionType, SubmittedAnswer } from "@quiz-battle/shared";

function validIndices(value: unknown, optionCount: number): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.length <= optionCount &&
    value.every(index => Number.isInteger(index) && index >= 0 && index < optionCount) &&
    new Set(value).size === value.length;
}

function normalizedText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isSingleChoiceQuestion(question: ClientQuestion): boolean {
  return !!question && Array.isArray(question.options) &&
    ![QuestionType.FillBlank, QuestionType.MultiSelect, QuestionType.Ordering].includes(question.type ?? QuestionType.MultipleChoice) &&
    Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < question.options.length;
}

export function hasValidAnswerKey(question: ClientQuestion): boolean {
  if (!question || !Array.isArray(question.options)) return false;
  if (question.type === QuestionType.FillBlank) {
    return typeof question.correctAnswer === "string" && normalizedText(question.correctAnswer).length > 0 &&
      question.correctAnswer.length <= 256 && (!question.acceptedAnswers ||
        (Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length <= 64 &&
          question.acceptedAnswers.every(answer => typeof answer === "string" && answer.length <= 256)));
  }
  if (question.type === QuestionType.MultiSelect) return validIndices(question.correctIndices, question.options.length);
  if (question.type === QuestionType.Ordering)
    return validIndices(question.correctOrder, question.options.length) && question.correctOrder.length === question.options.length;
  return isSingleChoiceQuestion(question);
}

export function normalizeSubmittedAnswer(question: ClientQuestion, answer: unknown): SubmittedAnswer | undefined {
  if (!hasValidAnswerKey(question)) return undefined;
  if (question.type === QuestionType.FillBlank) {
    return typeof answer === "string" && answer.length <= 256 && answer.trim().length > 0 ? answer.trim() : undefined;
  }
  if (question.type === QuestionType.MultiSelect || question.type === QuestionType.Ordering) {
    if (!validIndices(answer, question.options.length)) return undefined;
    if (question.type === QuestionType.Ordering && answer.length !== question.options.length) return undefined;
    return [...answer];
  }
  return typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer < question.options.length
    ? answer : undefined;
}

export function isAnswerCorrect(question: ClientQuestion, answer: unknown): boolean {
  const value = normalizeSubmittedAnswer(question, answer);
  if (value === undefined) return false;
  if (question.type === QuestionType.FillBlank) {
    return [question.correctAnswer, ...(question.acceptedAnswers || [])]
      .some(expected => normalizedText(expected) === normalizedText(value as string));
  }
  if (question.type === QuestionType.MultiSelect) {
    const indices = value as number[];
    return indices.length === question.correctIndices.length && indices.every(index => question.correctIndices.includes(index));
  }
  if (question.type === QuestionType.Ordering)
    return (value as number[]).every((index, position) => question.correctOrder[position] === index);
  return value === question.correctIndex;
}

export function getAnswerFeedback(question: ClientQuestion) {
  if (question.type === QuestionType.FillBlank) return { correctIndex: -1, correctAnswer: question.correctAnswer };
  if (question.type === QuestionType.MultiSelect) return { correctIndex: -1, correctIndices: [...question.correctIndices] };
  if (question.type === QuestionType.Ordering) return { correctIndex: -1, correctOrder: [...question.correctOrder] };
  return { correctIndex: question.correctIndex ?? -1 };
}

export function getBotAnswer(question: ClientQuestion, correct: boolean): SubmittedAnswer | undefined {
  if (!hasValidAnswerKey(question)) return undefined;
  if (question.type === QuestionType.FillBlank) return correct ? question.correctAnswer : "__incorrect_answer__";
  if (question.type === QuestionType.MultiSelect) {
    if (correct) return [...question.correctIndices];
    if (question.correctIndices.length > 1) return [question.correctIndices[0]];
    return [question.options.findIndex((_, index) => !question.correctIndices.includes(index))];
  }
  if (question.type === QuestionType.Ordering)
    return correct ? [...question.correctOrder] : [...question.correctOrder.slice(1), question.correctOrder[0]];
  return correct ? question.correctIndex : question.options.findIndex((_, index) => index !== question.correctIndex);
}

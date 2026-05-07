interface AnswerData {
  userId: string;
  questionId: string;
  answerTime: number;
  correct: boolean;
  timestamp: number;
}

const userAnswerHistory = new Map<string, AnswerData[]>();
const suspiciousUsers = new Set<string>();

const THRESHOLDS = {
  MIN_ANSWER_TIME: 500,
  MAX_CORRECT_STREAK_FAST: 5,
  SUSPICIOUS_ACCURACY_THRESHOLD: 0.95,
  MIN_ANSWERS_FOR_ANALYSIS: 10,
};

export function recordAnswer(data: AnswerData) {
  if (!userAnswerHistory.has(data.userId)) {
    userAnswerHistory.set(data.userId, []);
  }
  
  const history = userAnswerHistory.get(data.userId)!;
  history.push(data);
  
  if (history.length > 100) {
    history.shift();
  }
  
  analyzeUser(data.userId);
}

function analyzeUser(userId: string) {
  const history = userAnswerHistory.get(userId);
  if (!history || history.length < THRESHOLDS.MIN_ANSWERS_FOR_ANALYSIS) {
    return;
  }
  
  const recentAnswers = history.slice(-20);
  
  const fastCorrectStreak = checkFastCorrectStreak(recentAnswers);
  const suspiciousAccuracy = checkSuspiciousAccuracy(recentAnswers);
  const impossibleTiming = checkImpossibleTiming(recentAnswers);
  
  if (fastCorrectStreak || suspiciousAccuracy || impossibleTiming) {
    suspiciousUsers.add(userId);
    console.warn(`[ANTI-CHEAT] Suspicious activity detected for user ${userId}`);
  }
}

function checkFastCorrectStreak(answers: AnswerData[]): boolean {
  let streak = 0;
  
  for (const answer of answers) {
    if (answer.correct && answer.answerTime < THRESHOLDS.MIN_ANSWER_TIME) {
      streak++;
      if (streak >= THRESHOLDS.MAX_CORRECT_STREAK_FAST) {
        return true;
      }
    } else {
      streak = 0;
    }
  }
  
  return false;
}

function checkSuspiciousAccuracy(answers: AnswerData[]): boolean {
  const correct = answers.filter(a => a.correct).length;
  const accuracy = correct / answers.length;
  
  const avgTime = answers.reduce((sum, a) => sum + a.answerTime, 0) / answers.length;
  
  return accuracy > THRESHOLDS.SUSPICIOUS_ACCURACY_THRESHOLD && avgTime < 1000;
}

function checkImpossibleTiming(answers: AnswerData[]): boolean {
  const veryFastAnswers = answers.filter(a => a.answerTime < 200).length;
  return veryFastAnswers > answers.length * 0.5;
}

export function isSuspicious(userId: string): boolean {
  return suspiciousUsers.has(userId);
}

export function clearUserHistory(userId: string) {
  userAnswerHistory.delete(userId);
  suspiciousUsers.delete(userId);
}

export function getSuspiciousUsers(): string[] {
  return Array.from(suspiciousUsers);
}

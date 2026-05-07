import {
  BASE_SCORE,
  DIFFICULTY_MULTIPLIER,
  Difficulty,
  FinalResult,
  GameMode,
  PlayerState,
  TIME_BONUS_FACTOR,
} from "@quiz-battle/shared";

interface AnswerRecord {
  userId: string;
  answerIndex: number;
  timestamp: number;
  isCorrect: boolean;
  scoreDelta: number;
  latencyMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING SYSTEM — Simple, transparent, no XP/rank
//
// How it works:
// - Base score per correct answer = 1000
// - Difficulty multiplier scales that:
//     Novice: ×1 = 1000 base
//     Scholar: ×1.5 = 1500 base
//     Sage: ×2 = 2000 base
//     Master: ×3 = 3000 base
//     Legend: ×5 = 5000 base
// - Speed bonus: up to +50% of base for fast answers
// - Wrong answer = 0 points (no penalty)
// - DoubleDown power-up = ×2
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateScoreDelta(params: {
  isCorrect: boolean;
  difficulty: Difficulty;
  timeLimit: number;
  latencyMs: number;
  hasDoubleDown: boolean;
}): number {
  if (!params.isCorrect) return 0;

  const base = BASE_SCORE * DIFFICULTY_MULTIPLIER[params.difficulty];
  const timeFraction = Math.max(0, 1 - params.latencyMs / (params.timeLimit * 1000));
  const timeBonus = base * TIME_BONUS_FACTOR * timeFraction;
  const total = Math.round(base + timeBonus);

  return params.hasDoubleDown ? total * 2 : total;
}

// Validate answer timing (anti-cheat)
export function isTimingValid(
  clientTimestamp: number,
  questionStartTime: number,
  timeLimitMs: number
): boolean {
  const serverNow = Date.now();
  const elapsed = serverNow - questionStartTime;
  const clientElapsed = clientTimestamp - questionStartTime;

  // Reject if answer came before question was sent (impossible)
  if (clientElapsed < 0) return false;

  // Reject if answer came after time limit + 500ms tolerance
  if (elapsed > timeLimitMs + 500) return false;

  // Reject if client-reported time is impossibly fast (<200ms = bot-like)
  if (clientElapsed < 200) return false;

  return true;
}

// Apply steal power-up: take points from target
export function applyStealPowerUp(
  players: Record<string, PlayerState>,
  sourceId: string,
  targetId: string,
  stealAmount = 200
): Record<string, PlayerState> {
  const updated = { ...players };
  if (!updated[targetId] || !updated[sourceId]) return updated;

  const actual = Math.min(stealAmount, updated[targetId].score);
  updated[targetId] = { ...updated[targetId], score: updated[targetId].score - actual };
  updated[sourceId] = { ...updated[sourceId], score: updated[sourceId].score + actual };
  return updated;
}

// Apply WHOLE power-up: mirror target's last answer
export function applyWholePowerUp(
  players: Record<string, PlayerState>,
  sourceId: string,
  targetLastAnswerCorrect: boolean
): { deductFromTarget: boolean; bonus: number } {
  return {
    deductFromTarget: !targetLastAnswerCorrect,
    bonus: targetLastAnswerCorrect ? 300 : 0,
  };
}

export function computeFinalResults(
  players: Record<string, PlayerState>,
  answerHistory: Map<string, AnswerRecord[]>,
  _difficulty: Difficulty = Difficulty.Novice
): FinalResult[] {
  const results: FinalResult[] = Object.values(players).map((p) => {
    const history = answerHistory.get(p.userId) || [];
    const correctAnswers = history.filter((a) => a.isCorrect).length;
    const totalAnswers = history.length;
    const avgAnswerTime =
      totalAnswers > 0
        ? history.reduce((sum, a) => sum + a.latencyMs, 0) / totalAnswers
        : 0;

    return {
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      score: p.score,
      rank: 0, // set below
      correctAnswers,
      totalAnswers,
      avgAnswerTime: Math.round(avgAnswerTime),
      xpEarned: 0, // No XP system — kept for type compat, always 0
    };
  });

  // Sort by score, assign ranks
  results.sort((a, b) => b.score - a.score);
  results.forEach((r, i) => (r.rank = i + 1));

  return results;
}

// Survival mode: check eliminations
export function checkSurvivalEliminations(
  players: Record<string, PlayerState>,
  incorrectUserIds: string[],
  _mode: GameMode
): string[] {
  return incorrectUserIds.filter((id) => {
    const p = players[id];
    return !!p && !p.isEliminated;
  });
}

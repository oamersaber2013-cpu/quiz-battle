// ═══════════════════════════════════════════════════════════════════════════════
// TRAP SYSTEM V2.0 - Multi-Outcome Pressure System
// Features: Threshold zones, betrayal mechanics, progressive penalties, hero moments
// ═══════════════════════════════════════════════════════════════════════════════

import { Server } from "socket.io";
import { 
  getChaosV2, 
  incrementFactor 
} from "./chaosEngineV2";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export type TrapOutcome = "FULL_TRAP" | "PARTIAL_TRAP" | "NEUTRAL" | "BROKEN" | "HERO_BREAK";
export type AnswerMode = "SAFE" | "RISK";

interface PlayerAnswer {
  playerId: string;
  username: string;
  isCorrect: boolean;
  answerMode: AnswerMode;
  answerTime: number; // milliseconds
  scoreBefore: number;
}

interface TrapState {
  gameId: string;
  targetPlayerId: string;
  targetUsername: string;
  questionIndex: number;
  status: "PENDING" | "ACTIVE" | "EVALUATING" | "RESOLVED";
  
  // Player data
  playerAnswers: Map<string, PlayerAnswer>;
  totalPlayers: number;
  
  // Trap metrics
  trapLevel: number; // Escalating trap intensity
  trapWeight: number; // Accumulated from risk answers
  
  // Outcome data
  outcome?: TrapOutcome;
  correctRatio: number;
  averageAnswerTime: number;
  
  // Results
  penalties: Map<string, number>; // playerId -> penalty amount
  refunds: Map<string, number>; // playerId -> refund amount
  bonuses: Map<string, number>; // playerId -> bonus amount
  
  // Hero moment
  heroPlayerId?: string;
  heroUsername?: string;
}

interface TrapConfig {
  // Thresholds
  partialTrapThreshold: number; // 0.3 (30% correct)
  neutralThreshold: number; // 0.6 (60% correct)
  
  // Base penalties
  fullTrapBasePenalty: number; // 60
  partialTrapBasePenalty: number; // 30
  breakZonePenalty: number; // Extra for target if broken
  
  // Refunds
  fullTrapRefund: number; // 100% of previous loss
  partialTrapRefund: number; // 50% of previous loss
  
  // Bonuses
  heroBonus: number; // 80
  correctAnswerBonus: number; // 20
  
  // Risk mode weights
  riskModeTrapWeight: number; // 2
  safeModeTrapWeight: number; // 1
  
  // Anti-collusion
  slowAnswerThreshold: number; // 8000ms (8 seconds)
  collusionReductionFactor: number; // 0.5
  
  // Progressive escalation
  trapLevelMultiplier: number; // 1.5x per trap
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_TRAP_CONFIG: TrapConfig = {
  partialTrapThreshold: 0.3, // 30% correct = partial trap
  neutralThreshold: 0.6, // 60% correct = neutral/break zone
  
  fullTrapBasePenalty: 60,
  partialTrapBasePenalty: 30,
  breakZonePenalty: 40, // Target loses extra if trap breaks
  
  fullTrapRefund: 1.0, // 100%
  partialTrapRefund: 0.5, // 50%
  
  heroBonus: 80,
  correctAnswerBonus: 20,
  
  riskModeTrapWeight: 2,
  safeModeTrapWeight: 1,
  
  slowAnswerThreshold: 8000, // 8 seconds
  collusionReductionFactor: 0.5,
  
  trapLevelMultiplier: 1.5,
};

// Store trap states
const trapStates = new Map<string, TrapState>();

// Track trap levels per game (escalating)
const gameTrapLevels = new Map<string, number>();

// ═══════════════════════════════════════════════════════════════════════════════
// TRAP INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export function initializeTrap(
  gameId: string,
  targetPlayerId: string,
  targetUsername: string,
  questionIndex: number,
  totalPlayers: number
): TrapState {
  // Get escalating trap level
  const currentLevel = gameTrapLevels.get(gameId) || 1;
  gameTrapLevels.set(gameId, currentLevel);
  
  const trap: TrapState = {
    gameId,
    targetPlayerId,
    targetUsername,
    questionIndex,
    status: "ACTIVE",
    playerAnswers: new Map(),
    totalPlayers,
    trapLevel: currentLevel,
    trapWeight: 0,
    correctRatio: 0,
    averageAnswerTime: 0,
    penalties: new Map(),
    refunds: new Map(),
    bonuses: new Map(),
  };
  
  trapStates.set(gameId, trap);
  
  console.log(`[TRAP] Trap Level ${currentLevel} activated for ${targetUsername}`);
  
  return trap;
}

export function getTrap(gameId: string): TrapState | undefined {
  return trapStates.get(gameId);
}

export function cleanupTrap(gameId: string): void {
  trapStates.delete(gameId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER ANSWER RECORDING
// ═══════════════════════════════════════════════════════════════════════════════

export function recordPlayerAnswer(
  gameId: string,
  playerId: string,
  username: string,
  isCorrect: boolean,
  answerMode: AnswerMode,
  answerTime: number,
  scoreBefore: number
): void {
  const trap = getTrap(gameId);
  if (!trap || trap.status !== "ACTIVE") return;
  
  // Record answer
  trap.playerAnswers.set(playerId, {
    playerId,
    username,
    isCorrect,
    answerMode,
    answerTime,
    scoreBefore,
  });
  
  // Update trap weight based on answer mode
  const weight = answerMode === "RISK" 
    ? DEFAULT_TRAP_CONFIG.riskModeTrapWeight 
    : DEFAULT_TRAP_CONFIG.safeModeTrapWeight;
  
  trap.trapWeight += weight;
  
  console.log(`[TRAP] ${username} answered (${answerMode}) - weight: ${weight}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TARGET PLAYER ADVANTAGES
// ═══════════════════════════════════════════════════════════════════════════════

export function getTargetAdvantages(gameId: string, targetPlayerId: string): {
  hint?: string;
  timeBonus: number;
  eliminatedOptions: number;
} {
  const trap = getTrap(gameId);
  if (!trap || trap.targetPlayerId !== targetPlayerId) {
    return { timeBonus: 0, eliminatedOptions: 0 };
  }
  
  // Give target player advantages based on trap level
  const advantages = {
    timeBonus: 3 + trap.trapLevel, // +3 to +5 seconds
    eliminatedOptions: trap.trapLevel >= 2 ? 1 : 0, // Remove 1 wrong answer at level 2+
  };
  
  return advantages;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRAP EVALUATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

export async function evaluateTrap(
  gameId: string,
  io: Server,
  config: Partial<TrapConfig> = {}
): Promise<TrapOutcome | null> {
  const trap = getTrap(gameId);
  if (!trap || trap.status !== "ACTIVE") return null;
  
  // Move to evaluating state
  trap.status = "EVALUATING";
  
  // Calculate metrics
  calculateTrapMetrics(trap);
  
  // Detect collusion
  const isCollusion = detectCollusion(trap);
  
  // Determine outcome based on thresholds
  const outcome = determineOutcome(trap, isCollusion);
  trap.outcome = outcome;
  
  // Calculate results
  calculateResults(trap, { ...DEFAULT_TRAP_CONFIG, ...config }, isCollusion);
  
  // Emit suspense message
  io.to(gameId).emit("trap:evaluating", {
    message: "🤔 Evaluating Trap Outcome...",
    correctRatio: Math.round(trap.correctRatio * 100),
    playerCount: trap.playerAnswers.size,
  });
  
  // Wait 1.5 seconds for suspense
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Emit results
  emitTrapResults(io, trap);
  
  // Update chaos
  updateChaosFromTrap(gameId, outcome);
  
  // Escalate trap level for next time
  escalateTrapLevel(gameId);
  
  // Move to resolved
  trap.status = "RESOLVED";
  
  return outcome;
}

function calculateTrapMetrics(trap: TrapState): void {
  const answers = Array.from(trap.playerAnswers.values());
  const totalAnswers = answers.length;
  
  if (totalAnswers === 0) {
    trap.correctRatio = 0;
    trap.averageAnswerTime = 0;
    return;
  }
  
  // Calculate correct ratio
  const correctCount = answers.filter(a => a.isCorrect).length;
  trap.correctRatio = correctCount / trap.totalPlayers;
  
  // Calculate average answer time
  const totalTime = answers.reduce((sum, a) => sum + a.answerTime, 0);
  trap.averageAnswerTime = totalTime / totalAnswers;
  
  // Find hero (if any correct answers in low-ratio scenario)
  if (correctCount > 0 && correctCount < trap.totalPlayers * 0.3) {
    // Find the fastest correct answer
    const correctAnswers = answers.filter(a => a.isCorrect);
    const hero = correctAnswers.reduce((fastest, current) => 
      current.answerTime < fastest.answerTime ? current : fastest
    );
    trap.heroPlayerId = hero.playerId;
    trap.heroUsername = hero.username;
  }
}

function detectCollusion(trap: TrapState): boolean {
  // Check for suspicious patterns:
  // 1. Everyone answers wrong
  // 2. Everyone answers slowly (possible intentional failing)
  
  const answers = Array.from(trap.playerAnswers.values());
  const allWrong = answers.every(a => !a.isCorrect);
  const averageTooSlow = trap.averageAnswerTime > DEFAULT_TRAP_CONFIG.slowAnswerThreshold;
  
  return allWrong && averageTooSlow;
}

function determineOutcome(trap: TrapState, isCollusion: boolean): TrapOutcome {
  const ratio = trap.correctRatio;
  const config = DEFAULT_TRAP_CONFIG;
  
  // Apply trap weight influence (risk answers make trap more likely)
  const adjustedRatio = ratio * (1 - (trap.trapWeight / (trap.totalPlayers * 3)));
  
  if (adjustedRatio === 0) {
    return isCollusion ? "PARTIAL_TRAP" : "FULL_TRAP";
  }
  
  if (adjustedRatio < config.partialTrapThreshold) {
    return "PARTIAL_TRAP";
  }
  
  if (adjustedRatio < config.neutralThreshold) {
    return "NEUTRAL";
  }
  
  // Check for hero moment
  if (trap.heroPlayerId && ratio < config.neutralThreshold * 0.7) {
    return "HERO_BREAK";
  }
  
  return "BROKEN";
}

function calculateResults(
  trap: TrapState,
  config: TrapConfig,
  isCollusion: boolean
): void {
  const { outcome, trapLevel, targetPlayerId } = trap;
  
  // Calculate progressive penalty based on trap level
  const levelMultiplier = Math.pow(config.trapLevelMultiplier, trapLevel - 1);
  
  let basePenalty = 0;
  let targetRefund = 0;
  
  switch (outcome) {
    case "FULL_TRAP":
      basePenalty = config.fullTrapBasePenalty * levelMultiplier;
      targetRefund = config.fullTrapRefund;
      break;
      
    case "PARTIAL_TRAP":
      basePenalty = config.partialTrapBasePenalty * levelMultiplier;
      targetRefund = config.partialTrapRefund;
      // Reduce further if collusion detected
      if (isCollusion) {
        basePenalty *= config.collusionReductionFactor;
      }
      break;
      
    case "NEUTRAL":
      basePenalty = 0;
      targetRefund = 0;
      break;
      
    case "BROKEN":
      basePenalty = 0;
      targetRefund = 0;
      // Target loses extra for letting trap break
      trap.penalties.set(targetPlayerId, config.breakZonePenalty);
      break;
      
    case "HERO_BREAK":
      basePenalty = 0;
      targetRefund = 0;
      // Hero gets bonus
      if (trap.heroPlayerId) {
        trap.bonuses.set(trap.heroPlayerId, config.heroBonus);
      }
      break;
  }
  
  // Apply penalties to all players (except target and correct answers in some cases)
  if (basePenalty > 0) {
    for (const [playerId, answer] of trap.playerAnswers) {
      // Target doesn't get penalized
      if (playerId === targetPlayerId) continue;
      
      // In full trap, everyone loses
      // In partial trap, only wrong answers lose
      if (outcome === "FULL_TRAP" || (outcome === "PARTIAL_TRAP" && !answer.isCorrect)) {
        trap.penalties.set(playerId, basePenalty);
      }
    }
  }
  
  // Give target refund (percentage of their previous loss)
  // This would need to be calculated based on their actual previous loss
  // For now, using a flat amount scaled by trap level
  const refundAmount = 50 * targetRefund * trapLevel;
  if (refundAmount > 0) {
    trap.refunds.set(targetPlayerId, refundAmount);
  }
  
  // Give bonuses to correct answers (except in full trap)
  if (outcome !== "FULL_TRAP") {
    for (const [playerId, answer] of trap.playerAnswers) {
      if (answer.isCorrect) {
        // Check if they're the hero
        const bonus = playerId === trap.heroPlayerId 
          ? config.heroBonus 
          : config.correctAnswerBonus;
        trap.bonuses.set(playerId, bonus);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS INTERACTION
// ═══════════════════════════════════════════════════════════════════════════════

function updateChaosFromTrap(gameId: string, outcome: TrapOutcome): void {
  const state = getChaosV2(gameId);
  if (!state) return;
  
  // Chaos V2: Use factors instead of direct level
  const chaosIncrease = outcome === "FULL_TRAP" || outcome === "PARTIAL_TRAP" 
    ? 3 // Trap succeeded - more chaos factor
    : 1; // Trap failed - less chaos factor
  
  // Increment drama events factor (this affects chaos calculation)
  state.factors.dramaEvents += chaosIncrease;
  state.factors.wrongAnswersStreak += 1; // Trap adds wrong answer chaos
}

function escalateTrapLevel(gameId: string): void {
  const currentLevel = gameTrapLevels.get(gameId) || 1;
  gameTrapLevels.set(gameId, currentLevel + 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOCKET EVENT EMITTERS
// ═══════════════════════════════════════════════════════════════════════════════

function emitTrapResults(io: Server, trap: TrapState): void {
  const { outcome, heroUsername, correctRatio } = trap;
  
  const outcomeMessages: Record<TrapOutcome, { title: string; emoji: string; color: string }> = {
    FULL_TRAP: { title: "💀 FULL TRAP SUCCESS", emoji: "💀", color: "#ff4757" },
    PARTIAL_TRAP: { title: "🔥 PARTIAL TRAP", emoji: "🔥", color: "#ffa502" },
    NEUTRAL: { title: "⚖️ TRAP NEUTRALIZED", emoji: "⚖️", color: "#ffd700" },
    BROKEN: { title: "🛡️ TRAP BROKEN", emoji: "🛡️", color: "#00e676" },
    HERO_BREAK: { title: "🦸 HERO BREAK", emoji: "🦸", color: "#00d4ff" },
  };
  
  const result = outcomeMessages[outcome!];
  
  // Build detailed results
  const playerResults: Array<{
    playerId: string;
    username: string;
    penalty: number;
    refund: number;
    bonus: number;
    netResult: number;
  }> = [];
  
  for (const [playerId, answer] of trap.playerAnswers) {
    const penalty = trap.penalties.get(playerId) || 0;
    const refund = trap.refunds.get(playerId) || 0;
    const bonus = trap.bonuses.get(playerId) || 0;
    
    playerResults.push({
      playerId,
      username: answer.username,
      penalty,
      refund,
      bonus,
      netResult: -penalty + refund + bonus,
    });
  }
  
  // Emit to all players
  io.to(trap.gameId).emit("trap:result", {
    outcome: trap.outcome,
    title: result.title,
    emoji: result.emoji,
    color: result.color,
    correctRatio: Math.round(correctRatio * 100),
    targetPlayerId: trap.targetPlayerId,
    targetUsername: trap.targetUsername,
    heroUsername,
    trapLevel: trap.trapLevel,
    playerResults,
    summary: generateSummary(trap),
  });
}

function generateSummary(trap: TrapState): string {
  const { outcome, heroUsername, targetUsername } = trap;
  
  switch (outcome) {
    case "FULL_TRAP":
      return `Everyone failed! ${targetUsername} gets full refund!`;
    case "PARTIAL_TRAP":
      return `Few escaped! ${targetUsername} gets partial refund.`;
    case "NEUTRAL":
      return `Trap fizzled. No winners, no losers.`;
    case "BROKEN":
      return `${targetUsername} failed to protect the trap!`;
    case "HERO_BREAK":
      return `${heroUsername} saved everyone! Hero!`;
    default:
      return "Trap resolved.";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function getTrapStats(gameId: string): {
  trapLevel: number;
  totalTraps: number;
  canActivate: boolean;
} {
  const level = gameTrapLevels.get(gameId) || 1;
  const trap = getTrap(gameId);
  
  return {
    trapLevel: level,
    totalTraps: level - 1,
    canActivate: !trap || trap.status === "RESOLVED",
  };
}

export function resetTrapLevel(gameId: string): void {
  gameTrapLevels.delete(gameId);
}

// Export everything
export type { TrapState, TrapConfig, PlayerAnswer };

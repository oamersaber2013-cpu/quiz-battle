// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS ENGINE - Unpredictable Social Drama Mode System
// Features: Drama Detection, Voting, Trap Rounds, Chaos Modifiers
// ═══════════════════════════════════════════════════════════════════════════════

import { Server } from "socket.io";
import { GameMode } from "@quiz-battle/shared";

// Types for Chaos System
type DramaType = "TAB_LEFT" | "INACTIVITY" | "SWITCHED_APP" | "SUSPICIOUS_BEHAVIOR";
type VoteOption = "FORGIVE" | "REDUCE_SCORE" | "BLOCK_QUESTION";
type ChaosModifier = 
  | "REVERSE_VOTING" 
  | "SHUFFLE_OPTIONS" 
  | "INVERT_SCORES" 
  | "MODIFY_TIMER" 
  | "TRAP_REVERSAL"
  | "MINOR_CHAOS"
  | "DOUBLE_POINTS"
  | "HIDE_ANSWERS";

interface DramaEvent {
  id: string;
  type: DramaType;
  playerId: string;
  username: string;
  timestamp: number;
  chaosLevelIncrease: number;
}

interface VotingSession {
  dramaEventId: string;
  targetPlayerId: string;
  targetUsername: string;
  votes: Map<string, VoteOption>; // voterId -> vote
  startTime: number;
  duration: number; // milliseconds
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  result?: VoteOption;
}

interface TrapRound {
  targetPlayerId: string;
  questionIndex: number;
  status: "PENDING" | "ACTIVE" | "COMPLETED";
  allFailed: boolean;
  refundAmount: number;
}

interface PlayerTrustScore {
  playerId: string;
  score: number; // 0-100, higher = more trustworthy
  dramaCount: number;
  lastDramaTime: number;
}

interface ChaosState {
  gameId: string;
  chaosLevel: number; // 0-100
  dramaHistory: DramaEvent[];
  activeVoting: VotingSession | null;
  pendingTrap: TrapRound | null;
  trustScores: Map<string, PlayerTrustScore>;
  lastChaosEvent: number; // timestamp
  chaosModifierCooldowns: Map<string, number>; // modifier -> cooldown end time
  playersInTab: Set<string>; // players currently in tab
}

// Chaos probability thresholds (percentage 0-1)
const CHAOS_THRESHOLDS = {
  REVERSE_VOTING: 0.20,      // 20%
  SHUFFLE_OPTIONS: 0.15,     // 15%
  INVERT_SCORES: 0.10,       // 10%
  MODIFY_TIMER: 0.25,          // 25%
  TRAP_REVERSAL: 0.10,         // 10%
  MINOR_CHAOS: 0.40,           // 40% (base)
  DOUBLE_POINTS: 0.15,         // 15%
  HIDE_ANSWERS: 0.12,          // 12%
};

// Chaos level modifiers - higher level = more chaos
const CHAOS_LEVEL_MULTIPLIERS: Record<number, number> = {
  0: 1.0,   // Normal
  25: 1.2,  // Elevated
  50: 1.5,  // High
  75: 2.0,  // Extreme
  90: 2.5,  // Maximum
};

// Store chaos states per game
const chaosStates = new Map<string, ChaosState>();

// ═══════════════════════════════════════════════════════════════════════════════
// CORE CHAOS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function chaosRoll(): number {
  return Math.random();
}

export function initializeChaosState(gameId: string): ChaosState {
  const state: ChaosState = {
    gameId,
    chaosLevel: 0,
    dramaHistory: [],
    activeVoting: null,
    pendingTrap: null,
    trustScores: new Map(),
    lastChaosEvent: 0,
    chaosModifierCooldowns: new Map(),
    playersInTab: new Set(),
  };
  chaosStates.set(gameId, state);
  return state;
}

export function getChaosState(gameId: string): ChaosState | undefined {
  return chaosStates.get(gameId);
}

export function cleanupChaosState(gameId: string): void {
  chaosStates.delete(gameId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS LEVEL MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export function increaseChaosLevel(gameId: string, amount: number): number {
  const state = getChaosState(gameId);
  if (!state) return 0;
  
  state.chaosLevel = Math.min(100, state.chaosLevel + amount);
  return state.chaosLevel;
}

export function decreaseChaosLevel(gameId: string, amount: number): number {
  const state = getChaosState(gameId);
  if (!state) return 0;
  
  state.chaosLevel = Math.max(0, state.chaosLevel - amount);
  return state.chaosLevel;
}

export function getChaosMultiplier(gameId: string): number {
  const state = getChaosState(gameId);
  if (!state) return 1.0;
  
  const level = state.chaosLevel;
  if (level >= 90) return CHAOS_LEVEL_MULTIPLIERS[90];
  if (level >= 75) return CHAOS_LEVEL_MULTIPLIERS[75];
  if (level >= 50) return CHAOS_LEVEL_MULTIPLIERS[50];
  if (level >= 25) return CHAOS_LEVEL_MULTIPLIERS[25];
  return CHAOS_LEVEL_MULTIPLIERS[0];
}

export function getChaosIntensity(gameId: string): "CALM" | "ELEVATED" | "HIGH" | "EXTREME" | "MAXIMUM" {
  const state = getChaosState(gameId);
  if (!state) return "CALM";
  
  const level = state.chaosLevel;
  if (level >= 90) return "MAXIMUM";
  if (level >= 75) return "EXTREME";
  if (level >= 50) return "HIGH";
  if (level >= 25) return "ELEVATED";
  return "CALM";
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAMA DETECTION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

export function recordDramaEvent(
  gameId: string,
  type: DramaType,
  playerId: string,
  username: string
): DramaEvent | null {
  const state = getChaosState(gameId);
  if (!state) return null;
  
  // Anti-abuse: Check cooldown
  const playerTrust = state.trustScores.get(playerId);
  const now = Date.now();
  
  if (playerTrust && now - playerTrust.lastDramaTime < 10000) { // 10 second cooldown
    console.log(`[CHAOS] Drama cooldown active for ${username}`);
    return null;
  }
  
  // Calculate chaos level increase based on drama type
  const chaosIncrease: Record<DramaType, number> = {
    TAB_LEFT: 15,
    INACTIVITY: 8,
    SWITCHED_APP: 12,
    SUSPICIOUS_BEHAVIOR: 10,
  };
  
  const dramaEvent: DramaEvent = {
    id: `drama_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    playerId,
    username,
    timestamp: now,
    chaosLevelIncrease: chaosIncrease[type],
  };
  
  state.dramaHistory.push(dramaEvent);
  increaseChaosLevel(gameId, dramaEvent.chaosLevelIncrease);
  
  // Update trust score
  if (!playerTrust) {
    state.trustScores.set(playerId, {
      playerId,
      score: 100,
      dramaCount: 0,
      lastDramaTime: now,
    });
  } else {
    playerTrust.dramaCount++;
    playerTrust.score = Math.max(0, playerTrust.score - 5);
    playerTrust.lastDramaTime = now;
  }
  
  console.log(`[CHAOS] Drama event: ${type} by ${username}, Chaos Level: ${state.chaosLevel}`);
  
  return dramaEvent;
}

// Player tab visibility tracking
export function playerEnteredTab(gameId: string, playerId: string): void {
  const state = getChaosState(gameId);
  if (state) {
    state.playersInTab.add(playerId);
  }
}

export function playerLeftTab(gameId: string, playerId: string, username: string): DramaEvent | null {
  const state = getChaosState(gameId);
  if (!state) return null;
  
  state.playersInTab.delete(playerId);
  
  // Only record drama during active gameplay
  return recordDramaEvent(gameId, "TAB_LEFT", playerId, username);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOTING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

export function startVotingSession(
  gameId: string,
  dramaEventId: string,
  targetPlayerId: string,
  targetUsername: string,
  voterIds: string[],
  durationMs: number = 5000
): VotingSession | null {
  const state = getChaosState(gameId);
  if (!state) return null;
  
  // Cancel any existing voting
  if (state.activeVoting) {
    state.activeVoting.status = "CANCELLED";
  }
  
  const voting: VotingSession = {
    dramaEventId,
    targetPlayerId,
    targetUsername,
    votes: new Map(),
    startTime: Date.now(),
    duration: durationMs,
    status: "ACTIVE",
  };
  
  state.activeVoting = voting;
  
  // Auto-complete voting after duration
  setTimeout(() => {
    completeVoting(gameId);
  }, durationMs);
  
  return voting;
}

export function castVote(
  gameId: string,
  voterId: string,
  vote: VoteOption
): boolean {
  const state = getChaosState(gameId);
  if (!state || !state.activeVoting) return false;
  
  const voting = state.activeVoting;
  if (voting.status !== "ACTIVE") return false;
  
  // Can't vote for yourself
  if (voterId === voting.targetPlayerId) return false;
  
  // One vote per player
  if (voting.votes.has(voterId)) return false;
  
  voting.votes.set(voterId, vote);
  return true;
}

export function completeVoting(gameId: string): VotingSession | null {
  const state = getChaosState(gameId);
  if (!state || !state.activeVoting) return null;
  
  const voting = state.activeVoting;
  if (voting.status !== "ACTIVE") return voting;
  
  voting.status = "COMPLETED";
  
  // Count votes
  const counts: Record<VoteOption, number> = {
    FORGIVE: 0,
    REDUCE_SCORE: 0,
    BLOCK_QUESTION: 0,
  };
  
  voting.votes.forEach((vote) => {
    counts[vote]++;
  });
  
  // Determine majority
  const totalVotes = voting.votes.size;
  if (totalVotes === 0) {
    voting.result = "FORGIVE"; // Default if no votes
  } else {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    voting.result = sorted[0][0] as VoteOption;
  }
  
  console.log(`[CHAOS] Voting completed: ${voting.result} for ${voting.targetUsername}`);
  
  // Apply trap if punishment selected
  if (voting.result === "REDUCE_SCORE" || voting.result === "BLOCK_QUESTION") {
    createTrapRound(gameId, voting.targetPlayerId);
  }
  
  return voting;
}

export function getVotingResults(gameId: string): VotingSession | null {
  const state = getChaosState(gameId);
  return state?.activeVoting || null;
}

export function cancelVoting(gameId: string): void {
  const state = getChaosState(gameId);
  if (state?.activeVoting) {
    state.activeVoting.status = "CANCELLED";
    state.activeVoting = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRAP ROUND SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

export function createTrapRound(gameId: string, targetPlayerId: string): TrapRound | null {
  const state = getChaosState(gameId);
  if (!state) return null;
  
  const trap: TrapRound = {
    targetPlayerId,
    questionIndex: -1, // Set when question starts
    status: "PENDING",
    allFailed: false,
    refundAmount: 0,
  };
  
  state.pendingTrap = trap;
  
  console.log(`[CHAOS] Trap round created for player ${targetPlayerId}`);
  
  return trap;
}

export function activateTrapRound(gameId: string, questionIndex: number): TrapRound | null {
  const state = getChaosState(gameId);
  if (!state || !state.pendingTrap) return null;
  
  state.pendingTrap.questionIndex = questionIndex;
  state.pendingTrap.status = "ACTIVE";
  
  return state.pendingTrap;
}

export function resolveTrapRound(
  gameId: string,
  allPlayersFailed: boolean,
  pointReduction: number
): TrapRound | null {
  const state = getChaosState(gameId);
  if (!state || !state.pendingTrap) return null;
  
  const trap = state.pendingTrap;
  trap.status = "COMPLETED";
  trap.allFailed = allPlayersFailed;
  
  if (allPlayersFailed) {
    // Refund the target player
    trap.refundAmount = pointReduction;
    console.log(`[CHAOS] Trap resolved - ALL FAILED! Refunding ${pointReduction} points`);
  } else {
    console.log(`[CHAOS] Trap resolved - Someone answered correctly`);
  }
  
  // Clear pending trap
  state.pendingTrap = null;
  
  return trap;
}

export function getPendingTrap(gameId: string): TrapRound | null {
  const state = getChaosState(gameId);
  return state?.pendingTrap || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS MODIFIERS
// ═══════════════════════════════════════════════════════════════════════════════

export function rollChaosModifier(gameId: string): { modifier: ChaosModifier | null; message: string } {
  const state = getChaosState(gameId);
  if (!state) return { modifier: null, message: "" };
  
  // Anti-abuse: One chaos event per question minimum
  const now = Date.now();
  if (now - state.lastChaosEvent < 3000) { // 3 second minimum
    return { modifier: null, message: "" };
  }
  
  // Check cooldowns
  const isOnCooldown = (modifier: ChaosModifier): boolean => {
    const cooldownEnd = state.chaosModifierCooldowns.get(modifier);
    return cooldownEnd ? now < cooldownEnd : false;
  };
  
  // Get chaos multiplier based on level
  const multiplier = getChaosMultiplier(gameId);
  const roll = chaosRoll();
  
  // Determine which modifier to apply
  let modifier: ChaosModifier | null = null;
  let cumulative = 0;
  
  const chances: Record<ChaosModifier, number> = {
    REVERSE_VOTING: CHAOS_THRESHOLDS.REVERSE_VOTING * multiplier,
    SHUFFLE_OPTIONS: CHAOS_THRESHOLDS.SHUFFLE_OPTIONS * multiplier,
    INVERT_SCORES: CHAOS_THRESHOLDS.INVERT_SCORES * multiplier,
    MODIFY_TIMER: CHAOS_THRESHOLDS.MODIFY_TIMER * multiplier,
    TRAP_REVERSAL: CHAOS_THRESHOLDS.TRAP_REVERSAL * multiplier,
    MINOR_CHAOS: CHAOS_THRESHOLDS.MINOR_CHAOS,
    DOUBLE_POINTS: CHAOS_THRESHOLDS.DOUBLE_POINTS * multiplier,
    HIDE_ANSWERS: CHAOS_THRESHOLDS.HIDE_ANSWERS * multiplier,
  };
  
  // Normalize chances
  const totalChance = Object.values(chances).reduce((a, b) => a + b, 0);
  const normalizedRoll = roll * totalChance;
  
  for (const [mod, chance] of Object.entries(chances)) {
    cumulative += chance;
    if (normalizedRoll <= cumulative && !isOnCooldown(mod as ChaosModifier)) {
      modifier = mod as ChaosModifier;
      break;
    }
  }
  
  if (!modifier) {
    return { modifier: null, message: "" };
  }
  
  // Set cooldown (5 seconds for minor, 10 for major)
  const cooldown = modifier === "MINOR_CHAOS" ? 5000 : 10000;
  state.chaosModifierCooldowns.set(modifier, now + cooldown);
  state.lastChaosEvent = now;
  
  // Generate message
  const messages: Record<ChaosModifier, string> = {
    REVERSE_VOTING: "🎲 CHAOS ACTIVATED: Voting outcome reversed!",
    SHUFFLE_OPTIONS: "🎲 CHAOS ACTIVATED: Answer options shuffled!",
    INVERT_SCORES: "🎲 CHAOS ACTIVATED: Points inverted!",
    MODIFY_TIMER: "🎲 CHAOS ACTIVATED: Timer modified randomly!",
    TRAP_REVERSAL: "🎲 CHAOS ACTIVATED: Trap effects flipped!",
    MINOR_CHAOS: "🎲 Minor chaos detected...",
    DOUBLE_POINTS: "🎲 CHAOS ACTIVATED: Double points for this round!",
    HIDE_ANSWERS: "🎲 CHAOS ACTIVATED: Answer visibility hidden!",
  };
  
  console.log(`[CHAOS] Modifier activated: ${modifier}`);
  
  return { modifier, message: messages[modifier] };
}

export function applyChaosModifier(
  modifier: ChaosModifier,
  data: any
): { modified: boolean; data: any; message: string } {
  switch (modifier) {
    case "SHUFFLE_OPTIONS":
      if (data.options) {
        // Fisher-Yates shuffle
        const shuffled = [...data.options];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return { modified: true, data: { ...data, options: shuffled }, message: "Options shuffled!" };
      }
      break;
      
    case "MODIFY_TIMER":
      if (data.timeLimit) {
        const multiplier = 0.5 + chaosRoll(); // 0.5x to 1.5x
        const newTime = Math.max(5, Math.round(data.timeLimit * multiplier));
        return { modified: true, data: { ...data, timeLimit: newTime }, message: `Timer changed to ${newTime}s!` };
      }
      break;
      
    case "DOUBLE_POINTS":
      if (data.points) {
        return { modified: true, data: { ...data, points: data.points * 2, chaosMultiplier: 2 }, message: "Double points active!" };
      }
      break;
      
    case "HIDE_ANSWERS":
      return { modified: true, data: { ...data, hideAnswers: true }, message: "Answers hidden temporarily!" };
      
    default:
      return { modified: false, data, message: "" };
  }
  
  return { modified: false, data, message: "" };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function shouldAllowTargeting(
  gameId: string,
  targetPlayerId: string,
  targeterPlayerId: string
): boolean {
  const state = getChaosState(gameId);
  if (!state) return false;
  
  // Can't target yourself
  if (targetPlayerId === targeterPlayerId) return false;
  
  // Check trust score
  const trust = state.trustScores.get(targetPlayerId);
  if (trust && trust.score < 20) {
    // Low trust players are protected from repeated targeting
    const recentDramas = state.dramaHistory.filter(
      d => d.playerId === targetPlayerId && Date.now() - d.timestamp < 60000
    );
    if (recentDramas.length >= 3) return false;
  }
  
  return true;
}

export function getPlayerTrustScore(gameId: string, playerId: string): number {
  const state = getChaosState(gameId);
  if (!state) return 50;
  
  const trust = state.trustScores.get(playerId);
  return trust?.score ?? 50;
}

export function getChaosStats(gameId: string): {
  chaosLevel: number;
  intensity: string;
  totalDramaEvents: number;
  activeVoting: boolean;
  pendingTrap: boolean;
} {
  const state = getChaosState(gameId);
  if (!state) {
    return {
      chaosLevel: 0,
      intensity: "CALM",
      totalDramaEvents: 0,
      activeVoting: false,
      pendingTrap: false,
    };
  }
  
  return {
    chaosLevel: state.chaosLevel,
    intensity: getChaosIntensity(gameId),
    totalDramaEvents: state.dramaHistory.length,
    activeVoting: state.activeVoting?.status === "ACTIVE",
    pendingTrap: !!state.pendingTrap,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOCKET EVENT EMITTERS
// ═══════════════════════════════════════════════════════════════════════════════

export function emitDramaEvent(
  io: any,
  gameId: string,
  event: DramaEvent
): void {
  io.to(gameId).emit("chaos:drama", {
    id: event.id,
    type: event.type,
    playerId: event.playerId,
    username: event.username,
    chaosLevel: getChaosState(gameId)?.chaosLevel || 0,
  });
}

export function emitVotingStart(
  io: any,
  gameId: string,
  voting: VotingSession
): void {
  io.to(gameId).emit("chaos:votingStart", {
    dramaEventId: voting.dramaEventId,
    targetPlayerId: voting.targetPlayerId,
    targetUsername: voting.targetUsername,
    duration: voting.duration,
    options: ["FORGIVE", "REDUCE_SCORE", "BLOCK_QUESTION"],
  });
}

export function emitVotingUpdate(
  io: any,
  gameId: string,
  voting: VotingSession
): void {
  const voteCounts = {
    FORGIVE: 0,
    REDUCE_SCORE: 0,
    BLOCK_QUESTION: 0,
  };
  
  voting.votes.forEach((vote) => {
    voteCounts[vote]++;
  });
  
  io.to(gameId).emit("chaos:votingUpdate", {
    totalVotes: voting.votes.size,
    voteCounts,
    timeRemaining: Math.max(0, voting.startTime + voting.duration - Date.now()),
  });
}

export function emitVotingComplete(
  io: any,
  gameId: string,
  voting: VotingSession
): void {
  // Count votes for each option
  const voteCounts = { FORGIVE: 0, REDUCE_SCORE: 0, BLOCK_QUESTION: 0 };
  voting.votes.forEach((vote) => {
    voteCounts[vote]++;
  });
  
  io.to(gameId).emit("chaos:votingComplete", {
    result: voting.result,
    targetPlayerId: voting.targetPlayerId,
    targetUsername: voting.targetUsername,
    voteCounts,
  });
}

export function emitChaosModifier(
  io: any,
  gameId: string,
  modifier: ChaosModifier,
  message: string
): void {
  io.to(gameId).emit("chaos:modifier", {
    modifier,
    message,
    chaosLevel: getChaosState(gameId)?.chaosLevel || 0,
    intensity: getChaosIntensity(gameId),
  });
}

export function emitTrapWarning(
  io: any,
  gameId: string,
  trap: TrapRound
): void {
  io.to(gameId).emit("chaos:trapWarning", {
    targetPlayerId: trap.targetPlayerId,
    message: "🚨 TRAP ROUND ACTIVATED!",
    description: "If NO ONE answers correctly, all lose points!",
  });
}

export function emitTrapResult(
  io: any,
  gameId: string,
  trap: TrapRound
): void {
  io.to(gameId).emit("chaos:trapResult", {
    allFailed: trap.allFailed,
    refundAmount: trap.refundAmount,
    targetPlayerId: trap.targetPlayerId,
    message: trap.allFailed 
      ? "💥 Everyone failed! Target player refunded!" 
      : "✅ Someone succeeded! Normal scoring applies.",
  });
}

// Export types for use in other modules
export type { DramaEvent, VotingSession, TrapRound, ChaosState, DramaType, VoteOption, ChaosModifier };

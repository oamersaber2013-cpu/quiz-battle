// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS ORCHESTRATOR - Integrates Chaos Mode with Game Flow
// Handles: Round management, drama detection, voting, trap rounds, chaos modifiers
// ═══════════════════════════════════════════════════════════════════════════════

import { Server } from "socket.io";
import { GameMode } from "@quiz-battle/shared";
import {
  initializeChaosState,
  getChaosState,
  cleanupChaosState,
  chaosRoll,
  rollChaosModifier,
  applyChaosModifier,
  recordDramaEvent,
  playerLeftTab,
  playerEnteredTab,
  startVotingSession,
  castVote,
  completeVoting,
  getVotingResults,
  activateTrapRound,
  resolveTrapRound,
  getPendingTrap,
  increaseChaosLevel,
  getChaosStats,
  emitDramaEvent,
  emitVotingStart,
  emitVotingUpdate,
  emitVotingComplete,
  emitChaosModifier,
  emitTrapWarning,
  emitTrapResult,
  ChaosModifier,
  DramaEvent,
  VotingSession,
} from "./chaosEngine";

type TypedServer = Server<any, any>;

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export function initializeChaosGame(
  gameId: string,
  io: TypedServer
): void {
  // Initialize chaos state for this game
  initializeChaosState(gameId);
  
  console.log(`[CHAOS] Game ${gameId} initialized in CHAOS MODE`);
  
  // Emit initial chaos state
  io.to(gameId).emit("chaos:init", {
    chaosLevel: 0,
    intensity: "CALM",
    message: "🌀 CHAOS MODE ACTIVATED! Expect the unexpected...",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUND MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export function onChaosRoundStart(
  gameId: string,
  questionIndex: number,
  io: TypedServer,
  questionData: any
): any {
  const state = getChaosState(gameId);
  if (!state) return questionData;
  
  let modifiedQuestion = { ...questionData };
  let chaosMessages: string[] = [];
  
  // Check for pending trap
  const pendingTrap = getPendingTrap(gameId);
  if (pendingTrap) {
    activateTrapRound(gameId, questionIndex);
    emitTrapWarning(io, gameId, pendingTrap);
    chaosMessages.push("🚨 TRAP ROUND!");
  }
  
  // Roll for chaos modifier (only if no trap active)
  if (!pendingTrap) {
    const { modifier, message } = rollChaosModifier(gameId);
    
    if (modifier) {
      const result = applyChaosModifier(modifier, modifiedQuestion);
      if (result.modified) {
        modifiedQuestion = result.data;
        chaosMessages.push(message);
        emitChaosModifier(io, gameId, modifier, message);
      }
    }
  }
  
  // Emit round start with chaos info
  io.to(gameId).emit("chaos:roundStart", {
    questionIndex,
    chaosLevel: state.chaosLevel,
    intensity: getChaosStats(gameId).intensity,
    messages: chaosMessages,
    isTrapRound: !!pendingTrap,
  });
  
  return modifiedQuestion;
}

export function onChaosRoundEnd(
  gameId: string,
  questionIndex: number,
  io: TypedServer,
  results: {
    allFailed: boolean;
    scores: Record<string, number>;
    pointReduction: number;
  }
): void {
  const state = getChaosState(gameId);
  if (!state) return;
  
  // Check for trap round resolution
  const trap = getPendingTrap(gameId);
  if (trap && trap.status === "ACTIVE") {
    const resolvedTrap = resolveTrapRound(gameId, results.allFailed, results.pointReduction);
    
    if (resolvedTrap) {
      emitTrapResult(io, gameId, resolvedTrap);
      
      // Apply refund if all failed
      if (resolvedTrap.allFailed && resolvedTrap.refundAmount > 0) {
        // Refund logic handled by game orchestrator
        io.to(gameId).emit("chaos:refund", {
          playerId: resolvedTrap.targetPlayerId,
          amount: resolvedTrap.refundAmount,
          message: "💰 Refund granted - everyone failed the trap!",
        });
      }
    }
  }
  
  // Decrease chaos level slightly after round (cooldown)
  if (state.chaosLevel > 0) {
    const newLevel = Math.max(0, state.chaosLevel - 2);
    state.chaosLevel = newLevel;
  }
  
  // Emit chaos stats update
  io.to(gameId).emit("chaos:stats", getChaosStats(gameId));
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAMA HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

export function handlePlayerTabVisibility(
  gameId: string,
  playerId: string,
  username: string,
  isVisible: boolean,
  io: TypedServer
): void {
  if (isVisible) {
    playerEnteredTab(gameId, playerId);
  } else {
    const drama = playerLeftTab(gameId, playerId, username);
    
    if (drama) {
      // Emit drama event
      emitDramaEvent(io, gameId, drama);
      
      // Check if we should start voting
      const state = getChaosState(gameId);
      if (state && state.chaosLevel >= 25) {
        // Only start voting if chaos is elevated
        startDramaVoting(gameId, drama, io);
      }
    }
  }
}

export function handlePlayerInactivity(
  gameId: string,
  playerId: string,
  username: string,
  io: TypedServer
): void {
  const drama = recordDramaEvent(gameId, "INACTIVITY", playerId, username);
  
  if (drama) {
    emitDramaEvent(io, gameId, drama);
    
    // Start voting if chaos level is high enough
    const state = getChaosState(gameId);
    if (state && state.chaosLevel >= 30) {
      startDramaVoting(gameId, drama, io);
    }
  }
}

function startDramaVoting(
  gameId: string,
  drama: DramaEvent,
  io: TypedServer
): void {
  const state = getChaosState(gameId);
  if (!state) return;
  
  // Get all player IDs (in real implementation, get from game state)
  // For now, voting will be started when socket handler receives request
  
  // Emit that voting is available
  io.to(gameId).emit("chaos:votingAvailable", {
    dramaEventId: drama.id,
    playerId: drama.playerId,
    username: drama.username,
    type: drama.type,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOTING HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

export function handleStartVoting(
  gameId: string,
  dramaEventId: string,
  targetPlayerId: string,
  targetUsername: string,
  voterIds: string[],
  io: TypedServer
): VotingSession | null {
  const voting = startVotingSession(gameId, dramaEventId, targetPlayerId, targetUsername, voterIds);
  
  if (voting) {
    emitVotingStart(io, gameId, voting);
    
    // Update voting progress periodically
    const updateInterval = setInterval(() => {
      const currentVoting = getVotingResults(gameId);
      if (currentVoting && currentVoting.status === "ACTIVE") {
        emitVotingUpdate(io, gameId, currentVoting);
      } else {
        clearInterval(updateInterval);
      }
    }, 1000);
  }
  
  return voting;
}

export function handleCastVote(
  gameId: string,
  voterId: string,
  vote: "FORGIVE" | "REDUCE_SCORE" | "BLOCK_QUESTION",
  io: TypedServer
): boolean {
  const success = castVote(gameId, voterId, vote);
  
  if (success) {
    const voting = getVotingResults(gameId);
    if (voting) {
      emitVotingUpdate(io, gameId, voting);
    }
  }
  
  return success;
}

export function handleVotingComplete(
  gameId: string,
  io: TypedServer
): void {
  const voting = completeVoting(gameId);
  
  if (voting) {
    emitVotingComplete(io, gameId, voting);
    
    // Apply effects based on result
    if (voting.result === "REDUCE_SCORE") {
      io.to(gameId).emit("chaos:punish", {
        playerId: voting.targetPlayerId,
        type: "SCORE_REDUCTION",
        amount: 50, // Configurable
      });
    } else if (voting.result === "BLOCK_QUESTION") {
      io.to(gameId).emit("chaos:punish", {
        playerId: voting.targetPlayerId,
        type: "BLOCK_NEXT",
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME END CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

export function endChaosGame(gameId: string, io: TypedServer): void {
  const stats = getChaosStats(gameId);
  
  // Emit final chaos summary
  io.to(gameId).emit("chaos:summary", {
    totalDramaEvents: stats.totalDramaEvents,
    peakChaosLevel: stats.chaosLevel,
    message: stats.totalDramaEvents > 10 
      ? "🔥 ABSOLUTE CHAOS! What a wild ride!" 
      : stats.totalDramaEvents > 5 
        ? "😈 Moderate mayhem achieved!" 
        : "🙂 Surprisingly calm chaos session.",
  });
  
  // Cleanup
  cleanupChaosState(gameId);
  console.log(`[CHAOS] Game ${gameId} ended, chaos state cleaned up`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { getChaosStats, getChaosState, increaseChaosLevel };

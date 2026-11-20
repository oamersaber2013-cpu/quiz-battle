import { CHAOS_VOTE_OPTIONS } from "@quiz-battle/shared";
import type { ChaosClientSnapshot } from "@quiz-battle/shared";
import { cleanupChaosV2, getChaosV2, getPendingChaosDrama } from "./chaosEngineV2";
import { cleanupTrap, getTrap, resetTrapLevel } from "./trapSystem";

export function getChaosClientSnapshot(gameId: string, viewerId?: string): ChaosClientSnapshot | null {
  const state = getChaosV2(gameId);
  if (!state) return null;

  const now = Date.now();
  const voting = state.activeVoting && state.activeVoting.endsAt > now ? state.activeVoting : null;
  const hasVoted = Boolean(viewerId && voting?.votes.has(viewerId));
  const pendingDrama = voting ? null : getPendingChaosDrama(gameId, now);
  const trap = getTrap(gameId);
  const activeTrap = trap?.status === "ACTIVE" || trap?.status === "EVALUATING" ? trap : null;

  return {
    serverNow: now,
    gameId,
    level: state.chaosLevel,
    state: state.chaosState,
    personality: state.personality,
    pendingDrama: pendingDrama ? { ...pendingDrama } : null,
    votingSession: voting ? {
      dramaEventId: voting.dramaEventId,
      targetPlayerId: voting.targetPlayerId,
      targetUsername: voting.targetUsername,
      durationMs: voting.durationMs,
      endsAt: voting.endsAt,
      timeRemainingMs: voting.endsAt - now,
      totalVotes: voting.votes.size,
      options: [...CHAOS_VOTE_OPTIONS],
      canVote: Boolean(viewerId && voting.eligibleVoters.has(viewerId) && !hasVoted),
      hasVoted,
    } : null,
    activeTrap: activeTrap ? {
      targetPlayerId: activeTrap.targetPlayerId,
      targetUsername: activeTrap.targetUsername,
      level: activeTrap.trapLevel,
      isTarget: viewerId === activeTrap.targetPlayerId,
    } : null,
    evaluatingTrap: activeTrap?.status === "EVALUATING",
  };
}

export function cleanupChaosRoom(gameId: string): void {
  cleanupChaosV2(gameId);
  cleanupTrap(gameId);
  resetTrapLevel(gameId);
}

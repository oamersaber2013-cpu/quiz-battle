import type { Server } from "socket.io";
import { CHAOS_VOTE_OPTIONS } from "@quiz-battle/shared";
import type { ChaosVote, ClientToServerEvents, ServerToClientEvents } from "@quiz-battle/shared";
import { getChaosV2, getPendingChaosDrama } from "./chaosEngineV2";
import type { VotingSession } from "./chaosEngineV2";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
const BALLOT_DURATION_MS = 5000;
const SCORE_PENALTY = 50;

function getVoteCounts(voting: VotingSession): Record<ChaosVote, number> {
  const counts = { FORGIVE: 0, REDUCE_SCORE: 0 };
  for (const vote of voting.votes.values()) counts[vote]++;
  return counts;
}

export function startChaosVoting(
  io: TypedServer,
  gameId: string,
  request: { dramaEventId: string; voterIds: readonly string[] },
  onPenalty: (targetPlayerId: string, amount: number) => number | void,
  onChanged?: () => void
): boolean {
  const state = getChaosV2(gameId);
  const now = Date.now();
  const drama = getPendingChaosDrama(gameId, now);
  if (!state || state.votingClosed || state.activeVoting || !drama || drama.id !== request.dramaEventId) return false;
  if (!request.voterIds.includes(drama.playerId)) return false;

  const eligibleVoters = new Set(request.voterIds.filter(playerId => playerId !== drama.playerId));
  if (!eligibleVoters.size) return false;

  let resolveSettlement!: () => void;
  const settled = new Promise<void>(resolve => { resolveSettlement = resolve; });
  const timer = setTimeout(() => {
    if (getChaosV2(gameId)?.activeVoting !== voting) return;
    state.activeVoting = null;
    try {
      const voteCounts = getVoteCounts(voting);
      // Forgive empty or tied ballots.
      const result = voteCounts.REDUCE_SCORE > voteCounts.FORGIVE ? "REDUCE_SCORE" : "FORGIVE";
      const scorePenalty = result === "REDUCE_SCORE" ? (onPenalty(voting.targetPlayerId, SCORE_PENALTY) || 0) : 0;
      io.to(gameId).emit("chaos:votingComplete", {
        dramaEventId: voting.dramaEventId,
        result,
        targetPlayerId: voting.targetPlayerId,
        targetUsername: voting.targetUsername,
        voteCounts,
        scorePenalty,
      });
      voting.onChanged?.();
    } finally {
      voting.resolveSettlement();
    }
  }, BALLOT_DURATION_MS);
  timer.unref();

  const voting: VotingSession = {
    dramaEventId: drama.id,
    targetPlayerId: drama.playerId,
    targetUsername: drama.username,
    votes: new Map(),
    eligibleVoters,
    endsAt: now + BALLOT_DURATION_MS,
    durationMs: BALLOT_DURATION_MS,
    timer,
    settled,
    resolveSettlement,
    onChanged,
  };
  state.activeVoting = voting;
  state.pendingDrama = null;
  io.to(gameId).emit("chaos:votingStart", {
    dramaEventId: voting.dramaEventId,
    targetPlayerId: voting.targetPlayerId,
    targetUsername: voting.targetUsername,
    duration: voting.durationMs,
    endsAt: voting.endsAt,
    options: [...CHAOS_VOTE_OPTIONS],
  });
  voting.onChanged?.();
  return true;
}

export async function closeChaosVoting(gameId: string): Promise<void> {
  const state = getChaosV2(gameId);
  if (!state) return;
  state.votingClosed = true;
  state.pendingDrama = null;
  await state.activeVoting?.settled;
}

export function castChaosVote(
  io: TypedServer, gameId: string, dramaEventId: string, voterId: string, vote: unknown
): boolean {
  const voting = getChaosV2(gameId)?.activeVoting;
  const now = Date.now();
  if (!voting || voting.dramaEventId !== dramaEventId || now >= voting.endsAt) return false;
  if (!voting.eligibleVoters.has(voterId) || voting.votes.has(voterId)) return false;
  if (vote !== "FORGIVE" && vote !== "REDUCE_SCORE") return false;

  voting.votes.set(voterId, vote);
  io.to(gameId).emit("chaos:votingUpdate", {
    dramaEventId: voting.dramaEventId,
    totalVotes: voting.votes.size,
    voteCounts: getVoteCounts(voting),
    timeRemaining: voting.endsAt - now,
  });
  voting.onChanged?.();
  return true;
}

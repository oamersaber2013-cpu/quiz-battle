import { getChaosV2, initializeChaosV2, recordDramaV2 } from "../lib/chaosEngineV2";
import { startChaosVoting, castChaosVote, closeChaosVoting } from "../lib/chaosVoting";
import { cleanupChaosRoom, getChaosClientSnapshot } from "../lib/chaosSnapshot";
import { evaluateTrap, initializeTrap } from "../lib/trapSystem";

describe("Chaos state on reconnect", () => {
  const gameId = "chaos-room";
  const playerIds = ["host", "target", "guest"];
  const emit = jest.fn();
  const io = { to: () => ({ emit }) } as any;

  beforeEach(() => {
    jest.useFakeTimers({ now: 100_000 });
    emit.mockClear();
    initializeChaosV2(gameId, "TRICKSTER");
  });

  afterEach(() => {
    cleanupChaosRoom(gameId);
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  function recordDrama() {
    return recordDramaV2(gameId, "TAB_LEFT", "target", "Target")!.dramaId;
  }

  it("starts a ballot from recorded drama and restores its deadline and each viewer's vote status", () => {
    const dramaEventId = recordDrama();
    expect(getChaosClientSnapshot(gameId, "host")?.pendingDrama).toEqual({
      id: dramaEventId, type: "TAB_LEFT", playerId: "target", username: "Target", expiresAt: 130_000,
    });
    const penalty = jest.fn(() => 32);
    const onChanged = jest.fn();
    expect(startChaosVoting(io, gameId, { dramaEventId, voterIds: playerIds }, penalty, onChanged)).toBe(true);
    expect(startChaosVoting(io, gameId, { dramaEventId, voterIds: playerIds }, penalty)).toBe(false);
    expect(emit).toHaveBeenCalledWith("chaos:votingStart", expect.objectContaining({
      dramaEventId, targetPlayerId: "target", endsAt: 105_000,
    }));
    jest.advanceTimersByTime(2100);
    expect(castChaosVote(io, gameId, dramaEventId, "host", "REDUCE_SCORE")).toBe(true);
    expect(getChaosClientSnapshot(gameId, "host")).toMatchObject({
      gameId, personality: "TRICKSTER", pendingDrama: null,
      votingSession: { dramaEventId, endsAt: 105_000, timeRemainingMs: 2900, totalVotes: 1, canVote: false, hasVoted: true },
    });
    expect(getChaosClientSnapshot(gameId, "guest")?.votingSession).toMatchObject({ canVote: true, hasVoted: false });
    expect(getChaosClientSnapshot(gameId, "target")?.votingSession).toMatchObject({ canVote: false, hasVoted: false });
    const spectator = getChaosClientSnapshot(gameId);
    expect(spectator?.votingSession).toMatchObject({ totalVotes: 1, canVote: false, hasVoted: false });
    expect(spectator?.votingSession).not.toHaveProperty("votes");
    expect(spectator?.votingSession).not.toHaveProperty("eligibleVoters");
    expect(spectator).not.toHaveProperty("playerProfiles");

    jest.advanceTimersByTime(2900);
    expect(getChaosClientSnapshot(gameId, "host")?.votingSession).toBeNull();
    expect(penalty).toHaveBeenCalledTimes(1);
    expect(penalty).toHaveBeenCalledWith("target", 50);
    expect(emit).toHaveBeenCalledWith("chaos:votingComplete", expect.objectContaining({
      dramaEventId, result: "REDUCE_SCORE", scorePenalty: 32, voteCounts: { FORGIVE: 0, REDUCE_SCORE: 1 },
    }));
    expect(onChanged).toHaveBeenCalledTimes(3);
  });

  it("rejects stale, ineligible or late votes and clears pending drama after its deadline", () => {
    const dramaEventId = recordDrama();
    expect(startChaosVoting(io, gameId, { dramaEventId, voterIds: ["host"] }, jest.fn())).toBe(false);
    expect(startChaosVoting(io, gameId, { dramaEventId, voterIds: playerIds }, jest.fn())).toBe(true);
    expect(castChaosVote(io, gameId, "other-ballot", "host", "FORGIVE")).toBe(false);
    expect(castChaosVote(io, gameId, dramaEventId, "target", "FORGIVE")).toBe(false);
    expect(castChaosVote(io, gameId, dramaEventId, "outsider", "FORGIVE")).toBe(false);
    expect(castChaosVote(io, gameId, dramaEventId, "host", "BLOCK_QUESTION")).toBe(false);
    expect(castChaosVote(io, gameId, dramaEventId, "guest", "FORGIVE")).toBe(true);
    expect(castChaosVote(io, gameId, dramaEventId, "guest", "REDUCE_SCORE")).toBe(false);

    // Moving the epoch without flushing timers models a late vote before the
    // completion callback is serviced in a busy event loop.
    jest.setSystemTime(105_001);
    expect(getChaosClientSnapshot(gameId, "host")?.votingSession).toBeNull();
    expect(castChaosVote(io, gameId, dramaEventId, "host", "FORGIVE")).toBe(false);
    jest.advanceTimersByTime(20_000);
    const newerDrama = recordDrama();
    jest.advanceTimersByTime(30_000);
    expect(getChaosClientSnapshot(gameId)?.pendingDrama).toBeNull();
    expect(startChaosVoting(io, gameId, { dramaEventId: newerDrama, voterIds: playerIds }, jest.fn())).toBe(false);
  });

  it("preserves the session on repeat initialization and unblocks a closing game if the room is removed", async () => {
    const dramaEventId = recordDrama();
    const penalty = jest.fn();
    startChaosVoting(io, gameId, { dramaEventId, voterIds: playerIds }, penalty);
    castChaosVote(io, gameId, dramaEventId, "guest", "REDUCE_SCORE");
    expect(initializeChaosV2(gameId, "REVENGE")).toBe(getChaosV2(gameId));
    expect(getChaosClientSnapshot(gameId, "guest")).toMatchObject({
      personality: "TRICKSTER", votingSession: { dramaEventId, hasVoted: true },
    });
    const settled = closeChaosVoting(gameId);
    expect(recordDramaV2(gameId, "INACTIVITY", "host", "Host")).toBeNull();
    cleanupChaosRoom(gameId);
    await settled;
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(10_000);
    expect(getChaosClientSnapshot(gameId)).toBeNull();
    expect(penalty).not.toHaveBeenCalled();
  });

  it("projects active trap display without raw answers or private advantages", async () => {
    initializeTrap(gameId, "target", "Target", 1, 3);
    const target = getChaosClientSnapshot(gameId, "target");
    expect(target?.activeTrap).toEqual({
      targetPlayerId: "target", targetUsername: "Target", level: 1, isTarget: true,
    });
    expect(getChaosClientSnapshot(gameId)?.activeTrap?.isTarget).toBe(false);
    const evaluating = evaluateTrap(gameId, io);
    expect(getChaosClientSnapshot(gameId)?.evaluatingTrap).toBe(true);
    await jest.advanceTimersByTimeAsync(1500);
    await evaluating;
    expect(getChaosClientSnapshot(gameId)).toMatchObject({ activeTrap: null, evaluatingTrap: false });
  });
});

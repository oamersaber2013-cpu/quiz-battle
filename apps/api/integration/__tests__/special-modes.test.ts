jest.mock("@quiz-battle/db", () => ({ prisma: {} }));
jest.mock("../../src/lib/analytics", () => ({ trackEvent: jest.fn(async () => {}) }));
jest.mock("../../src/lib/gamePersistence", () => ({ saveGameSession: jest.fn(async () => {}) }));
jest.mock("../../src/lib/questions", () => {
  const actual = jest.requireActual("../../src/lib/questions");
  return { ...actual, fetchQuestions: jest.fn() };
});

import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as connect, Socket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { Difficulty, GameMode, GameStatus, PowerUpType } from "@quiz-battle/shared";
import { setActiveGame, removeActiveGame } from "../../src/lib/gameOrchestrator";
import { getBotInfo, removeBots } from "../../src/lib/aiBots";
import { cleanupChaosV2 } from "../../src/lib/chaosEngineV2";
import { getConquestState, removeConquestGame } from "../../src/lib/conquestOrchestrator";
import { deleteInvasionGame } from "../../src/lib/invasionOrchestrator";
import { getJwtSecret } from "../../src/lib/jwtConfig";
import { fetchQuestions } from "../../src/lib/questions";
import { saveGameSession } from "../../src/lib/gamePersistence";
import { SafeRedis } from "../../src/lib/redis";
import { registerSocketHandlers } from "../../src/socket";

const realSetTimeout = setTimeout;
const realClearTimeout = clearTimeout;
const gameId = "special-modes-integration";
const host = "integration-host";
const guest = "integration-guest";
const correctAnswer = 1;

class EventQueue {
  private messages = new Map<string, any[]>();
  private listeners = new Map<string, (payload: any) => void>();

  constructor(readonly socket: Socket) {
    socket.onAny((event, payload) => {
      const next = this.listeners.get(event);
      if (next) next(payload);
      else this.messages.set(event, [...(this.messages.get(event) || []), payload]);
    });
  }

  next(event: string): Promise<any> {
    const queued = this.messages.get(event);
    if (queued?.length) return Promise.resolve(queued.shift());
    return new Promise((resolve, reject) => {
      const timer = realSetTimeout(() => {
        this.listeners.delete(event);
        reject(new Error(`Timed out waiting for ${event}`));
      }, 5000);
      this.listeners.set(event, payload => {
        realClearTimeout(timer);
        this.listeners.delete(event);
        resolve(payload);
      });
    });
  }
}

describe("Special-mode matches over Socket.IO", () => {
  let io: Server;
  let url: string;
  let nextQuestionId: number;
  const clients: EventQueue[] = [];

  beforeEach(async () => {
    jest.useFakeTimers({ now: 100000, doNotFake: ["nextTick", "setImmediate", "clearImmediate"] });
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    jest.mocked(saveGameSession).mockClear();
    nextQuestionId = 0;
    jest.mocked(fetchQuestions).mockImplementation(async (difficulty, count) => (
      Array.from({ length: count }, () => ({
        id: `fixture-${++nextQuestionId}`, category: "general", difficulty,
        text: "سؤال تجريبي", options: ["ألف", "باء", "جيم", "دال"],
        correctIndex: correctAnswer, timeLimit: 15,
      }))
    ));
    const http = createServer();
    // Keep heartbeat scheduling outside the virtual game interval under test.
    io = new Server(http, { pingInterval: 600000, pingTimeout: 10000 });
    registerSocketHandlers(io, new SafeRedis(null));
    await new Promise<void>(resolve => http.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    clients.splice(0).forEach(client => client.socket.disconnect());
    await new Promise<void>(resolve => io.close(() => resolve()));
    cleanupChaosV2(gameId);
    removeConquestGame(gameId);
    deleteInvasionGame(gameId);
    removeActiveGame(gameId);
    removeBots(gameId);
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function createMatch(mode: GameMode, totalRounds: number) {
    setActiveGame(gameId, {
      gameId, joinCode: "MODE42", hostId: host, mode, difficulty: Difficulty.Scholar, language: "ar",
      status: GameStatus.Lobby, currentRound: 0, totalRounds, maxPlayers: 8,
      questionStartTime: 0, questions: [], answersThisRound: {}, lastAnswerByPlayer: {}, activeEffects: [],
      players: {
        [host]: {
          userId: host, username: "Host", score: 0, rank: 0, streak: 0, isConnected: true,
          isEliminated: false, powerUpInventory: [],
        },
      },
    });
  }

  async function connectPlayer(userId: string): Promise<EventQueue> {
    const socket = connect(url, {
      autoConnect: false, transports: ["websocket"], forceNew: true, reconnection: false,
      useNativeTimers: true,
      auth: { token: jwt.sign({ userId, username: userId }, getJwtSecret()) },
    });
    const queue = new EventQueue(socket);
    clients.push(queue);
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
      socket.connect();
    });
    return queue;
  }

  async function success(client: EventQueue, event: string, data: object = { gameId }) {
    const ack = await client.socket.timeout(5000).emitWithAck(event, data);
    expect(ack).toMatchObject({ success: true });
    return ack;
  }

  async function join(client: EventQueue) {
    await success(client, "game:join");
    return (await client.next("game:stateSync")).room;
  }

  async function startMatch(first: EventQueue, second: EventQueue) {
    await success(first, "game:start");
    await Promise.all([first.next("game:powerUpSelectStart"), second.next("game:powerUpSelectStart")]);
    await success(first, "game:confirmPowerUpSelection");
    await success(second, "game:confirmPowerUpSelection");
    // Both sockets receive a post-selection snapshot. Consume it so a later
    // rejoin assertion reads the new connection's own snapshot.
    await Promise.all([first.next("game:stateSync"), second.next("game:stateSync")]);
  }

  async function questionForBoth(first: EventQueue, second: EventQueue, event: string, round: number) {
    const [a, b] = await Promise.all([first.next(event), second.next(event)]);
    expect(a).toEqual(b);
    expect(a).toMatchObject({ round, question: { text: "سؤال تجريبي" } });
    expect(a.question).not.toHaveProperty("correctIndex");
    return a.question;
  }

  it("starts a solo Classic match with its chosen power-up after one confirmation", async () => {
    createMatch(GameMode.Classic, 1);
    const first = await connectPlayer(host);
    await join(first);
    await success(first, "game:start");
    await first.next("game:powerUpSelectStart");
    const botAdded = (await first.next("game:stateSync")).room;
    expect(botAdded.players).toHaveLength(2);
    expect(botAdded.players).toContainEqual(expect.objectContaining({ isBot: true }));

    await success(first, "game:selectPowerUp", { gameId, powerUp: PowerUpType.TimeWarp });
    await success(first, "game:confirmPowerUpSelection");
    expect(await first.next("game:powerUpSelectEnd")).toMatchObject({ selections: { [host]: [PowerUpType.TimeWarp] } });
    expect(await first.next("game:countdown")).toEqual({ seconds: 5 });
    await jest.advanceTimersByTimeAsync(5000);
    expect(await first.next("game:question")).toMatchObject({ round: 1 });
    const unselected = await first.socket.timeout(5000).emitWithAck("player:powerup", {
      gameId, type: PowerUpType.Shield,
    });
    expect(unselected).toMatchObject({ success: false });
    await success(first, "player:powerup", { gameId, type: PowerUpType.TimeWarp });
    expect(await first.next("game:powerUpApplied")).toMatchObject({
      type: PowerUpType.TimeWarp, sourceUserId: host, expiresAt: Date.now() + 20000,
    });
  });

  it("restores a Chaos answer and active ballot on reconnect and completes two rounds", async () => {
    createMatch(GameMode.Chaos, 2);
    let first = await connectPlayer(host);
    let second = await connectPlayer(guest);
    await join(first);
    await join(second);
    // The host starts through the ordinary lobby, without a separate init packet.
    await startMatch(first, second);
    await first.next("game:countdown");
    await jest.advanceTimersByTimeAsync(5000);
    const question = await questionForBoth(first, second, "game:question", 1);
    await jest.advanceTimersByTimeAsync(400);
    second.socket.emit("player:answer", { gameId, questionId: question.id, answer: correctAnswer, timestamp: Date.now() });
    expect((await join(second)).selectedAnswer).toBe(correctAnswer);
    second.socket.disconnect();
    second = await connectPlayer(guest);
    const rejoined = await join(second);
    expect(rejoined).toMatchObject({ currentRound: 1, currentQuestion: { id: question.id }, selectedAnswer: correctAnswer });
    expect(rejoined.currentQuestion).not.toHaveProperty("correctIndex");
    expect(rejoined.chaos).toMatchObject({ gameId, personality: "RANDOM", votingSession: null });
    first.socket.emit("player:answer", { gameId, questionId: question.id, answer: 0, timestamp: Date.now() });
    expect((await join(first)).selectedAnswer).toBe(0);
    await jest.advanceTimersByTimeAsync(700);
    const firstScoreboard = await first.next("game:scoreboard");
    await second.next("game:scoreboard");
    const guestScore = firstScoreboard.players.find(player => player.userId === guest).score;
    expect(guestScore).toBeGreaterThan(50);
    await jest.advanceTimersByTimeAsync(3000);
    const next = await questionForBoth(first, second, "game:question", 2);
    expect(next.id).not.toBe(question.id);
    await jest.advanceTimersByTimeAsync(400);

    second.socket.emit("chaos:drama", { gameId, type: "TAB_LEFT" });
    const drama = await first.next("chaos:drama");
    expect(drama).toMatchObject({ playerId: guest, type: "TAB_LEFT" });
    await success(first, "chaos:startVoting", { gameId, dramaEventId: drama.id });
    const ballot = await first.next("chaos:votingStart");
    expect(await second.next("chaos:votingStart")).toEqual(ballot);
    expect(ballot).toMatchObject({ dramaEventId: drama.id, targetPlayerId: guest, endsAt: Date.now() + 5000 });
    expect((await join(second)).chaos.votingSession).toMatchObject({ canVote: false, hasVoted: false });
    await success(first, "chaos:vote", { gameId, dramaEventId: drama.id, vote: "REDUCE_SCORE" });
    expect(await second.next("chaos:votingUpdate")).toMatchObject({ dramaEventId: drama.id, totalVotes: 1 });

    await jest.advanceTimersByTimeAsync(2000);
    first.socket.disconnect();
    first = await connectPlayer(host);
    const active = (await join(first)).chaos.votingSession;
    expect(active).toMatchObject({
      dramaEventId: drama.id, targetPlayerId: guest, endsAt: ballot.endsAt,
      timeRemainingMs: 3000, canVote: false, hasVoted: true, totalVotes: 1,
    });
    expect(active).not.toHaveProperty("votes");
    await jest.advanceTimersByTimeAsync(3000);
    const complete = await first.next("chaos:votingComplete");
    expect(await second.next("chaos:votingComplete")).toEqual(complete);
    expect(complete).toMatchObject({ dramaEventId: drama.id, targetPlayerId: guest, result: "REDUCE_SCORE", scorePenalty: 50 });
    const scoreboard = await first.next("game:scoreboard");
    expect(scoreboard.players.find(player => player.userId === guest).score).toBe(guestScore - 50);
    expect((await join(first)).chaos.votingSession).toBeNull();

    for (const player of [first, second]) {
      player.socket.emit("player:answer", { gameId, questionId: next.id, answer: correctAnswer, timestamp: Date.now() });
      expect((await join(player)).selectedAnswer).toBe(correctAnswer);
    }
    await jest.advanceTimersByTimeAsync(3700);
    const end = await first.next("game:end");
    expect(await second.next("game:end")).toEqual(end);
    expect(end.results).toEqual([
      expect.objectContaining({ userId: guest, totalAnswers: 2, correctAnswers: 2 }),
      expect.objectContaining({ userId: host, totalAnswers: 2, correctAnswers: 1 }),
    ]);
    expect(saveGameSession).toHaveBeenCalledTimes(1);
  }, 20000);

  it("removes an active solo Conquest draft together with its bot actions", async () => {
    createMatch(GameMode.Conquest, 12);
    const first = await connectPlayer(host);
    await join(first);
    const forge = jest.fn();
    first.socket.on("game:powerUpSelectStart", forge);
    await success(first, "game:start");
    await first.next("conquest:draftQuestion");
    expect(forge).not.toHaveBeenCalled();
    const state = getConquestState(gameId)!;
    const botId = state.turnOrder.find(id => id !== host)!;
    expect(getBotInfo(botId)).toBeDefined();
    expect(state.scheduledTasks.size).toBe(1);
    removeActiveGame(gameId);
    expect(getConquestState(gameId)).toBeUndefined();
    expect(getBotInfo(botId)).toBeNull();
    expect(state.scheduledTasks.size).toBe(0);
  });

  it("runs the full Conquest draft, all twelve configured Invasion rounds and final territory results", async () => {
    createMatch(GameMode.Conquest, 12);
    const first = await connectPlayer(host);
    let second = await connectPlayer(guest);
    const players = { [host]: first, [guest]: second };
    await join(first);
    await join(second);
    const forge = jest.fn();
    first.socket.on("game:powerUpSelectStart", forge);
    await success(first, "game:start");
    const [started, peerStarted] = await Promise.all([first.next("game:stateSync"), second.next("game:stateSync")]);
    expect(started).toEqual(peerStarted);
    expect(started.room).toMatchObject({ status: GameStatus.Question, powerUpSelection: { isSelecting: false } });
    // Two forts are preclaimed. Ten unclaimed countries take three draft rounds.
    const drafted = new Set<string>();
    for (let round = 1; round <= 3; round++) {
      const question = await questionForBoth(first, second, "conquest:draftQuestion", round);
      for (const player of [first, second]) {
        await success(player, "conquest:draftAnswer", { gameId, answerIndex: correctAnswer, responseTimeMs: 400, questionId: question.id, round });
      }
      // All submitted answers advance immediately; no client-side countdown
      // or extra buffer is needed to start the authoritative pick phase.
      const ranking = await first.next("conquest:draftRanking");
      expect(ranking.ranking.every(player => player.correct)).toBe(true);
      const pickCount = Math.min(4, 10 - drafted.size);
      for (let pick = 0; pick < pickCount; pick++) {
        const turn = await first.next("conquest:draftPickTurn");
        const territoryId = turn.availableTerritories[0];
        expect(drafted.has(territoryId)).toBe(false);
        drafted.add(territoryId);
        await success(players[turn.playerId], "conquest:selectDraftTerritory", { gameId, territoryId, turnId: turn.turnId });
      }
    }
    const draft = await first.next("conquest:draftComplete");
    expect(await second.next("conquest:draftComplete")).toEqual(draft);
    expect(Object.values(draft.territories)).toHaveLength(12);
    expect(Object.values(draft.territories).every(id => id === host || id === guest)).toBe(true);
    expect(await first.next("invasion:init")).toMatchObject({ gameId, playerIds: [host, guest] });
    const initialInvasion = await first.next("invasion:state");
    expect(await second.next("invasion:state")).toEqual(initialInvasion);
    expect(Object.fromEntries(initialInvasion.territories.map(t => [t.id, t.ownerId]))).toEqual(draft.territories);
    // A normal client never needs to trigger the transition itself.
    for (let round = 1; round <= 12; round++) {
      const question = await questionForBoth(first, second, "invasion:roundStart", round);
      if (round === 1) {
        first.socket.emit("invasion:answer", { gameId, answer: correctAnswer, responseTimeMs: 0 });
        await success(first, "game:join");
        expect((await first.next("invasion:state")).selectedAnswer).toBe(correctAnswer);
        second.socket.emit("invasion:answer", { gameId, answer: 0, responseTimeMs: 0 });
        await success(second, "game:join");
        expect((await second.next("invasion:state")).selectedAnswer).toBe(0);
        second.socket.disconnect();
        second = await connectPlayer(guest);
        await join(second);
        const rejoined = await second.next("invasion:state");
        expect(rejoined).toMatchObject({ currentRound: 1, currentQuestion: { id: question.id }, selectedAnswer: 0 });
        expect(rejoined.currentQuestion).not.toHaveProperty("correctIndex");
        expect(rejoined).not.toHaveProperty("playerResponses");
      }
      await jest.advanceTimersByTimeAsync(question.timeLimit * 1000);
      const ranking = await first.next("invasion:ranking");
      if (round === 1) {
        expect(ranking.ranking).toEqual([expect.objectContaining({ playerId: host, picks: 3 })]);
        await jest.advanceTimersByTimeAsync(3000);
        let target: number;
        for (let pick = 0; pick < 3; pick++) {
          const turn = await first.next("invasion:turn");
          const territoryId = pick === 1 ? target : turn.selectableTerritories[0];
          if (pick === 0) target = territoryId;
          first.socket.emit("invasion:selectTerritory", { gameId, territoryId });
          const update = await first.next("invasion:territoryUpdate");
          const updated = update.territories.find(t => t.id === territoryId);
          if (pick === 0) expect(updated).toMatchObject({ ownerId: guest, troopCount: 50 });
          if (pick === 1) expect(updated).toMatchObject({ ownerId: host, troopCount: 100 });
        }
        expect((await first.next("invasion:state")).selectionPhase.isActive).toBe(false);
        await jest.advanceTimersByTimeAsync(2000);
      } else {
        expect(ranking.ranking).toEqual([]);
        await jest.advanceTimersByTimeAsync(3000);
      }
    }
    const end = await first.next("game:end");
    expect(await second.next("game:end")).toEqual(end);
    const invasionEnd = await first.next("invasion:gameEnd");
    expect(await second.next("invasion:gameEnd")).toEqual(invasionEnd);
    expect(invasionEnd.finalTerritories).toEqual({
      [host]: draft.playerTerritories[host].length + 1,
      [guest]: draft.playerTerritories[guest].length - 1,
    });
    expect(end.results.map(player => [player.userId, player.score])).toEqual(Object.entries(invasionEnd.finalTerritories).sort((a, b) => Number(b[1]) - Number(a[1])));
    expect(end.results.find(player => player.userId === host)).toMatchObject({ correctAnswers: 4, totalAnswers: 4, avgAnswerTime: 0 });
    expect(end.results.find(player => player.userId === guest)).toMatchObject({ correctAnswers: 3, totalAnswers: 4, avgAnswerTime: 0 });
    expect(saveGameSession).toHaveBeenCalledTimes(1);
    expect(saveGameSession).toHaveBeenCalledWith(expect.objectContaining({ gameId, mode: GameMode.Conquest, language: "ar", totalRounds: 12, players: end.results }));
    expect(forge).not.toHaveBeenCalled();
  }, 20000);
});

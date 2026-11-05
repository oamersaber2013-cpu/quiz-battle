import { io } from "socket.io-client";
import { Difficulty, GameMode, GameStatus, PowerUpType, SyncedGameRoom } from "@quiz-battle/shared";
import { connectSocket, disconnectSocket, getSocket, subscribeGameRoom, emitAnswer } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";

jest.mock("socket.io-client", () => ({ io: jest.fn() }));
jest.mock("@/lib/sounds", () => ({ soundManager: { play: jest.fn() } }));

class FakeSocket {
  connected = false;
  auth: Record<string, unknown> = {};
  handlers = new Map<string, Set<(...args: any[]) => void>>();
  emit = jest.fn();
  connect = jest.fn(() => this);
  disconnect = jest.fn(() => { this.connected = false; this.dispatch("disconnect"); });
  removeAllListeners = jest.fn(() => this.handlers.clear());
  on(event: string, handler: (...args: any[]) => void) {
    const handlers = this.handlers.get(event) || new Set();
    handlers.add(handler);
    this.handlers.set(event, handlers);
    return this;
  }
  off(event: string, handler: (...args: any[]) => void) {
    this.handlers.get(event)?.delete(handler);
    return this;
  }
  dispatch(event: string, ...args: any[]) {
    this.handlers.get(event)?.forEach((handler) => handler(...args));
  }
}

const question = {
  id: "question-4",
  text: "ما عاصمة قطر؟",
  options: ["الدوحة", "مسقط", "الرياض", "المنامة"],
  timeLimit: 30,
  category: "geography",
  difficulty: Difficulty.Novice,
};

function room(overrides: Partial<SyncedGameRoom> = {}): SyncedGameRoom {
  return {
    gameId: "battle-1",
    joinCode: "ABC123",
    hostId: "player-1",
    mode: GameMode.Classic,
    difficulty: Difficulty.Novice,
    status: GameStatus.Question,
    currentRound: 4,
    totalRounds: 8,
    maxPlayers: 8,
    language: "ar",
    players: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-11-04T09:00:00Z"));
  jest.spyOn(console, "warn").mockImplementation(() => {});
  useGameStore.getState().resetGame();
  useGameStore.getState().setAuth({ userId: "player-1", username: "محارب", token: "test-token" });
  useGameStore.setState({ soundEnabled: false });
  (io as jest.Mock).mockImplementation((_url, options) => {
    const socket = new FakeSocket();
    socket.auth = options.auth;
    return socket;
  });
});

afterEach(() => {
  disconnectSocket();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("room membership recovery", () => {
  const callbacks = () => ({ onJoining: jest.fn(), onJoined: jest.fn(), onError: jest.fn() });
  const typed = (socket: FakeSocket) => socket as unknown as ReturnType<typeof getSocket>;

  it("joins when opening a game URL and rejoins after every transport reconnect", () => {
    const socket = new FakeSocket();
    socket.connected = true;
    const events = callbacks();
    const cleanup = subscribeGameRoom(typed(socket), "battle-1", false, events);
    expect(socket.emit).toHaveBeenCalledWith("game:join", { gameId: "battle-1" }, expect.any(Function));
    socket.emit.mock.calls[0][2]({ success: true });
    expect(events.onJoined).toHaveBeenCalledTimes(1);

    socket.dispatch("disconnect");
    socket.dispatch("connect");
    expect(socket.emit).toHaveBeenCalledTimes(2);
    socket.emit.mock.calls[1][2]({ success: true });
    expect(events.onJoined).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it("waits for the initial connection and removes route listeners on cleanup", () => {
    const socket = new FakeSocket();
    const cleanup = subscribeGameRoom(typed(socket), "battle-1", false, callbacks());
    expect(socket.emit).not.toHaveBeenCalled();
    socket.dispatch("connect");
    expect(socket.emit).toHaveBeenCalledTimes(1);
    cleanup();
    socket.dispatch("connect");
    expect(socket.emit).toHaveBeenCalledTimes(1);
  });

  it("ignores stale acknowledgments from the disconnected socket", () => {
    const socket = new FakeSocket();
    socket.connected = true;
    const events = callbacks();
    const cleanup = subscribeGameRoom(typed(socket), "battle-1", false, events);
    const oldAcknowledgment = socket.emit.mock.calls[0][2];
    socket.dispatch("disconnect");
    socket.dispatch("connect");
    oldAcknowledgment({ success: true });
    expect(events.onJoined).not.toHaveBeenCalled();
    socket.emit.mock.calls[1][2]({ success: true });
    expect(events.onJoined).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("returns a failed join instead of waiting indefinitely", () => {
    const socket = new FakeSocket();
    socket.connected = true;
    const events = callbacks();
    const cleanup = subscribeGameRoom(typed(socket), "missing-battle", false, events);
    jest.advanceTimersByTime(10000);
    expect(events.onError).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("reports an API connection that never opens", () => {
    const events = callbacks();
    const cleanup = subscribeGameRoom(typed(new FakeSocket()), "battle-1", false, events);
    jest.advanceTimersByTime(10000);
    expect(events.onError).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("restores spectators as spectators after reconnect", () => {
    const socket = new FakeSocket();
    socket.connected = true;
    const cleanup = subscribeGameRoom(typed(socket), "battle-1", true, callbacks());
    socket.dispatch("disconnect");
    socket.dispatch("connect");
    expect(socket.emit.mock.calls.map((call) => call[0])).toEqual(["game:spectate", "game:spectate"]);
    cleanup();
  });

  it("reuses a pending connection for the same identity and replaces a previous identity", () => {
    const first = connectSocket("player-1", "محارب", "token-1", true);
    expect(connectSocket("player-1", "محارب", "token-1", true)).toBe(first);
    expect(io).toHaveBeenCalledTimes(1);
    const replacement = connectSocket("player-2", "Warrior", "token-2", false);
    expect(replacement).not.toBe(first);
    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(io).toHaveBeenCalledTimes(2);
  });
});

describe("restoring an active question", () => {
  it("restores final results when an ended room is still retained by the server", () => {
    const finalResults = [{ userId: "player-1", username: "محارب", score: 100, rank: 1, correctAnswers: 3, totalAnswers: 4, avgAnswerTime: 900, xpEarned: 20 }];
    useGameStore.getState().syncRoom(room({ status: GameStatus.Ended, currentQuestion: null, finalResults }));
    expect(useGameStore.getState().status).toBe(GameStatus.Ended);
    expect(useGameStore.getState().finalResults).toEqual(finalResults);
  });
  it.each([{ answer: "الدوحة" }, { answer: [0, 2] }, { answer: [2, 0, 1] }])("restores a text or list answer without coercion: %j", ({ answer }) => {
    useGameStore.getState().syncRoom(room({ currentQuestion: question, questionStartedAt: Date.now(), selectedAnswer: answer }));
    expect(useGameStore.getState().selectedAnswer).toEqual(answer);
  });
  it("restores authoritative reveal metadata and clears it when the next question arrives", () => {
    useGameStore.getState().syncRoom(room({
      status: GameStatus.AnswerReveal, currentQuestion: question, questionStartedAt: Date.now(),
      selectedAnswer: [0], lastAnswerResult: { correct: false, correctIndex: -1, correctIndices: [0, 2] },
    }));
    expect(useGameStore.getState().lastAnswerResult?.correctIndices).toEqual([0, 2]);
    useGameStore.getState().syncRoom(room({ currentQuestion: { ...question, id: "question-5" }, questionStartedAt: Date.now() }));
    expect(useGameStore.getState().lastAnswerResult).toBeNull();
    expect(useGameStore.getState().selectedAnswer).toBeNull();
  });
  it("restores the server clock, round, language and submitted answer after reload", () => {
    useGameStore.getState().syncRoom(room({
      currentQuestion: question,
      questionStartedAt: Date.now() - 10000,
      selectedAnswer: 2,
      answeredAt: Date.now() - 5000,
    }));
    const state = useGameStore.getState();
    expect(state.currentQuestion?.id).toBe("question-4");
    expect(state.timeLeft).toBe(20);
    expect(state.currentRound).toBe(4);
    expect(state.totalRounds).toBe(8);
    expect(state.selectedAnswer).toBe(2);
    expect(state.language).toBe("ar");
  });

  it("keeps question and answer state when a general room broadcast omits them", () => {
    const store = useGameStore.getState();
    store.syncRoom(room({ currentQuestion: question, questionStartedAt: Date.now(), selectedAnswer: 1 }));
    store.syncRoom(room());
    expect(useGameStore.getState().selectedAnswer).toBe(1);
    expect(useGameStore.getState().currentQuestion?.id).toBe(question.id);
    store.syncRoom(room({ gameId: "battle-2", status: GameStatus.Lobby }));
    expect(useGameStore.getState().selectedAnswer).toBeNull();
    expect(useGameStore.getState().currentQuestion).toBeNull();
  });

  it("restores invasion geometry, selection turn and question clock from a reconnect snapshot", () => {
    const socket = connectSocket("player-1", "محارب", "test-token", true) as unknown as FakeSocket;
    socket.dispatch("invasion:state", {
      territories: [{ id: "1", name: "Qatar", nameAr: "قطر", path: "M0,0L1,1Z", center: { x: 1, y: 1 }, ownerId: "player-1", troopCount: 1 }],
      currentRound: 2,
      totalRounds: 6,
      phase: "question",
      currentQuestion: question,
      questionStartedAt: Date.now() - 12000,
      selectedAnswer: 1,
      lastRanking: [],
      selectableTerritories: [1],
      selectionPhase: { isActive: false, pickingPlayerId: "player-1", picksRemaining: 2, turnIndex: 0 },
    });
    const state = useGameStore.getState();
    expect(state.timeLeft).toBe(18);
    expect(state.selectedAnswer).toBe(1);
    expect(state.invasionState?.territories[0]).toMatchObject({ id: 1, nameAr: "قطر", center: { x: 1, y: 1 } });
    expect(state.invasionState?.currentTurn).toBe("player-1");
    expect(state.invasionState?.selectableTerritories).toEqual([1]);
  });

  it("ends the invasion answer window when the ranking arrives", () => {
    const socket = connectSocket("player-1", "محارب", "test-token", true) as unknown as FakeSocket;
    useGameStore.getState().setQuestion(question, 1, 6);
    socket.dispatch("invasion:ranking", { ranking: [] });
    expect(useGameStore.getState().status).toBe(GameStatus.AnswerReveal);
  });

  it("restores power-up choices and the remaining selection time", () => {
    useGameStore.getState().syncRoom(room({
      status: GameStatus.PowerUpSelect,
      powerUpSelection: {
        availablePowerUps: [PowerUpType.Shield, PowerUpType.Freeze],
        selectedPowerUps: [PowerUpType.Shield],
        maxSelections: 3,
        timeLeft: 17,
        isSelecting: true,
      },
    }));
    expect(useGameStore.getState().powerUpSelection).toMatchObject({
      isSelecting: true,
      selectedPowerUps: [PowerUpType.Shield],
      timeLeft: 17,
    });
  });

  it("does not undo a local power-up selection when the server echoes it", () => {
    const socket = connectSocket("player-1", "محارب", "test-token", true) as unknown as FakeSocket;
    useGameStore.getState().selectPowerUp(PowerUpType.Shield);
    socket.dispatch("game:powerUpSelected", { userId: "player-1", powerUp: PowerUpType.Shield, remainingSlots: 2 });
    expect(useGameStore.getState().powerUpSelection.selectedPowerUps).toEqual([PowerUpType.Shield]);
  });
});

describe("answer wire payloads", () => {
  it.each([{ answer: "الدوحة" }, { answer: [0, 2] }, { answer: [2, 0, 1] }])("emits the complete answer and no numeric fallback: %j", ({ answer }) => {
    const socket = connectSocket("player-1", "محارب", "test-token", true) as unknown as FakeSocket;
    emitAnswer("battle-1", "question-1", answer);
    expect(socket.emit).toHaveBeenCalledWith("player:answer", {
      gameId: "battle-1", questionId: "question-1", answer, timestamp: Date.now(),
    });
  });

  it("retains the legacy numeric field for multiple-choice clients", () => {
    const socket = connectSocket("player-1", "محارب", "test-token", true) as unknown as FakeSocket;
    emitAnswer("battle-1", "question-1", 2);
    expect(socket.emit).toHaveBeenCalledWith("player:answer", {
      gameId: "battle-1", questionId: "question-1", answer: 2, answerIndex: 2, timestamp: Date.now(),
    });
  });

  it("keeps server reveal metadata instead of inventing a letter for nonnumeric answers", () => {
    const socket = connectSocket("player-1", "محارب", "test-token", true) as unknown as FakeSocket;
    socket.dispatch("game:answerResult", {
      userId: "player-1", correct: false, scoreDelta: 0, newScore: 0, correctIndex: -1, correctAnswer: "الدوحة",
    });
    expect(useGameStore.getState().lastAnswerResult?.correctAnswer).toBe("الدوحة");
    expect(useGameStore.getState().status).toBe(GameStatus.AnswerReveal);
    expect(useGameStore.getState().toasts[0].message).toContain("الدوحة");
    expect(useGameStore.getState().toasts[0].message).not.toContain("@");
  });
});

describe("Time Warp deadline", () => {
  it("extends the same clock used by the game timer and resets for the next question", () => {
    const store = useGameStore.getState();
    store.setQuestion(question, 1, 8);
    jest.advanceTimersByTime(10000);
    store.applyTimeWarpBonus(5);
    expect(useGameStore.getState().timeWarpBonusSeconds).toBe(5);
    expect(useGameStore.getState().timeLeft).toBe(25);
    store.applyTimeWarpBonus(5);
    expect(useGameStore.getState().timeWarpBonusSeconds).toBe(5);
    store.setQuestion({ ...question, id: "question-5" }, 2, 8);
    expect(useGameStore.getState().timeWarpBonusSeconds).toBe(0);
  });

  it("recovers the granted extension from the server effect expiry", () => {
    const startedAt = Date.now() - 10000;
    useGameStore.getState().syncRoom(room({
      currentQuestion: question,
      questionStartedAt: startedAt,
      activeEffects: [{ type: PowerUpType.TimeWarp, sourceUserId: "player-1", expiresAt: startedAt + 35000 }],
    }));
    expect(useGameStore.getState().timeWarpBonusSeconds).toBe(5);
    expect(useGameStore.getState().timeLeft).toBe(25);
  });
});

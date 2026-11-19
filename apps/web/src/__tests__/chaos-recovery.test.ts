import { createElement } from "react";
import { Difficulty, GameMode, GameStatus, PowerUpType, type ChaosClientSnapshot, type SyncedGameRoom } from "@quiz-battle/shared";
import ChaosGame from "@/components/ChaosGame";
import { QuestionReview } from "@/components/QuestionReview";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";
import { io } from "socket.io-client";
import { resetServerClock } from "@/lib/gameClock";

const { act, create } = require("react-test-renderer");
jest.mock("socket.io-client", () => ({ io: jest.fn() }));
jest.mock("@/lib/sounds", () => ({ soundManager: { play: jest.fn() } }));
jest.mock("@/components/EmoteSystem", () => ({ EmoteSystem: () => null }));
jest.mock("@/components/RoundProgress", () => ({ RoundProgress: () => null }));
jest.mock("framer-motion", () => ({
  motion: { div: "div", button: "button", span: "span" }, AnimatePresence: "div",
}));

const serverHandlers = new Map<string, (...args: any[]) => void>();
const socket = {
  connected: true,
  auth: {},
  on: jest.fn((name, listener) => serverHandlers.set(name, listener)),
  off: jest.fn(),
  emit: jest.fn(),
  emitWithAck: jest.fn(),
  timeout: jest.fn(),
  disconnect: jest.fn(),
  removeAllListeners: jest.fn(() => serverHandlers.clear()),
};

function votingSession(overrides: Partial<NonNullable<ChaosClientSnapshot["votingSession"]>> = {}): NonNullable<ChaosClientSnapshot["votingSession"]> {
  return {
    dramaEventId: "ballot-1",
    targetPlayerId: "target",
    targetUsername: "Target",
    durationMs: 5000,
    endsAt: Date.now() + 3000,
    timeRemainingMs: 3000,
    totalVotes: 1,
    options: ["FORGIVE", "REDUCE_SCORE"],
    canVote: true,
    hasVoted: false,
    ...overrides,
  };
}

function chaos(overrides: Partial<ChaosClientSnapshot> = {}): ChaosClientSnapshot {
  return {
    gameId: "chaos-room",
    level: 35,
    state: "UNSTABLE",
    personality: "RANDOM",
    votingSession: null,
    pendingDrama: null,
    activeTrap: null,
    evaluatingTrap: false,
    ...overrides,
  };
}

function sync(chaosSnapshot = chaos(), overrides: Partial<SyncedGameRoom> = {}) {
  serverHandlers.get("game:stateSync")?.({
    room: {
      gameId: "chaos-room",
      joinCode: "ABC123",
      hostId: "player-1",
      mode: GameMode.Chaos,
      difficulty: Difficulty.Novice,
      status: GameStatus.Question,
      currentRound: 2,
      totalRounds: 8,
      maxPlayers: 8,
      players: [{
        userId: "player-1", username: "Warrior", score: 50, rank: 1, streak: 0,
        isEliminated: false, isConnected: true, powerUpInventory: [],
      }],
      language: "en",
      currentQuestion: {
        id: "question-1", text: "What is Qatar's capital?", options: ["Doha", "Muscat"],
        category: "geography", difficulty: Difficulty.Novice, timeLimit: 30,
      },
      questionStartedAt: Date.now() - 5000,
      selectedAnswer: null,
      chaos: chaosSnapshot,
      ...overrides,
    },
  });
}

let view: ReturnType<typeof create>;
beforeAll(() => {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { addEventListener: jest.fn(), removeEventListener: jest.fn() },
  });
});
afterAll(() => { Reflect.deleteProperty(globalThis, "document"); });
beforeEach(() => {
  resetServerClock();
  jest.useFakeTimers();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  useGameStore.getState().resetGame();
  useGameStore.setState({ userId: "player-1", language: "en", soundEnabled: false });
  (io as jest.Mock).mockReturnValue(socket);
  socket.timeout.mockReturnValue(socket);
  socket.emitWithAck.mockResolvedValue({ success: true });
  connectSocket("player-1", "Warrior", "token");
  serverHandlers.get("connect")?.();
  socket.emit.mockClear();
});
afterEach(() => {
  resetServerClock();
  act(() => view?.unmount());
  view = undefined;
  disconnectSocket();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

function render(spectating = false) {
  act(() => { view = create(createElement(ChaosGame, { isSpectating: spectating })); });
}
function text(node: any): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  return node?.props ? text(node.props.children) : "";
}
function button(label: string) {
  return view.root.findAllByType("button").find((node: any) => text(node.props.children).includes(label));
}
function content() {
  return JSON.stringify(view.toJSON());
}

it("localizes the Chaos level and live ballot seconds in Arabic", () => {
  sync(chaos({ votingSession: votingSession() }), { language: "ar" });
  render();
  expect(content()).toContain("غير مستقر");
  expect(content()).not.toContain("UNSTABLE");
  expect(button("سامح")).toBeDefined();
  expect(content()).toContain("ث");
});

it.each([-40000, 40000])("keeps Chaos drama and ballots usable with client clock skew %sms", (skew) => {
  const serverNow = Date.now();
  jest.setSystemTime(serverNow + skew);
  sync(chaos({ serverNow, pendingDrama: { id: "skew-drama", type: "TAB_LEFT", playerId: "target", username: "Target", expiresAt: serverNow + 10000 } }), {
    serverNow, questionStartedAt: serverNow - 5000,
  });
  render();
  expect(button("Start voting").props.disabled).toBeFalsy();
  expect(button("Doha").props.disabled).toBe(false);
  act(() => serverHandlers.get("chaos:state")?.(chaos({ serverNow, votingSession: votingSession({ endsAt: serverNow + 3000, timeRemainingMs: 3000 }) })));
  expect(button("FORGIVE").props.disabled).toBe(false);
  act(() => jest.advanceTimersByTime(3000));
  expect(button("FORGIVE").props.disabled).toBe(true);
});

it("restores the active ballot, trap and my submitted answer from a room snapshot", () => {
  sync(chaos({
    votingSession: votingSession({ hasVoted: true }),
    activeTrap: { targetPlayerId: "player-1", targetUsername: "Warrior", level: 2, isTarget: true },
  }), { selectedAnswer: 0 });
  render();
  expect(content()).toContain("Unstable");
  expect(content()).toContain("VOTE CAST");
  expect(content()).toContain("Level 2 trap");
  expect(button("Doha").props.disabled).toBe(true);
  expect(button("RISK")).toBeUndefined();
});

it("sends normal scoring traffic for Chaos answers and ignores repeat clicks", () => {
  sync();
  render();
  act(() => button("Doha").props.onClick());
  act(() => button("Doha").props.onClick());
  expect(socket.emit).toHaveBeenCalledTimes(1);
  expect(socket.emit).toHaveBeenCalledWith("player:answer", expect.objectContaining({ gameId: "chaos-room", questionId: "question-1", answerIndex: 0 }));
});

it("does not let spectators answer or send a vote", () => {
  sync(chaos({ votingSession: votingSession() }));
  render(true);
  expect(button("Doha").props.disabled).toBe(true);
  act(() => button("Doha").props.onClick());
  expect(button("FORGIVE")).toBeUndefined();
  expect(socket.emit).not.toHaveBeenCalled();
  expect(socket.emitWithAck).not.toHaveBeenCalled();
});

it("applies a live snapshot only for the current match and expires a ballot on the server deadline", () => {
  sync();
  render();
  act(() => serverHandlers.get("chaos:state")?.(chaos({ votingSession: votingSession() })));
  expect(button("FORGIVE").props.disabled).toBe(false);
  act(() => serverHandlers.get("chaos:state")?.(chaos({ gameId: "old-room", level: 100 })));
  expect(useGameStore.getState().chaosState?.level).toBe(35);
  act(() => { jest.advanceTimersByTime(3000); });
  expect(button("FORGIVE").props.disabled).toBe(true);
});

it("lets only the host open a valid pending ballot with the server drama ID", async () => {
  const drama = {
    id: "drama-1", type: "TAB_LEFT", playerId: "target",
    username: "Player two", expiresAt: Date.now() + 30000,
  };
  sync(chaos({ pendingDrama: drama }), { hostId: "other-host" });
  render();
  expect(button("Start voting")).toBeUndefined();
  act(() => sync(chaos({ pendingDrama: drama })));
  await act(async () => { button("Start voting").props.onClick(); });
  expect(socket.emitWithAck).toHaveBeenCalledWith("chaos:startVoting", {
    gameId: "chaos-room", dramaEventId: drama.id,
  });
  expect(button("FORGIVE")).toBeUndefined();
});

it("waits for vote confirmation and leaves a rejected ballot retryable", async () => {
  sync(chaos({ votingSession: votingSession() }));
  render();
  socket.emitWithAck.mockResolvedValueOnce({ success: false });
  await act(async () => { button("FORGIVE").props.onClick(); });
  expect(content()).toContain("Voting action failed");
  expect(button("FORGIVE").props.disabled).toBe(false);
  await act(async () => { button("REDUCE SCORE").props.onClick(); });
  expect(socket.emitWithAck).toHaveBeenLastCalledWith("chaos:vote", {
    gameId: "chaos-room", dramaEventId: "ballot-1", vote: "REDUCE_SCORE",
  });
  expect(content()).toContain("VOTE CAST");
  expect(button("FORGIVE")).toBeUndefined();
});

it("shows a live ballot during a reconnect even when no current question is available", () => {
  sync(chaos({ votingSession: votingSession() }), { currentQuestion: null, status: GameStatus.AnswerReveal });
  render();
  expect(content()).toContain("VOTE ON PUNISHMENT");
  expect(button("FORGIVE").props.disabled).toBe(false);
});

it.each(["en", "ar"] as const)("reviews the real safe question and the viewer's submitted answer in %s", language => {
  const prompt = language === "ar" ? "ما عاصمة دولة قطر؟" : "What is Qatar's capital?";
  const option = language === "ar" ? "الدوحة" : "Doha";
  sync(chaos(), { language, selectedAnswer: 0, status: GameStatus.AnswerReveal, lastAnswerResult: { correct: true, correctIndex: 0 },
    currentQuestion: { id: "review-question", text: prompt, options: [option, "Muscat"], category: "geography", difficulty: Difficulty.Novice, timeLimit: 30 },
  });
  render();
  act(() => button(language === "ar" ? "مراجعة السؤال" : "Review Question").props.onClick());
  expect(content()).toContain(prompt);
  expect(content()).toContain(option);
  expect(view.root.findByType(QuestionReview).props.playerAnswers).toEqual({ "player-1": 0 });
  expect(content()).not.toContain("No answer");
});

it("keeps freeze and sandstorm temporary and preserves only the viewer's eliminated choices", () => {
  const now = Date.now();
  sync(chaos(), { activeEffects: [
    { type: PowerUpType.Freeze, sourceUserId: "other", targetUserId: "player-1", expiresAt: now + 1000 },
    { type: PowerUpType.Sandstorm, sourceUserId: "other", targetUserId: "player-1", expiresAt: now + 2000 },
  ] });
  useGameStore.setState({ eliminatedOptions: [1] });
  render();
  expect(button("Doha").props.disabled).toBe(true);
  expect(view.root.findAllByProps({ "data-chaos-sandstorm": true })).toHaveLength(2);
  act(() => jest.advanceTimersByTime(1000));
  expect(button("Doha").props.disabled).toBe(false);
  expect(button("Muscat").props.disabled).toBe(true);
  act(() => button("Muscat").props.onClick());
  expect(socket.emit).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1000));
  expect(view.root.findAllByProps({ "data-chaos-sandstorm": true })).toHaveLength(0);
  act(() => button("Doha").props.onClick());
  expect(socket.emit).toHaveBeenCalledTimes(1);
});

it("closes a question review before the next round and keeps the next reveal unobstructed", () => {
  sync(chaos(), { selectedAnswer: 0, status: GameStatus.AnswerReveal, lastAnswerResult: { correct: true, correctIndex: 0 } });
  render();
  act(() => button("Review Question").props.onClick());
  expect(view.root.findAllByType(QuestionReview)).toHaveLength(1);
  act(() => useGameStore.getState().setQuestion({ ...useGameStore.getState().currentQuestion!, id: "question-2" }, 3, 8));
  act(() => useGameStore.setState({ status: GameStatus.AnswerReveal, lastAnswerResult: { correct: false, correctIndex: 1 } }));
  expect(view.root.findAllByType(QuestionReview)).toHaveLength(0);
});

it("restores focus only to the actual review trigger while its connected round remains relevant", () => {
  sync(chaos(), { selectedAnswer: 0, status: GameStatus.AnswerReveal, lastAnswerResult: { correct: true, correctIndex: 0 } });
  render();
  act(() => button("Review Question").props.onClick());
  const review = view.root.findByType(QuestionReview).props;
  expect(review.returnFocusRef).toBeDefined();
  expect(review.shouldRestoreFocus()).toBe(true);
  act(() => useGameStore.setState({ isConnected: false }));
  expect(review.shouldRestoreFocus()).toBe(false);
  act(() => useGameStore.setState({ isConnected: true, currentRound: 3 }));
  expect(review.shouldRestoreFocus()).toBe(false);
});

it("keeps a spectator's question and current standings visible during reveal without inventing an own result", () => {
  sync(chaos(), { status: GameStatus.AnswerReveal, lastAnswerResult: null });
  render(true);
  expect(content()).toContain("What is Qatar's capital?");
  expect(button("Doha").props.disabled).toBe(true);
  expect(button("Review Question")).toBeUndefined();
  expect(view.root.findByProps({ "aria-label": "Current standings" })).toBeDefined();
  expect(content()).not.toContain("Wrong Answer");
});

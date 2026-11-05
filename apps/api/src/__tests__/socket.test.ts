jest.mock("../lib/gameOrchestrator", () => ({
  getActiveGame: jest.fn(),
  startGame: jest.fn(), handlePlayerAnswer: jest.fn(), handlePowerUp: jest.fn(),
  startPowerUpSelectionPhase: jest.fn(), handlePowerUpSelection: jest.fn(),
  confirmPowerUpSelection: jest.fn(),
  getPowerUpSelectionSnapshot: jest.fn(),
  getViewerAnswerResult: jest.fn(() => null),
}));
jest.mock("../lib/aiBots", () => ({ fillWithBots: jest.fn(), getBotInfo: jest.fn() }));
jest.mock("../lib/questions", () => ({ fetchQuestions: jest.fn() }));

import jwt from "jsonwebtoken";
import { GameMode, GameStatus, Difficulty } from "@quiz-battle/shared";
import { getActiveGame, handlePlayerAnswer, getViewerAnswerResult } from "../lib/gameOrchestrator";
import { getJwtSecret } from "../lib/jwtConfig";
import { createInvasionGame, getInvasionState, deleteInvasionGame } from "../lib/invasionOrchestrator";
import { registerSocketHandlers } from "../socket";

describe("Socket identity and room authority", () => {
  let middleware: Function;
  let connect: Function;
  let handlers: Record<string, Function>;
  let socket: any;
  let game: any;
  let io: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (getViewerAnswerResult as jest.Mock).mockReturnValue(null);
    handlers = {};
    io = {
      use: (fn: Function) => { middleware = fn; },
      on: (_event: string, fn: Function) => { connect = fn; },
      to: jest.fn(() => ({ emit: jest.fn() })),
      sockets: { adapter: { rooms: new Map() } },
    };
    socket = {
      data: { userId: "player", username: "Player" },
      handshake: { auth: {} },
      rooms: new Set(["room"]),
      on: (event: string, fn: Function) => { handlers[event] = fn; },
      emit: jest.fn(),
      join: jest.fn(async () => {}),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };
    game = {
      gameId: "room", hostId: "host", mode: GameMode.Conquest, status: GameStatus.Question,
      difficulty: Difficulty.Medium, language: "ar", maxPlayers: 8,
      players: {
        host: { userId: "host", username: "Host", isConnected: true },
        player: { userId: "player", username: "Player", isConnected: true },
      },
      questions: [], answersThisRound: {}, lastAnswerByPlayer: {},
    };
    (getActiveGame as jest.Mock).mockImplementation(id => id === "room" ? game : undefined);
    registerSocketHandlers(io, {} as any);
  });

  afterEach(() => deleteInvasionGame("room"));

  it("rejects arbitrary tokens and tokenless claimed guest ids", async () => {
    socket.handshake.auth = { token: "host", userId: "host" };
    const next = jest.fn();
    await middleware(socket, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    next.mockClear();
    socket.handshake.auth = { guestId: "host" };
    await middleware(socket, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("uses signed guest identity and ignores client-supplied user/name overrides", async () => {
    socket.handshake.auth = {
      token: jwt.sign({ userId: "guest-1", username: "Signed Guest" }, getJwtSecret()),
      userId: "host", username: "Host", guestId: "host",
    };
    const next = jest.fn();
    await middleware(socket, next);
    expect(next).toHaveBeenCalledWith();
    expect(socket.data.userId).toBe("guest-1");
    expect(socket.data.username).toBe("Signed Guest");
  });

  it("rejects a correctly signed token without a player identity", async () => {
    socket.handshake.auth = { token: jwt.sign({ role: "free" }, getJwtSecret()) };
    const next = jest.fn();
    await middleware(socket, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("does not let another player reinitialize the invasion map", async () => {
    createInvasionGame("room", ["host", "player"]);
    const state = getInvasionState("room");
    connect(socket);
    await handlers["invasion:init"]({ gameId: "room", playerIds: ["player"] });
    expect(getInvasionState("room")).toBe(state);
    expect(getInvasionState("room")!.playerIds).toEqual(["host", "player"]);
    expect(socket.emit).toHaveBeenCalledWith("game:error", expect.any(Object));
  });

  it("does not let another player start an invasion question", async () => {
    createInvasionGame("room", ["host", "player"]);
    connect(socket);
    await handlers["invasion:startRound"]({ gameId: "room" });
    expect(getInvasionState("room")!.currentQuestion).toBeNull();
    expect(socket.emit).toHaveBeenCalledWith("game:error", expect.any(Object));
  });

  it("restores only the rejoining player's answer and strips private round state", async () => {
    game.mode = GameMode.Classic;
    game.currentRound = 1;
    game.questionStartTime = Date.now() - 1000;
    game.questions = [{ id: "q1", text: "Question", options: ["A", "B"], correctIndex: 1, timeLimit: 15 }];
    game.answersThisRound = {
      player: { index: 0, timestamp: Date.now(), latencyMs: 500 },
      host: { index: 1, timestamp: Date.now(), latencyMs: 100 },
    };
    game.lastAnswerByPlayer = { host: true };
    game.password = "private-room-password";
    connect(socket);
    await handlers["game:join"]({ gameId: "room" }, jest.fn());
    const room = socket.emit.mock.calls.find(([event]: any[]) => event === "game:stateSync")[1].room;
    expect(room).not.toHaveProperty("questions");
    expect(room).not.toHaveProperty("answersThisRound");
    expect(room).not.toHaveProperty("lastAnswerByPlayer");
    expect(room).not.toHaveProperty("password");
    expect(room.currentQuestion).not.toHaveProperty("correctIndex");
    expect(room.questionStartedAt).toBe(game.questionStartTime);
    expect(room.selectedAnswer).toBe(0);
  });

  it.each(["Doha", [0, 2], [2, 0, 1], 0])("forwards typed submissions without numeric coercion", async answer => {
    connect(socket);
    await handlers["player:answer"]({ gameId: "room", questionId: "q1", answer, timestamp: 123 });
    expect(handlePlayerAnswer).toHaveBeenCalledWith(game, io, {}, "player", "q1", answer, 123);
  });

  it("keeps legacy numeric answerIndex clients working", async () => {
    connect(socket);
    await handlers["player:answer"]({ gameId: "room", questionId: "q1", answerIndex: 2, timestamp: 123 });
    expect(handlePlayerAnswer).toHaveBeenCalledWith(game, io, {}, "player", "q1", 2, 123);
  });

  it("restores a typed answer without leaking its key or alternatives", async () => {
    game.mode = GameMode.Classic;
    game.currentRound = 1;
    game.questions = [{ id: "q1", text: "City?", options: [], correctAnswer: "Doha", acceptedAnswers: ["الدوحة"], correctIndex: -1, explanation: "private" }];
    game.answersThisRound = { player: { answer: "الدوحة", timestamp: 123 } };
    connect(socket);
    await handlers["game:join"]({ gameId: "room" }, jest.fn());
    const room = socket.emit.mock.calls.find(([event]: any[]) => event === "game:stateSync")[1].room;
    expect(room.selectedAnswer).toBe("الدوحة");
    expect(room.currentQuestion).not.toHaveProperty("correctAnswer");
    expect(room.currentQuestion).not.toHaveProperty("acceptedAnswers");
    expect(room.currentQuestion).not.toHaveProperty("explanation");
    expect(room.lastAnswerResult).toBeNull();
    expect(getViewerAnswerResult).not.toHaveBeenCalled();
  });

  it("restores reveal metadata only at reveal and finished results only at the end", async () => {
    game.mode = GameMode.Classic;
    game.status = GameStatus.AnswerReveal;
    (getViewerAnswerResult as jest.Mock).mockReturnValue({ correct: true, scoreDelta: 100, correctAnswer: "Doha" });
    connect(socket);
    await handlers["game:join"]({ gameId: "room" }, jest.fn());
    expect(socket.emit.mock.calls.find(([event]: any[]) => event === "game:stateSync")[1].room.lastAnswerResult.correctAnswer).toBe("Doha");
    socket.emit.mockClear();
    game.status = GameStatus.Ended;
    game.finalResults = [{ userId: "player", score: 100 }];
    await handlers["game:join"]({ gameId: "room" }, jest.fn());
    const ended = socket.emit.mock.calls.find(([event]: any[]) => event === "game:stateSync")[1].room;
    expect(ended.finalResults).toEqual(game.finalResults);
    expect(ended.lastAnswerResult).toBeNull();
    expect(ended.currentQuestion).toBeNull();
  });
});

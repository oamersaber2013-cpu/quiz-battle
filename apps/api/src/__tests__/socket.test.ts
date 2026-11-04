jest.mock("../lib/gameOrchestrator", () => ({
  getActiveGame: jest.fn(),
  startGame: jest.fn(), handlePlayerAnswer: jest.fn(), handlePowerUp: jest.fn(),
  startPowerUpSelectionPhase: jest.fn(), handlePowerUpSelection: jest.fn(),
  confirmPowerUpSelection: jest.fn(),
  getPowerUpSelectionSnapshot: jest.fn(),
}));
jest.mock("../lib/aiBots", () => ({ fillWithBots: jest.fn(), getBotInfo: jest.fn() }));
jest.mock("../lib/questions", () => ({ fetchQuestions: jest.fn() }));

import jwt from "jsonwebtoken";
import { GameMode, GameStatus, Difficulty } from "@quiz-battle/shared";
import { getActiveGame } from "../lib/gameOrchestrator";
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
    connect(socket);
    await handlers["game:join"]({ gameId: "room" }, jest.fn());
    const room = socket.emit.mock.calls.find(([event]: any[]) => event === "game:stateSync")[1].room;
    expect(room).not.toHaveProperty("questions");
    expect(room).not.toHaveProperty("answersThisRound");
    expect(room).not.toHaveProperty("lastAnswerByPlayer");
    expect(room.currentQuestion).not.toHaveProperty("correctIndex");
    expect(room.questionStartedAt).toBe(game.questionStartTime);
    expect(room.selectedAnswer).toBe(0);
  });
});

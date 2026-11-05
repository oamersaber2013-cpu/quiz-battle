jest.mock("../lib/gameOrchestrator", () => ({
  getActiveGame: jest.fn(), startGame: jest.fn(), handlePlayerAnswer: jest.fn(), handlePowerUp: jest.fn(),
  startPowerUpSelectionPhase: jest.fn(), handlePowerUpSelection: jest.fn(), confirmPowerUpSelection: jest.fn(),
  getPowerUpSelectionSnapshot: jest.fn(),
  getViewerAnswerResult: jest.fn(() => null),
}));
jest.mock("../lib/aiBots", () => ({ fillWithBots: jest.fn(), getBotInfo: jest.fn() }));
jest.mock("../lib/questions", () => ({ fetchQuestions: jest.fn() }));

import { createServer } from "http";
import { AddressInfo } from "net";
import { Server } from "socket.io";
import { io as connectClient, Socket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { Difficulty, GameMode, GameStatus } from "@quiz-battle/shared";
import { getActiveGame } from "../lib/gameOrchestrator";
import { getJwtSecret } from "../lib/jwtConfig";
import { fetchQuestions } from "../lib/questions";
import { createInvasionGame, deleteInvasionGame, getInvasionState } from "../lib/invasionOrchestrator";
import { SafeRedis } from "../lib/redis";
import { registerSocketHandlers } from "../socket";
import { protectRoom, removeRoomAccess } from "../lib/roomAccess";

describe("Socket.IO transport", () => {
  let io: Server;
  let url: string;
  let game: any;
  const clients: Socket[] = [];

  async function connect(userId: string, overrides: Record<string, unknown> = {}) {
    const client = connectClient(url, {
      transports: ["websocket"], reconnection: false, forceNew: true,
      auth: { token: jwt.sign({ userId, username: userId }, getJwtSecret()), ...overrides },
    });
    clients.push(client);
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("connect_error", reject);
    });
    return client;
  }

  function once(client: Socket, event: string): Promise<any> {
    return new Promise(resolve => client.once(event, resolve));
  }

  async function join(client: Socket) {
    const sync = once(client, "game:stateSync");
    const response = await new Promise<any>(resolve => client.emit("game:join", { gameId: "wire-room" }, resolve));
    expect(response.success).toBe(true);
    return (await sync).room;
  }

  beforeAll(async () => {
    const http = createServer();
    io = new Server(http);
    registerSocketHandlers(io as any, new SafeRedis(null));
    await new Promise<void>(resolve => http.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  });

  beforeEach(() => {
    game = {
      gameId: "wire-room", joinCode: "WIRE", hostId: "host", mode: GameMode.Classic,
      difficulty: Difficulty.Medium, language: "ar", status: GameStatus.Question, maxPlayers: 8,
      currentRound: 1, totalRounds: 6, questionStartTime: Date.now() - 2000,
      questions: [{ id: "wire-question", text: "سؤال", options: ["أ", "ب"], correctIndex: 1, timeLimit: 15 }],
      answersThisRound: {}, lastAnswerByPlayer: { host: true },
      players: {
        host: { userId: "host", username: "Host", isConnected: true },
        player: { userId: "player", username: "Player", isConnected: false },
      },
    };
    (getActiveGame as jest.Mock).mockImplementation(id => id === "wire-room" ? game : undefined);
    (fetchQuestions as jest.Mock).mockReset().mockResolvedValue([{
      id: "invasion-question", text: "سؤال الغزو", options: ["أ", "ب"], correctIndex: 1, timeLimit: 15,
    }]);
  });

  afterEach(() => {
    clients.splice(0).forEach(client => client.disconnect());
    deleteInvasionGame("wire-room");
    removeRoomAccess("wire-room");
  });

  afterAll(async () => {
    await new Promise<void>(resolve => io.close(() => resolve()));
  });

  it("rejoins a signed guest on a new connection and restores only their answer", async () => {
    const first = await connect("player");
    const initial = await join(first);
    expect(initial.currentQuestion.text).toBe("سؤال");
    expect(initial.currentQuestion).not.toHaveProperty("correctIndex");
    expect(initial.selectedAnswer).toBeNull();
    first.disconnect();

    game.answersThisRound = {
      host: { index: 1, timestamp: Date.now(), latencyMs: 200 },
      player: { index: 0, timestamp: Date.now(), latencyMs: 500 },
    };
    const reconnect = await connect("player");
    const restored = await join(reconnect);
    expect(restored.questionStartedAt).toBe(game.questionStartTime);
    expect(restored.selectedAnswer).toBe(0);
    expect(restored).not.toHaveProperty("answersThisRound");
    expect(restored).not.toHaveProperty("lastAnswerByPlayer");
    expect(restored).not.toHaveProperty("questions");
  });

  it("ignores a forged host id and rejects outsider invasion controls over the wire", async () => {
    const player = await connect("player", { userId: "host", username: "Host" });
    await join(player);
    const start = await new Promise<any>(resolve => player.emit("game:start", { gameId: "wire-room" }, resolve));
    expect(start).toEqual({ success: false, error: "Only the host can start" });

    game.mode = GameMode.Conquest;
    createInvasionGame("wire-room", ["host", "player"]);
    const outsider = await connect("outsider");
    const error = once(outsider, "game:error");
    outsider.emit("invasion:startRound", { gameId: "wire-room" });
    expect((await error).message).toMatch(/Only the host/);
    expect(getInvasionState("wire-room")!.currentQuestion).toBeNull();
  });

  it("rejects an unsigned claimed identity at the transport handshake", async () => {
    await expect(connect("player", { token: "host", userId: "host" })).rejects.toThrow("Invalid token");
  });

  it("lets the joined host start exactly one invasion question", async () => {
    game.mode = GameMode.Conquest;
    createInvasionGame("wire-room", ["host", "player"], { language: "ar" });
    const host = await connect("host");
    await join(host);
    const question = once(host, "invasion:roundStart");
    host.emit("invasion:startRound", { gameId: "wire-room" });
    host.emit("invasion:startRound", { gameId: "wire-room" });
    expect((await question).question.text).toBe("سؤال الغزو");
    expect(fetchQuestions).toHaveBeenCalledTimes(1);
    expect(fetchQuestions).toHaveBeenCalledWith(Difficulty.Medium, 1, undefined, undefined, "ar", "wire-room", { singleChoiceOnly: true });
  });

  it("requires the private password before room admission and remembers an authenticated participant", async () => {
    game.status = GameStatus.Lobby;
    game.isPrivate = true;
    delete game.players.player;
    await protectRoom("wire-room", "  private secret  ");
    const player = await connect("player");
    const received: unknown[] = [];
    player.on("game:stateSync", state => received.push(state));
    const attempt = (password?: string) => new Promise<any>(resolve => player.emit("game:join", { gameId: "wire-room", password }, resolve));
    expect(await attempt()).toMatchObject({ success: false, code: "PASSWORD_REQUIRED" });
    expect(game.players.player).toBeUndefined();
    expect(received).toHaveLength(0);
    expect(await attempt("wrong")).toMatchObject({ success: false, code: "INVALID_PASSWORD" });
    expect(await attempt("  private secret  ")).toMatchObject({ success: true });
    expect(received).toHaveLength(1);
    player.disconnect();
    const restored = await connect("player");
    expect((await join(restored)).gameId).toBe("wire-room");
  });

  it("protects spectators too, restores their grant, and revokes it when they leave", async () => {
    game.isPrivate = true;
    await protectRoom("wire-room", "spectator-password");
    const spectator = await connect("spectator");
    const received: any[] = [];
    spectator.on("game:stateSync", state => received.push(state));
    const watch = (client: Socket, password?: string) => new Promise<any>(resolve => client.emit("game:spectate", { gameId: "wire-room", password }, resolve));
    expect(await watch(spectator)).toMatchObject({ success: false, code: "PASSWORD_REQUIRED" });
    expect(received).toHaveLength(0);
    expect(await watch(spectator, "wrong")).toMatchObject({ success: false, code: "INVALID_PASSWORD" });
    expect(await watch(spectator, "spectator-password")).toEqual({ success: true });
    expect(received[0].room.selectedAnswer).toBeNull();
    expect(received[0].room).not.toHaveProperty("passwordHash");
    spectator.disconnect();
    const restored = await connect("spectator");
    expect(await watch(restored)).toEqual({ success: true });
    restored.emit("game:leave", { gameId: "wire-room" });
    // Event ordering on this socket guarantees leave is processed before spectate.
    expect(await watch(restored)).toMatchObject({ success: false, code: "PASSWORD_REQUIRED" });
  });
});

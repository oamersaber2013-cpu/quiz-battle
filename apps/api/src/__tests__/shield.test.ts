jest.mock("@quiz-battle/db", () => ({ prisma: {} }));
jest.mock("../lib/analytics", () => ({ trackEvent: jest.fn(async () => {}) }));
jest.mock("../lib/gamePersistence", () => ({ saveGameSession: jest.fn(async () => {}) }));
jest.mock("../lib/aiBots", () => ({ getBotInfo: jest.fn(), removeBots: jest.fn(), fillWithBots: jest.fn() }));
jest.mock("../lib/questions", () => ({ ...jest.requireActual("../lib/questions"), fetchQuestions: jest.fn(), clearUsedQuestions: jest.fn() }));

import { createServer } from "http";
import { AddressInfo } from "net";
import { Server } from "socket.io";
import { io as connectClient, Socket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { Difficulty, GameMode, GameStatus, PowerUpType } from "@quiz-battle/shared";
import { handlePowerUp, removeActiveGame, setActiveGame } from "../lib/gameOrchestrator";
import { SafeRedis } from "../lib/redis";
import { getJwtSecret } from "../lib/jwtConfig";
import { registerSocketHandlers } from "../socket";

const redis = new SafeRedis(null);
function createGame() {
  const player = (id: string, inventory: PowerUpType[]) => ({ userId: id, username: id, score: 1000, rank: 1, streak: 0, isConnected: true, isEliminated: false, powerUpInventory: inventory });
  return { gameId: "shield-room", joinCode: "SHIELD", hostId: "defender", mode: GameMode.Classic, language: "ar", difficulty: Difficulty.Novice,
    status: GameStatus.Question, maxPlayers: 8, currentRound: 1, totalRounds: 3, questionStartTime: Date.now() - 1000,
    questions: [{ id: "shield-question", text: "Question", options: ["A", "B"], correctIndex: 0, timeLimit: 30 }],
    players: { attacker: player("attacker", [PowerUpType.Freeze, PowerUpType.Sandstorm, PowerUpType.Steal, PowerUpType.Whole]), defender: player("defender", [PowerUpType.Shield]) },
    answersThisRound: {}, lastAnswerByPlayer: { defender: false }, activeEffects: [] } as any;
}

describe("one-use attack shield", () => {
  const emit = jest.fn();
  const io = { to: () => ({ emit }) } as any;
  beforeEach(() => { jest.useFakeTimers({ now: 100000 }); emit.mockClear(); });
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
  it.each([PowerUpType.Freeze, PowerUpType.Sandstorm, PowerUpType.Steal, PowerUpType.Whole])("blocks %s before applying its effect, then lets the next attack through", async type => {
    const game = createGame();
    await handlePowerUp(game, io, redis, "defender", PowerUpType.Shield);
    emit.mockClear();
    expect(await handlePowerUp(game, io, redis, "attacker", type, "defender")).toEqual({ success: true });
    expect(game.players.attacker.powerUpInventory).not.toContain(type);
    expect(game.players.defender.powerUpInventory).toEqual([]);
    expect(game.players.attacker.score).toBe(1000);
    expect(game.players.defender.score).toBe(1000);
    expect(game.activeEffects).toEqual([]);
    expect(emit).toHaveBeenCalledWith("game:powerUpBlocked", expect.objectContaining({ type, sourceUserId: "attacker", targetUserId: "defender" }));
    expect(emit).not.toHaveBeenCalledWith("game:powerUpApplied", expect.anything());
    const next = type === PowerUpType.Freeze ? PowerUpType.Sandstorm : PowerUpType.Freeze;
    await handlePowerUp(game, io, redis, "attacker", next, "defender");
    expect(game.activeEffects).toContainEqual(expect.objectContaining({ type: next, targetUserId: "defender" }));
    expect(emit.mock.calls.filter(([event]) => event === "game:powerUpBlocked")).toHaveLength(1);
  });
  it("does not let an expired shield block an attacker using valid extra time", async () => {
    const game = createGame();
    await handlePowerUp(game, io, redis, "defender", PowerUpType.Shield);
    game.activeEffects.push({ type: PowerUpType.TimeWarp, sourceUserId: "attacker", expiresAt: game.questionStartTime + 35000 });
    jest.setSystemTime(game.questionStartTime + 30100); emit.mockClear();
    await handlePowerUp(game, io, redis, "attacker", PowerUpType.Steal, "defender");
    expect(game.players.attacker.score).toBe(1200);
    expect(game.players.defender.score).toBe(800);
    expect(emit).not.toHaveBeenCalledWith("game:powerUpBlocked", expect.anything());
  });
  it("blocks an Echo reward without awarding its attacker points", async () => {
    const game = createGame(); game.lastAnswerByPlayer.defender = true;
    await handlePowerUp(game, io, redis, "defender", PowerUpType.Shield);
    await handlePowerUp(game, io, redis, "attacker", PowerUpType.Whole, "defender");
    expect(game.players.attacker.score).toBe(1000);
    expect(game.players.defender.score).toBe(1000);
    expect(game.activeEffects).toEqual([]);
  });
  it("keeps unrelated self powers active when the shield blocks an attack", async () => {
    const game = createGame(); game.players.defender.powerUpInventory.push(PowerUpType.TimeWarp);
    await handlePowerUp(game, io, redis, "defender", PowerUpType.Shield);
    await handlePowerUp(game, io, redis, "defender", PowerUpType.TimeWarp);
    expect(game.activeEffects.map((effect: any) => effect.type)).toEqual([PowerUpType.Shield, PowerUpType.TimeWarp]);
    await handlePowerUp(game, io, redis, "attacker", PowerUpType.Freeze, "defender");
    expect(game.activeEffects.map((effect: any) => effect.type)).toEqual([PowerUpType.TimeWarp]);
  });
  it("rejects an invalid target without consuming either inventory or the shield", async () => {
    const game = createGame();
    await handlePowerUp(game, io, redis, "defender", PowerUpType.Shield);
    expect(await handlePowerUp(game, io, redis, "attacker", PowerUpType.Freeze, "missing")).toMatchObject({ success: false });
    expect(game.players.attacker.powerUpInventory).toContain(PowerUpType.Freeze);
    expect(game.activeEffects).toHaveLength(1);
  });
});

describe("shield blocking through actual Socket.IO", () => {
  let io: Server;
  let url: string;
  const clients: Socket[] = [];
  const once = (client: Socket, event: string) => new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Missing ${event}`)), 5000);
    client.once(event, payload => { clearTimeout(timer); resolve(payload); });
  });
  async function connect(userId: string) {
    const client = connectClient(url, { transports: ["websocket"], reconnection: false, forceNew: true,
      auth: { token: jwt.sign({ userId, username: userId }, getJwtSecret()) } });
    clients.push(client); await once(client, "connect"); return client;
  }
  const ack = (client: Socket, event: string, payload: any) => client.timeout(5000).emitWithAck(event, payload);
  async function join(client: Socket) {
    const snapshot = once(client, "game:stateSync");
    expect(await ack(client, "game:join", { gameId: "shield-room" })).toMatchObject({ success: true });
    return (await snapshot).room;
  }
  beforeAll(async () => {
    const http = createServer(); io = new Server(http);
    registerSocketHandlers(io as any, redis);
    await new Promise<void>(resolve => http.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  });
  afterEach(() => { clients.splice(0).forEach(client => client.disconnect()); removeActiveGame("shield-room"); });
  afterAll(async () => { await new Promise<void>(resolve => io.close(() => resolve())); });
  it("notifies both players and restores consumed inventories with no attack effect after reconnect", async () => {
    const game = createGame(); setActiveGame(game.gameId, game);
    const attacker = await connect("attacker"); const defender = await connect("defender");
    await join(attacker); await join(defender);
    expect(await ack(defender, "player:powerup", { gameId: game.gameId, type: PowerUpType.Shield })).toEqual({ success: true });
    const blocked = [once(attacker, "game:powerUpBlocked"), once(defender, "game:powerUpBlocked")];
    expect(await ack(attacker, "player:powerup", { gameId: game.gameId, type: PowerUpType.Freeze, targetUserId: "defender" })).toEqual({ success: true });
    const notices = await Promise.all(blocked);
    expect(notices[0]).toEqual(notices[1]);
    attacker.disconnect(); defender.disconnect();
    for (const userId of ["attacker", "defender"]) {
      const restored = await join(await connect(userId));
      expect(restored.players.find((player: any) => player.userId === "attacker").powerUpInventory).not.toContain(PowerUpType.Freeze);
      expect(restored.players.find((player: any) => player.userId === "defender").powerUpInventory).toEqual([]);
      expect(restored.activeEffects).toEqual([]);
      expect(restored.currentQuestion).not.toHaveProperty("correctIndex");
    }
  });
});

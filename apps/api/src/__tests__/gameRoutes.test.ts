jest.mock("nanoid", () => ({ nanoid: () => "test-room" }));
jest.mock("@quiz-battle/db", () => ({ prisma: { $transaction: jest.fn(), question: { findMany: jest.fn() } } }));
jest.mock("../lib/gameOrchestrator", () => ({ getActiveGame: jest.fn(), setActiveGame: jest.fn(), getAllActiveGames: jest.fn() }));

import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import jwt from "jsonwebtoken";
import { prisma } from "@quiz-battle/db";
import { Difficulty, GameMode, GameStatus, PowerUpType } from "@quiz-battle/shared";
import { gamesRouter } from "../routes/games";
import { getActiveGame, setActiveGame, getAllActiveGames } from "../lib/gameOrchestrator";
import { authorizeRoomAccess, removeRoomAccess } from "../lib/roomAccess";
import { SafeRedis } from "../lib/redis";
import { sanitizeInput } from "../lib/sanitize";

const rooms = new Map<string, any>();
const secret = "room-route-test-signing-secret";
const auth = (userId: string) => ({ authorization: `Bearer ${jwt.sign({ userId, username: "Host" }, secret)}` });
beforeEach(() => {
  jest.clearAllMocks();
  rooms.clear();
  (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
  (getActiveGame as jest.Mock).mockImplementation(id => rooms.get(id));
  (setActiveGame as jest.Mock).mockImplementation((id, state) => rooms.set(id, state));
  (getAllActiveGames as jest.Mock).mockImplementation(() => [...rooms.values()]);
  (prisma.$transaction as jest.Mock).mockImplementation(async callback => callback({ user: { findUnique: async () => ({ id: "host", hasPurchasedGame: false, shortGamesRemaining: 0, longGamesRemaining: 0 }) } }));
});
afterEach(() => { removeRoomAccess("test-room"); });

async function createApp() {
  const app = Fastify();
  await app.register(fastifyJwt, { secret });
  app.decorate("redis", new SafeRedis(null));
  app.decorate("authenticate", async (req, reply) => {
    try { await req.jwtVerify(); }
    catch { return reply.status(401).send({ error: "Unauthorized" }); }
  });
  app.addHook("preHandler", sanitizeInput);
  await app.register(gamesRouter, { prefix: "/api/games" });
  return app;
}

const config = { mode: GameMode.Classic, difficulty: Difficulty.Novice, rounds: 1, isPrivate: true };

it("uses validated Custom settings for the actual room and response", async () => {
  const app = await createApp();
  const customSettings = {
    name: "  A short custom battle  ", rounds: 22, timePerQuestion: 5,
    difficulty: Difficulty.Master, enabledPowerUps: [PowerUpType.TimeWarp],
    maxPlayers: 4, categoryFilter: "science",
  };
  try {
    const response = await app.inject({ method: "POST", url: "/api/games", headers: auth("host"), payload: {
      mode: GameMode.Custom, difficulty: Difficulty.Novice, rounds: 1, categories: ["general"],
      subcategories: ["trivia"], customSettings,
    } });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ totalRounds: 22, maxPlayers: 4, difficulty: Difficulty.Master,
      customSettings: { ...customSettings, name: customSettings.name.trim() } });
    expect(rooms.get("test-room")).toMatchObject({ totalRounds: 22, maxPlayers: 4,
      categories: ["science"], subcategories: undefined, difficulty: Difficulty.Master });
    const summary = await app.inject({ method: "GET", url: "/api/games/test-room" });
    expect(summary.json().customSettings).toEqual(response.json().customSettings);
  } finally { await app.close(); }
});

it.each([
  { rounds: 0 }, { rounds: 31 }, { timePerQuestion: 4 }, { timePerQuestion: 61 },
  { maxPlayers: 1 }, { maxPlayers: 21 }, { enabledPowerUps: ["forged"] },
  { enabledPowerUps: [PowerUpType.DoublePick] },
])("rejects invalid Custom configuration before creating a room", async customSettings => {
  const app = await createApp();
  try {
    const response = await app.inject({ method: "POST", url: "/api/games", headers: auth("host"), payload: {
      mode: GameMode.Custom, difficulty: Difficulty.Novice, customSettings,
    } });
    expect(response.statusCode).toBe(400);
    expect(setActiveGame).not.toHaveBeenCalled();
  } finally { await app.close(); }
});

it.each([
  { mode: GameMode.Custom, difficulty: Difficulty.Scholar, customSettings: { difficulty: Difficulty.Legend, categoryFilter: "sports" } },
  { mode: GameMode.Classic, difficulty: Difficulty.Legend, categories: ["sports"] },
  { mode: GameMode.Classic, difficulty: Difficulty.Sage, categories: ["mythology"] },
  { mode: GameMode.Classic, difficulty: Difficulty.Sage, categories: ["technology", "sports"] },
])("rejects unplayable category and grade combinations before creating a room", async payload => {
  const app = await createApp();
  try {
    const response = await app.inject({ method: "POST", url: "/api/games", headers: auth("host"), payload });
    expect(response.statusCode).toBe(400);
    expect(setActiveGame).not.toHaveBeenCalled();
  } finally { await app.close(); }
});

it("accepts a real curated DB-only category while requiring single-choice compatibility in Conquest", async () => {
  (prisma.question.findMany as jest.Mock).mockResolvedValue([{
    id: "curated-fill", category: "integration_fill_blank", difficulty: Difficulty.Sage,
    textEn: "Capital?", textAr: "ما هي العاصمة؟", type: "fill_blank",
    optionsEnJson: null, optionsArJson: null, correctAnswer: "Paris",
  }]);
  const app = await createApp();
  try {
    const payload = { mode: GameMode.Classic, difficulty: Difficulty.Sage, categories: ["integration_fill_blank"] };
    const classic = await app.inject({ method: "POST", url: "/api/games", headers: auth("host"), payload });
    expect(classic.statusCode).toBe(201);
    expect(rooms.get("test-room").categories).toEqual(["integration_fill_blank"]);
    const conquest = await app.inject({ method: "POST", url: "/api/games", headers: auth("host"), payload: { ...payload, mode: GameMode.Conquest } });
    expect(conquest.statusCode).toBe(400);
  } finally { await app.close(); }
});

it("keeps room passwords and answer records out of the public room summary", async () => {
  (getActiveGame as jest.Mock).mockReturnValue({
    gameId: "private-room", password: "hidden-password", players: {},
    questions: [{ correctAnswer: "hidden-answer" }], answersThisRound: { player: { answer: "secret" } },
    lastAnswerByPlayer: { player: true },
  });
  const app = Fastify();
  app.decorate("authenticate", async () => {});
  await app.register(gamesRouter, { prefix: "/api/games" });
  try {
    const response = await app.inject({ method: "GET", url: "/api/games/private-room" });
    expect(response.statusCode).toBe(200);
    const data = response.json();
    for (const key of ["password", "questions", "answersThisRound", "lastAnswerByPlayer"]) expect(data).not.toHaveProperty(key);
  } finally { await app.close(); }
});

it.each([undefined, "", "أ".repeat(37)])("rejects a private room without a usable password", async password => {
  const app = await createApp();
  try {
    const response = await app.inject({ method: "POST", url: "/api/games", headers: auth("host"), payload: { ...config, password } });
    expect(response.statusCode).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(setActiveGame).not.toHaveBeenCalled();
  } finally { await app.close(); }
});

it("protects a room without serializing the password or trusting a supplied host identity", async () => {
  const app = await createApp();
  try {
    const password = "  preserve secret  ";
    const response = await app.inject({ method: "POST", url: "/api/games", headers: auth("host"), payload: { ...config, password, userId: "forged-host" } });
    expect(response.statusCode).toBe(201);
    const room = rooms.get("test-room");
    expect(room.hostId).toBe("host");
    expect(room.isPrivate).toBe(true);
    expect(room).not.toHaveProperty("password");
    expect(room).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(room)).not.toContain(password);
    expect(JSON.stringify(response.json())).not.toContain(password);
    expect((await authorizeRoomAccess(room, "viewer", password)).success).toBe(true);
  } finally { await app.close(); }
});

it("requires private summary admission and hides private rooms from the public list", async () => {
  const app = await createApp();
  try {
    await app.inject({ method: "POST", url: "/api/games", headers: auth("host"), payload: { ...config, password: "private" } });
    const room = rooms.get("test-room");
    room.status = GameStatus.Question;
    expect((await app.inject({ method: "GET", url: "/api/games/test-room" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/api/games/test-room", headers: auth("outsider") })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: "/api/games/test-room", headers: auth("host") })).statusCode).toBe(200);
    await authorizeRoomAccess(room, "viewer", "private");
    expect((await app.inject({ method: "GET", url: "/api/games/test-room", headers: auth("viewer") })).statusCode).toBe(200);
    const listing = await app.inject({ method: "GET", url: "/api/games/active" });
    expect(listing.json()).toEqual([]);
  } finally { await app.close(); }
});

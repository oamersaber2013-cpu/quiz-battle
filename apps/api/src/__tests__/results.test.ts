jest.mock("@quiz-battle/db", () => ({ prisma: { gameSession: { findUnique: jest.fn(), upsert: jest.fn() } } }));
jest.mock("../lib/gameOrchestrator", () => ({ getActiveGame: jest.fn() }));

import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { prisma } from "@quiz-battle/db";
import { Difficulty, GameMode } from "@quiz-battle/shared";
import { getActiveGame } from "../lib/gameOrchestrator";
import { saveGameSession } from "../lib/gamePersistence";
import { resultsRouter } from "../routes/results";

describe("durable completed results", () => {
  const apps: ReturnType<typeof Fastify>[] = [];
  const endedAt = new Date("2026-11-05T09:00:00Z");
  const standing = {
    userId: "player", username: "Player", avatar: "https://example.test/avatar.png", score: 2500,
    rank: 1, correctAnswers: 2, totalAnswers: 3, avgAnswerTime: 1250,
  };
  const session = {
    id: "completed-room", hostId: "host", joinCode: "SECRET", mode: GameMode.Classic,
    difficulty: Difficulty.Sage, language: "ar", totalRounds: 3, endedAt,
    questionIds: '["private-question"]', playerStats: [standing],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(session);
    (prisma.gameSession.upsert as jest.Mock).mockResolvedValue(session);
    (getActiveGame as jest.Mock).mockReturnValue(undefined);
  });
  afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });

  async function request(userId?: string, suffix = "completed-room", invalidToken = false) {
    const app = Fastify();
    apps.push(app);
    await app.register(fastifyJwt, { secret: "durable-results-test" });
    app.decorate("authenticate", async (req: any, reply: any) => {
      try { await req.jwtVerify(); } catch { return reply.status(401).send({ error: "Unauthorized" }); }
    });
    await app.register(resultsRouter, { prefix: "/api/results" });
    const token = userId ? app.jwt.sign({ userId, username: userId }) : undefined;
    return app.inject({
      method: "GET", url: `/api/results/${suffix}`,
      headers: token || invalidToken ? { authorization: `Bearer ${invalidToken ? "forged" : token}` } : {},
    });
  }

  it("stores the original room id and all standings in one idempotent nested write", async () => {
    const completed = {
      gameId: session.id, hostId: session.hostId, joinCode: session.joinCode, mode: session.mode,
      difficulty: session.difficulty, language: "ar" as const, totalRounds: 3,
      endedAt, players: [standing], winnerId: "player", winnerScore: 2500,
    };
    await saveGameSession(completed);
    await saveGameSession(completed);
    const write = (prisma.gameSession.upsert as jest.Mock).mock.calls[0][0];
    expect(write.where).toEqual({ id: session.id });
    expect(write.create).toMatchObject({ id: session.id, hostId: "host", language: "ar", endedAt });
    expect(write.create.playerStats.create).toEqual([expect.objectContaining(standing)]);
    expect(write.update.playerStats).toEqual({ deleteMany: {}, create: write.create.playerStats.create });
  });

  it("propagates a failed save so the game cannot claim durable success", async () => {
    const outage = new Error("PostgreSQL unavailable");
    (prisma.gameSession.upsert as jest.Mock).mockRejectedValue(outage);
    await expect(saveGameSession({
      gameId: session.id, hostId: "host", joinCode: "SECRET", mode: GameMode.Classic,
      difficulty: Difficulty.Sage, totalRounds: 3, players: [standing],
    })).rejects.toBe(outage);
  });

  it("recovers standings from storage with no active room", async () => {
    const result = await request("player");
    expect(result.statusCode).toBe(200);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.json()).toEqual({
      gameId: session.id, mode: GameMode.Classic, difficulty: Difficulty.Sage, language: "ar",
      totalRounds: 3, endedAt: endedAt.toISOString(), results: [{ ...standing, xpEarned: 0 }],
    });
    expect(result.body).not.toContain("SECRET");
    expect(result.body).not.toContain("private-question");
  });

  it("allows the persisted host even when they have no scoreboard row", async () => {
    expect((await request("host")).statusCode).toBe(200);
  });

  it("rejects an outsider even when they supply another user's id", async () => {
    const result = await request("outsider", "completed-room?userId=player");
    expect(result.statusCode).toBe(403);
    expect(result.body).not.toContain("2500");
  });

  it.each([false, true])("rejects missing and invalid tokens before reading results", async invalid => {
    const result = await request(undefined, "completed-room", invalid);
    expect(result.statusCode).toBe(401);
    expect(prisma.gameSession.findUnique).not.toHaveBeenCalled();
  });

  it("returns not found for an unknown or uncompleted session", async () => {
    (prisma.gameSession.findUnique as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({ ...session, endedAt: null });
    expect((await request("player")).statusCode).toBe(404);
    expect((await request("player")).statusCode).toBe(404);
  });

  it("returns an explicit retryable service error during a database outage", async () => {
    (prisma.gameSession.findUnique as jest.Mock).mockRejectedValue(new Error("PostgreSQL unavailable"));
    const result = await request("player");
    expect(result.statusCode).toBe(503);
    expect(result.headers["retry-after"]).toBe("5");
    expect(result.body).not.toContain("PostgreSQL");
  });

  it("keeps pending saves distinct from missing results without exposing them to outsiders", async () => {
    (prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(null);
    (getActiveGame as jest.Mock).mockReturnValue({ hostId: "host", players: { player: {} }, finalResults: [standing] });
    expect((await request("player")).statusCode).toBe(503);
    expect((await request("host")).statusCode).toBe(503);
    expect((await request("outsider")).statusCode).toBe(403);
  });
});

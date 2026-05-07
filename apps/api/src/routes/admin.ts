import { FastifyPluginAsync } from "fastify";
import { prisma } from "@quiz-battle/db";
import { getSuspiciousUsers } from "../lib/antiCheat";
import { getEventStats } from "../lib/analytics";

export const adminRouter: FastifyPluginAsync = async (app) => {
  // Middleware to check if user is admin
  app.addHook("preHandler", async (req, reply) => {
    try {
      await req.jwtVerify();
      const authUser = req.user as unknown as { userId: string; username?: string };
      const adminIds = (process.env.ADMIN_USER_IDS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const adminNames = (process.env.ADMIN_USERNAMES || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const isAdmin =
        adminIds.includes(authUser.userId) ||
        (!!authUser.username && adminNames.includes(authUser.username));

      if (!isAdmin) {
        return reply.status(403).send({ error: "Forbidden: Admin access required" });
      }
    } catch (err) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });

  // GET /api/admin/questions — Fetch questions for moderation
  app.get<{
    Querystring: { status?: string; category?: string; page?: string; limit?: string };
  }>("/questions", async (req, reply) => {
    const { status, category, page = "1", limit = "50" } = req.query;
    
    const where: any = {};
    if (status) where.sourceType = status;
    if (category) where.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const questions = await prisma.question.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.question.count({ where });

    return reply.send({
      questions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  });

  // PUT /api/admin/questions/:id — Update and verify a question
  app.put<{
    Params: { id: string };
    Body: {
      textEn?: string;
      textAr?: string;
      optionsEnJson?: string;
      optionsArJson?: string;
      correctIndex?: number;
      sourceType?: string;
    };
  }>("/questions/:id", async (req, reply) => {
    const { id } = req.params;
    const data = req.body;

    try {
      const updated = await prisma.question.update({
        where: { id },
        data,
      });
      return reply.send(updated);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: "Failed to update question" });
    }
  });
  
  // DELETE /api/admin/questions/:id — Delete a question
  app.delete<{
    Params: { id: string };
  }>("/questions/:id", async (req, reply) => {
    try {
      await prisma.question.delete({ where: { id: req.params.id } });
      return reply.send({ success: true });
    } catch (err) {
      return reply.status(500).send({ error: "Failed to delete question" });
    }
  });
};

  // GET /api/admin/stats — Dashboard statistics
  app.get("/stats", async (req, reply) => {
    const totalUsers = await prisma.user.count();
    const totalGames = await prisma.gameSession.count();
    const totalQuestions = await prisma.question.count();
    const activeGames = await prisma.game.count({ where: { status: "active" } });
    const suspiciousUsers = getSuspiciousUsers();

    return reply.send({
      totalUsers,
      totalGames,
      totalQuestions,
      activeGames,
      suspiciousUsers,
    });
  });

  // GET /api/admin/analytics — Event analytics
  app.get("/analytics", async (req, reply) => {
    const gamesStarted = await getEventStats("game_started", 7);
    const gamesCompleted = await getEventStats("game_completed", 7);
    const userRegistrations = await getEventStats("user_registered", 7);

    return reply.send({
      gamesStarted,
      gamesCompleted,
      userRegistrations,
    });
  });

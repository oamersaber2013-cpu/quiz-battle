import { FastifyPluginAsync } from "fastify";
import { prisma } from "@quiz-battle/db";

import { getUserStats } from "../lib/gamePersistence";

export const userRouter: FastifyPluginAsync = async (app) => {
  app.get("/stats", { onRequest: [app.authenticate] }, async (req, reply) => {
    reply.header("Cache-Control", "private, no-store");
    if (!req.user?.userId) return reply.code(401).send({ error: "Unauthorized" });
    const stats = await getUserStats(req.user.userId);
    if (!stats) return reply.code(404).send({ error: "Player not found" });
    return stats;
  });

  // GET /api/user/profile/:userId — Get public profile
  app.get("/profile/:userId", async (req: any, reply) => {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        avatarUrl: true,
        createdAt: true,
      }
    });

    if (!user) return reply.status(404).send({ error: "User not found" });

    return reply.send({
      ...user,
      avatar: user.avatarUrl,
    });
  });
};

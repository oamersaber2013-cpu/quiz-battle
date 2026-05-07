import { FastifyPluginAsync } from "fastify";
import { prisma } from "@quiz-battle/db";

export const userRouter: FastifyPluginAsync = async (app) => {
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

import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { prisma } from "@quiz-battle/db";
import { rateLimits, createRateLimitHook } from "../lib/rateLimiter";
import type { JWTPayload } from "./auth";

const purchaseRateLimit = createRateLimitHook(rateLimits.games);

const GAME_PRICE_QAR = 35; // ~$10 USD

/**
 * Round-based purchase system:
 * - Buy once → Get 3 short games (1-5 rounds) + 2 long games (10-15 rounds)
 * - 6-9 round games are FREE (medium length)
 * - Each hosted game decrements the appropriate counter
 */
export const purchaseRouter: FastifyPluginAsync = async (app) => {
  const getUserId = (req: FastifyRequest) => {
    const user = req.user as Partial<JWTPayload> | undefined;
    return user?.userId ?? null;
  };

  // GET /api/purchase/status - Check if user has purchased and their remaining games
  app.get("/status", { onRequest: [app.authenticate, purchaseRateLimit] }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        hasPurchasedGame: true,
        purchasedAt: true,
        shortGamesRemaining: true,
        longGamesRemaining: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    return {
      hasPurchased: user.hasPurchasedGame,
      shortGames: user.shortGamesRemaining ?? 0,
      longGames: user.longGamesRemaining ?? 0,
      purchasedAt: user.purchasedAt,
      price: GAME_PRICE_QAR,
    };
  });

  // POST /api/purchase/buy - Purchase the game
  app.post<{
    Body: { paymentMethod: "paypal" | "stripe" };
  }>("/buy", { onRequest: [app.authenticate, purchaseRateLimit] }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    // Check if already purchased
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { hasPurchasedGame: true },
    });

    if (existing?.hasPurchasedGame) {
      return reply.status(409).send({ error: "Game already purchased" });
    }

    const allowFakePayments =
      process.env.ALLOW_FAKE_PURCHASES === "true" || process.env.NODE_ENV !== "production";

    // NOTE: Replace this with real provider verification (PayPal/Stripe webhook/intent validation).
    const paymentSuccess = allowFakePayments;

    if (!paymentSuccess) {
      return reply.status(501).send({
        error:
          "Payment provider is not configured. Set ALLOW_FAKE_PURCHASES=true for local dev only.",
      });
    }

    // Update user with purchase - 3 short + 2 long games
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        hasPurchasedGame: true,
        purchasedAt: new Date(),
        shortGamesRemaining: 3,
        longGamesRemaining: 2,
      },
    });

    console.log(`[Purchase] User ${userId} purchased game access`);

    return {
      success: true,
      message: "Game purchased successfully!",
      shortGames: 3,
      longGames: 2,
    };
  });
};

export default purchaseRouter;

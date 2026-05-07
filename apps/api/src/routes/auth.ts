import { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@quiz-battle/db";
import { rateLimits, createRateLimitHook } from "../lib/rateLimiter";
import { registerUser, loginUser, loginWithGoogle, loginWithFacebook } from "../lib/auth";
import { validateEmail, validateUsername } from "../lib/sanitize";
import { trackEvent } from "../lib/analytics";

const authRateLimit = createRateLimitHook(rateLimits.auth);

// ─── Validation ────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(8),
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type JWTPayload = {
  userId: string;
  username: string;
  iat?: number;
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

export const authRouter: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", authRateLimit);

  // ─── POST /api/auth/guest ─────────────────────────────────────
  app.post("/guest", async (req, reply) => {
    const username = `Warrior${Math.floor(Math.random() * 9999)}`;
    try {
      const user = await prisma.user.create({ data: { username } });
      const token = await reply.jwtSign({ userId: user.id, username: user.username });
      return reply.send({
        userId: user.id,
        username: user.username,
        token,
        isGuest: true,
        hasPurchasedGame: user.hasPurchasedGame,
        shortGames: user.shortGamesRemaining,
        longGames: user.longGamesRemaining,
      });
    } catch (err) {
      console.error("[Auth] Guest create error:", err);
      return reply.status(500).send({ error: "Database error" });
    }
  });

  // ─── POST /api/auth/register ──────────────────────────────────
  app.post<{ Body: { email: string; password: string; username: string } }>(
    "/register",
    { onRequest: authRateLimit },
    async (req, reply) => {
      const { email, username, password } = req.body;
      
      if (!validateEmail(email) || !validateUsername(username)) {
        return reply.status(400).send({ error: "Invalid input" });
      }

      try {
        const { user, token } = await registerUser(username, email, password);
        await trackEvent("user_registered", user.id);
        
        return reply.status(201).send({
          userId: user.id,
          username: user.username,
          email: user.email,
          token,
          isGuest: false,
          role: user.role,
        });
      } catch (err: any) {
        return reply.status(409).send({ error: err.message });
      }
    }
  );

  // ─── POST /api/auth/login ─────────────────────────────────────
  app.post<{ Body: { email: string; password: string } }>(
    "/login",
    async (req, reply) => {
      const { email, password } = req.body;

      try {
        const { user, token } = await loginUser(email, password);
        await trackEvent("user_login", user.id);
        
        return reply.send({
          userId: user.id,
          email: user.email,
          username: user.username,
          token,
          isGuest: false,
          role: user.role,
        });
      } catch (err: any) {
        return reply.status(401).send({ error: err.message });
      }
    }
  );

  // ─── POST /api/auth/refresh ───────────────────────────────────
  app.post("/refresh", async (req, reply) => {
    try {
      await req.jwtVerify();
      const payload = req.user as JWTPayload;
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) return reply.status(401).send({ error: "User not found" });

      const token = await reply.jwtSign({ userId: user.id, username: user.username });
      return reply.send({
        userId: user.id,
        username: user.username,
        email: user.email,
        token,
        isGuest: !user.email,
        hasPurchasedGame: user.hasPurchasedGame,
        shortGames: user.shortGamesRemaining,
        longGames: user.longGamesRemaining,
      });
    } catch {
      return reply.status(401).send({ error: "Invalid or expired token" });
    }
  });

  // ─── GET /api/auth/me ────────────────────────────────────────
  app.get("/me", { onRequest: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JWTPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return reply.status(404).send({ error: "User not found" });

    return reply.send({
      userId: user.id,
      username: user.username,
      email: user.email,
      isGuest: !user.email,
      hasPurchasedGame: user.hasPurchasedGame,
      shortGames: user.shortGamesRemaining,
      longGames: user.longGamesRemaining,
    });
  });
};

  // ─── POST /api/auth/google ────────────────────────────────────
  app.post<{ Body: { googleId: string; email: string; name: string } }>(
    "/google",
    async (req, reply) => {
      const { googleId, email, name } = req.body;

      try {
        const { user, token } = await loginWithGoogle(googleId, email, name);
        await trackEvent("user_login_google", user.id);
        
        return reply.send({
          userId: user.id,
          email: user.email,
          username: user.username,
          token,
          isGuest: false,
          role: user.role,
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // ─── POST /api/auth/facebook ──────────────────────────────────
  app.post<{ Body: { facebookId: string; email: string; name: string } }>(
    "/facebook",
    async (req, reply) => {
      const { facebookId, email, name } = req.body;

      try {
        const { user, token } = await loginWithFacebook(facebookId, email, name);
        await trackEvent("user_login_facebook", user.id);
        
        return reply.send({
          userId: user.id,
          email: user.email,
          username: user.username,
          token,
          isGuest: false,
          role: user.role,
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );

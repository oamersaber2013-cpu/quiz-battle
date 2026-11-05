import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import { Server } from "socket.io";
import { createServer } from "http";
import { createRedisClient, isRedisConnected } from "./lib/redis";
import { registerSocketHandlers } from "./socket/index";
import { gamesRouter } from "./routes/games";
import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/user";
import { adminRouter } from "./routes/admin";
import { resultsRouter } from "./routes/results";
import { initSentry } from "./lib/sentry";
import { rateLimit } from "./lib/rateLimit";
import { sanitizeInput } from "./lib/sanitize";
import { getJwtSecret } from "./lib/jwtConfig";
import { createOriginPolicy } from "./lib/originPolicy";

loadEnv({ path: resolve(__dirname, "../.env") });

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const PORT = parseInt(process.env.PORT || "4000");
const HOST = "0.0.0.0";

const isAllowedOrigin = createOriginPolicy();

async function bootstrap() {
  console.log("Bootstrapping API...");
  initSentry();
  const redis = createRedisClient();
  const app = Fastify({ logger: { level: "info" } });

  console.log("Registering plugins...");
  // Security & CORS
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      cb(null, isAllowedOrigin(origin));
    },
    credentials: true,
  });

  // JWT
  await app.register(jwt, {
    secret: getJwtSecret(),
  });

  // Add JWT authentication hook
  app.decorate("authenticate", async (request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });

  console.log("🔗 Registering routes...");
  app.addHook('preHandler', sanitizeInput);
  await app.register(authRouter, { prefix: "/api/auth" });
  await app.register(gamesRouter, { prefix: "/api/games" });
  await app.register(userRouter, { prefix: "/api/user" });
  await app.register(adminRouter, { prefix: "/api/admin" });
  await app.register(resultsRouter, { prefix: "/api/results" });

  console.log("🏥 Registering health check...");
  // Health check
  app.get("/health", async () => ({ status: "ok", timestamp: Date.now() }));

  console.log("Setting up HTTP server...");
  console.log("Setting up Socket.io...");
  const io = new Server(app.server, {
    allowRequest: (request, callback) => callback(null, isAllowedOrigin(request.headers.origin)),
    cors: {
      origin: (origin, callback) => {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true,
    },
    pingTimeout: 10000,
    pingInterval: 5000,
  });

  // Attach io and redis to fastify for use in routes
  app.decorate("io", io);
  app.decorate("redis", redis);

  // Register socket handlers
  registerSocketHandlers(io, redis);

  // Start
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`\n🚀 Quiz Battle API running at http://${HOST}:${PORT}`);
    console.log(`🔌 Socket.io ready`);
    console.log(`📡 Redis: ${isRedisConnected() ? "connected" : "using in-memory fallback (dev mode)"}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

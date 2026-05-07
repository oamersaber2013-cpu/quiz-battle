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
import { initSentry } from "./lib/sentry";
import { rateLimit } from "./lib/rateLimit";
import { sanitizeInput } from "./lib/sanitize";

loadEnv({ path: resolve(__dirname, "../.env") });

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const PORT = parseInt(process.env.PORT || "4000");
const HOST = "0.0.0.0";

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:51664", // Browser preview proxy
];

function isNgrokUrl(origin: string): boolean {
  return origin?.includes('.ngrok') || origin?.includes('.ngrok.io') || origin?.includes('.ngrok-free.app');
}

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
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://127.0.0.1:") || isNgrokUrl(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`Origin ${origin} not allowed`), false);
      }
    },
    credentials: true,
  });

  // JWT
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
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

  console.log("🏥 Registering health check...");
  // Health check
  app.get("/health", async () => ({ status: "ok", timestamp: Date.now() }));

  console.log("Setting up HTTP server...");
  console.log("Setting up Socket.io...");
  const io = new Server(app.server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://127.0.0.1:") || isNgrokUrl(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`), false);
        }
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

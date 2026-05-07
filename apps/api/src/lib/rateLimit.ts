import { Request, Response, NextFunction } from "express";
import { prisma } from "@quiz-battle/db";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const configs: Record<string, RateLimitConfig> = {
  default: { windowMs: 60000, maxRequests: 100 },
  auth: { windowMs: 60000, maxRequests: 5 },
  game: { windowMs: 60000, maxRequests: 30 },
  chat: { windowMs: 10000, maxRequests: 10 },
};

export function rateLimit(type: keyof typeof configs = "default") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const config = configs[type];
    const identifier = req.ip || req.socket.remoteAddress || "unknown";
    const endpoint = `${type}:${req.path}`;

    try {
      const windowStart = new Date(Date.now() - config.windowMs);

      const existing = await prisma.rateLimit.findUnique({
        where: {
          identifier_endpoint: {
            identifier,
            endpoint,
          },
        },
      });

      if (existing) {
        if (existing.windowStart < windowStart) {
          await prisma.rateLimit.update({
            where: { id: existing.id },
            data: {
              count: 1,
              windowStart: new Date(),
            },
          });
        } else if (existing.count >= config.maxRequests) {
          return res.status(429).json({
            error: "Too many requests",
            retryAfter: Math.ceil((existing.windowStart.getTime() + config.windowMs - Date.now()) / 1000),
          });
        } else {
          await prisma.rateLimit.update({
            where: { id: existing.id },
            data: { count: { increment: 1 } },
          });
        }
      } else {
        await prisma.rateLimit.create({
          data: {
            identifier,
            endpoint,
            count: 1,
            windowStart: new Date(),
          },
        });
      }

      next();
    } catch (error) {
      console.error("Rate limit error:", error);
      next();
    }
  };
}

export async function cleanupOldRateLimits() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.rateLimit.deleteMany({
    where: {
      windowStart: { lt: oneDayAgo },
    },
  });
}

setInterval(cleanupOldRateLimits, 60 * 60 * 1000);

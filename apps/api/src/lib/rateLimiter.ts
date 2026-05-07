// Simple in-memory rate limiter for API routes
// For production, use Redis-based rate limiting

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}, 60000);

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetTime < now) {
    // New window
    store.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// Rate limit configurations for different routes
export const rateLimits = {
  // Auth: stricter (prevent brute force)
  auth: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  
  // Game creation: moderate
  games: { maxRequests: 20, windowMs: 60000 }, // 20 per minute
  
  // General API: generous
  general: { maxRequests: 100, windowMs: 60000 }, // 100 per minute
  
  // Admin: very strict
  admin: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
};

// Fastify rate limit hook
export function createRateLimitHook(config: RateLimitConfig) {
  return async (request: any, reply: any) => {
    const identifier = request.user?.userId || request.ip;
    const result = checkRateLimit(identifier, config);

    // Set headers
    reply.header("X-RateLimit-Limit", config.maxRequests);
    reply.header("X-RateLimit-Remaining", result.remaining);
    reply.header("X-RateLimit-Reset", result.resetTime);

    if (!result.allowed) {
      reply.status(429).send({
        error: "Too many requests",
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
      return;
    }
  };
}

// Socket.io rate limiter
interface SocketRateLimit {
  count: number;
  resetTime: number;
}

const socketStore = new Map<string, Map<string, SocketRateLimit>>();

export function checkSocketRateLimit(
  socketId: string,
  event: string,
  maxPerSecond: number = 10
): boolean {
  const now = Date.now();
  const windowMs = 1000; // 1 second window

  if (!socketStore.has(socketId)) {
    socketStore.set(socketId, new Map());
  }

  const userStore = socketStore.get(socketId)!;
  const entry = userStore.get(event);

  if (!entry || entry.resetTime < now) {
    userStore.set(event, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (entry.count >= maxPerSecond) {
    return false;
  }

  entry.count++;
  return true;
}

// Cleanup old socket entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [socketId, userStore] of socketStore.entries()) {
    for (const [event, entry] of userStore.entries()) {
      if (entry.resetTime < now) {
        userStore.delete(event);
      }
    }
    if (userStore.size === 0) {
      socketStore.delete(socketId);
    }
  }
}, 30000);

export function cleanupSocketRateLimit(socketId: string) {
  socketStore.delete(socketId);
}

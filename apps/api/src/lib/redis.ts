import Redis from "ioredis";

let client: Redis | null = null;
let redisAvailable = false;

// ─── In-memory fallback (dev with no Redis) ──────────────────
const memStore = new Map<string, { value: string; expiresAt?: number }>();

function memGet(key: string): string | null {
  const e = memStore.get(key);
  if (!e) return null;
  if (e.expiresAt && Date.now() > e.expiresAt) { memStore.delete(key); return null; }
  return e.value;
}
function memSet(key: string, value: string, ttlSeconds?: number): void {
  memStore.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined });
}
function memDel(...keys: string[]): void { keys.forEach((k) => memStore.delete(k)); }
function memZadd(_key: string, _score: number, _member: string): void { /* noop in fallback */ }
function memZrevrange(_key: string): string[] { return []; }

// ─── Thin proxy that delegates to Redis or in-memory ─────────
export class SafeRedis {
  private r: Redis | null;
  constructor(r: Redis | null) { this.r = r; }

  async get(key: string): Promise<string | null> {
    if (!redisAvailable || !this.r) return memGet(key);
    try { return await this.r.get(key); } catch { return memGet(key); }
  }

  async set(key: string, value: string, _ex?: "EX", ttl?: number): Promise<"OK"> {
    if (!redisAvailable || !this.r) { memSet(key, value, ttl); return "OK"; }
    try {
      if (_ex && ttl) return await this.r.set(key, value, "EX", ttl) as "OK";
      return await this.r.set(key, value) as "OK";
    } catch { memSet(key, value, ttl); return "OK"; }
  }

  async del(...keys: string[]): Promise<number> {
    if (!redisAvailable || !this.r) { memDel(...keys); return keys.length; }
    try { return await this.r.del(...keys); } catch { memDel(...keys); return 0; }
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!redisAvailable || !this.r) { memZadd(key, score, member); return 1; }
    try { return await this.r.zadd(key, score, member); } catch { return 0; }
  }

  async zrevrangebyscore(
    key: string,
    max: string,
    min: string,
    ...rest: Array<string | number>
  ): Promise<string[]> {
    if (!redisAvailable || !this.r) return memZrevrange(key);
    try { return await (this.r.zrevrangebyscore as Function)(key, max, min, ...rest); } catch { return []; }
  }
}

let safeClient: SafeRedis | null = null;

export function createRedisClient(): SafeRedis {
  if (safeClient) return safeClient;

  const url = process.env.REDIS_URL || "redis://localhost:6379";

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: false,
      connectTimeout: 2000,
      retryStrategy: (times) => {
        if (times > 2) {
          if (redisAvailable) {
            console.log("⚠️  Redis unavailable — using in-memory fallback (dev mode)");
            redisAvailable = false;
          }
          return null; // stop retrying
        }
        return Math.min(times * 500, 2000);
      },
    });

    client.on("connect", () => {
      redisAvailable = true;
      console.log("✅ Redis connected");
    });

    client.on("error", () => {
      // silently swallow — retryStrategy handles logging
    });

  } catch {
    console.log("⚠️  Redis unavailable — using in-memory fallback");
  }

  safeClient = new SafeRedis(client);
  return safeClient;
}

export function getRedis(): SafeRedis {
  if (!safeClient) throw new Error("Redis not initialized. Call createRedisClient() first.");
  return safeClient;
}

export function isRedisConnected(): boolean { return redisAvailable; }

// ─── Key Helpers ─────────────────────────────────────────────
export const KEYS = {
  room: (gameId: string) => `room:${gameId}`,
  roomPlayers: (gameId: string) => `room:${gameId}:players`,
  roomQuestion: (gameId: string) => `room:${gameId}:question`,
  roomAnswers: (gameId: string, qId: string) => `room:${gameId}:answers:${qId}`,
  roomPowerups: (gameId: string) => `room:${gameId}:powerups`,
  joinCode: (code: string) => `joincode:${code}`,
  userSession: (userId: string) => `session:${userId}`,
  leaderboard: "leaderboard:global",
  leaderboardWeekly: "leaderboard:weekly",
};

// ─── Room State Helpers ──────────────────────────────────────
export async function setRoomState(
  redis: SafeRedis,
  gameId: string,
  state: Record<string, unknown>
): Promise<void> {
  await redis.set(KEYS.room(gameId), JSON.stringify(state), "EX", 7200);
}

export async function getRoomState(
  redis: SafeRedis,
  gameId: string
): Promise<Record<string, unknown> | null> {
  const raw = await redis.get(KEYS.room(gameId));
  return raw ? JSON.parse(raw) : null;
}

export async function deleteRoomState(redis: SafeRedis, gameId: string): Promise<void> {
  await redis.del(
    KEYS.room(gameId),
    KEYS.roomPlayers(gameId),
    KEYS.roomQuestion(gameId),
    KEYS.roomPowerups(gameId)
  );
}

jest.mock("@quiz-battle/db", () => ({ prisma: { user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } } }));
jest.mock("../lib/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../lib/rateLimiter", () => ({ rateLimits: { auth: {} }, createRateLimitHook: () => async () => {} }));

import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { prisma } from "@quiz-battle/db";
import { authRouter } from "../routes/auth";

describe("authentication request boundaries", () => {
  const apps: ReturnType<typeof Fastify>[] = [];
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: "new-user", username: "Verified", role: "free" });
    (prisma.user.update as jest.Mock).mockResolvedValue({});
  });
  afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });
  async function request(path: string, payload: unknown) {
    const app = Fastify();
    apps.push(app);
    await app.register(fastifyJwt, { secret: "auth-route-test" });
    app.decorate("authenticate", async () => {});
    await app.register(authRouter, { prefix: "/api/auth" });
    return app.inject({ method: "POST", url: `/api/auth/${path}`, payload: payload as Record<string, unknown> });
  }

  it("rejects a forged Google identity instead of creating a session", async () => {
    const result = await request("google", { googleId: "victim", email: "victim@example.test", name: "Victim" });
    expect(result.statusCode).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it("rejects a forged Facebook identity instead of creating a session", async () => {
    const result = await request("facebook", { facebookId: "victim", email: "victim@example.test", name: "Victim" });
    expect(result.statusCode).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it("rejects a short registration password before writing an account", async () => {
    const result = await request("register", { email: "new@example.test", username: "Player", password: "short" });
    expect(result.statusCode).toBe(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it.each([{}, { email: "bad", password: [] }, { email: "user@example.test" }])("rejects malformed login input", async payload => {
    const result = await request("login", payload);
    expect(result.statusCode).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

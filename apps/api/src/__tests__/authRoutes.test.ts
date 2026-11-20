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
    jest.resetAllMocks();
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

  it("creates an Arabic guest display name and signs the same canonical identity", async () => {
    (prisma.user.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: "guest-1", username: data.username }));
    const result = await request("guest", { username: "  محارب التجربة  " });
    expect(result.statusCode).toBe(200);
    expect(prisma.user.create).toHaveBeenCalledWith({ data: { username: "محارب التجربة" } });
    expect(result.json()).toMatchObject({ userId: "guest-1", username: "محارب التجربة", isGuest: true });
    const claims = JSON.parse(Buffer.from(result.json().token.split(".")[1], "base64url").toString());
    expect(claims).toMatchObject({ userId: "guest-1", username: "محارب التجربة" });
  });

  it("retries a colliding chosen name with a suffix and returns the saved name", async () => {
    (prisma.user.create as jest.Mock)
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["username"] } })
      .mockImplementationOnce(async ({ data }) => ({ id: "guest-2", username: data.username }));
    const requested = "abcdefghijklmnopqrst";
    const result = await request("guest", { username: requested });
    expect(result.statusCode).toBe(200);
    const saved = result.json().username;
    expect(saved).toMatch(/^abcdefghijklm_[a-f0-9]{6}$/);
    expect(saved).toHaveLength(20);
    expect(prisma.user.create).toHaveBeenCalledTimes(2);
  });

  it("supports bodyless guest creation and retries generated name collisions", async () => {
    (prisma.user.create as jest.Mock)
      .mockRejectedValueOnce({ code: "P2002" })
      .mockImplementationOnce(async ({ data }) => ({ id: "guest-3", username: data.username }));
    const result = await request("guest", undefined);
    expect(result.statusCode).toBe(200);
    expect(result.json()).toMatchObject({ userId: "guest-3", isGuest: true });
    expect(result.json().username).toMatch(/^Warrior[a-f0-9]{8}$/);
    expect(prisma.user.create).toHaveBeenCalledTimes(2);
  });

  it.each([{ username: [] }, { username: "" }, { username: "x".repeat(21) }, { username: "<script>" }])("rejects malformed guest names", async payload => {
    const result = await request("guest", payload);
    expect(result.statusCode).toBe(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

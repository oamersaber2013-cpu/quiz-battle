const mockVerify = jest.fn();
jest.mock("google-auth-library", () => ({ OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: (...args: unknown[]) => mockVerify(...args) })) }));
jest.mock("@quiz-battle/db", () => ({ prisma: { user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } } }));

import { prisma } from "@quiz-battle/db";
import { loginWithGoogle, loginWithFacebook, verifyToken } from "../lib/auth";
import { verifyGoogleIdentity } from "../lib/googleIdentity";
import { sanitizeObject } from "../lib/sanitize";

describe("verified social identities", () => {
  const configuredAudience = process.env.GOOGLE_CLIENT_ID;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "configured-client.apps.googleusercontent.com";
    mockVerify.mockResolvedValue({ getPayload: () => ({ sub: "verified-subject", email: "verified@example.test", email_verified: true, name: "Verified Player" }) });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockImplementation(async ({ data }) => ({ ...data, id: "new-account" }));
    (prisma.user.update as jest.Mock).mockResolvedValue({});
  });
  afterEach(() => {
    if (configuredAudience === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = configuredAudience;
  });
  it("verifies the configured audience and uses only the returned Google subject", async () => {
    const { token } = await loginWithGoogle("opaque-google-token");
    expect(mockVerify).toHaveBeenCalledWith({ idToken: "opaque-google-token", audience: process.env.GOOGLE_CLIENT_ID });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { googleId: "verified-subject" } });
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ googleId: "verified-subject", email: "verified@example.test" }) });
    expect(verifyToken(token)?.userId).toBe("new-account");
  });
  it("fails closed when Google rejects a credential", async () => {
    mockVerify.mockRejectedValue(new Error("expired token or wrong audience"));
    await expect(loginWithGoogle("forged")).rejects.toMatchObject({ statusCode: 401 });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it("requires a configured Google client id", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    await expect(verifyGoogleIdentity("opaque")).rejects.toMatchObject({ statusCode: 503 });
    expect(mockVerify).not.toHaveBeenCalled();
  });
  it("rejects a provider identity without a verified email", async () => {
    mockVerify.mockResolvedValue({ getPayload: () => ({ sub: "subject", email: "unverified@example.test", email_verified: false }) });
    await expect(loginWithGoogle("opaque")).rejects.toMatchObject({ statusCode: 401 });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it("does not link a different account solely because its email matches", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "password-account" });
    await expect(loginWithGoogle("opaque")).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it("keeps Facebook unavailable until provider verification is implemented", async () => {
    await expect(loginWithFacebook("opaque")).rejects.toMatchObject({ statusCode: 503 });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it("preserves opaque passwords and long credentials through input sanitization", () => {
    const password = "  secret with spaces  ";
    const idToken = "x".repeat(2500);
    expect(sanitizeObject({ password, idToken, accessToken: idToken })).toEqual({ password, idToken, accessToken: idToken });
  });
});

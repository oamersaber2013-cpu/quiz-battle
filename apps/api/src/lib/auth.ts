import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "@quiz-battle/db";
import { getJwtSecret } from "./jwtConfig";
import { randomUUID } from "crypto";
import { verifyGoogleIdentity, SocialLoginError } from "./googleIdentity";

const JWT_EXPIRES_IN = "7d";

export interface AuthPayload {
  userId: string;
  username: string;
  email?: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as AuthPayload;
  } catch {
    return null;
  }
}

export async function registerUser(username: string, email: string, password: string) {
  const passwordHash = await hashPassword(password);
  
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      role: "free",
    },
  });

  const token = generateToken({
    userId: user.id,
    username: user.username,
    email: user.email || undefined,
    role: user.role,
  });

  return { user, token };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user || !user.passwordHash) {
    throw new Error("Invalid credentials");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error("Account locked. Try again later.");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  
  if (!valid) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: { increment: 1 },
        lockedUntil: user.failedLoginAttempts >= 4 ? new Date(Date.now() + 15 * 60 * 1000) : undefined,
      },
    });
    throw new Error("Invalid credentials");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  const token = generateToken({
    userId: user.id,
    username: user.username,
    email: user.email || undefined,
    role: user.role,
  });

  return { user, token };
}

export async function loginWithGoogle(idToken: string) {
  const { googleId, email, name } = await verifyGoogleIdentity(idToken);
  let user = await prisma.user.findUnique({ where: { googleId } });

  if (!user) {
    if (await prisma.user.findUnique({ where: { email } })) {
      throw new SocialLoginError(409, "Sign in to your existing account before linking Google");
    }
    const baseName = name.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_").slice(0, 11) || "Player";
    user = await prisma.user.create({
      data: {
        googleId,
        email,
        username: `${baseName}_${randomUUID().slice(0, 8)}`,
        role: "free",
      },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = generateToken({
    userId: user.id,
    username: user.username,
    email: user.email || undefined,
    role: user.role,
  });

  return { user, token };
}

export async function loginWithFacebook(_accessToken: string): Promise<never> {
  // Never exchange a client-supplied Facebook id/profile for an application JWT.
  // Re-enable only with a completed provider-token verification flow.
  throw new SocialLoginError(503, "Facebook sign-in is not available yet");
}

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "@quiz-battle/db";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
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

export async function loginWithGoogle(googleId: string, email: string, name: string) {
  let user = await prisma.user.findUnique({ where: { googleId } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        googleId,
        email,
        username: name,
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

export async function loginWithFacebook(facebookId: string, email: string, name: string) {
  let user = await prisma.user.findUnique({ where: { facebookId } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        facebookId,
        email,
        username: name,
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

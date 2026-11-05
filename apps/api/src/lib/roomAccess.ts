import bcrypt from "bcryptjs";

interface AccessRoom {
  gameId: string;
  hostId: string;
  isPrivate?: boolean;
  players: Record<string, unknown>;
}
interface Protection {
  hash: string;
  granted: Set<string>;
  attempts: Map<string, { count: number; expiresAt: number }>;
}
const protections = new Map<string, Protection>();

export function validRoomPassword(password: unknown): password is string {
  return typeof password === "string" && password.length > 0 && Buffer.byteLength(password, "utf8") <= 72;
}

export async function protectRoom(gameId: string, password: string): Promise<void> {
  if (!validRoomPassword(password)) throw new Error("A room password must contain 1 to 72 UTF-8 bytes");
  const hash = await bcrypt.hash(password, 10);
  // Keep credentials and authorization grants outside serialized game state.
  protections.set(gameId, { hash, granted: new Set(), attempts: new Map() });
}

export function hasRoomAccess(room: AccessRoom, userId: string): boolean {
  if (!room.isPrivate && !protections.has(room.gameId)) return true;
  return room.hostId === userId || Object.prototype.hasOwnProperty.call(room.players, userId) ||
    !!protections.get(room.gameId)?.granted.has(userId);
}

export async function authorizeRoomAccess(room: AccessRoom, userId: string, password?: string): Promise<{
  success: boolean; error?: string; code?: "PASSWORD_REQUIRED" | "INVALID_PASSWORD" | "RATE_LIMITED";
}> {
  if (hasRoomAccess(room, userId)) return { success: true };
  const protection = protections.get(room.gameId);
  if (!protection) return { success: false, error: "Room access is unavailable; ask the host to create a new room" };
  const attempt = protection.attempts.get(userId);
  if (attempt && attempt.expiresAt > Date.now() && attempt.count >= 5) {
    return { success: false, code: "RATE_LIMITED", error: "Too many password attempts; try again in a minute" };
  }
  if (password === undefined || password === "") return { success: false, code: "PASSWORD_REQUIRED", error: "Room password required" };
  const activeAttempt = attempt && attempt.expiresAt > Date.now() ? attempt : { count: 0, expiresAt: Date.now() + 60000 };
  activeAttempt.count++;
  protection.attempts.set(userId, activeAttempt);
  if (!validRoomPassword(password) || !await bcrypt.compare(password, protection.hash)) {
    return { success: false, code: "INVALID_PASSWORD", error: "Incorrect room password" };
  }
  // A removed/replaced room cannot gain admission from a stale comparison.
  if (protections.get(room.gameId) !== protection) return { success: false, error: "Room access changed; try again" };
  protection.granted.add(userId);
  protection.attempts.delete(userId);
  return { success: true };
}

export function revokeRoomAccess(gameId: string, userId: string): void {
  protections.get(gameId)?.granted.delete(userId);
}

export function removeRoomAccess(gameId: string): void { protections.delete(gameId); }

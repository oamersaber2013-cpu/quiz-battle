export function normalizeRoomCode(value: string): string {
  return value.replace(/[\s\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, "").toUpperCase();
}

export function isRoomCode(value: string): boolean {
  return /^[A-Z0-9]{6}$/.test(value);
}

export function isRoomId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(value);
}

export function createRoomInviteUrl(origin: string, code: string, language: "en" | "ar"): string {
  const path = createRoomInvitePath({ code, language });
  return path ? new URL(path, origin).toString() : "";
}

export function createRoomInvitePath({ code = "", roomId, language, spectate = false }: {
  code?: string; roomId?: string; language: "en" | "ar"; spectate?: boolean;
}): string {
  const params = new URLSearchParams();
  if (roomId) {
    if (!isRoomId(roomId)) return "";
    params.set("room", roomId);
  } else {
    const normalized = normalizeRoomCode(code);
    if (!isRoomCode(normalized)) return "";
    params.set("join", normalized);
  }
  params.set("lang", language);
  if (spectate) params.set("spectate", "true");
  return `/?${params.toString()}`;
}

export function validateInviteReturnPath(value: string | null): string | null {
  if (!value?.startsWith("/?")) return null;
  const url = new URL(value, "https://invite.invalid");
  if (url.pathname !== "/" || url.hash || url.origin !== "https://invite.invalid") return null;
  const allowed = new Set(["join", "room", "lang", "spectate"]);
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1) return null;
  }
  const code = url.searchParams.get("join");
  const roomId = url.searchParams.get("room");
  if ((code === null) === (roomId === null)) return null;
  const language = url.searchParams.get("lang") ?? "en";
  if (language !== "en" && language !== "ar") return null;
  const spectate = url.searchParams.get("spectate");
  if (spectate !== null && spectate !== "true") return null;
  return createRoomInvitePath({ code: code ?? "", roomId: roomId ?? undefined, language, spectate: spectate === "true" }) || null;
}

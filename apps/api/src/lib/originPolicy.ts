// Shared by HTTP and Socket.IO so both transports enforce the same origins.
export function createOriginPolicy(env: NodeJS.ProcessEnv = process.env) {
  const configured = new Set<string>();
  for (const value of [env.FRONTEND_URL, env.ALLOWED_ORIGINS].filter(Boolean).join(",").split(",")) {
    if (!value.trim()) continue;
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("Frontend origins must be HTTP(S) URLs without credentials");
    }
    configured.add(url.origin);
  }
  return (origin?: string): boolean => {
    if (!origin) return true; // CLI/native clients do not send a browser Origin.
    try {
      const url = new URL(origin);
      if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) return false;
      if (configured.has(origin)) return true;
      return env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    } catch { return false; }
  };
}

interface FrontendLocation {
  origin: string;
  hostname: string;
  protocol: string;
}

export function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  return host === "localhost" || host.endsWith(".localhost") || host.startsWith("127.") || host === "::1";
}

export function isPrivateNetworkHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (isLoopbackHost(host) || (host.includes(":") && (host === "::" || host.startsWith("::ffff:") || /^(f[cd]|fe[89ab]|ff)/i.test(host)))) return true;
  if (host.endsWith(".local") || host.endsWith(".lan") || host.endsWith(".internal")) return true;
  const parts = host.split(".").map(Number);
  return /^\d+\.\d+\.\d+\.\d+$/.test(host) && (
    parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || parts[0] >= 224 ||
    (parts[0] === 169 && parts[1] === 254) || (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
  );
}

export function resolveApiOrigin(configured: string | undefined, frontend?: FrontendLocation): string {
  const localFrontend = Boolean(frontend && isLoopbackHost(frontend.hostname));
  if (configured) {
    try {
      const api = new URL(configured);
      const validOrigin = configured === api.origin || configured === `${api.origin}/`;
      const allowedProtocol = api.protocol === "https:" || (localFrontend && api.protocol === "http:");
      if (validOrigin && allowedProtocol && !api.username && !api.password &&
          (localFrontend || !isPrivateNetworkHost(api.hostname))) return api.origin;
    } catch { /* Fall back to this frontend rather than the visitor's network. */ }
  }
  return localFrontend ? "http://127.0.0.1:4000" : frontend?.origin || "";
}

export function getApiOrigin(): string {
  return resolveApiOrigin(process.env.NEXT_PUBLIC_API_URL, typeof window === "undefined" ? undefined : window.location);
}

export function safeMediaUrl(source: unknown, frontend: FrontendLocation | undefined = typeof window === "undefined" ? undefined : window.location): string | null {
  if (typeof source !== "string" || !source.trim()) return null;
  try {
    const base = frontend?.origin || "https://same-origin.invalid";
    const media = new URL(source, base);
    if (!['http:', 'https:'].includes(media.protocol) || media.username || media.password) return null;
    if (media.origin === base) return source;
    if (frontend && isLoopbackHost(frontend.hostname)) return source;
    return media.protocol === "https:" && !isPrivateNetworkHost(media.hostname) ? source : null;
  } catch { return null; }
}

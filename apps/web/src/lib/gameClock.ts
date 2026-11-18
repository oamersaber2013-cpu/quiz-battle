type ClockAnchor = { serverTime: number; monotonicTime: number };

let anchor: ClockAnchor | null = null;

export function getMonotonicTime(): number {
  return globalThis.performance?.now() ?? Date.now();
}

// Server epochs are compared against a monotonic elapsed duration so changing
// the device clock cannot expire a live question or extend its deadline.
export function getServerTime(): number {
  if (!anchor) return Date.now();
  return anchor.serverTime + Math.max(0, getMonotonicTime() - anchor.monotonicTime);
}

// Snapshots initialize the clock immediately. An RTT sample then refines the
// estimate using the midpoint of the request and acknowledgment.
export function synchronizeServerClock(serverNow: number | undefined, requestStartedAt?: number): boolean {
  if (typeof serverNow !== "number" || !Number.isFinite(serverNow)) return false;
  if (anchor && requestStartedAt === undefined) return true;
  const receivedAt = getMonotonicTime();
  const roundTripMs = requestStartedAt === undefined ? 0 : receivedAt - requestStartedAt;
  if (!Number.isFinite(roundTripMs) || roundTripMs < 0 || roundTripMs > 10000) return false;
  anchor = { serverTime: serverNow + roundTripMs / 2, monotonicTime: receivedAt };
  return true;
}

export function resetServerClock(): void {
  anchor = null;
}

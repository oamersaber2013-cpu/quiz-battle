import { getMonotonicTime, getServerTime, resetServerClock, synchronizeServerClock } from "@/lib/gameClock";

beforeEach(() => {
  jest.useFakeTimers();
  resetServerClock();
});

afterEach(() => {
  resetServerClock();
  jest.useRealTimers();
});

it.each([-40000, 40000])("calibrates a device clock skew of %sms and keeps elapsed time monotonic", (skew) => {
  const serverNow = new Date("2026-11-18T07:00:00Z").getTime();
  jest.setSystemTime(serverNow + skew);
  const requestedAt = getMonotonicTime();
  jest.advanceTimersByTime(200);
  synchronizeServerClock(serverNow + 100, requestedAt);
  expect(getServerTime()).toBe(serverNow + 200);
  jest.setSystemTime(serverNow + 3600000);
  jest.advanceTimersByTime(3000);
  expect(getServerTime()).toBe(serverNow + 3200);
});

it("uses a fresh snapshot immediately and refines it with the RTT midpoint", () => {
  const serverNow = Date.now() - 40000;
  synchronizeServerClock(serverNow);
  const requestedAt = getMonotonicTime();
  jest.advanceTimersByTime(100);
  synchronizeServerClock(serverNow + 50, requestedAt);
  expect(getServerTime()).toBe(serverNow + 100);
  synchronizeServerClock(serverNow - 10000);
  expect(getServerTime()).toBe(serverNow + 100);
});

it("rejects invalid or stale samples without replacing a valid clock", () => {
  const serverNow = Date.now();
  synchronizeServerClock(serverNow);
  const requestedAt = getMonotonicTime();
  jest.advanceTimersByTime(10001);
  expect(synchronizeServerClock(serverNow, requestedAt)).toBe(false);
  expect(synchronizeServerClock(Number.NaN)).toBe(false);
  expect(getServerTime()).toBe(serverNow + 10001);
});

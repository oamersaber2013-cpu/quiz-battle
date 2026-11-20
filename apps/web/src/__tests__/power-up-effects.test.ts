import { createElement } from "react";
import { PowerUpType, type ActivePowerUpEffect } from "@quiz-battle/shared";
import { PowerUpEffects } from "@/components/PowerUpEffects";
import { resetServerClock } from "@/lib/gameClock";

const { act, create } = require("react-test-renderer");
let view: any;
const effect = (overrides: Partial<ActivePowerUpEffect> = {}): ActivePowerUpEffect => ({
  type: PowerUpType.TimeWarp, sourceUserId: "host", expiresAt: 120000, ...overrides,
});
const notices = () => view.root.findAll((node: any) => node.props["data-power-notice"] !== undefined);

beforeEach(() => {
  jest.useFakeTimers({ now: 100000 });
  resetServerClock();
});
afterEach(() => {
  act(() => view?.unmount());
  view = undefined;
  jest.clearAllTimers();
  jest.useRealTimers();
  resetServerClock();
});

it("shows one notice through live clock rerenders and does not replay a finished notice", () => {
  const active = effect();
  act(() => { view = create(createElement(PowerUpEffects, { activeEffects: [active], currentUserId: "host", language: "ar" })); });
  expect(notices()).toHaveLength(1);
  expect(JSON.stringify(view.toJSON())).toContain("وقت إضافي");
  for (let tick = 0; tick < 20; tick++) {
    act(() => {
      jest.advanceTimersByTime(100);
      view.update(createElement(PowerUpEffects, { activeEffects: [{ ...active }], currentUserId: "host", language: "ar" }));
    });
    expect(notices()).toHaveLength(1);
  }
  act(() => { jest.advanceTimersByTime(600); });
  expect(notices()).toHaveLength(0);
  act(() => { view.update(createElement(PowerUpEffects, { activeEffects: [{ ...active }], currentUserId: "host" })); });
  expect(notices()).toHaveLength(0);
});

it("ends only the animation and leaves the authoritative effect and callback untouched", () => {
  const active = Object.freeze(effect());
  const completed = jest.fn();
  act(() => { view = create(createElement(PowerUpEffects, { activeEffects: [active], currentUserId: "host", onEffectComplete: completed })); });
  act(() => { jest.advanceTimersByTime(3000); });
  expect(notices()).toHaveLength(0);
  expect(completed).not.toHaveBeenCalled();
  expect(active).toEqual({ type: PowerUpType.TimeWarp, sourceUserId: "host", expiresAt: 120000 });
});

it("bounds simultaneous notices, discards expired effects and cleans timers when the round clears", () => {
  const effects = [effect(), effect({ type: PowerUpType.Freeze, sourceUserId: "guest", targetUserId: "host" }),
    effect({ type: PowerUpType.Shield, sourceUserId: "third" }), effect({ type: PowerUpType.Steal, expiresAt: 0 })];
  act(() => { view = create(createElement(PowerUpEffects, { activeEffects: effects, currentUserId: "host", language: "ar" })); });
  expect(notices()).toHaveLength(2);
  expect(JSON.stringify(view.toJSON())).toContain("استخدمت هذه القدرة ضدك");
  expect(notices().some((node: any) => node.props["data-power-notice"] === PowerUpType.Steal)).toBe(false);
  act(() => { view.update(createElement(PowerUpEffects, { activeEffects: [], currentUserId: "host" })); });
  expect(notices()).toHaveLength(0);
  expect(jest.getTimerCount()).toBe(0);
  act(() => { view.update(createElement(PowerUpEffects, { activeEffects: [effect()], currentUserId: "host" })); });
  expect(notices()).toHaveLength(1);
  act(() => { view.unmount(); });
  expect(jest.getTimerCount()).toBe(0);
  view = undefined;
});

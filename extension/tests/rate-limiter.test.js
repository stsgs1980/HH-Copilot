/// <reference types="vitest/globals" />
/**
 * TESTS: rate limiter with storage persistence (#10, portion A)
 * ==============================================================
 * - daily/hourly limits, min-interval, burst window + time reset
 * - adaptive 429 slowdown with 5.0 cap
 * - persist on recordAction, hydrate in a fresh module instance
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import rateLimiter from "../src/lib/rate-limiter.js";

function installLimiterStub({ stats = {}, settings = {}, limiterState } = {}) {
  const today = new Date().toISOString().split("T")[0];
  const store = {
    stats,
    settings,
    dailyResetDate: today,
    ...(limiterState !== undefined ? { rateLimiterState: limiterState } : {}),
  };
  const setCalls = [];
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) {
          if (typeof key === "string") return key in store ? { [key]: store[key] } : {};
          return { ...store };
        },
        async set(obj) {
          setCalls.push(obj);
          Object.assign(store, obj);
        },
      },
    },
  };
  return { store, setCalls };
}

function resetLimiter() {
  rateLimiter._hydrated = false;
  rateLimiter.lastActionTime = 0;
  rateLimiter.burstCount = 0;
  rateLimiter.hourlyCount = 0;
  rateLimiter.currentHour = new Date().getHours();
  rateLimiter.adaptiveFactor = 1.0;
}

beforeEach(() => {
  resetLimiter();
  installLimiterStub();
});

describe("#10 -- limits", () => {
  it("daily limit denies when appliedToday >= limit", async () => {
    installLimiterStub({ stats: { appliedToday: 200 }, settings: { dailyLimit: 200 } });
    const r = await rateLimiter.check();
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain("Дневной лимит");
  });

  it("hourly window resets on hour change", async () => {
    rateLimiter.hourlyCount = 30;
    rateLimiter.currentHour = (new Date().getHours() + 1) % 24;
    const r = await rateLimiter.check();
    expect(r.allowed).toBe(true);
    expect(rateLimiter.hourlyCount).toBe(0);
  });

  it("min-interval denies right after recordAction", async () => {
    rateLimiter.recordAction();
    const r = await rateLimiter.check();
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("Слишком быстро");
  });
});

describe("#10 -- burst window", () => {
  it("5 in a row -> burst pause", async () => {
    rateLimiter.lastActionTime = Date.now() - 40000;
    rateLimiter.burstCount = 5;
    const r = await rateLimiter.check();
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain("Burst pause");
  });

  it("burst resets after burstPauseMs of inactivity", async () => {
    rateLimiter.lastActionTime = Date.now() - 200000;
    rateLimiter.burstCount = 5;
    const r = await rateLimiter.check();
    expect(r.allowed).toBe(true);
    expect(rateLimiter.burstCount).toBe(0);
  });
});

describe("#10 -- adaptive slowdown", () => {
  it("429 doubles factor, capped at 5.0", () => {
    rateLimiter.adaptiveSlowdown("429");
    expect(rateLimiter.adaptiveFactor).toBe(2.0);
    rateLimiter.adaptiveSlowdown("429");
    rateLimiter.adaptiveSlowdown("429");
    rateLimiter.adaptiveSlowdown("429");
    expect(rateLimiter.adaptiveFactor).toBe(5.0);
  });
});

describe("#10 -- persistence", () => {
  it("recordAction persists state to storage", async () => {
    const { setCalls } = installLimiterStub();
    resetLimiter();
    rateLimiter.recordAction();
    const saved = setCalls.map((c) => c.rateLimiterState).find(Boolean);
    expect(saved).toBeTruthy();
    expect(saved.burstCount).toBe(1);
    expect(saved.lastActionTime).toBeGreaterThan(0);
  });

  it("fresh module hydrates persisted lastActionTime (min-interval applies)", async () => {
    const { store } = installLimiterStub();
    resetLimiter();
    rateLimiter.recordAction();
    expect(store.rateLimiterState.lastActionTime).toBeGreaterThan(0);

    vi.resetModules();
    const fresh = (await import("../src/lib/rate-limiter.js")).default;
    const r = await fresh.check();
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("Слишком быстро");
  });
});

/// <reference types="vitest/globals" />
/**
 * TESTS: apply queue (#10, portion A)
 * ====================================
 * - dequeueNext cuts the head, clearQueue empties
 * - stale items (>10 min) skipped recursively
 * - rate-denied preserves the queue
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearQueue, dequeueNext, getQueue, processNextInQueue, setQueue } from "../src/engine/apply-queue.js";
import rateLimiter from "../src/lib/rate-limiter.js";
import { getApplyQueue, setApplyQueue } from "../src/lib/storage.js";

vi.mock("../src/lib/storage.js", () => {
  let store = [];
  return {
    getApplyQueue: vi.fn(async () => [...store]),
    setApplyQueue: vi.fn(async (q) => {
      store = [...q];
    }),
    __setStore: (q) => {
      store = [...q];
    },
  };
});

vi.mock("../src/lib/rate-limiter.js", () => ({
  default: { check: vi.fn(async () => ({ allowed: true })) },
}));

vi.mock("../src/lib/timing.js", () => ({
  simulateReading: vi.fn(async () => {}),
}));

import { __setStore } from "../src/lib/storage.js";

function installWindow() {
  globalThis.window = { location: { pathname: "/", href: "" } };
}

beforeEach(() => {
  vi.clearAllMocks();
  installWindow();
  __setStore([]);
});

describe("#10 -- queue primitives", () => {
  it("dequeueNext cuts the head", async () => {
    await setQueue([
      { vacancyId: "a", timestamp: Date.now() },
      { vacancyId: "b", timestamp: Date.now() },
    ]);
    const next = await dequeueNext();
    expect(next.vacancyId).toBe("a");
    expect(await getQueue()).toHaveLength(1);
  });

  it("dequeueNext on empty returns null", async () => {
    expect(await dequeueNext()).toBeNull();
  });

  it("clearQueue empties", async () => {
    await setQueue([{ vacancyId: "a", timestamp: 1 }]);
    await clearQueue();
    expect(await getQueue()).toEqual([]);
  });
});

describe("#10 -- processNextInQueue", () => {
  it("stale item (>10 min) skipped recursively to fresh", async () => {
    const now = Date.now();
    __setStore([
      { vacancyId: "old", timestamp: now - 11 * 60 * 1000 },
      { vacancyId: "fresh", timestamp: now },
    ]);
    await processNextInQueue();
    expect(globalThis.window.location.href).toBe("https://hh.ru/vacancy/fresh");
    expect(setApplyQueue).toHaveBeenCalled();
  });

  it("rate-denied preserves the queue (no navigation)", async () => {
    rateLimiter.check.mockResolvedValue({ allowed: false, reason: "deny" });
    __setStore([{ vacancyId: "a", timestamp: Date.now() }]);
    await processNextInQueue();
    expect(globalThis.window.location.href).toBe("");
    expect(await getApplyQueue()).toHaveLength(1);
  });
});

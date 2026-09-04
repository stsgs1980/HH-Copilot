/// <reference types="vitest/globals" />
/**
 * TESTS: apply orchestrator honest outcomes (#10, portion A)
 * ===========================================================
 * - continueApply click-fail -> { success:false, skipped:true }, no markAsApplied
 * - continueApply popup-fail -> { success:false, skipped:true }, recordAction kept
 * - continueApply success -> incrementApplied + markAsApplied once each
 * - applyToAll: filters, sorting, skippedPreviously counting
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clickApplyButton, waitForPopupAndSubmit } from "../src/engine/apply-actions.js";
import { applyToAll, continueApply } from "../src/engine/apply-orchestrator.js";
import { processNextInQueue } from "../src/engine/apply-queue.js";
import rateLimiter from "../src/lib/rate-limiter.js";
import {
  getSkippedVacancies,
  incrementApplied,
  isAlreadyApplied,
  markAsApplied,
  markAsSkipped,
} from "../src/lib/storage.js";

vi.mock("../src/lib/storage.js", () => ({
  incrementApplied: vi.fn(async () => ({ allowed: true, remaining: 199 })),
  isAlreadyApplied: vi.fn(async () => false),
  isAlreadySkipped: vi.fn(async () => false),
  markAsApplied: vi.fn(async () => {}),
  markAsSkipped: vi.fn(async () => {}),
  getSkippedVacancies: vi.fn(async () => []),
  getApplyQueue: vi.fn(async () => []),
  setApplyQueue: vi.fn(async () => {}),
}));

vi.mock("../src/lib/rate-limiter.js", () => ({
  default: { check: vi.fn(async () => ({ allowed: true })), recordAction: vi.fn() },
}));

vi.mock("../src/engine/apply-actions.js", () => ({
  clickApplyButton: vi.fn(),
  setActiveResumeForCoverLetter: vi.fn(),
  waitForPageReady: vi.fn(async () => {}),
  waitForPopupAndSubmit: vi.fn(),
}));

vi.mock("../src/engine/apply-queue.js", () => ({
  getQueue: vi.fn(async () => []),
  setQueue: vi.fn(async () => {}),
  processNextInQueue: vi.fn(async () => {}),
}));

function installWindow(pathname = "/vacancy/123") {
  globalThis.window = { location: { pathname, href: "" } };
}

beforeEach(() => {
  vi.clearAllMocks();
  installWindow();
});

describe("#10 -- continueApply honest outcomes", () => {
  it("click-fail -> { success:false, skipped:true }, markAsApplied NOT called", async () => {
    clickApplyButton.mockResolvedValue({ clicked: false, reason: "no-button" });
    const r = await continueApply({ vacancyId: "123" });
    expect(r).toEqual({ success: false, reason: "no-button", skipped: true });
    expect(markAsApplied).not.toHaveBeenCalled();
    expect(markAsSkipped).toHaveBeenCalledTimes(1);
    expect(markAsSkipped).toHaveBeenCalledWith("123", expect.stringContaining("no-apply-button"));
  });

  it("popup-fail -> { success:false, skipped:true }, recordAction kept", async () => {
    clickApplyButton.mockResolvedValue({ clicked: true });
    waitForPopupAndSubmit.mockResolvedValue({ success: false, reason: "no-popup" });
    const r = await continueApply({ vacancyId: "123" });
    expect(r).toEqual({ success: false, reason: "no-popup", skipped: true });
    expect(markAsApplied).not.toHaveBeenCalled();
    expect(markAsSkipped).toHaveBeenCalledWith("123", expect.stringContaining("popup-not-handled"));
    expect(rateLimiter.recordAction).toHaveBeenCalledTimes(1);
  });

  it("success -> incrementApplied once, markAsApplied once", async () => {
    clickApplyButton.mockResolvedValue({ clicked: true });
    waitForPopupAndSubmit.mockResolvedValue({ success: true });
    const r = await continueApply({ vacancyId: "123" });
    expect(r).toEqual({ success: true });
    expect(incrementApplied).toHaveBeenCalledTimes(1);
    expect(markAsApplied).toHaveBeenCalledTimes(1);
    expect(markAsApplied).toHaveBeenCalledWith("123");
    expect(markAsSkipped).not.toHaveBeenCalled();
    expect(processNextInQueue).toHaveBeenCalledTimes(1);
  });
});

describe("#10 -- applyToAll filters + skippedPreviously", () => {
  function vac(id, overrides = {}) {
    return { id, status: "new", hasReply: true, matchScore: 80, ...overrides };
  }

  it("filters by status/hasReply/minScore/null-score, sorts desc, counts skippedPreviously", async () => {
    isAlreadyApplied.mockResolvedValue(false);
    getSkippedVacancies.mockResolvedValue([{ id: "s1", reason: "x", ts: "t" }]);
    const { setQueue } = await import("../src/engine/apply-queue.js");

    const vacancies = [
      vac("low", { matchScore: 10 }), // below minScore
      vac("old", { status: "archived" }), // wrong status
      vac("noreply", { hasReply: false }), // no reply
      vac("s1", { matchScore: 90 }), // previously skipped
      vac("a", { matchScore: 70 }),
      vac("b", { matchScore: 95 }),
      vac("nul", { matchScore: null }), // null score passes filter
    ];
    const r = await applyToAll(vacancies, 70);
    expect(r.skippedPreviously).toBe(1);
    const queued = setQueue.mock.calls[0][0].map((q) => q.vacancyId);
    expect(queued).toEqual(["b", "a", "nul"]);
    expect(r.reason).toContain("очередь: 3");
  });

  it("already-applied are excluded without touching skipped count", async () => {
    isAlreadyApplied.mockImplementation(async (id) => id === "done");
    const { setQueue } = await import("../src/engine/apply-queue.js");
    const r = await applyToAll([vac("done", { matchScore: 99 }), vac("fresh", { matchScore: 80 })], 70);
    expect(r.skippedPreviously).toBe(0);
    expect(setQueue.mock.calls[0][0].map((q) => q.vacancyId)).toEqual(["fresh"]);
  });
});

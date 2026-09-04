/// <reference types="vitest/globals" />
/**
 * TESTS: batch confirm + dry-run + audit (#10, portion B)
 * ========================================================
 * - previewApplyAll: ids only, no setQueue, no navigation
 * - startApplyAll: persists queue, navigates to first
 * - dryRun: no markAsApplied/incrementApplied/recordAction, queue advances
 * - audit: skipped/success outcomes sent as { type:"log", entry }
 * - confirmApplyAll dialog resolves true/false on button clicks
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clickApplyButton, waitForPopupAndSubmit } from "../src/engine/apply-actions.js";
import { continueApply, previewApplyAll, startApplyAll } from "../src/engine/apply-orchestrator.js";
import { processNextInQueue, setQueue } from "../src/engine/apply-queue.js";
import rateLimiter from "../src/lib/rate-limiter.js";
import { getAllSettings, incrementApplied, markAsApplied, markAsSkipped } from "../src/lib/storage.js";
import { confirmApplyAll } from "../src/ui/panel/apply-confirm.js";
import { refs } from "../src/ui/state.js";

vi.mock("../src/lib/storage.js", () => ({
  getAllSettings: vi.fn(async () => ({})),
  incrementApplied: vi.fn(async () => ({ allowed: true, remaining: 199 })),
  isAlreadyApplied: vi.fn(async () => false),
  markAsApplied: vi.fn(async () => {}),
  markAsSkipped: vi.fn(async () => {}),
  getSkippedVacancies: vi.fn(async () => []),
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

function installRuntime() {
  globalThis.chrome = { runtime: { sendMessage: vi.fn() } };
}

function vac(id, overrides = {}) {
  return { id, status: "new", hasReply: true, matchScore: 80, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  installWindow();
  installRuntime();
  refs.shadowRoot = null;
  getAllSettings.mockResolvedValue({});
});

describe("#10B -- previewApplyAll / startApplyAll", () => {
  it("preview returns ids, no setQueue, no navigation", async () => {
    const p = await previewApplyAll([vac("b", { matchScore: 95 }), vac("a", { matchScore: 70 })], 70);
    expect(p.ok).toBe(true);
    expect(p.queue).toEqual(["b", "a"]);
    expect(p.minScore).toBe(70);
    expect(p.skippedPreviously).toBe(0);
    expect(setQueue).not.toHaveBeenCalled();
    expect(globalThis.window.location.href).toBe("");
  });

  it("startApplyAll persists queue and navigates to first", async () => {
    const r = await startApplyAll(["b", "a"]);
    expect(setQueue).toHaveBeenCalledTimes(1);
    const items = setQueue.mock.calls[0][0];
    expect(items.map((q) => q.vacancyId)).toEqual(["b", "a"]);
    expect(globalThis.window.location.href).toBe("https://hh.ru/vacancy/b");
    expect(r.reason).toContain("очередь: 2");
  });
});

describe("#10B -- dry-run", () => {
  it("dryRun=true: no applied counters, no recordAction, queue advances", async () => {
    getAllSettings.mockResolvedValue({ dryRun: true });
    clickApplyButton.mockResolvedValue({ clicked: true, dryRun: true });
    waitForPopupAndSubmit.mockResolvedValue({ success: true, dryRun: true });
    const r = await continueApply({ vacancyId: "123" });
    expect(r).toEqual({ success: true, dryRun: true });
    expect(markAsApplied).not.toHaveBeenCalled();
    expect(incrementApplied).not.toHaveBeenCalled();
    expect(rateLimiter.recordAction).not.toHaveBeenCalled();
    expect(markAsSkipped).not.toHaveBeenCalled();
    expect(processNextInQueue).toHaveBeenCalledTimes(1);
  });

  it("dryRun passes through to DOM actions", async () => {
    getAllSettings.mockResolvedValue({ dryRun: true });
    clickApplyButton.mockResolvedValue({ clicked: true, dryRun: true });
    waitForPopupAndSubmit.mockResolvedValue({ success: true, dryRun: true });
    await continueApply({ vacancyId: "123" });
    expect(clickApplyButton).toHaveBeenCalledWith({ dryRun: true });
    expect(waitForPopupAndSubmit).toHaveBeenCalledWith({ dryRun: true });
  });
});

describe("#10B -- audit log", () => {
  it("skipped outcome sent as { type:'log', entry }", async () => {
    clickApplyButton.mockResolvedValue({ clicked: false, reason: "no-button" });
    await continueApply({ vacancyId: "123" });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "log",
      entry: {
        action: "apply",
        vacancyId: "123",
        outcome: "skipped",
        reason: expect.stringContaining("no-apply-button"),
      },
    });
  });

  it("success outcome audited as applied", async () => {
    clickApplyButton.mockResolvedValue({ clicked: true });
    waitForPopupAndSubmit.mockResolvedValue({ success: true });
    await continueApply({ vacancyId: "123" });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "log",
      entry: { action: "apply", vacancyId: "123", outcome: "applied", reason: "" },
    });
  });
});

describe("#10B -- confirmApplyAll dialog", () => {
  it("resolves true on [Откликнуться]", async () => {
    const host = document.createElement("div");
    refs.shadowRoot = host;
    const p = confirmApplyAll({ count: 3, minScore: 70, skipped: 1 });
    const btns = host.querySelectorAll("button");
    expect(btns.length).toBe(2);
    btns[1].click();
    await expect(p).resolves.toBe(true);
    expect(host.querySelector("#hh-ar-apply-confirm")).toBeNull();
  });

  it("resolves false on [Отмена]", async () => {
    const host = document.createElement("div");
    refs.shadowRoot = host;
    const p = confirmApplyAll({ count: 3, minScore: 70, skipped: 1 });
    host.querySelectorAll("button")[0].click();
    await expect(p).resolves.toBe(false);
  });
});

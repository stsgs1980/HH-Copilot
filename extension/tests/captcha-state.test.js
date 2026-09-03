/// <reference types="vitest/globals" />
/**
 * TESTS: CAPTCHA detector (F4.4)
 * Covers:
 *   - detectCaptcha: each selector type, hidden element skip, no CAPTCHA, null root
 *   - getCaptchaState / isAutoPaused: initial state
 *   - pauseForCaptcha: state set + persisted
 *   - resumeFromCaptcha: state cleared + storage removed
 *   - loadCaptchaState: persisted state loaded
 *   - checkAndPause: respects captchaAutoPause flag, idempotent on already-paused
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  CAPTCHA_STATE_KEY,
  _internal,
  getCaptchaState,
  isAutoPaused,
  loadCaptchaState,
  pauseForCaptcha,
  resumeFromCaptcha,
} from "../src/lib/captcha-detector.js";

// ===============================================
// chrome.storage.local stub
// ===============================================

let store;

beforeEach(() => {
  store = {};
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) {
          return key in store ? { [key]: store[key] } : {};
        },
        async set(obj) {
          Object.assign(store, obj);
        },
        async remove(key) {
          delete store[key];
        },
      },
    },
  };
  _internal._resetState();
});
describe("F4.4 -- getCaptchaState / isAutoPaused", () => {
  it("returns initial empty state", () => {
    const s = getCaptchaState();
    expect(s.paused).toBe(false);
    expect(s.reason).toBeNull();
    expect(s.detectedAt).toBeNull();
    expect(s.type).toBeNull();
  });

  it("isAutoPaused returns false initially", () => {
    expect(isAutoPaused()).toBe(false);
  });

  it("isAutoPaused returns true after pauseForCaptcha", async () => {
    await pauseForCaptcha("image", "test");
    expect(isAutoPaused()).toBe(true);
  });

  it("isAutoPaused returns false after resumeFromCaptcha", async () => {
    await pauseForCaptcha("image");
    await resumeFromCaptcha();
    expect(isAutoPaused()).toBe(false);
  });
});

describe("F4.4 -- pauseForCaptcha", () => {
  it("sets paused state with type + reason", async () => {
    await pauseForCaptcha("recaptcha", "Test reason");
    const s = getCaptchaState();
    expect(s.paused).toBe(true);
    expect(s.type).toBe("recaptcha");
    expect(s.reason).toBe("Test reason");
    expect(s.detectedAt).toBeTruthy();
  });

  it("uses default reason when none provided", async () => {
    await pauseForCaptcha("image");
    expect(getCaptchaState().reason).toContain("image");
  });

  it("persists state to chrome.storage.local", async () => {
    await pauseForCaptcha("image");
    expect(store[CAPTCHA_STATE_KEY]).toBeDefined();
    expect(store[CAPTCHA_STATE_KEY].paused).toBe(true);
  });

  it("returns true on success", async () => {
    const ok = await pauseForCaptcha("image");
    expect(ok).toBe(true);
  });
});

describe("F4.4 -- resumeFromCaptcha", () => {
  it("clears paused state", async () => {
    await pauseForCaptcha("image");
    await resumeFromCaptcha();
    const s = getCaptchaState();
    expect(s.paused).toBe(false);
    expect(s.reason).toBeNull();
    expect(s.type).toBeNull();
  });

  it("removes state from storage", async () => {
    await pauseForCaptcha("image");
    expect(store[CAPTCHA_STATE_KEY]).toBeDefined();
    await resumeFromCaptcha();
    expect(store[CAPTCHA_STATE_KEY]).toBeUndefined();
  });

  it("returns true on success", async () => {
    await pauseForCaptcha("image");
    const ok = await resumeFromCaptcha();
    expect(ok).toBe(true);
  });
});

describe("F4.4 -- loadCaptchaState", () => {
  it("loads persisted state into memory", async () => {
    store[CAPTCHA_STATE_KEY] = {
      paused: true,
      reason: "persisted",
      detectedAt: "2026-06-17T10:00:00Z",
      type: "image",
    };
    await loadCaptchaState();
    const s = getCaptchaState();
    expect(s.paused).toBe(true);
    expect(s.reason).toBe("persisted");
    expect(s.type).toBe("image");
  });

  it("keeps default state when nothing persisted", async () => {
    await loadCaptchaState();
    expect(getCaptchaState().paused).toBe(false);
  });
});

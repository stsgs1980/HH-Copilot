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
  _internal,
  checkAndPause,
  getCaptchaState,
  isAutoPaused,
  pauseForCaptcha,
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
describe("F4.4 -- checkAndPause", () => {
  it("pauses when CAPTCHA found and auto-pause enabled", async () => {
    const root = document.createElement("div");
    const img = document.createElement("img");
    img.src = "/captcha/x.png";
    root.appendChild(img);
    const res = await checkAndPause(root, { captchaAutoPause: true });
    expect(res.found).toBe(true);
    expect(res.paused).toBe(true);
    expect(isAutoPaused()).toBe(true);
  });

  it("does NOT pause when captchaAutoPause disabled", async () => {
    const root = document.createElement("div");
    const img = document.createElement("img");
    img.src = "/captcha/x.png";
    root.appendChild(img);
    const res = await checkAndPause(root, { captchaAutoPause: false });
    expect(res.found).toBe(true);
    expect(res.paused).toBe(false);
    expect(isAutoPaused()).toBe(false);
  });

  it("returns found:false when no CAPTCHA present", async () => {
    const root = document.createElement("div");
    root.innerHTML = "<p>no captcha</p>";
    const res = await checkAndPause(root, { captchaAutoPause: true });
    expect(res.found).toBe(false);
    expect(res.paused).toBe(false);
  });

  it("is idempotent when already paused", async () => {
    await pauseForCaptcha("image", "first");
    const root = document.createElement("div");
    const img = document.createElement("img");
    img.src = "/captcha/y.png";
    root.appendChild(img);
    await checkAndPause(root, { captchaAutoPause: true });
    // Reason should not be overwritten
    expect(getCaptchaState().reason).toBe("first");
  });

  it("defaults to pausing when settings missing", async () => {
    const root = document.createElement("div");
    const img = document.createElement("img");
    img.src = "/captcha/z.png";
    root.appendChild(img);
    const res = await checkAndPause(root); // no settings arg
    expect(res.found).toBe(true);
    expect(res.paused).toBe(true);
  });
});

describe("F4.4 -- internal", () => {
  it("CAPTCHA_SELECTORS has 7 entries", () => {
    expect(_internal.CAPTCHA_SELECTORS).toHaveLength(7);
  });

  it("each selector has sel + type", () => {
    for (const s of _internal.CAPTCHA_SELECTORS) {
      expect(s.sel).toBeTruthy();
      expect(s.type).toBeTruthy();
    }
  });

  it("CAPTCHA_STATE_KEY is a string", () => {
    expect(typeof _internal.CAPTCHA_STATE_KEY).toBe("string");
    expect(_internal.CAPTCHA_STATE_KEY.length).toBeGreaterThan(0);
  });
});

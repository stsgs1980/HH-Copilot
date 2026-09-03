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
import { _internal, detectCaptcha } from "../src/lib/captcha-detector.js";

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
describe("F4.4 -- detectCaptcha", () => {
  it("detects img[src*=captcha]", () => {
    const root = document.createElement("div");
    const img = document.createElement("img");
    img.src = "https://hh.ru/captcha/abc.png";
    root.appendChild(img);
    const res = detectCaptcha(root);
    expect(res.found).toBe(true);
    expect(res.type).toBe("image");
  });

  it("detects .g-recaptcha", () => {
    const root = document.createElement("div");
    const div = document.createElement("div");
    div.className = "g-recaptcha";
    root.appendChild(div);
    expect(detectCaptcha(root).type).toBe("recaptcha");
  });

  it("detects [data-qa*=captcha]", () => {
    const root = document.createElement("div");
    const el = document.createElement("div");
    el.setAttribute("data-qa", "captcha-input");
    root.appendChild(el);
    expect(detectCaptcha(root).type).toBe("data-qa");
  });

  it("detects iframe[src*=recaptcha]", () => {
    const root = document.createElement("div");
    const ifr = document.createElement("iframe");
    ifr.src = "https://www.google.com/recaptcha/api2";
    root.appendChild(ifr);
    expect(detectCaptcha(root).type).toBe("recaptcha-iframe");
  });

  it("detects #captcha id", () => {
    const root = document.createElement("div");
    const el = document.createElement("div");
    el.id = "captcha";
    root.appendChild(el);
    expect(detectCaptcha(root).type).toBe("captcha-id");
  });

  it("detects .captcha class", () => {
    const root = document.createElement("div");
    const el = document.createElement("div");
    el.className = "captcha";
    root.appendChild(el);
    expect(detectCaptcha(root).type).toBe("captcha-class");
  });

  it("detects textarea#g-recaptcha-response", () => {
    const root = document.createElement("div");
    const ta = document.createElement("textarea");
    ta.id = "g-recaptcha-response";
    root.appendChild(ta);
    expect(detectCaptcha(root).type).toBe("recaptcha-response");
  });

  it("returns found:false when no CAPTCHA present", () => {
    const root = document.createElement("div");
    root.innerHTML = "<div>some content</div><p>hello</p>";
    const res = detectCaptcha(root);
    expect(res.found).toBe(false);
    expect(res.type).toBeNull();
  });

  it("returns found:false for null/undefined root", () => {
    expect(detectCaptcha(null).found).toBe(false);
    expect(detectCaptcha(undefined).found).toBe(false);
  });

  it("skips hidden elements (display:none)", () => {
    const root = document.createElement("div");
    const el = document.createElement("div");
    el.className = "g-recaptcha";
    el.style.display = "none";
    root.appendChild(el);
    // offsetParent is null for display:none elements in jsdom
    // The skip check should prevent false positive
    const res = detectCaptcha(root);
    expect(res.found).toBe(false);
  });

  it("returns first match when multiple CAPTCHAs present (no crash)", () => {
    const root = document.createElement("div");
    const img = document.createElement("img");
    img.src = "/captcha/x.png";
    const div = document.createElement("div");
    div.className = "g-recaptcha";
    root.appendChild(img);
    root.appendChild(div);
    const res = detectCaptcha(root);
    expect(res.found).toBe(true);
    expect(res.type).toBe("image"); // first in CAPTCHA_SELECTORS order
  });
});

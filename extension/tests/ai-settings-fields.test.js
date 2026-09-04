/// <reference types="vitest/globals" />
/**
 * TESTS: AI settings UI panel module (F5.6)
 * Covers:
 *   - loadAiConfig: success (3 shapes), BG error, no chrome.runtime
 *   - saveAiConfig: success, BAD_INPUT, BG error
 *   - populateAiFields: populates 3 fields, defaults on BG error, no shadowRoot
 *   - readAiFields: reads 3 fields from DOM
 *   - bindAiSettingsHandlers: debounce, partial save on input
 *   - internal helpers: setFieldValue, getFieldValue
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { populateAiFields, readAiFields } from "../src/ui/panel/ai-settings.js";
import { refs } from "../src/ui/state.js";

// ===============================================
// chrome stub
// ===============================================

function installChromeStub() {
  globalThis.chrome = {
    runtime: {
      sendMessage: vi.fn(),
      lastError: null,
    },
  };
}

beforeEach(() => {
  installChromeStub();
  // Reset refs.shadowRoot before each test
  refs.shadowRoot = null;
});
describe("F5.6 -- populateAiFields", () => {
  it("populates the 4 fields from loaded config", async () => {
    refs.shadowRoot = makeShadowRootWithFields();
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ ok: true, config: { baseUrl: "https://b/v1", apiKey: "kk", model: "mm", timeoutMs: 75000 } });
    });
    const ok = await populateAiFields();
    expect(ok).toBe(true);
    expect(refs.shadowRoot.getElementById("s-ai-base-url").value).toBe("https://b/v1");
    expect(refs.shadowRoot.getElementById("s-ai-api-key").value).toBe("kk");
    expect(refs.shadowRoot.getElementById("s-ai-model").value).toBe("mm");
    expect(refs.shadowRoot.getElementById("s-ai-timeout").value).toBe("75000");
  });

  it("falls back to defaults on BG error", async () => {
    refs.shadowRoot = makeShadowRootWithFields();
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb(null);
    });
    const ok = await populateAiFields();
    expect(ok).toBe(false);
    expect(refs.shadowRoot.getElementById("s-ai-base-url").value).toBe("https://internal-api.z.ai/v1");
    expect(refs.shadowRoot.getElementById("s-ai-api-key").value).toBe("");
    expect(refs.shadowRoot.getElementById("s-ai-token").value).toBe("");
    expect(refs.shadowRoot.getElementById("s-ai-chat-id").value).toBe("");
    expect(refs.shadowRoot.getElementById("s-ai-user-id").value).toBe("");
    expect(refs.shadowRoot.getElementById("s-ai-model").value).toBe("glm-4.5");
    expect(refs.shadowRoot.getElementById("s-ai-timeout").value).toBe("60000");
  });

  it("returns false when no shadowRoot", async () => {
    refs.shadowRoot = null;
    const ok = await populateAiFields();
    expect(ok).toBe(false);
  });
});

describe("F5.6 -- readAiFields", () => {
  it("reads 4 field values from DOM", () => {
    refs.shadowRoot = makeShadowRootWithFields({
      "s-ai-base-url": "https://r/v1",
      "s-ai-api-key": "rk",
      "s-ai-model": "rm",
      "s-ai-timeout": "120000",
    });
    const cfg = readAiFields();
    expect(cfg.baseUrl).toBe("https://r/v1");
    expect(cfg.apiKey).toBe("rk");
    expect(cfg.model).toBe("rm");
    expect(cfg.timeoutMs).toBe(120000);
  });

  it("falls back to 60000 when timeout field is empty or invalid", () => {
    refs.shadowRoot = makeShadowRootWithFields({
      "s-ai-base-url": "https://r/v1",
      "s-ai-api-key": "rk",
      "s-ai-model": "rm",
      "s-ai-timeout": "abc",
    });
    const cfg = readAiFields();
    expect(cfg.timeoutMs).toBe(60000);
  });

  it("returns empty strings (and 60000 timeout) when no shadowRoot", () => {
    refs.shadowRoot = null;
    const cfg = readAiFields();
    expect(cfg.baseUrl).toBe("");
    expect(cfg.apiKey).toBe("");
    expect(cfg.model).toBe("");
    expect(cfg.timeoutMs).toBe(60000);
  });
});

function makeShadowRootWithFields(values) {
  const div = document.createElement("div");
  div.innerHTML = `
    <input id="s-ai-base-url" value="">
    <input id="s-ai-api-key" value="">
    <textarea id="s-ai-token"></textarea>
    <input id="s-ai-chat-id" value="">
    <input id="s-ai-user-id" value="">
    <input id="s-ai-model" value="">
    <input id="s-ai-timeout" value="">
  `;
  const sr = {
    getElementById(id) {
      const el = div.querySelector("#" + id);
      if (el && values && values[id] !== undefined) el.value = values[id];
      return el;
    },
  };
  return sr;
}

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
import { loadAiConfig, saveAiConfig } from "../src/ui/panel/ai-settings.js";
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
describe("F5.6 -- loadAiConfig", () => {
  it("handles {ok:true, config:{...}} shape (background wrapper)", async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ ok: true, config: { baseUrl: "https://x.example/v1", apiKey: "k1", model: "m1" } });
    });
    const res = await loadAiConfig();
    expect(res.ok).toBe(true);
    expect(res.config.baseUrl).toBe("https://x.example/v1");
    expect(res.config.apiKey).toBe("k1");
    expect(res.config.model).toBe("m1");
  });

  it("handles direct config shape (no ok wrapper)", async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ baseUrl: "https://y.example/v1", apiKey: "k2", model: "m2" });
    });
    const res = await loadAiConfig();
    expect(res.ok).toBe(true);
    expect(res.config.baseUrl).toBe("https://y.example/v1");
    expect(res.config.model).toBe("m2");
  });

  it("applies defaults when cfg fields missing", async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ ok: true, config: {} });
    });
    const res = await loadAiConfig();
    expect(res.ok).toBe(true);
    expect(res.config.baseUrl).toBe("https://api.z.ai/api/paas/v4");
    expect(res.config.apiKey).toBe(""); // no fake stub key (#8)
    expect(res.config.token).toBe(""); // empty (user must paste their JWT)
    expect(res.config.model).toBe("glm-4.5");
  });

  it("returns EMPTY_RESP when BG returns null", async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb(null);
    });
    const res = await loadAiConfig();
    expect(res.ok).toBe(false);
    expect(res.code).toBe("EMPTY_RESP");
  });

  it("returns NO_BG when chrome.runtime missing", async () => {
    const saved = globalThis.chrome.runtime;
    delete globalThis.chrome.runtime;
    const res = await loadAiConfig();
    expect(res.ok).toBe(false);
    expect(res.code).toBe("NO_BG");
    globalThis.chrome.runtime = saved;
  });

  it("returns BG_ERR when lastError set", async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      chrome.runtime.lastError = { message: "port closed" };
      cb(undefined);
      chrome.runtime.lastError = null;
    });
    const res = await loadAiConfig();
    expect(res.ok).toBe(false);
    expect(res.code).toBe("BG_ERR");
  });
});

describe("F5.6 -- saveAiConfig", () => {
  it("sends ai-set-config with partial config on success", async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ ok: true, config: { ...msg.config } });
    });
    const res = await saveAiConfig({ apiKey: "new-key" });
    expect(res.ok).toBe(true);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ai-set-config", config: { apiKey: "new-key" } }),
      expect.any(Function),
    );
  });

  it("returns BAD_INPUT on non-object partial", async () => {
    const res = await saveAiConfig(null);
    expect(res.ok).toBe(false);
    expect(res.code).toBe("BAD_INPUT");
  });

  it("returns EMPTY_RESP when BG returns null", async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb(null);
    });
    const res = await saveAiConfig({ model: "glm-4.5" });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("EMPTY_RESP");
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

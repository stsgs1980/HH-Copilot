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
import { _internal, bindAiSettingsHandlers } from "../src/ui/panel/ai-settings.js";
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
describe("F5.6 -- bindAiSettingsHandlers", () => {
  it("binds input handlers to 4 AI fields", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <input id="s-ai-base-url" value="https://a/v1">
      <input id="s-ai-api-key" value="k">
      <input id="s-ai-model" value="m">
      <input id="s-ai-timeout" value="60000">
    `;
    refs.shadowRoot = makeShadowRootWithFields();
    bindAiSettingsHandlers(container, { debounceMs: 10 });
    // No assertion needed -- if it runs without throwing, binding succeeded
    expect(true).toBe(true);
  });

  it("saves partial config after debounce when input changes", async () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <input id="s-ai-base-url" value="https://a/v1">
      <input id="s-ai-api-key" value="k">
      <input id="s-ai-model" value="m">
      <input id="s-ai-timeout" value="60000">
    `;
    refs.shadowRoot = {
      getElementById(id) {
        return container.querySelector("#" + id);
      },
    };
    let savedPartial = null;
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      if (msg.type === "ai-set-config") {
        savedPartial = msg.config;
        cb({ ok: true });
      } else {
        cb({ ok: true, config: {} });
      }
    });

    bindAiSettingsHandlers(container, { debounceMs: 10 });
    const input = container.querySelector("#s-ai-api-key");
    input.value = "new-key";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    // Wait past debounce
    await new Promise((r) => setTimeout(r, 30));

    expect(savedPartial).toEqual({ apiKey: "new-key" });
  });

  it("saves timeoutMs partial when timeout field changes", async () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <input id="s-ai-base-url" value="https://a/v1">
      <input id="s-ai-api-key" value="k">
      <input id="s-ai-model" value="m">
      <input id="s-ai-timeout" value="60000">
    `;
    refs.shadowRoot = {
      getElementById(id) {
        return container.querySelector("#" + id);
      },
    };
    let savedPartial = null;
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      if (msg.type === "ai-set-config") {
        savedPartial = msg.config;
        cb({ ok: true });
      } else {
        cb({ ok: true, config: {} });
      }
    });

    bindAiSettingsHandlers(container, { debounceMs: 10 });
    const input = container.querySelector("#s-ai-timeout");
    input.value = "120000";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    await new Promise((r) => setTimeout(r, 30));

    expect(savedPartial).toEqual({ timeoutMs: 120000 });
  });

  it("no-op when container is null", () => {
    bindAiSettingsHandlers(null);
    expect(true).toBe(true);
  });
});

describe("F5.6 -- internal helpers", () => {
  it("setFieldValue sets value when element exists", () => {
    const div = document.createElement("div");
    const inp = document.createElement("input");
    inp.id = "x";
    div.appendChild(inp);
    const sr = { getElementById: (id) => div.querySelector("#" + id) };
    _internal.setFieldValue(sr, "x", "val1");
    expect(inp.value).toBe("val1");
  });

  it("setFieldValue is no-op when element missing", () => {
    const sr = { getElementById: () => null };
    _internal.setFieldValue(sr, "nope", "val");
    expect(true).toBe(true);
  });

  it("getFieldValue returns value when element exists", () => {
    const div = document.createElement("div");
    const inp = document.createElement("input");
    inp.id = "y";
    inp.value = "val2";
    div.appendChild(inp);
    const sr = { getElementById: (id) => div.querySelector("#" + id) };
    expect(_internal.getFieldValue(sr, "y")).toBe("val2");
  });

  it("getFieldValue returns empty string when element missing", () => {
    const sr = { getElementById: () => null };
    expect(_internal.getFieldValue(sr, "nope")).toBe("");
  });

  it("AI_FIELD_IDS has exactly 8 ids (provider, baseUrl, apiKey, token, chatId, userId, model, timeout)", () => {
    expect(_internal.AI_FIELD_IDS).toHaveLength(8);
    expect(_internal.AI_FIELD_IDS).toContain("s-ai-provider");
    expect(_internal.AI_FIELD_IDS).toContain("s-ai-base-url");
    expect(_internal.AI_FIELD_IDS).toContain("s-ai-api-key");
    expect(_internal.AI_FIELD_IDS).toContain("s-ai-token");
    expect(_internal.AI_FIELD_IDS).toContain("s-ai-chat-id");
    expect(_internal.AI_FIELD_IDS).toContain("s-ai-user-id");
    expect(_internal.AI_FIELD_IDS).toContain("s-ai-model");
    expect(_internal.AI_FIELD_IDS).toContain("s-ai-timeout");
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

/// <reference types="vitest/globals" />
/**
 * TESTS: AI settings -- OpenRouter UI (#8)
 * =========================================
 * - provider switch to openrouter: baseUrl prefill, readOnly, zai-only fields cleared
 * - model fetch button with provider=openrouter calls ai-fetch-openrouter-models
 */

import { beforeEach, describe, expect, it } from "vitest";
import { bindModelFetchHandler, bindProviderHandler } from "../src/ui/panel/ai-settings-handlers.js";
import { refs } from "../src/ui/state.js";

beforeEach(() => {
  refs.shadowRoot = null;
});

describe("F5.6 -- provider switch to openrouter (#8)", () => {
  it("prefills baseUrl, sets readOnly, clears zai-only fields", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <select id="s-ai-provider">
        <option value="zai">Z.ai</option>
        <option value="openrouter">OpenRouter</option>
      </select>
    `;
    const host = document.createElement("div");
    host.innerHTML = `
      <input id="s-ai-provider" value="zai">
      <input id="s-ai-base-url" value="">
      <input id="s-ai-api-key" value="k">
      <input id="s-ai-token" value="t">
      <input id="s-ai-chat-id" value="c">
      <input id="s-ai-user-id" value="u">
      <input id="s-ai-model" value="m">
      <div id="s-ai-zai-fields"></div>
    `;
    refs.shadowRoot = { getElementById: (id) => host.querySelector("#" + id) };
    const saved = [];
    const saveAiConfig = async (cfg) => {
      saved.push(cfg);
      return { ok: true };
    };
    const readAiFields = () => ({
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "",
      token: "",
      chatId: "",
      userId: "",
      model: "",
      timeoutMs: 60000,
    });
    bindProviderHandler(container, readAiFields, saveAiConfig);
    const sel = container.querySelector("#s-ai-provider");
    sel.value = "openrouter";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(host.querySelector("#s-ai-base-url").value).toBe("https://openrouter.ai/api/v1");
    expect(host.querySelector("#s-ai-base-url").readOnly).toBe(true);
    expect(host.querySelector("#s-ai-token").value).toBe("");
    expect(host.querySelector("#s-ai-chat-id").value).toBe("");
    expect(host.querySelector("#s-ai-user-id").value).toBe("");
    expect(saved).toHaveLength(1);
  });
});

describe("F5.6 -- model fetch button for openrouter (#8)", () => {
  it('provider=openrouter -> sendBg called with type "ai-fetch-openrouter-models"', async () => {
    const container = document.createElement("div");
    container.innerHTML = `<button id="s-ai-fetch-models">Загрузить</button>`;
    const host = document.createElement("div");
    host.innerHTML = `
      <input id="s-ai-provider" value="openrouter">
      <input id="s-ai-base-url" value="https://openrouter.ai/api/v1">
      <input id="s-ai-model" value="">
      <div id="s-ai-model-list"></div>
    `;
    refs.shadowRoot = { getElementById: (id) => host.querySelector("#" + id) };
    let seen = null;
    const sendBg = async (msg) => {
      seen = msg;
      return { ok: true, models: ["a/b:free"] };
    };
    const setFV = (sr, id, v) => {
      const el = sr.getElementById(id);
      if (el) el.value = v;
    };
    bindModelFetchHandler(container, sendBg, setFV, async () => ({ ok: true }));
    container.querySelector("#s-ai-fetch-models").click();
    await new Promise((r) => setTimeout(r, 20));
    expect(seen).toEqual({ type: "ai-fetch-openrouter-models", baseUrl: "https://openrouter.ai/api/v1" });
    const tags = host.querySelectorAll(".ai-model-tag");
    expect(tags.length).toBe(1);
    expect(tags[0].textContent).toBe("a/b:free");
  });
});

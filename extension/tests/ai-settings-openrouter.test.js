/// <reference types="vitest/globals" />
/**
 * TESTS: AI settings -- Zen UI (#8)
 * =========================================
 * - provider switch to zen: baseUrl prefill, readOnly
 * - model fetch button with provider=zen calls ai-fetch-zen-models
 */

import { beforeEach, describe, expect, it } from "vitest";
import { bindModelFetchHandler, bindProviderHandler } from "../src/ui/panel/ai-settings-handlers.js";
import { refs } from "../src/ui/state.js";

beforeEach(() => {
  refs.shadowRoot = null;
});

describe("F5.6 -- provider switch to zen (#8)", () => {
  it("prefills baseUrl, sets readOnly", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <select id="s-ai-provider">
        <option value="zen">OpenCode Zen</option>
        <option value="custom">Custom</option>
      </select>
    `;
    const host = document.createElement("div");
    host.innerHTML = `
      <input id="s-ai-provider" value="custom">
      <input id="s-ai-base-url" value="">
      <input id="s-ai-api-key" value="k">
      <input id="s-ai-model" value="m">
    `;
    refs.shadowRoot = { getElementById: (id) => host.querySelector("#" + id) };
    const saved = [];
    const saveAiConfig = async (cfg) => {
      saved.push(cfg);
      return { ok: true };
    };
    const readAiFields = () => ({
      provider: "zen",
      baseUrl: "https://opencode.ai/zen/v1",
      apiKey: "",
      model: "",
      timeoutMs: 60000,
    });
    bindProviderHandler(container, readAiFields, saveAiConfig);
    const sel = container.querySelector("#s-ai-provider");
    sel.value = "zen";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(host.querySelector("#s-ai-base-url").value).toBe("https://opencode.ai/zen/v1");
    expect(host.querySelector("#s-ai-base-url").readOnly).toBe(true);
    expect(saved).toHaveLength(1);
  });
});

describe("F5.6 -- model fetch button for zen (#8)", () => {
  it('provider=zen -> sendBg called with type "ai-fetch-zen-models"', async () => {
    const container = document.createElement("div");
    container.innerHTML = `<button id="s-ai-fetch-models">Загрузить</button>`;
    const host = document.createElement("div");
    host.innerHTML = `
      <input id="s-ai-provider" value="zen">
      <input id="s-ai-base-url" value="https://opencode.ai/zen/v1">
      <input id="s-ai-model" value="">
      <div id="s-ai-model-list"></div>
    `;
    refs.shadowRoot = { getElementById: (id) => host.querySelector("#" + id) };
    let seen = null;
    const sendBg = async (msg) => {
      seen = msg;
      return { ok: true, models: ["mimo-v2.5-free"] };
    };
    const setFV = (sr, id, v) => {
      const el = sr.getElementById(id);
      if (el) el.value = v;
    };
    bindModelFetchHandler(container, sendBg, setFV, async () => ({ ok: true }));
    container.querySelector("#s-ai-fetch-models").click();
    await new Promise((r) => setTimeout(r, 20));
    expect(seen).toEqual({ type: "ai-fetch-zen-models", baseUrl: "https://opencode.ai/zen/v1" });
    const tags = host.querySelectorAll(".ai-model-tag");
    expect(tags.length).toBe(1);
    expect(tags[0].textContent).toBe("mimo-v2.5-free");
  });
});

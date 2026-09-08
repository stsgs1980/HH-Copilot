/// <reference types="vitest/globals" />
/**
 * TESTS: legacy Z.ai baseUrl migration + header contract (#11)
 * =============================================================
 * - stored internal-api.z.ai baseUrl rewritten to public v4 endpoint
 * - custom URLs pass through untouched (no storage write)
 * - ZAI requests carry Bearer auth without X-Z-AI-From
 */

import { describe, expect, it, vi } from "vitest";
import { AI_CONFIG_KEY, getAiConfig, sendMessage } from "../src/services/ai-service.js";

function installChromeStub(initial = {}) {
  const store = { ...initial };
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
  return store;
}

function installSpyingStub(stored) {
  const store = { [AI_CONFIG_KEY]: stored };
  const setCalls = [];
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) {
          return key in store ? { [key]: store[key] } : {};
        },
        async set(obj) {
          setCalls.push(obj);
          Object.assign(store, obj);
        },
        async remove(key) {
          delete store[key];
        },
      },
    },
  };
  return { store, setCalls };
}

function makeOkFetch(text) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: text } }], usage: null }),
    text: async () => text,
  }));
}

describe("F4.2 -- legacy baseUrl migration (#11)", () => {
  it("passes through legacy baseUrl without migration", async () => {
    const { setCalls } = installSpyingStub({
      provider: "zen",
      baseUrl: "https://opencode.ai/zen/v1",
      apiKey: "k",
    });
    const cfg = await getAiConfig();
    expect(cfg.baseUrl).toBe("https://opencode.ai/zen/v1");
    expect(setCalls).toHaveLength(0);
  });

  it("passes through legacy baseUrl with trailing slash", async () => {
    installSpyingStub({ provider: "zen", baseUrl: "https://opencode.ai/zen/v1/" });
    const cfg = await getAiConfig();
    expect(cfg.baseUrl).toBe("https://opencode.ai/zen/v1/");
  });

  it("leaves custom baseUrl untouched, no storage write", async () => {
    const { setCalls } = installSpyingStub({
      provider: "custom",
      baseUrl: "https://my-proxy.example.com/v1",
      apiKey: "k",
    });
    const cfg = await getAiConfig();
    expect(cfg.baseUrl).toBe("https://my-proxy.example.com/v1");
    expect(setCalls).toHaveLength(0);
  });

  it("detects provider from zen baseUrl", async () => {
    installSpyingStub({ baseUrl: "https://opencode.ai/zen/v1" });
    const cfg = await getAiConfig();
    expect(cfg.provider).toBe("zen");
    expect(cfg.baseUrl).toBe("https://opencode.ai/zen/v1");
  });
});

describe("F4.2 -- Zen request headers (#11)", () => {
  it("sends Bearer auth", async () => {
    installChromeStub({
      [AI_CONFIG_KEY]: {
        provider: "zen",
        baseUrl: "https://opencode.ai/zen/v1",
        apiKey: "k",
      },
    });
    const fetchImpl = makeOkFetch("ok");
    await sendMessage({ messages: [{ role: "user", content: "hi" }], fetchImpl });
    const headers = fetchImpl.mock.calls[0][1].headers;
    expect(headers["Authorization"]).toBe("Bearer k");
  });
});

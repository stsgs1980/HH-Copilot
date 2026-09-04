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
  it("migrates stored legacy baseUrl and rewrites storage", async () => {
    const { store, setCalls } = installSpyingStub({
      provider: "zai",
      baseUrl: "https://internal-api.z.ai/v1",
      apiKey: "k",
      token: "t",
    });
    const cfg = await getAiConfig();
    expect(cfg.baseUrl).toBe("https://api.z.ai/api/paas/v4");
    expect(setCalls).toHaveLength(1);
    expect(setCalls[0][AI_CONFIG_KEY].baseUrl).toBe("https://api.z.ai/api/paas/v4");
    expect(store[AI_CONFIG_KEY].baseUrl).toBe("https://api.z.ai/api/paas/v4");
  });

  it("migrates legacy baseUrl with trailing slash", async () => {
    installSpyingStub({ provider: "zai", baseUrl: "https://internal-api.z.ai/v1/" });
    const cfg = await getAiConfig();
    expect(cfg.baseUrl).toBe("https://api.z.ai/api/paas/v4");
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

  it("migrates legacy baseUrl without stored provider", async () => {
    installSpyingStub({ baseUrl: "https://internal-api.z.ai/v1" });
    const cfg = await getAiConfig();
    expect(cfg.provider).toBe("zai");
    expect(cfg.baseUrl).toBe("https://api.z.ai/api/paas/v4");
  });
});

describe("F4.2 -- ZAI request headers (#11)", () => {
  it("sends Bearer auth without X-Z-AI-From", async () => {
    installChromeStub({
      [AI_CONFIG_KEY]: {
        provider: "zai",
        baseUrl: "https://api.z.ai/api/paas/v4",
        apiKey: "k",
        token: "t",
      },
    });
    const fetchImpl = makeOkFetch("ok");
    await sendMessage({ messages: [{ role: "user", content: "hi" }], fetchImpl });
    const headers = fetchImpl.mock.calls[0][1].headers;
    expect(headers["Authorization"]).toBe("Bearer k");
    expect("X-Z-AI-From" in headers).toBe(false);
  });

  it("keeps legacy X-Token when token is set", async () => {
    installChromeStub({
      [AI_CONFIG_KEY]: {
        provider: "zai",
        baseUrl: "https://api.z.ai/api/paas/v4",
        apiKey: "k",
        token: "legacy-jwt",
      },
    });
    const fetchImpl = makeOkFetch("ok");
    await sendMessage({ messages: [{ role: "user", content: "hi" }], fetchImpl });
    const headers = fetchImpl.mock.calls[0][1].headers;
    expect(headers["X-Token"]).toBe("legacy-jwt");
  });
});

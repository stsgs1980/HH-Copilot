/// <reference types="vitest/globals" />
/**
 * TESTS: OpenRouter provider (#8, portion 1)
 * ==========================================
 * - detectProvider: openrouter.ai -> "openrouter", others unaffected (groq -> custom)
 * - fetchOpenRouterModels: id list mapping, non-ok -> []
 * - sendMessage with openrouter config: URL + auth/attribution headers
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { detectProvider, fetchOpenRouterModels } from "../src/services/ai-providers.js";
import { sendMessage } from "../src/services/ai-service.js";

function installOpenRouterChromeStub() {
  globalThis.chrome = {
    storage: {
      local: {
        async get() {
          return {
            aiConfig: {
              provider: "openrouter",
              baseUrl: "https://openrouter.ai/api/v1",
              apiKey: "test-key",
            },
          };
        },
      },
    },
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("#8 -- detectProvider: openrouter", () => {
  it('detectProvider("https://openrouter.ai/api/v1") === "openrouter"', () => {
    expect(detectProvider("https://openrouter.ai/api/v1")).toBe("openrouter");
  });

  it('detectProvider("https://api.groq.com/...") === "custom" (no regression)', () => {
    expect(detectProvider("https://api.groq.com/openai/v1")).toBe("custom");
  });
});

describe("#8 -- fetchOpenRouterModels", () => {
  it("maps data[].id list", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ id: "a/b:free" }, { id: "c/d" }] }),
    }));
    const models = await fetchOpenRouterModels("https://openrouter.ai/api/v1", fetchImpl);
    expect(models).toEqual(["a/b:free", "c/d"]);
  });

  it("resp.ok=false -> []", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500 }));
    const models = await fetchOpenRouterModels("https://openrouter.ai/api/v1", fetchImpl);
    expect(models).toEqual([]);
  });
});

describe("#8 -- sendMessage with openrouter", () => {
  it("posts to openrouter /chat/completions with Bearer key + Referer", async () => {
    installOpenRouterChromeStub();
    let seenUrl = "";
    let seenHeaders = {};
    const fetchImpl = vi.fn(async (url, opts) => {
      seenUrl = url;
      seenHeaders = opts.headers || {};
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "hello" } }], usage: null }),
      };
    });
    const r = await sendMessage({ messages: [{ role: "user", content: "hi" }], fetchImpl });
    expect(r.ok).toBe(true);
    expect(r.text).toBe("hello");
    expect(seenUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(seenHeaders["Authorization"]).toBe("Bearer test-key");
    expect(seenHeaders["HTTP-Referer"]).toBeTruthy();
  });
});

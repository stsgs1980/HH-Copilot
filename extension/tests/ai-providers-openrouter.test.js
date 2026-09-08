/// <reference types="vitest/globals" />
/**
 * TESTS: OpenRouter provider (#8, portion 1)
 * ==========================================
 * - detectProvider: openrouter.ai -> "openrouter", others unaffected (groq -> custom)
 * - fetchOpenRouterModels: id list mapping, non-ok -> []
 * - sendMessage with openrouter config: URL + auth/attribution headers
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { detectProvider, fetchZenModels } from "../src/services/ai-providers.js";
import { sendMessage } from "../src/services/ai-service.js";

function installZenChromeStub() {
  globalThis.chrome = {
    storage: {
      local: {
        async get() {
          return {
            aiConfig: {
              provider: "zen",
              baseUrl: "https://opencode.ai/zen/v1",
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

describe("#8 -- detectProvider: zen", () => {
  it('detectProvider("https://opencode.ai/zen/v1") === "zen"', () => {
    expect(detectProvider("https://opencode.ai/zen/v1")).toBe("zen");
  });

  it('detectProvider("https://api.groq.com/...") === "custom" (no regression)', () => {
    expect(detectProvider("https://api.groq.com/openai/v1")).toBe("custom");
  });
});

describe("#8 -- fetchZenModels", () => {
  it("maps data[].id list", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ id: "mimo-v2.5-free" }, { id: "gpt-4" }] }),
    }));
    const models = await fetchZenModels("https://opencode.ai/zen/v1", fetchImpl);
    expect(models).toEqual(["mimo-v2.5-free", "gpt-4"]);
  });

  it("resp.ok=false -> []", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500 }));
    const models = await fetchZenModels("https://opencode.ai/zen/v1", fetchImpl);
    expect(models).toEqual([]);
  });
});

describe("#8 -- sendMessage with zen", () => {
  it("posts to zen /chat/completions with Bearer key", async () => {
    installZenChromeStub();
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
    expect(seenUrl).toBe("https://opencode.ai/zen/v1/chat/completions");
    expect(seenHeaders["Authorization"]).toBe("Bearer test-key");
  });
});

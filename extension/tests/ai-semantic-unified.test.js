/// <reference types="vitest/globals" />
/**
 * TESTS: AI semantic via unified sendMessage (#8, portion 2)
 * ===========================================================
 * computeSemanticSimilarity tested through the REAL sendMessage
 * (no vi.mock of ai-service) with globalThis.fetch stubbed.
 * Config: OpenRouter aiConfig from chrome.storage stub.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeSemanticSimilarity } from "../src/lib/ai-semantic.js";

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

function okFetch(content) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }], usage: null }),
  }));
}

const RESUME = { title: "Frontend Developer", skills: ["React"], experienceTotal: "3 years" };
const VACANCY = { title: "Frontend Developer", keySkills: ["React"], description: { text: "Build UIs" } };

beforeEach(() => {
  installOpenRouterChromeStub();
  vi.restoreAllMocks();
});

describe("#8 -- computeSemanticSimilarity via unified sendMessage", () => {
  it('fetch content "0.75" -> 0.75', async () => {
    globalThis.fetch = okFetch("0.75");
    const score = await computeSemanticSimilarity(RESUME, VACANCY);
    expect(score).toBe(0.75);
  });

  it('fetch content "0.9xxx мусор" -> 0.9 (parseFloat prefix)', async () => {
    globalThis.fetch = okFetch("0.9xxx мусор");
    const score = await computeSemanticSimilarity(RESUME, VACANCY);
    expect(score).toBe(0.9);
  });

  it("fetch {ok:false} -> 0", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500, text: async () => "err" }));
    const score = await computeSemanticSimilarity(RESUME, VACANCY);
    expect(score).toBe(0);
  });

  it("fetch throws -> 0", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("Network failed");
    });
    const score = await computeSemanticSimilarity(RESUME, VACANCY);
    expect(score).toBe(0);
  });

  it("fetch body: max_tokens === 10, temperature === 0.1, url ~ openrouter.ai", async () => {
    let seenUrl = "";
    let seenBody = {};
    globalThis.fetch = vi.fn(async (url, opts) => {
      seenUrl = url;
      seenBody = JSON.parse(opts.body);
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "0.5" } }], usage: null }) };
    });
    await computeSemanticSimilarity(RESUME, VACANCY);
    expect(seenUrl).toContain("openrouter.ai");
    expect(seenBody.max_tokens).toBe(10);
    expect(seenBody.temperature).toBe(0.1);
  });
});

/// <reference types="vitest/globals" />
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeSemanticSimilarity } from "../src/lib/ai-semantic.js";

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
      },
    },
  };
  return store;
}

beforeEach(() => {
  installChromeStub({ aiApiKey: "test-key" });
});

describe("computeSemanticSimilarity", () => {
  it("should return 0 for null inputs", async () => {
    const result = await computeSemanticSimilarity(null, null);
    expect(result).toBe(0);
  });

  it("should return 0 for null resume", async () => {
    const result = await computeSemanticSimilarity(null, { title: "Test" });
    expect(result).toBe(0);
  });

  it("should return 0 for null vacancy", async () => {
    const result = await computeSemanticSimilarity({ title: "Test" }, null);
    expect(result).toBe(0);
  });

  it("should return number between 0 and 1", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "0.75" } }],
        }),
    });

    const result = await computeSemanticSimilarity(
      { title: "Менеджер", skills: ["продажи"] },
      { title: "Менеджер", keySkills: ["продажи"] },
    );

    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("clamps values outside 0-1 range (openrouter aiConfig)", async () => {
    installChromeStub({
      aiConfig: { provider: "openrouter", baseUrl: "https://openrouter.ai/api/v1", apiKey: "k" },
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "1.7" } }],
        }),
    });

    const result = await computeSemanticSimilarity({ title: "Test" }, { title: "Test" });

    expect(result).toBe(1);
  });

  it("should clamp negative values to 0", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "-0.3" } }],
        }),
    });

    const result = await computeSemanticSimilarity({ title: "Test" }, { title: "Test" });

    expect(result).toBe(0);
  });

  it("should return 0 on fetch error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await computeSemanticSimilarity({ title: "Test" }, { title: "Test" });

    expect(result).toBe(0);
  });

  it("should return 0 when AI response is empty", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "" } }],
        }),
    });

    const result = await computeSemanticSimilarity({ title: "Test" }, { title: "Test" });

    expect(result).toBe(0);
  });

  it("should return 0 when choices array is empty", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ choices: [] }),
    });

    const result = await computeSemanticSimilarity({ title: "Test" }, { title: "Test" });

    expect(result).toBe(0);
  });

  it("sends through unified ai-service (openrouter, no groq leftovers)", async () => {
    installChromeStub({
      aiConfig: { provider: "openrouter", baseUrl: "https://openrouter.ai/api/v1", apiKey: "k" },
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "0.8" } }],
        }),
    });
    global.fetch = mockFetch;

    await computeSemanticSimilarity(
      { title: "Frontend Developer", skills: ["React", "TypeScript"] },
      { title: "Frontend Developer", keySkills: ["React", "TypeScript"], description: { text: "Build UIs" } },
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("openrouter.ai");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Authorization"]).toBe("Bearer k");
    const body = JSON.parse(opts.body);
    expect(JSON.stringify(body)).not.toMatch(/groq|llama-3\.3/i);
    expect(body.temperature).toBe(0.1);
    expect(body.max_tokens).toBe(10);
    expect(body.messages[0].content).toContain("Frontend Developer");
  });

  it("handles missing optional fields (prompt has N/A fallbacks)", async () => {
    installChromeStub({
      aiConfig: { provider: "openrouter", baseUrl: "https://openrouter.ai/api/v1", apiKey: "k" },
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "0.3" } }],
        }),
    });
    global.fetch = mockFetch;

    const result = await computeSemanticSimilarity({}, { title: "X" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain("N/A");
    expect(result).toBe(0.3);
  });
});

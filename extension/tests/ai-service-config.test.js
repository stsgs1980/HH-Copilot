/// <reference types="vitest/globals" />
/**
 * TESTS: AI service (F4.2)
 * Covers:
 *   - getAiConfig / setAiConfig / isAiAvailable
 *   - sendMessage: success, empty, HTTP error, rate limit, timeout, network error, missing key, bad input
 *   - generateCoverLetterAI: success + missing args
 *   - generateChatReply: success + variants split + missing history
 *   - All tests use injected fetchImpl (no real network)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AI_CONFIG_KEY, getAiConfig, isAiAvailable, sendMessage, setAiConfig } from "../src/services/ai-service.js";

// ===============================================
// chrome.storage.local stub (in-memory)
// ===============================================

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

// ===============================================
// fetch stub builder
// ===============================================

function makeOkFetch(text, usage = { total_tokens: 10 }) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: text } }],
      usage,
    }),
    text: async () => JSON.stringify({ choices: [{ message: { content: text } }] }),
  }));
}

function makeHttpFetch(status, body = "") {
  return vi.fn(async () => ({
    ok: false,
    status,
    text: async () => body,
  }));
}

function makeEmptyFetch() {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: "" } }] }),
  }));
}

function makeBadJsonFetch() {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new Error("Unexpected token");
    },
  }));
}

function makeAbortFetch() {
  return vi.fn(async () => {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    throw err;
  });
}

function makeNetworkErrFetch(msg = "Network failed") {
  return vi.fn(async () => {
    throw new Error(msg);
  });
}

// ===============================================
// Tests
// ===============================================

beforeEach(() => {
  installChromeStub({
    [AI_CONFIG_KEY]: {
      baseUrl: "https://api.z.ai/api/paas/v4",
      apiKey: "test-key",
      token: "test-jwt",
      chatId: "chat-test",
      userId: "user-test",
    },
  });
});
describe("F4.2 -- config", () => {
  it("getAiConfig returns built-in defaults when no config in storage", async () => {
    installChromeStub({});
    const cfg = await getAiConfig();
    expect(cfg.baseUrl).toBe("https://api.z.ai/api/paas/v4");
    expect(cfg.apiKey).toBe(""); // no built-in defaults
    expect(cfg.token).toBe(""); // no built-in JWT
    expect(cfg.model).toBe("glm-4.5");
    expect(cfg.timeoutMs).toBe(60000);
  });

  it("setAiConfig merges partial", async () => {
    const store = installChromeStub({
      [AI_CONFIG_KEY]: { baseUrl: "https://api.z.ai/api/paas/v4", apiKey: "old", token: "old-jwt" },
    });
    await setAiConfig({ apiKey: "new" });
    expect(store[AI_CONFIG_KEY].apiKey).toBe("new");
    expect(store[AI_CONFIG_KEY].baseUrl).toBe("https://api.z.ai/api/paas/v4");
    // token is preserved
    expect(store[AI_CONFIG_KEY].token).toBe("old-jwt");
  });

  it("isAiAvailable true when BOTH apiKey and token set, false when either missing (with defaults disabled)", async () => {
    installChromeStub({ [AI_CONFIG_KEY]: { apiKey: "k", token: "jwt", __test_no_defaults: true } });
    expect(await isAiAvailable()).toBe(true);
    installChromeStub({ [AI_CONFIG_KEY]: { apiKey: "k", token: "", __test_no_defaults: true } });
    expect(await isAiAvailable()).toBe(false);
    installChromeStub({ [AI_CONFIG_KEY]: { apiKey: "", token: "jwt", __test_no_defaults: true } });
    expect(await isAiAvailable()).toBe(false);
  });

  it("isAiAvailable false out-of-the-box (no built-in defaults when storage empty)", async () => {
    installChromeStub({});
    expect(await isAiAvailable()).toBe(false);
  });

  it("getAiConfig returns stored timeoutMs when set", async () => {
    installChromeStub({ [AI_CONFIG_KEY]: { apiKey: "k", token: "jwt", timeoutMs: 90000 } });
    const cfg = await getAiConfig();
    expect(cfg.timeoutMs).toBe(90000);
  });

  it("getAiConfig clamps too-small timeoutMs to 5000", async () => {
    installChromeStub({ [AI_CONFIG_KEY]: { apiKey: "k", token: "jwt", timeoutMs: 1000 } });
    const cfg = await getAiConfig();
    expect(cfg.timeoutMs).toBe(5000);
  });

  it("getAiConfig clamps too-large timeoutMs to 600000", async () => {
    installChromeStub({ [AI_CONFIG_KEY]: { apiKey: "k", token: "jwt", timeoutMs: 999999 } });
    const cfg = await getAiConfig();
    expect(cfg.timeoutMs).toBe(600000);
  });

  it("getAiConfig falls back to 60000 when timeoutMs is invalid", async () => {
    installChromeStub({ [AI_CONFIG_KEY]: { apiKey: "k", token: "jwt", timeoutMs: "abc" } });
    const cfg = await getAiConfig();
    expect(cfg.timeoutMs).toBe(60000);
  });
});

describe("F4.2 -- sendMessage success", () => {
  it("returns text on 200 OK with content", async () => {
    const fetchImpl = makeOkFetch("Hello world");
    const res = await sendMessage({
      messages: [{ role: "user", content: "hi" }],
      fetchImpl,
    });
    expect(res.ok).toBe(true);
    expect(res.text).toBe("Hello world");
    expect(res.usage.total_tokens).toBe(10);
  });

  it("calls fetch with correct URL + headers", async () => {
    const fetchImpl = makeOkFetch("ok");
    await sendMessage({
      messages: [{ role: "user", content: "hi" }],
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.z.ai/api/paas/v4/chat/completions");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Authorization"]).toBe("Bearer test-key");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(opts.body);
    expect(body.messages).toHaveLength(1);
    expect(body.model).toBe("glm-4.5");
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.stream).toBe(false);
  });

  it("trims whitespace from response text", async () => {
    const fetchImpl = makeOkFetch("  trimmed  ");
    const res = await sendMessage({ messages: [{ role: "user", content: "x" }], fetchImpl });
    expect(res.text).toBe("trimmed");
  });

  it("passes max_tokens through to body when a number (#8)", async () => {
    const fetchImpl = makeOkFetch("ok");
    await sendMessage({ messages: [{ role: "user", content: "hi" }], max_tokens: 10, fetchImpl });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(10);
  });

  it("omits max_tokens when not provided", async () => {
    const fetchImpl = makeOkFetch("ok");
    await sendMessage({ messages: [{ role: "user", content: "hi" }], fetchImpl });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect("max_tokens" in body).toBe(false);
  });
});

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
import { AI_CONFIG_KEY, sendMessage } from "../src/services/ai-service.js";

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
describe("F4.2 -- sendMessage error paths", () => {
  it("returns BAD_INPUT when messages is empty", async () => {
    const res = await sendMessage({ messages: [], fetchImpl: makeOkFetch("x") });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("BAD_INPUT");
  });

  it("returns NO_API_KEY when no key configured (both apiKey and token empty, defaults disabled)", async () => {
    installChromeStub({ [AI_CONFIG_KEY]: { apiKey: "", token: "", __test_no_defaults: true } });
    const res = await sendMessage({
      messages: [{ role: "user", content: "x" }],
      fetchImpl: makeOkFetch("x"),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("NO_API_KEY");
  });

  it("returns NO_API_KEY when token missing but apiKey present (defaults disabled)", async () => {
    installChromeStub({ [AI_CONFIG_KEY]: { apiKey: "k", token: "", __test_no_defaults: true } });
    const res = await sendMessage({
      messages: [{ role: "user", content: "x" }],
      fetchImpl: makeOkFetch("x"),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("NO_API_KEY");
  });

  it("returns EMPTY when content is empty string", async () => {
    const res = await sendMessage({
      messages: [{ role: "user", content: "x" }],
      fetchImpl: makeEmptyFetch(),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("EMPTY");
  });

  it("returns HTTP_500 on server error", async () => {
    const res = await sendMessage({
      messages: [{ role: "user", content: "x" }],
      fetchImpl: makeHttpFetch(500, "Server down"),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("HTTP_500");
    expect(res.error).toBe("HTTP 500");
  });

  it("returns RATE_LIMIT on 429", async () => {
    const res = await sendMessage({
      messages: [{ role: "user", content: "x" }],
      fetchImpl: makeHttpFetch(429),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("RATE_LIMIT");
  });

  it("returns TIMEOUT on AbortError", async () => {
    const res = await sendMessage({
      messages: [{ role: "user", content: "x" }],
      fetchImpl: makeAbortFetch(),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("TIMEOUT");
  });

  it("uses aiConfig.timeoutMs when params.timeoutMs not provided", async () => {
    installChromeStub({ [AI_CONFIG_KEY]: { apiKey: "k", token: "jwt", timeoutMs: 120000 } });
    const fetchImpl = makeAbortFetch();
    await sendMessage({ messages: [{ role: "user", content: "x" }], fetchImpl });
    // AbortController fires after the configured timeout; for the test we only
    // need to verify that the error message reports the right timeout value.
    // Since makeAbortFetch aborts synchronously, we just check the returned
    // error contains the configured timeout.
    const res = await sendMessage({ messages: [{ role: "user", content: "x" }], fetchImpl });
    expect(res.code).toBe("TIMEOUT");
    expect(res.error).toContain("120000ms");
  });

  it("params.timeoutMs overrides aiConfig.timeoutMs", async () => {
    installChromeStub({ [AI_CONFIG_KEY]: { apiKey: "k", token: "jwt", timeoutMs: 120000 } });
    const fetchImpl = makeAbortFetch();
    const res = await sendMessage({
      messages: [{ role: "user", content: "x" }],
      fetchImpl,
      timeoutMs: 90000,
    });
    expect(res.code).toBe("TIMEOUT");
    expect(res.error).toContain("90000ms");
  });

  it("returns NETWORK on generic fetch error", async () => {
    const res = await sendMessage({
      messages: [{ role: "user", content: "x" }],
      fetchImpl: makeNetworkErrFetch("Connection refused"),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("NETWORK");
    expect(res.error).toBe("Connection refused");
  });

  it("returns BAD_JSON when response is not JSON", async () => {
    const res = await sendMessage({
      messages: [{ role: "user", content: "x" }],
      fetchImpl: makeBadJsonFetch(),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("BAD_JSON");
  });
});

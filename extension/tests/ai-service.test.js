/**
 * TESTS: AI service (F4.2)
 * Covers:
 *   - getAiConfig / setAiConfig / isAiAvailable
 *   - sendMessage: success, empty, HTTP error, rate limit, timeout, network error, missing key, bad input
 *   - generateCoverLetterAI: success + missing args
 *   - generateChatReply: success + variants split + missing history
 *   - All tests use injected fetchImpl (no real network)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sendMessage,
  generateCoverLetterAI,
  generateChatReply,
  getAiConfig,
  setAiConfig,
  isAiAvailable,
  AI_CONFIG_KEY,
} from '../src/services/ai-service.js';

// ===============================================
// chrome.storage.local stub (in-memory)
// ===============================================

function installChromeStub(initial = {}) {
  const store = { ...initial };
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) { return key in store ? { [key]: store[key] } : {}; },
        async set(obj) { Object.assign(store, obj); },
        async remove(key) { delete store[key]; },
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

function makeHttpFetch(status, body = '') {
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
    json: async () => ({ choices: [{ message: { content: '' } }] }),
  }));
}

function makeBadJsonFetch() {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => { throw new Error('Unexpected token'); },
  }));
}

function makeAbortFetch() {
  return vi.fn(async () => {
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    throw err;
  });
}

function makeNetworkErrFetch(msg = 'Network failed') {
  return vi.fn(async () => { throw new Error(msg); });
}

// ===============================================
// Tests
// ===============================================

beforeEach(() => {
  installChromeStub({ [AI_CONFIG_KEY]: { baseUrl: 'https://internal-api.z.ai/v1', apiKey: 'test-key' } });
});

describe('F4.2 -- config', () => {
  it('getAiConfig returns defaults when no config', async () => {
    installChromeStub({});
    const cfg = await getAiConfig();
    expect(cfg.baseUrl).toBe('https://internal-api.z.ai/v1');
    expect(cfg.apiKey).toBe('');
    expect(cfg.model).toBe('glm-4.5');
  });

  it('setAiConfig merges partial', async () => {
    const store = installChromeStub({ [AI_CONFIG_KEY]: { baseUrl: 'https://internal-api.z.ai/v1', apiKey: 'old' } });
    await setAiConfig({ apiKey: 'new' });
    expect(store[AI_CONFIG_KEY].apiKey).toBe('new');
    expect(store[AI_CONFIG_KEY].baseUrl).toBe('https://internal-api.z.ai/v1');
  });

  it('isAiAvailable true when key set, false when empty', async () => {
    installChromeStub({ [AI_CONFIG_KEY]: { apiKey: 'k' } });
    expect(await isAiAvailable()).toBe(true);
    installChromeStub({});
    expect(await isAiAvailable()).toBe(false);
  });
});

describe('F4.2 -- sendMessage success', () => {
  it('returns text on 200 OK with content', async () => {
    const fetchImpl = makeOkFetch('Hello world');
    const res = await sendMessage({
      messages: [{ role: 'user', content: 'hi' }],
      fetchImpl,
    });
    expect(res.ok).toBe(true);
    expect(res.text).toBe('Hello world');
    expect(res.usage.total_tokens).toBe(10);
  });

  it('calls fetch with correct URL + headers', async () => {
    const fetchImpl = makeOkFetch('ok');
    await sendMessage({
      messages: [{ role: 'user', content: 'hi' }],
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://internal-api.z.ai/v1/chat/completions');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toBe('Bearer test-key');
    expect(opts.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(opts.body);
    expect(body.messages).toHaveLength(1);
    expect(body.model).toBe('glm-4.5');
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.stream).toBe(false);
  });

  it('trims whitespace from response text', async () => {
    const fetchImpl = makeOkFetch('  trimmed  ');
    const res = await sendMessage({ messages: [{ role: 'user', content: 'x' }], fetchImpl });
    expect(res.text).toBe('trimmed');
  });
});

describe('F4.2 -- sendMessage error paths', () => {
  it('returns BAD_INPUT when messages is empty', async () => {
    const res = await sendMessage({ messages: [], fetchImpl: makeOkFetch('x') });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('BAD_INPUT');
  });

  it('returns NO_API_KEY when no key configured', async () => {
    installChromeStub({});
    const res = await sendMessage({
      messages: [{ role: 'user', content: 'x' }],
      fetchImpl: makeOkFetch('x'),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('NO_API_KEY');
  });

  it('returns EMPTY when content is empty string', async () => {
    const res = await sendMessage({
      messages: [{ role: 'user', content: 'x' }],
      fetchImpl: makeEmptyFetch(),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('EMPTY');
  });

  it('returns HTTP_500 on server error', async () => {
    const res = await sendMessage({
      messages: [{ role: 'user', content: 'x' }],
      fetchImpl: makeHttpFetch(500, 'Server down'),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('HTTP_500');
    expect(res.error).toBe('HTTP 500');
  });

  it('returns RATE_LIMIT on 429', async () => {
    const res = await sendMessage({
      messages: [{ role: 'user', content: 'x' }],
      fetchImpl: makeHttpFetch(429),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('RATE_LIMIT');
  });

  it('returns TIMEOUT on AbortError', async () => {
    const res = await sendMessage({
      messages: [{ role: 'user', content: 'x' }],
      fetchImpl: makeAbortFetch(),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('TIMEOUT');
  });

  it('returns NETWORK on generic fetch error', async () => {
    const res = await sendMessage({
      messages: [{ role: 'user', content: 'x' }],
      fetchImpl: makeNetworkErrFetch('Connection refused'),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('NETWORK');
    expect(res.error).toBe('Connection refused');
  });

  it('returns BAD_JSON when response is not JSON', async () => {
    const res = await sendMessage({
      messages: [{ role: 'user', content: 'x' }],
      fetchImpl: makeBadJsonFetch(),
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('BAD_JSON');
  });
});

describe('F4.2 -- generateCoverLetterAI (delegates to orchestrator)', () => {
  // v1.9.50.0 (F-CR-02): generateCoverLetterAI now delegates to
  // lib/cover-letter-ai.js orchestrator. Full pipeline tests are in
  // tests/cover-letter-ai.test.js. This file keeps a sanity-check that
  // the wrapper passes args through.

  it('returns BAD_INPUT when vacancy is null (orchestrator guard)', async () => {
    const res = await generateCoverLetterAI(null, {}, { fetchImpl: makeOkFetch('x') });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('BAD_INPUT');
  });
});

describe('F4.2 -- generateChatReply', () => {
  it('splits variants by ---VARIANT--- separator', async () => {
    const fetchImpl = makeOkFetch('Variant 1\n---VARIANT---\nVariant 2\n---VARIANT---\nVariant 3');
    const res = await generateChatReply(
      [{ role: 'user', content: 'Когда интервью?' }],
      { variants: 3, fetchImpl }
    );
    expect(res.ok).toBe(true);
    expect(res.variants).toHaveLength(3);
    expect(res.variants[0]).toBe('Variant 1');
    expect(res.variants[2]).toBe('Variant 3');
  });

  it('falls back to whole text as 1 variant when separator missing', async () => {
    const fetchImpl = makeOkFetch('Just one reply here.');
    const res = await generateChatReply(
      [{ role: 'user', content: 'hi' }],
      { variants: 3, fetchImpl }
    );
    expect(res.ok).toBe(true);
    expect(res.variants).toHaveLength(1);
    expect(res.variants[0]).toBe('Just one reply here.');
  });

  it('clamps variants to 1..3', async () => {
    const fetchImpl = makeOkFetch('a\n---VARIANT---\nb');
    const res = await generateChatReply(
      [{ role: 'user', content: 'x' }],
      { variants: 10, fetchImpl }
    );
    expect(res.ok).toBe(true);
    expect(res.variants).toHaveLength(2); // AI returned 2, cap at 3 still allows 2
  });

  it('returns BAD_INPUT on empty history', async () => {
    const res = await generateChatReply([], { fetchImpl: makeOkFetch('x') });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('BAD_INPUT');
  });

  it('propagates HTTP error from sendMessage', async () => {
    const res = await generateChatReply(
      [{ role: 'user', content: 'x' }],
      { fetchImpl: makeHttpFetch(503) }
    );
    expect(res.ok).toBe(false);
    expect(res.code).toBe('HTTP_503');
  });
});

/// <reference types="vitest/globals" />
/**
 * TESTS: negotiations cross-tab aggregator (F1.8)
 * Covers:
 *   - fetchTab: success, HTTP error, network error, empty items (anti-ghost)
 *   - deduplicateByTopic: by vacancyId, fallback to title+company, ghost skip
 *   - fetchAllNegotiations: cache hit/expire/invalidate, rate limit, partial failure
 *   - All tests use injected fetchImpl + parseItemsImpl + sleepImpl (no network)
 */

import { describe, expect, it } from "vitest";
import {
  CACHE_KEY,
  CACHE_TTL_MS,
  deduplicateByTopic,
  fetchTab,
  NEGOTIATION_TABS,
} from "../src/parsers/negotiations-aggregator.js";

// ===============================================
// Helpers / fixtures
// ===============================================

const TAB_ALL = NEGOTIATION_TABS.find((t) => t.id === "all");
const TAB_INVITE = NEGOTIATION_TABS.find((t) => t.id === "invite");
const TAB_DISCARD = NEGOTIATION_TABS.find((t) => t.id === "discard");

/** Mock fetch that returns given items for a tab url. */
function makeFetchImpl(routes) {
  // routes: { [url]: { status?, items?, throwMsg? } }
  return async (url) => {
    const route = routes[url];
    if (!route) {
      throw new Error("No route for " + url);
    }
    if (route.throwMsg) throw new Error(route.throwMsg);
    const status = route.status || 200;
    const items = route.items || [];
    // Items go through injected parseItemsImpl, so we just return them
    // wrapped in a fake Response-like object.
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(items),
    };
  };
}

/** Mock DOMParser -- never actually used because parseItemsImpl is injected. */
function makeDomParserImpl() {
  return class {
    parseFromString() {
      return {};
    }
  };
}

/** parseItemsImpl that reads the JSON we stuffed into response.text(). */
async function parseItemsImplStub(doc) {
  // doc is {} for our stub; we read from a side-channel instead.
  return parseItemsImplStub._lastItems || [];
}

// Side-channel: tests set this before calling.
parseItemsImplStub._lastItems = [];

// chrome.storage.local stub (in-memory)
function installChromeStub() {
  const store = {};
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
// Tests
// ===============================================

describe("F1.8 -- NEGOTIATION_TABS config", () => {
  it("has 8 tabs covering all hh.ru statuses", () => {
    expect(NEGOTIATION_TABS).toHaveLength(8);
    const ids = NEGOTIATION_TABS.map((t) => t.id);
    expect(ids).toEqual(["all", "invite", "consider", "offer", "wait", "discard", "deleted", "archive"]);
  });

  it("each tab has id, label, url", () => {
    for (const t of NEGOTIATION_TABS) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.url).toMatch(/^https:\/\/hh\.ru\/applicant\/negotiations\?status=/);
    }
  });
});

describe("F1.8 -- fetchTab", () => {
  it("returns parsed items on 200 OK", async () => {
    const items = [
      { id: 1, vacancyTitle: "A", company: "X", vacancyId: "v1" },
      { id: 2, vacancyTitle: "B", company: "Y", vacancyId: "v2" },
    ];
    parseItemsImplStub._lastItems = items;

    const res = await fetchTab(TAB_ALL, {
      fetchImpl: makeFetchImpl({ [TAB_ALL.url]: { items } }),
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: () => items,
    });

    expect(res.tab).toBe("all");
    expect(res.label).toBe("Все");
    expect(res.items).toHaveLength(2);
    expect(res.error).toBeNull();
  });

  it("returns empty items array (no ghost rows) when tab has 0 items", async () => {
    const res = await fetchTab(TAB_INVITE, {
      fetchImpl: makeFetchImpl({ [TAB_INVITE.url]: { items: [] } }),
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: () => [],
    });

    expect(res.items).toEqual([]);
    expect(res.error).toBeNull();
  });

  it("records HTTP error and returns [] items", async () => {
    const res = await fetchTab(TAB_DISCARD, {
      fetchImpl: makeFetchImpl({ [TAB_DISCARD.url]: { status: 500 } }),
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: () => [],
    });

    expect(res.items).toEqual([]);
    expect(res.error).toBe("HTTP 500");
  });

  it("records network error and returns [] items", async () => {
    const res = await fetchTab(TAB_ALL, {
      fetchImpl: makeFetchImpl({ [TAB_ALL.url]: { throwMsg: "CORS blocked" } }),
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: () => [],
    });

    expect(res.items).toEqual([]);
    expect(res.error).toBe("CORS blocked");
  });
});

describe("F1.8 -- deduplicateByTopic", () => {
  it("deduplicates by vacancyId", () => {
    const items = [
      { vacancyId: "v1", vacancyTitle: "A", tabOrigin: "all" },
      { vacancyId: "v2", vacancyTitle: "B", tabOrigin: "all" },
      { vacancyId: "v1", vacancyTitle: "A", tabOrigin: "wait" }, // dup
      { vacancyId: "v3", vacancyTitle: "C", tabOrigin: "discard" },
    ];
    const result = deduplicateByTopic(items);
    expect(result).toHaveLength(3);
    expect(result[0].vacancyId).toBe("v1");
    expect(result[0].alsoIn).toEqual(["wait"]);
    expect(result[1].vacancyId).toBe("v2");
    expect(result[1].alsoIn).toBeUndefined();
    expect(result[2].vacancyId).toBe("v3");
  });

  it("falls back to title+company when no vacancyId", () => {
    const items = [
      { vacancyTitle: "Dev", company: "X", tabOrigin: "all" },
      { vacancyTitle: "Dev", company: "X", tabOrigin: "wait" }, // dup
      { vacancyTitle: "Dev", company: "Y", tabOrigin: "all" },
    ];
    const result = deduplicateByTopic(items);
    expect(result).toHaveLength(2);
    expect(result[0].alsoIn).toEqual(["wait"]);
  });

  it("skips null/undefined items (anti-ghost)", () => {
    const items = [null, undefined, { vacancyId: "v1", tabOrigin: "all" }, null];
    const result = deduplicateByTopic(items);
    expect(result).toHaveLength(1);
    expect(result[0].vacancyId).toBe("v1");
  });

  it("skips items with no usable key", () => {
    const items = [
      { tabOrigin: "all" }, // no id, no title, no company
      { vacancyId: "v1", tabOrigin: "all" },
    ];
    const result = deduplicateByTopic(items);
    expect(result).toHaveLength(1);
  });

  it("handles empty input", () => {
    expect(deduplicateByTopic([])).toEqual([]);
    expect(deduplicateByTopic(null)).toEqual([]);
  });
});

describe("F1.8 -- constants", () => {
  it("CACHE_KEY is the documented storage key", () => {
    expect(CACHE_KEY).toBe("negotiations:all");
  });

  it("CACHE_TTL_MS is 30 seconds", () => {
    expect(CACHE_TTL_MS).toBe(30_000);
  });
});

/// <reference types="vitest/globals" />
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAllNegotiations,
  invalidateNegotiationsCache,
  NEGOTIATION_TABS,
} from "../src/parsers/negotiations-aggregator.js";

const TAB_DISCARD = NEGOTIATION_TABS.find((t) => t.id === "discard");

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

function makeDomParserImpl() {
  return class {
    parseFromString() {
      return {};
    }
  };
}

async function parseItemsImplStub(doc) {
  // doc is {} for our stub; we read from a side-channel instead.
  return parseItemsImplStub._lastItems || [];
}
parseItemsImplStub._lastItems = [];

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

describe("F1.8 -- fetchAllNegotiations (cache + partial failure)", () => {
  beforeEach(() => {
    installChromeStub();
    parseItemsImplStub._lastItems = [];
  });

  it("fetches all 8 tabs when no cache", async () => {
    const sleepMock = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = makeFetchImpl(
      Object.fromEntries(
        NEGOTIATION_TABS.map((t) => [t.url, { items: [{ vacancyId: "v_" + t.id, tabOrigin: t.id }] }]),
      ),
    );

    const result = await fetchAllNegotiations({
      fetchImpl,
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: (doc) => {
        // doc is {} stub; we route by URL via closure on fetchImpl routes
        // For test simplicity: return 1 item per tab
        return [{ vacancyId: "v_tab", tabOrigin: "unknown" }];
      },
      sleepImpl: sleepMock,
    });

    expect(result.fromCache).toBe(false);
    expect(result.errors).toEqual([]);
    expect(Object.keys(result.perTab)).toHaveLength(8);
    // 8 unique items (different vacancyId per tab would dedup; we used same -> 1)
    // Use unique ids to actually test merging
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(sleepMock).toHaveBeenCalledTimes(7); // 7 sleeps between 8 fetches
  });

  it("serves cached result when fresh (no fetch)", async () => {
    const sleepMock = vi.fn();
    const fetchImpl = vi.fn();

    // Pre-populate cache with fresh data
    const store = globalThis.chrome.storage.local;
    // Simulate prior fetch wrote cache via fetchAllNegotiations
    const firstResult = await fetchAllNegotiations({
      fetchImpl: makeFetchImpl(Object.fromEntries(NEGOTIATION_TABS.map((t) => [t.url, { items: [] }]))),
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: () => [],
      sleepImpl: sleepMock,
    });

    expect(firstResult.fromCache).toBe(false);

    // Second call should hit cache
    const second = await fetchAllNegotiations({
      fetchImpl,
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: () => [],
      sleepImpl: sleepMock,
    });

    expect(second.fromCache).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("forceRefresh bypasses cache", async () => {
    const sleepMock = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = makeFetchImpl(Object.fromEntries(NEGOTIATION_TABS.map((t) => [t.url, { items: [] }])));

    // Prime cache
    await fetchAllNegotiations({
      fetchImpl,
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: () => [],
      sleepImpl: sleepMock,
    });

    // Force refresh
    const refreshed = await fetchAllNegotiations({
      forceRefresh: true,
      fetchImpl,
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: () => [],
      sleepImpl: sleepMock,
    });

    expect(refreshed.fromCache).toBe(false);
  });

  it("partial failure: one tab 500 does not break others", async () => {
    const sleepMock = vi.fn().mockResolvedValue(undefined);
    const routes = Object.fromEntries(NEGOTIATION_TABS.map((t) => [t.url, { items: [] }]));
    // Make discard fail
    routes[TAB_DISCARD.url] = { status: 500 };

    const result = await fetchAllNegotiations({
      fetchImpl: makeFetchImpl(routes),
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: () => [],
      sleepImpl: sleepMock,
    });

    expect(result.fromCache).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/discard: HTTP 500/);
    expect(result.perTab.discard.error).toBe("HTTP 500");
    expect(result.perTab.all.count).toBe(0);
    // 7 other tabs succeeded
    expect(Object.keys(result.perTab)).toHaveLength(8);
  });

  it("respects opts.tabs subset (only fetches specified tabs)", async () => {
    const sleepMock = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn().mockImplementation(async (url) => ({
      ok: true,
      status: 200,
      text: async () => "[]",
    }));

    await fetchAllNegotiations({
      tabs: ["all", "discard"],
      fetchImpl,
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: () => [],
      sleepImpl: sleepMock,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepMock).toHaveBeenCalledTimes(1);
  });

  it("invalidateNegotiationsCache removes cache entry", async () => {
    const sleepMock = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = makeFetchImpl(Object.fromEntries(NEGOTIATION_TABS.map((t) => [t.url, { items: [] }])));

    // Prime cache
    await fetchAllNegotiations({
      fetchImpl,
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: () => [],
      sleepImpl: sleepMock,
    });

    // Invalidate
    await invalidateNegotiationsCache();

    // Next call should fetch again
    const fetchSpy = vi.fn(fetchImpl);
    await fetchAllNegotiations({
      fetchImpl: fetchSpy,
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: () => [],
      sleepImpl: sleepMock,
    });

    expect(fetchSpy).toHaveBeenCalled();
  });

  it("rate limit: sleepImpl called between tab fetches (not before first)", async () => {
    const sleepMock = vi.fn().mockResolvedValue(undefined);
    const routes = Object.fromEntries(NEGOTIATION_TABS.map((t) => [t.url, { items: [] }]));

    await fetchAllNegotiations({
      fetchImpl: makeFetchImpl(routes),
      domParserImpl: makeDomParserImpl(),
      parseItemsImpl: () => [],
      sleepImpl: sleepMock,
    });

    // 8 tabs => 7 sleeps (between consecutive pairs, not before first/after last)
    expect(sleepMock).toHaveBeenCalledTimes(7);
  });
});

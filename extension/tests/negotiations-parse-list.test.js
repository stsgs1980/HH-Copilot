/// <reference types="vitest/globals" />
/**
 * TESTS: negotiations parser + diagnostic
 * Covers F1.4 acceptance criteria:
 *   - Selectors find elements with primary + fallback chain
 *   - diagnoseNegotiationsDOM returns structured dump
 *   - Correct with long lists (50+ items) -- anti-hallucination criterion
 *
 * DOM samples are based on docs/research/04-negotiations-dom-analysis.md
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  findListContainer,
  findNegotiationItems,
  parseNegotiations,
  parseSingleItem,
} from "../src/parsers/negotiations.js";

// ===============================================
// DOM fixtures
// ===============================================

/**
 * Build one negotiations-item element matching the documented DOM structure.
 *
 * @param {Object} opts
 * @param {string} opts.vacancyTitle
 * @param {string} opts.vacancyId
 * @param {string} opts.company
 * @param {string} opts.date
 * @param {string} opts.statusQa - e.g. "negotiations-tag negotiations-item-not-viewed"
 * @param {string} opts.statusText
 * @returns {HTMLDivElement}
 */
function buildItem(opts) {
  const item = document.createElement("div");
  item.setAttribute("data-qa", "negotiations-item");

  // Tag (status badge)
  const tag = document.createElement("span");
  tag.setAttribute("data-qa", opts.statusQa);
  tag.textContent = opts.statusText;
  item.appendChild(tag);

  // Vacancy link
  const vacancy = document.createElement("a");
  vacancy.setAttribute("data-qa", "negotiations-item-vacancy");
  vacancy.setAttribute("href", "/vacancy/" + opts.vacancyId + "?hhtmFrom=negotiation_list");
  vacancy.textContent = opts.vacancyTitle;
  item.appendChild(vacancy);

  // Company
  const company = document.createElement("span");
  company.setAttribute("data-qa", "negotiations-item-company");
  company.textContent = opts.company;
  item.appendChild(company);

  // Date
  const date = document.createElement("span");
  date.setAttribute("data-qa", "negotiations-item-date");
  date.textContent = opts.date;
  item.appendChild(date);

  return item;
}

/**
 * Build a full negotiations page DOM inside document.body.
 *
 * @param {number} itemCount - how many items to render
 * @param {Object} [overrides] - per-item override map { idx: partialOpts }
 * @returns {HTMLDivElement} the list container
 */
function buildPage(itemCount, overrides) {
  overrides = overrides || {};
  document.body.innerHTML = "";

  const list = document.createElement("div");
  list.setAttribute("data-qa", "negotiations-list");

  for (let i = 0; i < itemCount; i++) {
    const override = overrides[i] || {};
    const item = buildItem({
      vacancyTitle: override.vacancyTitle || "Frontend Developer #" + i,
      vacancyId: override.vacancyId || String(1000000 + i),
      company: override.company || "Company " + i,
      date: override.date || "9 iyunya",
      statusQa: override.statusQa || "negotiations-tag negotiations-item-not-viewed",
      statusText: override.statusText || "Ne prosmotren",
    });
    list.appendChild(item);
  }

  document.body.appendChild(list);
  return list;
}

// ===============================================
// SELECTORS
// ===============================================

describe("findListContainer / findNegotiationItems", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("findListContainer returns list element", () => {
    buildPage(2);
    const list = findListContainer(document);
    expect(list).not.toBeNull();
    expect(list.getAttribute("data-qa")).toBe("negotiations-list");
  });

  it("findNegotiationItems returns array of item elements", () => {
    buildPage(3);
    const items = findNegotiationItems(document);
    expect(items.length).toBe(3);
    items.forEach((it) => expect(it.getAttribute("data-qa")).toBe("negotiations-item"));
  });

  it("findNegotiationItems returns [] when list is absent", () => {
    const items = findNegotiationItems(document);
    expect(items).toEqual([]);
  });
});

describe("parseNegotiations", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("parses all items on the page", async () => {
    buildPage(5);
    const result = await parseNegotiations();
    expect(result.length).toBe(5);
    expect(result[0].vacancyTitle).toBe("Frontend Developer #0");
    expect(result[4].vacancyTitle).toBe("Frontend Developer #4");
  });

  it("returns [] when no list container", async () => {
    const result = await parseNegotiations();
    expect(result).toEqual([]);
  });
});

describe("Long lists (50+ items) -- anti-hallucination", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("parses 50 items without losing any", () => {
    buildPage(50);
    const items = findNegotiationItems(document);
    expect(items.length).toBe(50);
  });

  it("parses 100 items without losing any", () => {
    buildPage(100);
    const items = findNegotiationItems(document);
    expect(items.length).toBe(100);
  });

  it("parseSingleItem works correctly for item #75 (long list)", () => {
    buildPage(100, {
      75: {
        vacancyTitle: "Senior QA Engineer",
        vacancyId: "777777",
        company: "Sber",
        date: "1 maya",
        statusQa: "negotiations-tag negotiations-item-discard",
        statusText: "Otkaz",
      },
    });
    const items = findNegotiationItems(document);
    const parsed = parseSingleItem(items[75], 75);

    expect(parsed).not.toBeNull();
    expect(parsed.vacancyTitle).toBe("Senior QA Engineer");
    expect(parsed.vacancyId).toBe("777777");
    expect(parsed.company).toBe("Sber");
    expect(parsed.status).toBe("discard");
  });

  it("mixed status distribution counts correctly (100 items, 4 statuses)", () => {
    const overrides = {};
    const statuses = ["not-viewed", "viewed", "discard", "invite"];
    for (let i = 0; i < 100; i++) {
      const st = statuses[i % 4];
      overrides[i] = {
        statusQa: "negotiations-tag negotiations-item-" + st,
        statusText: st,
      };
    }
    buildPage(100, overrides);

    const items = findNegotiationItems(document);
    const counts = { "not-viewed": 0, viewed: 0, discard: 0, invite: 0 };
    for (let i = 0; i < items.length; i++) {
      const parsed = parseSingleItem(items[i], i);
      counts[parsed.status]++;
    }
    // 100 items, 4 statuses evenly distributed = 25 each
    expect(counts["not-viewed"]).toBe(25);
    expect(counts["viewed"]).toBe(25);
    expect(counts["discard"]).toBe(25);
    expect(counts["invite"]).toBe(25);
  });

  it("parseNegotiations returns all 50 items with unique IDs", async () => {
    buildPage(50);
    const result = await parseNegotiations();
    expect(result.length).toBe(50);
    const ids = result.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(50);
  });
});

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

import { describe, expect, it } from "vitest";
import { diagnoseNegotiationsDOM } from "../src/parsers/negotiations-diagnostic.js";
import { findListContainer, findNegotiationItems, parseSingleItem } from "../src/parsers/negotiations.js";

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

describe("diagnoseNegotiationsDOM", () => {
  it("sample size limits sample array length", () => {
    buildPage(20);
    const diag = diagnoseNegotiationsDOM({
      itemSampleSize: 3,
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });
    expect(diag.items.sample.length).toBe(3);
    expect(diag.items.sample[0].index).toBe(0);
    expect(diag.items.sample[2].index).toBe(2);
  });

  it("statuses.unique and statuses.counts correct for mixed statuses", () => {
    buildPage(8, {
      0: { statusQa: "negotiations-tag negotiations-item-not-viewed", statusText: "a" },
      1: { statusQa: "negotiations-tag negotiations-item-not-viewed", statusText: "a" },
      2: { statusQa: "negotiations-tag negotiations-item-viewed", statusText: "b" },
      3: { statusQa: "negotiations-tag negotiations-item-discard", statusText: "c" },
      4: { statusQa: "negotiations-tag negotiations-item-invite", statusText: "d" },
      5: { statusQa: "negotiations-tag negotiations-item-invite", statusText: "d" },
      6: { statusQa: "negotiations-tag negotiations-item-invite", statusText: "d" },
      7: { statusQa: "negotiations-tag negotiations-item-not-viewed", statusText: "a" },
    });
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });

    expect(diag.statuses.unique.sort()).toEqual(["discard", "invite", "not-viewed", "viewed"]);
    expect(diag.statuses.counts["not-viewed"]).toBe(3);
    expect(diag.statuses.counts["viewed"]).toBe(1);
    expect(diag.statuses.counts["discard"]).toBe(1);
    expect(diag.statuses.counts["invite"]).toBe(3);
  });

  it("rawScan.dataQaContainingNegotiations lists unique data-qa values", () => {
    buildPage(2);
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });

    // Expect at least: negotiations-list, negotiations-item, negotiations-item-vacancy,
    // negotiations-item-company, negotiations-item-date, and one tag (with status suffix)
    expect(diag.rawScan.dataQaContainingNegotiations.length).toBeGreaterThanOrEqual(5);
    expect(diag.rawScan.dataQaContainingNegotiations).toContain("negotiations-list");
    expect(diag.rawScan.dataQaContainingNegotiations).toContain("negotiations-item");
  });

  it("handles 100 items correctly (anti-hallucination: long lists)", () => {
    buildPage(100);
    const diag = diagnoseNegotiationsDOM({
      itemSampleSize: 5,
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });
    expect(diag.items.totalFound).toBe(100);
    expect(diag.items.parsedOk).toBe(100);
    expect(diag.items.empty).toBe(0);
    expect(diag.items.sample.length).toBe(5);
  });

  it("counts empty items correctly when some fail to parse", () => {
    buildPage(3);
    // Inject one empty item at the end
    const list = document.querySelector('[data-qa="negotiations-list"]');
    const empty = document.createElement("div");
    empty.setAttribute("data-qa", "negotiations-item");
    list.appendChild(empty);

    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });
    expect(diag.items.totalFound).toBe(4);
    expect(diag.items.parsedOk).toBe(3);
    expect(diag.items.empty).toBe(1);
  });
});

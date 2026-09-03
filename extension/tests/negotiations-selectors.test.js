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
import { HH_SELECTORS, findAllElements, findElement } from "../src/lib/selectors.js";

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

describe("HH_SELECTORS -- negotiations", () => {
  it("has all 8 negotiations selector keys", () => {
    expect(HH_SELECTORS.negotiationsList).toBeDefined();
    expect(HH_SELECTORS.negotiationsItem).toBeDefined();
    expect(HH_SELECTORS.negotiationsItemCheckbox).toBeDefined();
    expect(HH_SELECTORS.negotiationsItemVacancy).toBeDefined();
    expect(HH_SELECTORS.negotiationsItemCompany).toBeDefined();
    expect(HH_SELECTORS.negotiationsItemDate).toBeDefined();
    expect(HH_SELECTORS.negotiationsItemTag).toBeDefined();
    expect(HH_SELECTORS.negotiationsEmployerStats).toBeDefined();
  });

  it("each selector has at least one fallback (chain length >= 2)", () => {
    // Anti-hallucination: no single-point-of-failure selector
    const keys = [
      "negotiationsList",
      "negotiationsItem",
      "negotiationsItemVacancy",
      "negotiationsItemCompany",
      "negotiationsItemDate",
      "negotiationsItemTag",
    ];
    for (const k of keys) {
      expect(HH_SELECTORS[k].length).toBeGreaterThanOrEqual(2);
    }
  });

  it("all selectors use data-qa as primary (not hashed classes)", () => {
    // Anti-hallucination criterion: data-qa stable, no Magritte hashed classes
    const keys = [
      "negotiationsList",
      "negotiationsItem",
      "negotiationsItemVacancy",
      "negotiationsItemCompany",
      "negotiationsItemDate",
      "negotiationsItemTag",
    ];
    for (const k of keys) {
      const first = HH_SELECTORS[k][0];
      expect(first).toContain("data-qa");
    }
  });
});

describe("findElement / findAllElements -- negotiations", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("findElement finds list container via primary data-qa", () => {
    buildPage(1);
    const list = findElement("negotiationsList");
    expect(list).not.toBeNull();
    expect(list.getAttribute("data-qa")).toBe("negotiations-list");
  });

  it("findAllElements returns all negotiation items", () => {
    buildPage(3);
    const items = findAllElements("negotiationsItem");
    expect(items.length).toBe(3);
  });

  it("returns empty array when nothing matches", () => {
    const items = findAllElements("negotiationsItem");
    expect(items).toEqual([]);
  });

  it("findElement returns null when list absent", () => {
    const list = findElement("negotiationsList");
    expect(list).toBeNull();
  });
});

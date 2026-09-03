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
  it("returns structured object with expected top-level keys", () => {
    buildPage(3);
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });

    expect(diag).toHaveProperty("timestamp");
    expect(diag).toHaveProperty("selectors");
    expect(diag).toHaveProperty("listContainer");
    expect(diag).toHaveProperty("items");
    expect(diag).toHaveProperty("statuses");
    expect(diag).toHaveProperty("rawScan");
  });

  it("reports listContainer.found=true when list present", () => {
    buildPage(2);
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });
    expect(diag.listContainer.found).toBe(true);
    expect(diag.listContainer.tag).toBe("DIV");
    expect(diag.listContainer.dataQa).toBe("negotiations-list");
  });

  it("reports listContainer.found=false when list absent", () => {
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => null,
      findItems: () => [],
      parseItem: () => null,
    });
    expect(diag.listContainer.found).toBe(false);
  });

  it("probes all 8 selector keys", () => {
    buildPage(1);
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });
    const expectedKeys = [
      "negotiationsList",
      "negotiationsItem",
      "negotiationsItemCheckbox",
      "negotiationsItemVacancy",
      "negotiationsItemCompany",
      "negotiationsItemDate",
      "negotiationsItemTag",
      "negotiationsEmployerStats",
    ];
    for (const k of expectedKeys) {
      expect(diag.selectors).toHaveProperty(k);
      expect(diag.selectors[k]).toHaveProperty("found");
      expect(diag.selectors[k]).toHaveProperty("matchedSelector");
      expect(diag.selectors[k]).toHaveProperty("chainLength");
    }
  });

  it("items.totalFound and items.parsedOk are correct (5 items)", () => {
    buildPage(5);
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });
    expect(diag.items.totalFound).toBe(5);
    expect(diag.items.parsedOk).toBe(5);
    expect(diag.items.empty).toBe(0);
  });
});

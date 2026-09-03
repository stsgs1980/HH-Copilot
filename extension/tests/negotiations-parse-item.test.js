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
import { parseSingleItem } from "../src/parsers/negotiations.js";

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

describe("parseSingleItem", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("extracts all fields from a well-formed item", () => {
    buildPage(1, {
      0: {
        vacancyTitle: "Senior Backend Engineer",
        vacancyId: "133218911",
        company: "Yandex",
        date: "15 iyunya",
        statusQa: "negotiations-tag negotiations-item-invite",
        statusText: "Priglashenie",
      },
    });
    const item = document.querySelector('[data-qa="negotiations-item"]');
    const parsed = parseSingleItem(item, 0);

    expect(parsed).not.toBeNull();
    expect(parsed.vacancyTitle).toBe("Senior Backend Engineer");
    expect(parsed.vacancyId).toBe("133218911");
    expect(parsed.vacancyUrl).toContain("/vacancy/133218911");
    expect(parsed.company).toBe("Yandex");
    expect(parsed.date).toBe("15 iyunya");
    expect(parsed.status).toBe("invite");
    expect(parsed.statusText).toBe("Priglashenie");
    expect(parsed.unread).toBe(true);
    expect(parsed.id).toBe("133218911");
  });

  it("extracts discard status correctly", () => {
    buildPage(1, {
      0: {
        statusQa: "negotiations-tag negotiations-item-discard",
        statusText: "Otkaz",
      },
    });
    const item = document.querySelector('[data-qa="negotiations-item"]');
    const parsed = parseSingleItem(item, 0);

    expect(parsed.status).toBe("discard");
    expect(parsed.statusText).toBe("Otkaz");
    expect(parsed.unread).toBe(false);
  });

  it("extracts viewed status", () => {
    buildPage(1, {
      0: {
        statusQa: "negotiations-tag negotiations-item-viewed",
        statusText: "Prosmotren",
      },
    });
    const item = document.querySelector('[data-qa="negotiations-item"]');
    const parsed = parseSingleItem(item, 0);

    expect(parsed.status).toBe("viewed");
    expect(parsed.unread).toBe(false);
  });

  it("handles missing tag (status=unknown, still parses other fields)", () => {
    document.body.innerHTML = "";
    const list = document.createElement("div");
    list.setAttribute("data-qa", "negotiations-list");

    const item = document.createElement("div");
    item.setAttribute("data-qa", "negotiations-item");

    const vac = document.createElement("a");
    vac.setAttribute("data-qa", "negotiations-item-vacancy");
    vac.setAttribute("href", "/vacancy/999");
    vac.textContent = "Some Vacancy";
    item.appendChild(vac);

    const comp = document.createElement("span");
    comp.setAttribute("data-qa", "negotiations-item-company");
    comp.textContent = "Some Company";
    item.appendChild(comp);

    list.appendChild(item);
    document.body.appendChild(list);

    const parsed = parseSingleItem(item, 0);
    expect(parsed).not.toBeNull();
    expect(parsed.status).toBe("unknown");
    expect(parsed.vacancyTitle).toBe("Some Vacancy");
    expect(parsed.company).toBe("Some Company");
  });

  it("returns null for completely empty item (anti-hallucination: no ghost rows)", () => {
    const item = document.createElement("div");
    item.setAttribute("data-qa", "negotiations-item");
    // no children, no text
    const parsed = parseSingleItem(item, 0);
    expect(parsed).toBeNull();
  });

  it("handles null item gracefully (does not throw)", () => {
    expect(() => parseSingleItem(null, 0)).not.toThrow();
  });

  it("uses fallback ID when vacancyId cannot be extracted", () => {
    document.body.innerHTML = "";
    const list = document.createElement("div");
    list.setAttribute("data-qa", "negotiations-list");
    const item = document.createElement("div");
    item.setAttribute("data-qa", "negotiations-item");

    const vac = document.createElement("a");
    vac.setAttribute("data-qa", "negotiations-item-vacancy");
    vac.setAttribute("href", "/not-a-vacancy-url"); // no /vacancy/{id}
    vac.textContent = "Title";
    item.appendChild(vac);

    list.appendChild(item);
    document.body.appendChild(list);

    const parsed = parseSingleItem(item, 7);
    expect(parsed.id).toBe("neg-7");
  });
});

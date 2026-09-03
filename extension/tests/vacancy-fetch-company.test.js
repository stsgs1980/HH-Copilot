/// <reference types="vitest/globals" />
/**
 * Tests for vacancy-fetch modules:
 *   - vacancy-fetch-text.js (parseVacancyDetailFromDoc, fetchVacancyViaText)
 *   - vacancy-fetch-iframe.js (fetchVacancyViaIframe)
 *   - vacancy-fetch-enrichment.js (enrichVacancy, enrichVacanciesFromCache, isDetailFresh)
 *   - vacancy-fetch.js (enrichFromCache, fetchVacancyDetails, abortVacancyFetch)
 *
 * v1.9.29.0
 */

import { beforeEach, describe, expect, it } from "vitest";

// ===============================================
// vacancy-fetch-text: parseVacancyDetailFromDoc
// ===============================================

describe("vacancy-fetch-text: extractCleanCompanyName", () => {
  let extractCleanCompanyName;

  beforeEach(async () => {
    const mod = await import("../src/lib/vacancy-fetch-text.js");
    extractCleanCompanyName = mod.extractCleanCompanyName;
  });

  it("returns plain text when no noise present", () => {
    const el = document.createElement("span");
    el.innerHTML = "ООО САНЛАЙФ";
    expect(extractCleanCompanyName(el)).toBe("ООО САНЛАЙФ");
  });

  it('cuts off "N отзывов" review-count fragment that leaked into text', () => {
    const el = document.createElement("span");
    el.innerHTML = "ООО САНЛАЙФ4,935 отзывов";
    expect(extractCleanCompanyName(el)).toBe("ООО САНЛАЙФ");
  });

  it('cuts off "N отзыва" (singular) variant', () => {
    const el = document.createElement("span");
    el.innerHTML = "Сбер 1234 отзыва";
    expect(extractCleanCompanyName(el)).toBe("Сбер");
  });

  it("removes nested <script> with window.globalServiceVars", () => {
    const el = document.createElement("span");
    el.innerHTML = "ООО САНЛАЙФ<script>window.globalServiceVars = {};</script>";
    expect(extractCleanCompanyName(el)).toBe("ООО САНЛАЙФ");
  });

  it("removes nested <svg> star-rating icons", () => {
    const el = document.createElement("span");
    el.innerHTML = 'Ромашка<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>';
    expect(extractCleanCompanyName(el)).toBe("Ромашка");
  });

  it('removes nested [data-qa*="reviews"] elements', () => {
    const el = document.createElement("span");
    el.innerHTML = 'Тинькофф<span data-qa="employer-reviews-count">4,935 отзывов</span>';
    expect(extractCleanCompanyName(el)).toBe("Тинькофф");
  });

  it('removes nested [data-qa*="rating"] elements', () => {
    const el = document.createElement("span");
    el.innerHTML = 'Альфа-Банк<span data-qa="employer-rating">4.5</span>';
    expect(extractCleanCompanyName(el)).toBe("Альфа-Банк");
  });

  it("handles full hh.ru-style noise: script + reviews + rating", () => {
    // This mirrors the real hh.ru DOM shape that caused the bug
    const el = document.createElement("span");
    el.setAttribute("data-qa", "vacancy-company-name");
    el.innerHTML =
      'ООО САНЛАЙФ<script>window.globalServiceVars = window.globalServiceVars || {};</script><span data-qa="employer-reviews-front">4,935 отзывов</span>';
    expect(extractCleanCompanyName(el)).toBe("ООО САНЛАЙФ");
  });

  it("trims trailing separators (em dash, pipe, dot)", () => {
    const el = document.createElement("span");
    el.innerHTML = "Газпром --";
    expect(extractCleanCompanyName(el)).toBe("Газпром");
  });

  it("returns empty string when el is null", () => {
    expect(extractCleanCompanyName(null)).toBe("");
  });

  it("returns textContent on unexpected error (graceful fallback)", () => {
    const el = document.createElement("span");
    el.innerHTML = "Просто название";
    // Simulate cloneNode throwing by stubbing it
    const origClone = el.cloneNode;
    el.cloneNode = () => {
      throw new Error("clone failed");
    };
    expect(extractCleanCompanyName(el)).toBe("Просто название");
    el.cloneNode = origClone;
  });
});

describe("vacancy-fetch-text: parseVacancyDetailFromDoc company extraction", () => {
  let parseVacancyDetailFromDoc;

  beforeEach(async () => {
    const mod = await import("../src/lib/vacancy-fetch-text.js");
    parseVacancyDetailFromDoc = mod.parseVacancyDetailFromDoc;
  });

  it("extracts clean company name from hh.ru-style noisy HTML", () => {
    const html = `<!DOCTYPE html><html><head></head><body>
      <h1 data-qa="vacancy-title">Руководитель отдела продаж (вторичный рынок)</h1>
      <a data-qa="vacancy-company-name" href="/employer/12345">
        <span data-qa="vacancy-company-name-text">ООО САНЛАЙФ</span>
        <span data-qa="employer-reviews-front">4,935 отзывов</span>
        <script>window.globalServiceVars = window.globalServiceVars || {};</script>
      </a>
      <div data-qa="vacancy-salary">от 100 000 руб.</div>
      <div data-qa="vacancy-description">Описание</div>
    </body></html>`;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const v = parseVacancyDetailFromDoc(doc, "https://hh.ru/vacancy/12345");
    expect(v).not.toBeNull();
    // Company should be clean (no review count, no script)
    expect(v.company).toBe("ООО САНЛАЙФ");
    expect(v.company).not.toContain("отзыв");
    expect(v.company).not.toContain("window");
    expect(v.company).not.toContain("globalServiceVars");
  });

  it("parses title correctly even with parentheses", () => {
    const html = `<!DOCTYPE html><html><head></head><body>
      <h1 data-qa="vacancy-title">Руководитель отдела продаж (вторичный рынок)</h1>
      <span data-qa="vacancy-company-name">ООО САНЛАЙФ</span>
    </body></html>`;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const v = parseVacancyDetailFromDoc(doc, "https://hh.ru/vacancy/12345");
    expect(v.title).toBe("Руководитель отдела продаж (вторичный рынок)");
  });
});

function createVacancyDoc({
  title = "Test Vacancy",
  company = "Test Company",
  salary = "",
  experience = "",
  description = "",
  skills = [],
  isRemote = false,
}) {
  let skillsHtml = "";
  if (skills.length > 0) {
    skillsHtml =
      '<div data-qa="vacancy-key-skills">' +
      skills
        .map((s) => '<span data-qa="skills-element"><span class="bloko-tag__text">' + s + "</span></span>")
        .join("") +
      "</div>";
  }

  const remoteHtml = isRemote ? '<span data-qa="vacancy-label-work-schedule-remote">Удаленная работа</span>' : "";

  const html = `<!DOCTYPE html>
<html><head></head><body>
  <h1 data-qa="vacancy-title">${title}</h1>
  <span data-qa="vacancy-company-name">${company}</span>
  ${salary ? '<div data-qa="vacancy-salary">' + salary + "</div>" : ""}
  ${experience ? '<div data-qa="vacancy-experience">' + experience + "</div>" : ""}
  <div data-qa="vacancy-description">${description}</div>
  ${skillsHtml}
  ${remoteHtml}
  <button data-qa="vacancy-response-link-top">Откликнуться</button>
</body></html>`;

  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
}

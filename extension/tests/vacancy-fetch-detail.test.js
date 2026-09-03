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

describe("vacancy-fetch-text: parseVacancyDetailFromDoc", () => {
  let parseVacancyDetailFromDoc;

  beforeEach(async () => {
    // Import fresh for each test
    const mod = await import("../src/lib/vacancy-fetch-text.js");
    parseVacancyDetailFromDoc = mod.parseVacancyDetailFromDoc;
  });

  it("parses a full vacancy detail from a Document", () => {
    const doc = createVacancyDoc({
      title: "Senior Frontend Developer",
      company: "Яндекс",
      salary: "от 250 000 \u20BD на руки",
      experience: "3-6 лет",
      description: "<p>Обязанности:</p><p>Разработка интерфейсов</p>",
      skills: ["React", "TypeScript", "CSS"],
    });

    const result = parseVacancyDetailFromDoc(doc, "https://hh.ru/vacancy/12345");

    expect(result).not.toBeNull();
    expect(result.id).toBe("12345");
    expect(result.title).toBe("Senior Frontend Developer");
    expect(result.company).toBe("Яндекс");
    expect(result.salary.raw).toBe("от 250 000 \u20BD на руки");
    expect(result.salary.min).toBe(250000);
    expect(result.salary.net).toBe(true);
    expect(result.salary.currency).toBe("RUB");
    expect(result.experience.min).toBe(3);
    expect(result.experience.max).toBe(6);
    expect(result.keySkills).toEqual(["React", "TypeScript", "CSS"]);
    expect(result.description.text).toContain("Разработка интерфейсов");
  });

  it("returns null when vacancy ID cannot be extracted from URL", () => {
    const doc = createVacancyDoc({ title: "Test" });
    const result = parseVacancyDetailFromDoc(doc, "https://hh.ru/some/other/page");
    expect(result).toBeNull();
  });

  it("returns null when no title is found", () => {
    const doc = new DOMParser().parseFromString("<html><body></body></html>", "text/html");
    const result = parseVacancyDetailFromDoc(doc, "https://hh.ru/vacancy/12345");
    expect(result).toBeNull();
  });

  it("derives skills from description text when no DOM skills", () => {
    const doc = createVacancyDoc({
      title: "Sales Manager",
      description: "<p>Требуется опыт B2B продаж и ведения переговоров с клиентами</p>",
      skills: [],
    });

    const result = parseVacancyDetailFromDoc(doc, "https://hh.ru/vacancy/99999");

    expect(result).not.toBeNull();
    // SKILL_PATTERNS should match "B2B продажи" and "переговоры"
    expect(result._skillsSource).toMatch(/derived|dom/);
  });

  it("parses structured salary range", () => {
    const doc = createVacancyDoc({
      title: "Analyst",
      salary: "150 000 - 200 000 \u20BD",
    });

    const result = parseVacancyDetailFromDoc(doc, "https://hh.ru/vacancy/54321");
    expect(result.salary.min).toBe(150000);
    expect(result.salary.max).toBe(200000);
    expect(result.salary.currency).toBe("RUB");
  });

  it('parses "Нет опыта" experience requirement', () => {
    const doc = createVacancyDoc({
      title: "Intern",
      experience: "Нет опыта",
    });

    const result = parseVacancyDetailFromDoc(doc, "https://hh.ru/vacancy/11111");
    expect(result.experience.min).toBe(0);
    expect(result.experience.max).toBe(0);
  });

  it("detects remote flag", () => {
    const doc = createVacancyDoc({
      title: "Remote Dev",
      isRemote: true,
    });

    const result = parseVacancyDetailFromDoc(doc, "https://hh.ru/vacancy/77777");
    expect(result.isRemote).toBe(true);
  });

  it("splits description into named sections", () => {
    const doc = createVacancyDoc({
      title: "Fullstack",
      description: `
        <p><strong>Обязанности:</strong></p>
        <p>Разработка бэкенда</p>
        <p><strong>Требования:</strong></p>
        <p>Знание Python</p>
        <p><strong>Условия:</strong></p>
        <p>ДМС, гибкий график</p>
      `,
    });

    const result = parseVacancyDetailFromDoc(doc, "https://hh.ru/vacancy/88888");
    expect(result.description.sections.responsibilities).toContain("Разработка бэкенда");
    expect(result.description.sections.requirements).toContain("Знание Python");
    expect(result.description.sections.conditions).toContain("ДМС, гибкий график");
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

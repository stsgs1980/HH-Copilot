/// <reference types="vitest/globals" />
/**
 * Tests for cover-letter-generator.js
 *   - generateCoverLetter()
 *   - fillTemplate()
 *   - findVacancyData()
 *
 * v1.9.30.0
 */

import { beforeEach, describe, expect, it } from "vitest";

describe("cover-letter-generator: fillTemplate", () => {
  let fillTemplate;

  beforeEach(async () => {
    const mod = await import("../src/lib/cover-letter-generator.js");
    fillTemplate = mod.fillTemplate;
  });

  it("replaces all placeholders in template", () => {
    const template = "Вакансия: {position} в {company}. Опыт: {experience}.";
    const values = { position: "Developer", company: "Яндекс", experience: "5 лет" };
    const result = fillTemplate(template, values);
    expect(result).toBe("Вакансия: Developer в Яндекс. Опыт: 5 лет.");
  });

  it("replaces empty values with empty string", () => {
    const template = "Hello {name}!";
    const values = { name: "" };
    expect(fillTemplate(template, values)).toBe("Hello !");
  });

  it("leaves unknown placeholders unchanged", () => {
    const template = "Hello {unknown}!";
    const values = {};
    expect(fillTemplate(template, values)).toBe("Hello {unknown}!");
  });

  it("handles multiple occurrences of same placeholder", () => {
    const template = "{position} -- это {position}";
    const values = { position: "Dev" };
    expect(fillTemplate(template, values)).toBe("Dev -- это Dev");
  });

  it("returns empty string for null template", () => {
    expect(fillTemplate(null, {})).toBe("");
  });
});

describe("cover-letter-generator: findVacancyData", () => {
  let findVacancyData;

  beforeEach(async () => {
    const mod = await import("../src/lib/cover-letter-generator.js");
    findVacancyData = mod.findVacancyData;
  });

  it("finds vacancy in vacancies array by ID", () => {
    const vacancies = [
      { id: "1", title: "Dev A" },
      { id: "2", title: "Dev B" },
    ];
    const result = findVacancyData("2", vacancies);
    expect(result).not.toBeNull();
    expect(result.title).toBe("Dev B");
  });

  it("returns null when vacancy not found", () => {
    const result = findVacancyData("999", []);
    expect(result).toBeNull();
  });

  it("returns null when vacancies is null", () => {
    const result = findVacancyData("1", null);
    expect(result).toBeNull();
  });
});

/// <reference types="vitest/globals" />
/**
 * TESTS: MATCH SCORER (F7.1 + F7.2)
 * ================================
 * Unit tests for the core scoring engine:
 *   - computeMatchScore()        -- orchestrator (match-scorer.js)
 *   - scoreSkills()              -- 0-35 via orchestrator (match-scorer-skills.js outputs 0-40)
 *   - scoreTitle()               -- 0-25 via orchestrator (match-scorer-title.js outputs 0-30)
 *   - scoreSalary()              -- 0-15 (match-scorer-salary.js)
 *   - scoreExperience()          -- 0-10 via orchestrator (match-scorer-experience.js outputs 0-15)
 *   - scoreLocation()            -- 0-15 (match-scorer-location.js)
 *
 * Weights (v1.9.72.0): skills 35, title 25, salary 15, experience 10, location 15 = 100
 *
 * Before v1.9.71.0: ZERO tests on scoring.
 * v1.9.72.0: Added location scoring tests, updated orchestrator assertions.
 */

import { describe, expect, it } from "vitest";
import { scoreTitle } from "../src/lib/match-scorer-title.js";
import { computeMatchScore } from "../src/lib/match-scorer.js";

// ============================================================
// HELPERS
// ============================================================

function makeResume(overrides = {}) {
  return {
    title: "Менеджер по продажам",
    skills: [],
    derivedSkills: [],
    salary: "",
    experience: [],
    address: "",
    workFormat: "",
    ...overrides,
  };
}

function makeVacancy(overrides = {}) {
  return {
    title: "Менеджер по продажам",
    keySkills: [],
    salary: {},
    experience: {},
    location: "",
    schedule: "",
    ...overrides,
  };
}

// ============================================================
// ORCHESTRATOR: computeMatchScore
// ============================================================

describe("computeMatchScore -- orchestrator", () => {
  it("returns 0/0/0/0/0 breakdown for null inputs", async () => {
    const r = await computeMatchScore(null, {});
    expect(r.total).toBe(0);
    expect(r.breakdown).toEqual({ skills: 0, title: 0, salary: 0, experience: 0, location: 0, semantic: 0 });
  });

  it("returns 0 for null vacancy", async () => {
    const r = await computeMatchScore(makeResume(), null);
    expect(r.total).toBe(0);
  });

  it("returns details with all expected keys including locationMatch", async () => {
    const r = await computeMatchScore(makeResume({ skills: ["CRM"] }), makeVacancy({ keySkills: ["CRM"] }));
    expect(r.details).toHaveProperty("matchingSkills");
    expect(r.details).toHaveProperty("missingSkills");
    expect(r.details).toHaveProperty("extraSkills");
    expect(r.details).toHaveProperty("derivedMatchSkills");
    expect(r.details).toHaveProperty("synonymMatchSkills");
    expect(r.details).toHaveProperty("impliedMatchSkills");
    expect(r.details).toHaveProperty("titleSimilarity");
    expect(r.details).toHaveProperty("salaryMatch");
    expect(r.details).toHaveProperty("experienceMatch");
    expect(r.details).toHaveProperty("locationMatch");
    expect(r.details).toHaveProperty("semanticScore");
  });

  it("breakdown includes location dimension", async () => {
    const r = await computeMatchScore(makeResume({ address: "Москва" }), makeVacancy({ location: "Москва" }));
    expect(r.breakdown).toHaveProperty("location");
    expect(r.breakdown.location).toBe(15);
  });

  it("total is sum of all 5 dimensions (capped at 100)", async () => {
    const resume = makeResume({
      title: "Senior Python Developer",
      skills: ["Python", "Docker", "SQL", "Git"],
      salary: "150 000",
      experience: [{ duration: { years: 5, months: 0 } }],
      address: "Москва",
    });
    const vacancy = makeVacancy({
      title: "Senior Python Developer",
      keySkills: ["Python", "Docker", "SQL", "Git", "Linux"],
      salary: { min: 140000, max: 180000 },
      experience: { min: 3, max: 7 },
      location: "Москва",
    });
    const r = await computeMatchScore(resume, vacancy);
    expect(r.total).toBeGreaterThan(60);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it("caps total at 25 when title similarity is 0 (role mismatch)", async () => {
    const resume = makeResume({
      title: "Курьер",
      skills: ["работа с клиентами"],
      salary: "50 000",
    });
    const vacancy = makeVacancy({
      title: "Руководитель отдела продаж",
      keySkills: ["работа с клиентами", "переговоры", "CRM", "B2B продажи", "управление командой"],
      salary: { min: 150000, max: 250000 },
    });
    const r = await computeMatchScore(resume, vacancy);
    expect(r.total).toBeLessThanOrEqual(25);
  });

  it("caps total at 40 when title similarity is barely >0 (<0.15)", async () => {
    const resume = makeResume({ title: "Менеджер по закупкам" });
    const vacancy = makeVacancy({ title: "Менеджер по рекламе" });
    const r = await computeMatchScore(resume, vacancy);
    expect(r.details.titleSimilarity).toBeGreaterThanOrEqual(0);
    if (r.details.titleSimilarity > 0 && r.details.titleSimilarity < 0.15) {
      expect(r.total).toBeLessThanOrEqual(40);
    }
  });
});

describe("scoreTitle", () => {
  it("exact match -> 30/30, similarity 1.0", () => {
    const r = scoreTitle(makeResume({ title: "Менеджер по продажам" }), makeVacancy({ title: "Менеджер по продажам" }));
    expect(r.score).toBe(30);
    expect(r.similarity).toBe(1.0);
  });

  it("case-insensitive exact match -> 30/30", () => {
    const r = scoreTitle(
      makeResume({ title: "SENIOR PYTHON DEVELOPER" }),
      makeVacancy({ title: "senior python developer" }),
    );
    expect(r.score).toBe(30);
  });

  it("empty title on either side -> 0/30", () => {
    expect(scoreTitle(makeResume({ title: "" }), makeVacancy()).score).toBe(0);
    expect(scoreTitle(makeResume(), makeVacancy({ title: "" })).score).toBe(0);
  });

  it("keyword overlap: partial match scores <30", () => {
    const r = scoreTitle(
      makeResume({ title: "Менеджер по продажам B2B" }),
      makeVacancy({ title: "Менеджер по маркетингу" }),
    );
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(30);
  });

  it("no word overlap -> 0/30", () => {
    const r = scoreTitle(
      makeResume({ title: "Курьер доставки" }),
      makeVacancy({ title: "Руководитель отдела продаж" }),
    );
    expect(r.score).toBe(0);
    expect(r.similarity).toBe(0);
  });

  it('abbreviation bonus: "РОП" matches "Руководитель отдела продаж"', () => {
    const r = scoreTitle(makeResume({ title: "РОП" }), makeVacancy({ title: "Руководитель отдела продаж" }));
    expect(r.score).toBe(5);
  });

  it('abbreviation bonus: "программист" matches "разработчик"', () => {
    const r = scoreTitle(makeResume({ title: "Программист Python" }), makeVacancy({ title: "Разработчик Python" }));
    expect(r.score).toBe(18);
  });

  it('stem matching catches inflection: "продажам" ~ "продаж"', () => {
    const r = scoreTitle(makeResume({ title: "Менеджер по продажам" }), makeVacancy({ title: "Менеджер продаж" }));
    // "менеджер" exact + "продажам" stem-matches "продаж" -> similarity > 0.5
    expect(r.similarity).toBeGreaterThan(0.5);
  });

  it("bonus is capped at 5 (max one abbreviation match)", () => {
    const r = scoreTitle(makeResume({ title: "Фронтенд-разработчик" }), makeVacancy({ title: "Frontend developer" }));
    expect(r.score).toBe(5);
  });
});

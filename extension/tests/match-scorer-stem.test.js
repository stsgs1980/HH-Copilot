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
import { normalizeSkillSet } from "../src/lib/match-scorer-skills.js";
import { ABBR_MAP, crudeStem, scoreTitle, stemMatchAny } from "../src/lib/match-scorer-title.js";

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

describe("scoreTitle -- stem matching (F7.3)", () => {
  it('"Frontend-разработчик" vs "Веб-разработчик" -> stem "разраб" matches, similarity > 0', () => {
    const r = scoreTitle(makeResume({ title: "Frontend-разработчик" }), makeVacancy({ title: "Веб-разработчик" }));
    expect(r.similarity).toBeGreaterThan(0);
    expect(r.score).toBeGreaterThan(0);
  });

  it('"Разработчик Python" vs "Python Developer" -> "python" overlaps + abbreviation bonus', () => {
    const r = scoreTitle(makeResume({ title: "Разработчик Python" }), makeVacancy({ title: "Python Developer" }));
    expect(r.score).toBeGreaterThan(0);
  });

  it('"Менеджер по продажам" vs "Менеджер продажам" -> stem match on "продаж"', () => {
    const r = scoreTitle(makeResume({ title: "Менеджер по продажам" }), makeVacancy({ title: "Менеджер продажам" }));
    // "менеджер" exact + "продаж" stem match (продажам -> продаж)
    expect(r.similarity).toBeGreaterThan(0.5);
  });

  it('"SMM-менеджер" vs "Менеджер по соцсетям" -> abbreviation bonus', () => {
    const r = scoreTitle(makeResume({ title: "SMM-менеджер" }), makeVacancy({ title: "Менеджер по соцсетям" }));
    // "менеджер" overlap + SMM abbreviation bonus
    expect(r.score).toBeGreaterThan(12);
  });

  it('"Техлид" vs "Ведущий разработчик" -> abbreviation bonus', () => {
    const r = scoreTitle(makeResume({ title: "Техлид" }), makeVacancy({ title: "Ведущий разработчик" }));
    expect(r.score).toBeGreaterThan(0);
  });

  it('"CTO" vs "Технический директор" -> abbreviation bonus', () => {
    const r = scoreTitle(makeResume({ title: "CTO" }), makeVacancy({ title: "Технический директор" }));
    expect(r.score).toBeGreaterThan(0);
  });

  it('"Junior разработчик" vs "Младший программист" -> junior abbreviation + stem on "разработ/программ" no match, but junior + программист->разработчик bonus', () => {
    const r = scoreTitle(makeResume({ title: "Junior разработчик" }), makeVacancy({ title: "Младший программист" }));
    // "junior"~"младший" bonus + "программист"~"разработчик" bonus -> but capped at one bonus
    expect(r.score).toBeGreaterThan(0);
  });

  it('"Data Scientist" vs "Дата саентист" -> abbreviation bonus', () => {
    const r = scoreTitle(makeResume({ title: "Data Scientist" }), makeVacancy({ title: "Дата саентист" }));
    expect(r.score).toBe(5); // abbreviation bonus only, no word overlap
  });

  it("stem does NOT match unrelated words", () => {
    // "курьер" (курь) vs "руководитель" (руков) -> no stem match
    const r = scoreTitle(makeResume({ title: "Курьер" }), makeVacancy({ title: "Руководитель" }));
    expect(r.similarity).toBe(0);
    expect(r.score).toBe(0);
  });

  it("stem requires minimum 4 chars", () => {
    // "seo" (3 chars) vs "сео" (3 chars) -- too short for stem, but exact match
    const set = new Set(["сео"]);
    expect(stemMatchAny("seo", set)).toBe(false); // both < 4 chars
  });
});

describe("crudeStem -- helper", () => {
  it('"разработчик" -> "разра" (5 chars)', () => {
    expect(crudeStem("разработчик")).toBe("разра");
  });

  it('"продажам" -> "прода" (5 chars)', () => {
    expect(crudeStem("продажам")).toBe("прода");
  });

  it('"продаж" -> "прода" (6 chars, >= 5, returns first 5)', () => {
    expect(crudeStem("продаж")).toBe("прода");
  });

  it('"abc" (< 4 chars) returns as-is', () => {
    expect(crudeStem("abc")).toBe("abc");
  });
});

describe("ABBR_MAP -- 50+ entries", () => {
  it("has at least 50 abbreviation entries", () => {
    expect(ABBR_MAP.length).toBeGreaterThanOrEqual(50);
  });

  it("covers IT abbreviations", () => {
    const entries = ABBR_MAP.map((e) => e.a);
    expect(entries).toContain("devops");
    expect(entries).toContain("frontend");
    expect(entries).toContain("backend");
    expect(entries).toContain("qa");
    expect(entries).toContain("tech lead");
    expect(entries).toContain("team lead");
  });

  it("covers sales abbreviations", () => {
    const entries = ABBR_MAP.map((e) => e.a);
    expect(entries).toContain("роп");
    expect(entries).toContain("sales manager");
  });

  it("covers marketing abbreviations", () => {
    const entries = ABBR_MAP.map((e) => e.a);
    expect(entries).toContain("smm");
    expect(entries).toContain("seo");
    expect(entries).toContain("ppc");
  });

  it("covers HR abbreviations", () => {
    const entries = ABBR_MAP.map((e) => e.a);
    expect(entries).toContain("hr");
    expect(entries).toContain("recruiter");
    expect(entries).toContain("hrbp");
  });

  it("covers finance abbreviations", () => {
    const entries = ABBR_MAP.map((e) => e.a);
    expect(entries).toContain("cfo");
  });
});

describe("normalizeSkillSet", () => {
  it("normalizes to lowercase and trims", () => {
    const set = normalizeSkillSet(["  CRM  ", "B2B ПРОДАЖИ"]);
    expect(set.has("crm")).toBe(true);
    expect(set.has("b2b продажи")).toBe(true);
  });

  it("replaces hyphens with spaces", () => {
    const set = normalizeSkillSet(["B2B-Продажи"]);
    expect(set.has("b2b продажи")).toBe(true);
  });

  it("replaces ё with е", () => {
    const set = normalizeSkillSet(["Всё"]);
    expect(set.has("все")).toBe(true);
  });

  it('handles {name: "..."} objects', () => {
    const set = normalizeSkillSet([{ name: "Python" }, { name: "" }]);
    expect(set.has("python")).toBe(true);
    expect(set.size).toBe(1);
  });

  it("[DOCUMENTED BUG] normalizeSkillSet crashes on null array element", () => {
    expect(() => normalizeSkillSet([null])).toThrow(TypeError);
  });
});

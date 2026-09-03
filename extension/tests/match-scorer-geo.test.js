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
import { detectWorkFormat, getRegion, identifyCity } from "../src/lib/match-scorer-location.js";

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

describe("identifyCity -- helper", () => {
  it('identifies "Москва"', () => {
    expect(identifyCity("Москва")).toBe("москва");
  });

  it('expands "МСК" to "москва"', () => {
    expect(identifyCity("МСК")).toBe("москва");
  });

  it('expands "СПб" to "санкт-петербург"', () => {
    expect(identifyCity("СПб")).toBe("санкт-петербург");
  });

  it('handles "Москва, Россия" (strips country)', () => {
    expect(identifyCity("Москва, Россия")).toBe("москва");
  });

  it("returns null for empty string", () => {
    expect(identifyCity("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(identifyCity(null)).toBeNull();
  });

  it("returns null for unknown city", () => {
    expect(identifyCity("Букингем")).toBeNull();
  });

  it('identifies "Нижний Новгород" as full form', () => {
    expect(identifyCity("Нижний Новгород")).toBe("нижний новгород");
  });

  it('identifies "НН" abbreviation', () => {
    expect(identifyCity("НН")).toBe("нижний новгород");
  });
});

describe("getRegion -- helper", () => {
  it('Москва region is "moscow"', () => {
    expect(getRegion("москва")).toBe("moscow");
  });

  it("Химки is in moscow region", () => {
    expect(getRegion("химки")).toBe("moscow");
  });

  it('СПб region is "spb"', () => {
    expect(getRegion("санкт-петербург")).toBe("spb");
  });

  it("null for unknown city", () => {
    expect(getRegion(null)).toBeNull();
  });

  it("different cities have different regions", () => {
    expect(getRegion("москва")).not.toBe(getRegion("санкт-петербург"));
  });
});

describe("detectWorkFormat -- helper", () => {
  it('detects remote from "Удаленно"', () => {
    expect(detectWorkFormat("Удаленно")).toBe("remote");
  });

  it('detects hybrid from "Гибрид"', () => {
    expect(detectWorkFormat("Гибрид")).toBe("hybrid");
  });

  it('detects hybrid from "Москва, удаленно"', () => {
    expect(detectWorkFormat("Москва, удаленно")).toBe("hybrid");
  });

  it('detects office from "Москва"', () => {
    expect(detectWorkFormat("Москва")).toBe("office");
  });

  it("returns unknown for empty", () => {
    expect(detectWorkFormat("")).toBe("unknown");
  });

  it("returns unknown for null", () => {
    expect(detectWorkFormat(null)).toBe("unknown");
  });
});

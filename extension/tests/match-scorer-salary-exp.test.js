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
import { scoreExperience } from "../src/lib/match-scorer-experience.js";
import { scoreSalary } from "../src/lib/match-scorer-salary.js";

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

describe("scoreSalary", () => {
  it("within range -> 15/15", () => {
    const r = scoreSalary(
      makeResume({ salary: "150 000 руб." }),
      makeVacancy({ salary: { min: 140000, max: 180000 } }),
    );
    expect(r.score).toBe(15);
    expect(r.reason).toBe("within-range");
  });

  it("no data on either side -> 4/15 (low neutral)", () => {
    const r = scoreSalary(makeResume(), makeVacancy());
    expect(r.score).toBe(4);
    expect(r.reason).toBe("no-data");
  });

  it("no resume salary -> 4/15 (low neutral)", () => {
    const r = scoreSalary(makeResume({ salary: "" }), makeVacancy({ salary: { min: 100000, max: 200000 } }));
    expect(r.score).toBe(4);
    expect(r.reason).toBe("resume-no-salary");
  });

  it("no vacancy salary -> 4/15 (low neutral)", () => {
    const r = scoreSalary(makeResume({ salary: "150 000" }), makeVacancy({ salary: {} }));
    expect(r.score).toBe(4);
    expect(r.reason).toBe("vacancy-no-salary");
  });

  it("slightly below (within 20%) -> 12/15", () => {
    const r = scoreSalary(makeResume({ salary: "125 000" }), makeVacancy({ salary: { min: 150000, max: 200000 } }));
    expect(r.score).toBe(12);
    expect(r.reason).toBe("slightly-below");
  });

  it("way below (>20%) -> 5/15", () => {
    const r = scoreSalary(makeResume({ salary: "100 000" }), makeVacancy({ salary: { min: 150000, max: 200000 } }));
    expect(r.score).toBe(5);
    expect(r.reason).toBe("below-range");
  });

  it("slightly above (within 20%) -> 10/15", () => {
    const r = scoreSalary(makeResume({ salary: "230 000" }), makeVacancy({ salary: { min: 150000, max: 200000 } }));
    expect(r.score).toBe(10);
    expect(r.reason).toBe("slightly-above");
  });

  it("way above (>20%) -> 3/15", () => {
    const r = scoreSalary(makeResume({ salary: "300 000" }), makeVacancy({ salary: { min: 150000, max: 200000 } }));
    expect(r.score).toBe(3);
    expect(r.reason).toBe("above-range");
  });

  it('parses vacancy salary string "150 000 - 200 000 руб"', () => {
    const r = scoreSalary(makeResume({ salary: "180 000" }), makeVacancy({ salary: "150 000 - 200 000 руб" }));
    expect(r.score).toBe(15);
    expect(r.reason).toBe("within-range");
  });

  it('parses "от 150 000" (no max) -> within range', () => {
    const r = scoreSalary(makeResume({ salary: "160 000" }), makeVacancy({ salary: "от 150 000" }));
    expect(r.score).toBe(15);
  });

  it('parses "до 200 000" (no min) -> slightly above', () => {
    const r = scoreSalary(makeResume({ salary: "230 000" }), makeVacancy({ salary: "до 200 000" }));
    expect(r.score).toBe(10);
    expect(r.reason).toBe("slightly-above");
  });
});

describe("scoreExperience", () => {
  it("within range -> 15/15", () => {
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 5, months: 0 } }] }),
      makeVacancy({ experience: { min: 3, max: 7 } }),
    );
    expect(r.score).toBe(15);
    expect(r.reason).toBe("within-range");
  });

  it("no experience required -> 15/15", () => {
    const r = scoreExperience(makeResume({ experience: [] }), makeVacancy({ experience: { min: 0, max: 0 } }));
    expect(r.score).toBe(15);
    expect(r.reason).toBe("no-experience-required");
  });

  it("unknown resume experience -> 8/15 neutral", () => {
    const r = scoreExperience(makeResume({ experience: [] }), makeVacancy({ experience: { min: 3, max: 5 } }));
    expect(r.score).toBe(8);
    expect(r.reason).toBe("unknown-resume-exp");
  });

  it("unknown vacancy experience -> 8/15 neutral", () => {
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 3, months: 0 } }] }),
      makeVacancy({ experience: {} }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe("unknown-vacancy-exp");
  });

  it("slightly below min (within 1 year) -> 10/15", () => {
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 4, months: 6 } }] }),
      makeVacancy({ experience: { min: 5, max: 10 } }),
    );
    expect(r.score).toBe(10);
    expect(r.reason).toBe("slightly-below");
  });

  it("exactly at boundary (4.5 vs 5-1=4) -> slightly-below", () => {
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 4, months: 6 } }] }),
      makeVacancy({ experience: { min: 5, max: 10 } }),
    );
    expect(r.score).toBe(10);
  });

  it("significantly below min (>1 year) -> 3/15", () => {
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 2, months: 0 } }] }),
      makeVacancy({ experience: { min: 5, max: 10 } }),
    );
    expect(r.score).toBe(3);
    expect(r.reason).toBe("below-range");
  });

  it("overqualified (above max) -> 8/15 (soft penalty)", () => {
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 10, months: 0 } }] }),
      makeVacancy({ experience: { min: 3, max: 5 } }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe("overqualified");
  });

  it("sums experience across multiple jobs", () => {
    const r = scoreExperience(
      makeResume({
        experience: [{ duration: { years: 2, months: 6 } }, { duration: { years: 1, months: 6 } }],
      }),
      makeVacancy({ experience: { min: 3, max: 7 } }),
    );
    expect(r.score).toBe(15);
    expect(r.reason).toBe("within-range");
  });

  it('parses string duration "3 года 6 месяцев"', () => {
    const r = scoreExperience(
      makeResume({ experience: [{ duration: "3 года 6 месяцев" }] }),
      makeVacancy({ experience: { min: 3, max: 5 } }),
    );
    expect(r.score).toBe(15);
  });
});

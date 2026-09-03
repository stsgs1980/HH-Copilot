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
import { scoreLocation } from "../src/lib/match-scorer-location.js";

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

describe("scoreLocation -- city matching", () => {
  it('same city "Москва" -> 15/15', () => {
    const r = scoreLocation(makeResume({ address: "Москва" }), makeVacancy({ location: "Москва" }));
    expect(r.score).toBe(15);
    expect(r.reason).toBe("same-city");
  });

  it('same city "Санкт-Петербург" -> 15/15', () => {
    const r = scoreLocation(makeResume({ address: "Санкт-Петербург" }), makeVacancy({ location: "Санкт-Петербург" }));
    expect(r.score).toBe(15);
  });

  it('same city via abbreviation: "МСК" and "Москва" -> 15/15', () => {
    const r = scoreLocation(makeResume({ address: "МСК" }), makeVacancy({ location: "Москва" }));
    expect(r.score).toBe(15);
    expect(r.reason).toBe("same-city");
  });

  it('same city via abbreviation: "СПб" and "Санкт-Петербург" -> 15/15', () => {
    const r = scoreLocation(makeResume({ address: "СПб" }), makeVacancy({ location: "Санкт-Петербург" }));
    expect(r.score).toBe(15);
  });

  it("nearby region: Москва vs Химки -> 12/15", () => {
    const r = scoreLocation(makeResume({ address: "Москва" }), makeVacancy({ location: "Химки" }));
    expect(r.score).toBe(12);
    expect(r.reason).toBe("nearby-region");
  });

  it("nearby region: СПб vs Всеволожск -> 12/15", () => {
    const r = scoreLocation(makeResume({ address: "Санкт-Петербург" }), makeVacancy({ location: "Всеволожск" }));
    expect(r.score).toBe(12);
    expect(r.reason).toBe("nearby-region");
  });

  it("different known cities: Москва vs Новосибирск -> 8/15", () => {
    const r = scoreLocation(makeResume({ address: "Москва" }), makeVacancy({ location: "Новосибирск" }));
    expect(r.score).toBe(8);
    expect(r.reason).toBe("different-city");
  });

  it("different regions: Казань vs Екатеринбург -> 8/15", () => {
    const r = scoreLocation(makeResume({ address: "Казань" }), makeVacancy({ location: "Екатеринбург" }));
    expect(r.score).toBe(8);
    expect(r.reason).toBe("different-city");
  });
});

describe("scoreLocation -- remote/hybrid", () => {
  it("remote matches remote -> 12/15", () => {
    const r = scoreLocation(
      makeResume({ address: "Удаленная работа" }),
      makeVacancy({ location: "Удаленно", schedule: "remote" }),
    );
    expect(r.score).toBe(12);
    expect(r.reason).toBe("remote-remote");
  });

  it("resume remote + vacancy office -> 12/15 (remote can do office)", () => {
    const r = scoreLocation(
      makeResume({ workFormat: "удаленная работа" }),
      makeVacancy({ location: "Москва", schedule: "office" }),
    );
    expect(r.score).toBe(12);
    expect(r.reason).toBe("remote-can-do-office");
  });

  it("resume office + vacancy remote -> 8/15 (office wants remote)", () => {
    const r = scoreLocation(
      makeResume({ address: "Москва" }),
      makeVacancy({ location: "Удаленно", schedule: "remote" }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe("office-wants-remote");
  });

  it("hybrid + hybrid -> 13/15", () => {
    const r = scoreLocation(
      makeResume({ workFormat: "гибрид" }),
      makeVacancy({ location: "Москва, удаленно", schedule: "hybrid" }),
    );
    expect(r.score).toBe(13);
    expect(r.reason).toBe("hybrid-hybrid");
  });

  it("hybrid + office -> 12/15", () => {
    const r = scoreLocation(
      makeResume({ workFormat: "гибрид" }),
      makeVacancy({ location: "Москва", schedule: "office" }),
    );
    expect(r.score).toBe(12);
    expect(r.reason).toBe("hybrid-can-do-office");
  });
});

describe("scoreLocation -- unknown/missing", () => {
  it("no data on either side -> 8/15 neutral", () => {
    const r = scoreLocation(makeResume(), makeVacancy());
    expect(r.score).toBe(8);
    expect(r.reason).toBe("no-data");
  });

  it("no resume address -> 8/15 neutral", () => {
    const r = scoreLocation(makeResume(), makeVacancy({ location: "Москва" }));
    expect(r.score).toBe(8);
    expect(r.reason).toBe("no-resume-location");
  });

  it("no vacancy location -> 8/15 neutral", () => {
    const r = scoreLocation(makeResume({ address: "Москва" }), makeVacancy());
    expect(r.score).toBe(8);
    expect(r.reason).toBe("no-vacancy-location");
  });

  it("unknown city text -> 8/15 neutral", () => {
    const r = scoreLocation(
      makeResume({ address: "какой-то населенный пункт" }),
      makeVacancy({ location: "еще один городок" }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe("unknown-city");
  });
});

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
import { scoreSkills } from "../src/lib/match-scorer-skills.js";

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

describe("scoreSkills -- explicit match (weight 1.0)", () => {
  it("returns 0 when vacancy has no keySkills and no derivedSkills", () => {
    const r = scoreSkills(makeResume({ skills: ["CRM"] }), makeVacancy());
    expect(r.score).toBe(0);
    expect(r.matching).toEqual([]);
  });

  it("returns 40 when all vacancy skills match resume exactly (5+ vac skills)", () => {
    const vacSkills = ["CRM", "B2B продажи", "переговоры", "работа с клиентами", "аналитика продаж"];
    const r = scoreSkills(makeResume({ skills: vacSkills }), makeVacancy({ keySkills: vacSkills }));
    expect(r.score).toBe(40);
    expect(r.matching).toHaveLength(5);
    expect(r.missing).toHaveLength(0);
  });

  it("categorizes each vacancy skill correctly: matching, derived, missing", () => {
    const r = scoreSkills(
      makeResume({
        skills: ["CRM", "B2B продажи"],
        derivedSkills: ["переговоры"],
      }),
      makeVacancy({
        keySkills: ["CRM", "B2B продажи", "переговоры", "Python", "управление командой"],
      }),
    );
    expect(r.matching).toEqual(["crm", "b2b продажи"]);
    expect(r.derivedMatch).toEqual(["переговоры"]);
    expect(r.missing).toEqual(["python", "управление командой"]);
  });

  it("reports extra skills (resume has skills not in vacancy)", () => {
    const r = scoreSkills(makeResume({ skills: ["CRM", "Docker", "Python"] }), makeVacancy({ keySkills: ["CRM"] }));
    expect(r.extra).toContain("docker");
    expect(r.extra).toContain("python");
  });

  it("deduplicates skills: does not count a skill as both matching and derived", () => {
    const r = scoreSkills(
      makeResume({
        skills: ["CRM"],
        derivedSkills: ["CRM"],
      }),
      makeVacancy({ keySkills: ["CRM"] }),
    );
    expect(r.matching).toContain("crm");
    expect(r.derivedMatch).not.toContain("crm");
  });
});

describe("scoreSkills -- derived match (weight 0.7)", () => {
  it("gives lower score for derived-only matches vs explicit", () => {
    const vacSkills = ["CRM", "B2B продажи", "переговоры", "работа с клиентами", "аналитика продаж"];
    const rExplicit = scoreSkills(makeResume({ skills: vacSkills }), makeVacancy({ keySkills: vacSkills }));
    const rDerived = scoreSkills(makeResume({ derivedSkills: vacSkills }), makeVacancy({ keySkills: vacSkills }));
    expect(rExplicit.score).toBe(40);
    expect(rDerived.score).toBe(28);
    expect(rDerived.derivedMatch).toHaveLength(5);
  });
});

describe("scoreSkills -- synonym match (weight 0.5)", () => {
  it('matches via synonym group: resume "переговоры" matches vacancy "деловое общение"', () => {
    const r = scoreSkills(makeResume({ skills: ["переговоры"] }), makeVacancy({ keySkills: ["деловое общение"] }));
    expect(r.synonymMatch).toHaveLength(1);
    expect(r.synonymMatch[0]).toContain("деловое общение");
    expect(r.missing).toHaveLength(0);
  });

  it("synonym match gets 50% weight (SYNONYM_WEIGHT=0.5)", () => {
    const vacSkills = ["деловое общение", "CRM", "B2B продажи", "Python", "Docker"];
    const r = scoreSkills(
      makeResume({ title: "Оператор", skills: ["переговоры"] }),
      makeVacancy({ keySkills: vacSkills }),
    );
    expect(r.score).toBe(4);
    expect(r.synonymMatch).toHaveLength(1);
    expect(r.missing).toHaveLength(4);
  });
});

describe("scoreSkills -- role-implied match (weight 0.4)", () => {
  it('implied skills match from resume title "Руководитель отдела продаж"', () => {
    const r = scoreSkills(
      makeResume({ title: "Руководитель отдела продаж", skills: [] }),
      makeVacancy({
        keySkills: ["управление командой", "делегирование", "Python"],
      }),
    );
    expect(r.impliedMatch).toContain("управление командой");
    expect(r.impliedMatch).toContain("делегирование");
    expect(r.missing).toEqual(["python"]);
  });

  it("implied match gets 40% weight", () => {
    const vacSkills = ["управление командой", "делегирование", "мотивация персонала", "Python", "B2B продажи"];
    const r = scoreSkills(
      makeResume({ title: "Руководитель отдела продаж", skills: [] }),
      makeVacancy({ keySkills: vacSkills }),
    );
    expect(r.score).toBe(10);
    expect(r.impliedMatch).toHaveLength(3);
  });

  it('does NOT imply skills for "заместитель руководителя" (exclusion rule)', () => {
    const r = scoreSkills(
      makeResume({ title: "Заместитель руководителя", skills: [] }),
      makeVacancy({ keySkills: ["управление командой", "делегирование", "Python", "CRM", "B2B продажи"] }),
    );
    expect(r.impliedMatch).toHaveLength(0);
  });
});

describe("scoreSkills -- confidence factor", () => {
  it("1 vacancy skill: confidence 0.3, max 12/40 from skills", () => {
    const r = scoreSkills(makeResume({ skills: ["CRM"] }), makeVacancy({ keySkills: ["CRM"] }));
    expect(r.score).toBe(12);
  });

  it("2 vacancy skills: confidence 0.5, max 20/40", () => {
    const r = scoreSkills(
      makeResume({ skills: ["CRM", "B2B продажи"] }),
      makeVacancy({ keySkills: ["CRM", "B2B продажи"] }),
    );
    expect(r.score).toBe(20);
  });

  it("3 vacancy skills: confidence 0.7, max 28/40", () => {
    const r = scoreSkills(
      makeResume({ skills: ["CRM", "B2B продажи", "переговоры"] }),
      makeVacancy({ keySkills: ["CRM", "B2B продажи", "переговоры"] }),
    );
    expect(r.score).toBe(28);
  });

  it("5+ vacancy skills: confidence 1.0, full 40/40 possible", () => {
    const skills = ["CRM", "B2B продажи", "переговоры", "работа с клиентами", "аналитика продаж"];
    const r = scoreSkills(makeResume({ skills }), makeVacancy({ keySkills: skills }));
    expect(r.score).toBe(40);
  });
});

describe("scoreSkills -- normalization", () => {
  it("normalizes B2B-Продажи and B2B Продажи to same form", () => {
    const r = scoreSkills(makeResume({ skills: ["B2B-Продажи"] }), makeVacancy({ keySkills: ["B2B Продажи"] }));
    expect(r.matching).toContain("b2b продажи");
    expect(r.score).toBeGreaterThan(0);
  });

  it("normalizes ё to е", () => {
    const r = scoreSkills(makeResume({ skills: ["Всё включено"] }), makeVacancy({ keySkills: ["все включено"] }));
    expect(r.matching).toContain("все включено");
  });

  it('handles {name: "..."} skill objects (from hh.ru)', () => {
    const r = scoreSkills(
      makeResume({ skills: [{ name: "CRM" }, { name: "B2B продажи" }] }),
      makeVacancy({ keySkills: ["CRM", "B2B продажи", "Python", "Docker", "Git"] }),
    );
    expect(r.matching).toContain("crm");
    expect(r.matching).toContain("b2b продажи");
  });

  it("uses vacancy.derivedSkills when keySkills is empty", () => {
    const r = scoreSkills(
      makeResume({ skills: ["CRM", "Python"] }),
      makeVacancy({ keySkills: [], derivedSkills: ["CRM", "Python", "Docker"] }),
    );
    expect(r.matching).toContain("crm");
    expect(r.matching).toContain("python");
    expect(r.missing).toContain("docker");
  });
});

/// <reference types="vitest/globals" />
/**
 * TESTS: derive-skills reverse derivation (matchVacancySkillsToExperience)
 * ======================================================================
 * Reverse derivation: checks vacancy skills against resume experience text.
 */

import { describe, expect, it } from "vitest";
import { matchVacancySkillsToExperience } from "../src/lib/derive-skills.js";

describe("matchVacancySkillsToExperience -- reverse derivation", () => {
  it("matches a vacancy skill that literally appears in experience text", () => {
    const resume = {
      experience: [{ description: "Работал с Kubernetes и Docker." }],
    };
    const matched = matchVacancySkillsToExperience(resume, ["Kubernetes", "React"]);
    expect(matched).toContain("Kubernetes");
    expect(matched).not.toContain("React");
  });

  it("matches a vacancy skill via dictionary pattern (direct adjacency required)", () => {
    const resume = {
      experience: [{ description: "Управление продажами регионального отдела." }],
    };
    const matched = matchVacancySkillsToExperience(resume, ["управление продажами"]);
    expect(matched).toContain("управление продажами");
  });

  it('[pattern gap] does NOT match "управление продажами" when words are separated', () => {
    const resume = {
      experience: [{ description: "Управление командой продаж." }],
    };
    const matched = matchVacancySkillsToExperience(resume, ["управление продажами"]);
    expect(matched).not.toContain("управление продажами");
  });

  it("skips skills already in resume.skills", () => {
    const resume = {
      skills: ["Python"],
      experience: [{ description: "Писал на Python." }],
    };
    const matched = matchVacancySkillsToExperience(resume, ["Python"]);
    expect(matched).not.toContain("Python");
  });

  it("returns [] for null resume", () => {
    expect(matchVacancySkillsToExperience(null, ["Python"])).toEqual([]);
  });

  it("returns [] for string instead of array (invalid type guard)", () => {
    // @ts-ignore -- намеренно неверный тип: проверяем guard рантайма
    expect(matchVacancySkillsToExperience({}, "Python")).toEqual([]);
  });

  it("returns [] for empty vacancy skills array", () => {
    expect(matchVacancySkillsToExperience({}, [])).toEqual([]);
  });

  it("returns [] when experience text is empty", () => {
    const resume = { experience: [{ description: "" }] };
    expect(matchVacancySkillsToExperience(resume, ["Python"])).toEqual([]);
  });

  it('reverse: "Go" matches "на Go", not "в Google"', () => {
    const r1 = matchVacancySkillsToExperience({ experience: [{ description: "Писал сервис на Go." }] }, ["Go"]);
    expect(r1).toContain("Go");
    const r2 = matchVacancySkillsToExperience({ experience: [{ description: "Работал в Google." }] }, ["Go"]);
    expect(r2).not.toContain("Go");
  });
});

/// <reference types="vitest/globals" />
/**
 * TESTS: MATCH SCORER -- flexible + semantic opt-in (issue #9)
 * =============================================================
 * - flexible WITHOUT opts.semanticOptIn: no AI call, semantic=0
 * - flexible WITH opt-in: semantic displaces title weight (25+20=45)
 * - location scaled by profile (flexible 15 -> 5)
 * - precise ignores opt-in; undefined opts behaves like no opt-in
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeSemanticSimilarity } from "../src/lib/ai-semantic.js";
import { computeMatchScore } from "../src/lib/match-scorer.js";

vi.mock("../src/lib/ai-semantic.js", () => ({
  computeSemanticSimilarity: vi.fn(async () => 0),
}));

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

function strongPair() {
  return [
    makeResume({
      title: "Senior Python Developer",
      skills: ["Python", "Docker", "SQL", "Git"],
      salary: "150 000",
      experience: [{ duration: { years: 5, months: 0 } }],
      address: "Москва",
    }),
    makeVacancy({
      title: "Senior Python Developer",
      keySkills: ["Python", "Docker", "SQL", "Git", "Linux"],
      salary: { min: 140000, max: 180000 },
      experience: { min: 3, max: 7 },
      location: "Москва",
    }),
  ];
}

describe("computeMatchScore -- flexible + semantic opt-in (issue #9)", () => {
  beforeEach(() => {
    vi.mocked(computeSemanticSimilarity).mockClear();
    vi.mocked(computeSemanticSimilarity).mockResolvedValue(0);
  });

  it("flexible WITHOUT opts.semanticOptIn: semantic NOT called, total <= 100", async () => {
    const [resume, vacancy] = strongPair();
    const r = await computeMatchScore(resume, vacancy, "flexible");
    expect(computeSemanticSimilarity).not.toHaveBeenCalled();
    expect(r.breakdown.semantic).toBe(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it("flexible WITH opts.semanticOptIn=true: semantic=20 at score 1.0, title<=25, total<=100", async () => {
    vi.mocked(computeSemanticSimilarity).mockResolvedValueOnce(1.0);
    const [resume, vacancy] = strongPair();
    const r = await computeMatchScore(resume, vacancy, "flexible", { semanticOptIn: true });
    expect(computeSemanticSimilarity).toHaveBeenCalledTimes(1);
    expect(r.breakdown.semantic).toBe(20);
    expect(r.breakdown.title).toBeLessThanOrEqual(25);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it("location fix: flexible scales 15 -> 5, precise keeps 15", async () => {
    const resume = makeResume({ address: "Москва" });
    const vacancy = makeVacancy({ location: "Москва" });
    const flex = await computeMatchScore(resume, vacancy, "flexible");
    expect(flex.breakdown.location).toBe(5);
    const precise = await computeMatchScore(resume, vacancy, "precise");
    expect(precise.breakdown.location).toBe(15);
  });

  it("precise ignores semanticOptIn (no AI call, semantic=0)", async () => {
    const [resume, vacancy] = strongPair();
    const r = await computeMatchScore(resume, vacancy, "precise", { semanticOptIn: true });
    expect(computeSemanticSimilarity).not.toHaveBeenCalled();
    expect(r.breakdown.semantic).toBe(0);
  });

  it("opts undefined behaves like no opt-in (no AI call)", async () => {
    const [resume, vacancy] = strongPair();
    const r = await computeMatchScore(resume, vacancy, "flexible", undefined);
    expect(computeSemanticSimilarity).not.toHaveBeenCalled();
    expect(r.breakdown.semantic).toBe(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });
});

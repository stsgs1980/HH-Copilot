/// <reference types="vitest/globals" />
/**
 * TESTS: cover-letter-evidence (F-CR-02)
 * ========================================
 * mapEvidence(scorecard, resume, matchResult) -> Evidence[]
 *
 * Each Evidence = { competency, evidenceText, source, confidence }
 * Anti-hallucination: ONLY quotes from resume.experience[].description,
 * never paraphrases. Missing skills are SKIPPED silently.
 */

import { describe, expect, it } from "vitest";
import { mapEvidence } from "../src/lib/cover-letter-evidence.js";

const baseResume = {
  name: "Ivan",
  position: "Developer",
  skills: ["React", "TypeScript", "Node.js"],
  experience: [
    {
      company: "Yandex",
      position: "Junior Dev",
      period: "2018-2020",
      description: "Работал с React, делал UI компоненты. Сократил время рендеринга на 30%.",
    },
    {
      company: "Google",
      position: "Middle Dev",
      period: "2020-2024",
      description: "Разрабатывал на TypeScript микросервисы на Node.js. Внедрил CI/CD. Ускорил деплой на 40%.",
    },
  ],
};

const baseMatchResult = {
  total: 75,
  breakdown: {},
  details: {
    matchingSkills: ["React", "TypeScript"],
    derivedMatchSkills: ["Node.js"],
    synonymMatchSkills: [],
    impliedMatchSkills: [],
    missingSkills: ["Python", "Docker"],
    extraSkills: [],
  },
};

const baseScorecard = {
  mission: "Dev role",
  outcomes: ["build UI"],
  competencies: ["React", "TypeScript", "Node.js", "Python", "Docker"],
};

describe("F-CR-02 -- mapEvidence", () => {
  it("skill mentioned in experience position title (not description) -> found via position fallback", () => {
    const resume = {
      ...baseResume,
      experience: [
        {
          company: "A",
          position: "Senior React Developer",
          period: "2020-2024",
          description: "Работал над UI без упоминания технологий в тексте.",
        },
      ],
    };
    const ev = mapEvidence(baseScorecard, resume, baseMatchResult);
    const react = ev.find((e) => e.competency === "React");
    expect(react).toBeDefined();
    expect(react.source.type).toBe("experience");
    expect(react.source.sentence).toContain("React");
    expect(react.confidence).toBe("medium"); // position-only -> capped medium
  });

  it("evidence source field has type, index, sentence", () => {
    const ev = mapEvidence(baseScorecard, baseResume, baseMatchResult);
    expect(ev.length).toBeGreaterThan(0);
    const first = ev[0];
    expect(first.source.type).toBe("experience");
    expect(typeof first.source.index).toBe("number");
    expect(typeof first.source.sentence).toBe("string");
    expect(first.source.sentence.length).toBeGreaterThan(5);
  });

  it("no matching skills at all -> falls back to top-2 most recent experience entries (v1.9.55.0)", () => {
    const emptyMatch = {
      total: 0,
      breakdown: {},
      details: {
        matchingSkills: [],
        derivedMatchSkills: [],
        synonymMatchSkills: [],
        impliedMatchSkills: [],
        missingSkills: ["React", "TypeScript"],
        extraSkills: [],
      },
    };
    const ev = mapEvidence(baseScorecard, baseResume, emptyMatch);
    // No per-competency matches -> fallback kicks in: top-2 most recent experience items
    expect(ev.length).toBe(2);
    expect(ev[0].source.type).toBe("experience_fallback");
    expect(ev[0].confidence).toBe("low");
    expect(ev[0].competency).toBe("(опыт из резюме)");
    // Most recent first (index 1 = Google, then index 0 = Yandex)
    expect(ev[0].source.index).toBe(1);
    expect(ev[1].source.index).toBe(0);
    // Evidence text is the first sentence of the description
    expect(ev[0].evidenceText).toContain("TypeScript");
  });

  it("fallback respects EXPERIENCE_FALLBACK_MAX (returns at most 2 entries)", () => {
    const resume = {
      ...baseResume,
      experience: [
        { company: "A", position: "P1", period: "2018", description: "Работа 1." },
        { company: "B", position: "P2", period: "2019", description: "Работа 2." },
        { company: "C", position: "P3", period: "2020", description: "Работа 3." },
        { company: "D", position: "P4", period: "2021", description: "Работа 4." },
      ],
    };
    const emptyMatch = {
      total: 0,
      breakdown: {},
      details: {
        matchingSkills: [],
        derivedMatchSkills: [],
        synonymMatchSkills: [],
        impliedMatchSkills: [],
        missingSkills: ["React"],
        extraSkills: [],
      },
    };
    const ev = mapEvidence(baseScorecard, resume, emptyMatch);
    expect(ev.length).toBe(2); // capped at EXPERIENCE_FALLBACK_MAX
    expect(ev[0].source.index).toBe(3); // most recent
    expect(ev[1].source.index).toBe(2);
  });

  it("fallback skipped when resume.experience is empty -> returns []", () => {
    const resume = { ...baseResume, experience: [] };
    const emptyMatch = {
      total: 0,
      breakdown: {},
      details: {
        matchingSkills: [],
        derivedMatchSkills: [],
        synonymMatchSkills: [],
        impliedMatchSkills: [],
        missingSkills: ["React"],
        extraSkills: [],
      },
    };
    const ev = mapEvidence(baseScorecard, resume, emptyMatch);
    expect(ev).toEqual([]);
  });

  it("confidence high when sentence contains digit/percent/timeframe", () => {
    const resume = {
      ...baseResume,
      experience: [
        {
          company: "A",
          position: "X",
          period: "2020-2024",
          description: "React проект без цифр.",
        },
      ],
    };
    const ev = mapEvidence(baseScorecard, resume, baseMatchResult);
    const react = ev.find((e) => e.competency === "React");
    expect(react).toBeDefined();
    expect(react.confidence).toBe("medium"); // no digit in sentence
  });
});

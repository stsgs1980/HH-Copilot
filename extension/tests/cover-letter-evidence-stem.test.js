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
import { _internal, mapEvidence } from "../src/lib/cover-letter-evidence.js";

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

describe("F-CR-02 -- mentionsSkillStem (v1.9.55.0)", () => {
  const { mentionsSkillStem } = _internal;

  it("matches Russian word-form variation (Управление -> Управлял)", () => {
    expect(mentionsSkillStem("Управлял командой продаж.", "Управление продажами")).toBe(true);
  });

  it("matches Russian plural variation (продажи -> продаж)", () => {
    expect(mentionsSkillStem("Рост продаж на 30%.", "продажи")).toBe(true);
  });

  it("matches multi-word skill with all stems present", () => {
    expect(mentionsSkillStem("Управлял B2B продажами.", "B2B продажи")).toBe(true);
  });

  it("does NOT match when only one stem of a multi-word skill is present", () => {
    expect(mentionsSkillStem("Рост выручки на 30%.", "Управление продажами")).toBe(false);
  });

  it("does NOT match unrelated sentence", () => {
    expect(mentionsSkillStem("Готовил кофе по утрам.", "Управление продажами")).toBe(false);
  });

  it("multi-word skill: short tokens require exact match (Gap 2 hardening)", () => {
    // "AI"/"UX" are < MIN_STEM_LEN -> must be present EXACTLY in the sentence.
    // Previously they were silently skipped -> false-positive when absent
    // (same anti-hallucination hole as "C++ разработка").
    expect(mentionsSkillStem("Дизайн интерфейсов.", "AI UX дизайн")).toBe(false); // AI/UX absent
    expect(mentionsSkillStem("AI и UX дизайн интерфейсов.", "AI UX дизайн")).toBe(true); // all present
    expect(mentionsSkillStem("Делал интерфейсы.", "AI UX дизайн")).toBe(false); // AI/UX absent
  });

  it("handles empty inputs gracefully", () => {
    expect(mentionsSkillStem("", "React")).toBe(false);
    expect(mentionsSkillStem("sentence", "")).toBe(false);
    expect(mentionsSkillStem(null, null)).toBe(false);
  });

  // ============================================================
  // Gap 1: prefix false-positive hardening (anti-hallucination).
  // A short stem must not match a longer unrelated word ("react" vs
  // "Reactive"). Allowed: exact word, or word + inflection suffix.
  // ============================================================
  it("Gap 1: does NOT match a longer word sharing the prefix (reactive)", () => {
    expect(mentionsSkillStem("Reactive programming.", "react")).toBe(false); // "ive" not a suffix
  });

  it("Gap 1: does NOT match a longer word sharing the prefix (dockerized)", () => {
    expect(mentionsSkillStem("Dockerized deployment.", "docker")).toBe(false); // "ized" not a suffix
  });

  it("Gap 1: matches exact word", () => {
    expect(mentionsSkillStem("Опыт работы с react.", "react")).toBe(true);
  });

  it("Gap 1: matches word + Russian inflection (творительный падеж)", () => {
    expect(mentionsSkillStem("Работал с reactом.", "react")).toBe(true); // "ом" is a RU suffix
  });

  it("Gap 1: matches word + English inflection (plural)", () => {
    expect(mentionsSkillStem("Built several reacts.", "react")).toBe(true); // "s" is an EN suffix
  });

  // ============================================================
  // Gap 2: short token (< MIN_STEM_LEN) in a multi-word skill MUST be
  // present exactly in the sentence (no skipping). Fixes the
  // "C++ разработка" hole where "C++" was dropped and ignored.
  // ============================================================
  it("Gap 2: short symbolic token must be present exactly (C++)", () => {
    expect(mentionsSkillStem("Руководил разработкой.", "C++ разработка")).toBe(false); // C++ absent
    expect(mentionsSkillStem("Разработка на C++ для бэкенда.", "C++ разработка")).toBe(true); // C++ + разраб
  });

  it("Gap 2: short alphanumeric token must be present exactly (B2B)", () => {
    expect(mentionsSkillStem("Работа в команде.", "B2B продажи")).toBe(false); // B2B absent
    expect(mentionsSkillStem("Управлял B2B продажами.", "B2B продажи")).toBe(true); // B2B exact + продаж stem
  });

  // ============================================================
  // Gap 3: skills composed ONLY of short tokens. After the Gap 2 fix,
  // short tokens are checked EXACTLY (not skipped), so a skill of only
  // short tokens matches when all of them are literally present.
  // ============================================================
  it("Gap 3: skill of only short tokens matches when all present exactly", () => {
    expect(mentionsSkillStem("Работал с AI и UX.", "AI UX")).toBe(true); // both present
    expect(mentionsSkillStem("Работал с AI.", "AI UX")).toBe(false); // UX absent
    expect(mentionsSkillStem("Опыт с Go.", "Go")).toBe(true);
    expect(mentionsSkillStem("Used ML pipelines.", "ML")).toBe(true);
    expect(mentionsSkillStem("Знаю C#.", "C#")).toBe(true);
  });

  // ============================================================
  // Gap 4: special characters / dots in skill names. After Gap 2 fix,
  // short symbolic tokens (C++, .NET) are checked exactly -- so they
  // match when literally present. Node.js (7 chars) uses the stem tier.
  // ============================================================
  it("Gap 4: special-character skills match when present", () => {
    expect(mentionsSkillStem("Опыт с Node.js.", "Node.js")).toBe(true); // 7 chars -> stem tier
    expect(mentionsSkillStem(".NET framework проект.", ".NET")).toBe(true); // exact (4 chars, symbolic)
    expect(mentionsSkillStem("Работал с C++ в проекте.", "C++")).toBe(true); // exact (C++ present)
    expect(mentionsSkillStem("Разработка на Python.", "C++")).toBe(false); // C++ absent
  });

  // ============================================================
  // Gap 5: non-string sentence must not crash (contract hardening).
  // ============================================================
  it("Gap 5: non-string sentence coerced instead of throwing", () => {
    expect(() => mentionsSkillStem(123, "react")).not.toThrow();
    expect(mentionsSkillStem(123, "react")).toBe(false);
  });
});

describe("F-CR-02 -- stem matching integration in mapEvidence (v1.9.55.0)", () => {
  it("stem match produces confidence=low and fieldType recorded in source", () => {
    // Resume describes "Управлял командой" -- skill "Управление" should match via stem
    const resume = {
      name: "X",
      skills: ["Управление"],
      experience: [
        {
          company: "A",
          position: "Менеджер",
          period: "2020-2024",
          description: "Управлял командой из 5 человек. Рост продаж на 30%.",
        },
      ],
    };
    const match = {
      total: 60,
      breakdown: {},
      details: {
        matchingSkills: ["Управление"],
        derivedMatchSkills: [],
        synonymMatchSkills: [],
        impliedMatchSkills: [],
        missingSkills: [],
        extraSkills: [],
      },
    };
    const scorecard = {
      mission: "",
      outcomes: [],
      competencies: ["Управление"],
    };
    const ev = mapEvidence(scorecard, resume, match);
    const evItem = ev.find((e) => e.competency === "Управление");
    expect(evItem).toBeDefined();
    expect(evItem.confidence).toBe("low"); // stem match -> capped at low
    expect(evItem.source.type).toBe("experience");
    expect(evItem.evidenceText).toMatch(/Управлял/);
  });

  it("exact word match takes priority over stem match (confidence not capped)", () => {
    // Description contains exact word "React" -- should match exactly (high/medium),
    // not via stem (low).
    const resume = {
      name: "X",
      skills: ["React"],
      experience: [
        {
          company: "A",
          position: "P",
          period: "2020",
          description: "Работал с React. Ускорил на 50%.",
        },
      ],
    };
    const match = {
      total: 80,
      breakdown: {},
      details: {
        matchingSkills: ["React"],
        derivedMatchSkills: [],
        synonymMatchSkills: [],
        impliedMatchSkills: [],
        missingSkills: [],
        extraSkills: [],
      },
    };
    const scorecard = { mission: "", outcomes: [], competencies: ["React"] };
    const ev = mapEvidence(scorecard, resume, match);
    const react = ev.find((e) => e.competency === "React");
    expect(react).toBeDefined();
    // Description has "50%" -> confidence high (not low from stem)
    expect(react.confidence).toBe("high");
  });
});

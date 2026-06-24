/**
 * TESTS: cover-letter-evidence (F-CR-02)
 * ========================================
 * mapEvidence(scorecard, resume, matchResult) -> Evidence[]
 *
 * Each Evidence = { competency, evidenceText, source, confidence }
 * Anti-hallucination: ONLY quotes from resume.experience[].description,
 * never paraphrases. Missing skills are SKIPPED silently.
 */

import { describe, it, expect } from 'vitest';
import { mapEvidence, _internal } from '../src/lib/cover-letter-evidence.js';

const baseResume = {
  name: 'Ivan',
  position: 'Developer',
  skills: ['React', 'TypeScript', 'Node.js'],
  experience: [
    {
      company: 'Yandex',
      position: 'Junior Dev',
      period: '2018-2020',
      description: 'Работал с React, делал UI компоненты. Сократил время рендеринга на 30%.',
    },
    {
      company: 'Google',
      position: 'Middle Dev',
      period: '2020-2024',
      description: 'Разрабатывал на TypeScript микросервисы на Node.js. Внедрил CI/CD. Ускорил деплой на 40%.',
    },
  ],
};

const baseMatchResult = {
  total: 75,
  breakdown: {},
  details: {
    matchingSkills: ['React', 'TypeScript'],
    derivedMatchSkills: ['Node.js'],
    synonymMatchSkills: [],
    impliedMatchSkills: [],
    missingSkills: ['Python', 'Docker'],
    extraSkills: [],
  },
};

const baseScorecard = {
  mission: 'Dev role',
  outcomes: ['build UI'],
  competencies: ['React', 'TypeScript', 'Node.js', 'Python', 'Docker'],
};

describe('F-CR-02 -- mapEvidence', () => {
  it('matching skill with evidence + digit -> confidence high', () => {
    const ev = mapEvidence(baseScorecard, baseResume, baseMatchResult);
    const react = ev.find(e => e.competency === 'React');
    expect(react).toBeDefined();
    expect(react.confidence).toBe('high'); // description has "30%"
    expect(react.evidenceText).toMatch(/React/i);
    expect(react.source).toBeDefined();
    expect(react.source.type).toBe('experience');
  });

  it('derived skill -> confidence medium', () => {
    const ev = mapEvidence(baseScorecard, baseResume, baseMatchResult);
    const node = ev.find(e => e.competency === 'Node.js');
    expect(node).toBeDefined();
    expect(node.confidence).toBe('medium');
  });

  it('missing skill -> SKIPPED, not in evidence array', () => {
    const ev = mapEvidence(baseScorecard, baseResume, baseMatchResult);
    const py = ev.find(e => e.competency === 'Python');
    const docker = ev.find(e => e.competency === 'Docker');
    expect(py).toBeUndefined();
    expect(docker).toBeUndefined();
  });

  it('multiple experience entries with same skill -> picks most recent', () => {
    // Add React to second experience too (more recent)
    const resume = {
      ...baseResume,
      experience: [
        { ...baseResume.experience[0], description: 'Старый React проект.' },
        { ...baseResume.experience[1], description: 'React 18 проект. TypeScript.' },
      ],
    };
    const ev = mapEvidence(baseScorecard, resume, baseMatchResult);
    const react = ev.find(e => e.competency === 'React');
    expect(react).toBeDefined();
    // source.index should be 1 (most recent, last in array)
    expect(react.source.index).toBe(1);
  });

  it('experience entry with empty description -> skipped for that entry', () => {
    const resume = {
      ...baseResume,
      experience: [
        { company: 'A', position: 'X', period: '2020-2021', description: '' },
        { ...baseResume.experience[1] },
      ],
    };
    const ev = mapEvidence(baseScorecard, resume, baseMatchResult);
    const ts = ev.find(e => e.competency === 'TypeScript');
    expect(ts).toBeDefined();
    expect(ts.source.index).toBe(1); // found in 2nd entry, not 1st
  });

  it('skill in resume.skills but not in any experience description -> falls back to skill_declaration evidence', () => {
    const resume = {
      ...baseResume,
      experience: [{ company: 'A', position: 'X', period: '2020', description: 'Без упоминания скиллов.' }],
    };
    const ev = mapEvidence(baseScorecard, resume, baseMatchResult);
    // React is matching skill but no description mentions it -> fallback
    const react = ev.find(e => e.competency === 'React');
    expect(react).toBeDefined();
    expect(react.source.type).toBe('skill_declaration');
    expect(react.confidence).toBe('declared');
    expect(react.evidenceText).toContain('React');
  });

  it('skill declared but missing from matchResult -> still skipped (no match basis)', () => {
    // React is in resume.skills but matchResult says it's missing -> skipped
    const resume = {
      ...baseResume,
      experience: [{ company: 'A', position: 'X', period: '2020', description: 'Без упоминания.' }],
    };
    const missingMatch = {
      total: 0,
      breakdown: {},
      details: {
        matchingSkills: [],
        derivedMatchSkills: [],
        synonymMatchSkills: [],
        impliedMatchSkills: [],
        missingSkills: ['React'],
        extraSkills: [],
      },
    };
    const ev = mapEvidence(baseScorecard, resume, missingMatch);
    const react = ev.find(e => e.competency === 'React');
    expect(react).toBeUndefined();
  });

  it('skill mentioned in experience position title (not description) -> found via position fallback', () => {
    const resume = {
      ...baseResume,
      experience: [{
        company: 'A',
        position: 'Senior React Developer',
        period: '2020-2024',
        description: 'Работал над UI без упоминания технологий в тексте.',
      }],
    };
    const ev = mapEvidence(baseScorecard, resume, baseMatchResult);
    const react = ev.find(e => e.competency === 'React');
    expect(react).toBeDefined();
    expect(react.source.type).toBe('experience');
    expect(react.source.sentence).toContain('React');
    expect(react.confidence).toBe('medium'); // position-only -> capped medium
  });

  it('evidence source field has type, index, sentence', () => {
    const ev = mapEvidence(baseScorecard, baseResume, baseMatchResult);
    expect(ev.length).toBeGreaterThan(0);
    const first = ev[0];
    expect(first.source.type).toBe('experience');
    expect(typeof first.source.index).toBe('number');
    expect(typeof first.source.sentence).toBe('string');
    expect(first.source.sentence.length).toBeGreaterThan(5);
  });

  it('no matching skills at all -> falls back to top-2 most recent experience entries (v1.9.55.0)', () => {
    const emptyMatch = {
      total: 0,
      breakdown: {},
      details: {
        matchingSkills: [],
        derivedMatchSkills: [],
        synonymMatchSkills: [],
        impliedMatchSkills: [],
        missingSkills: ['React', 'TypeScript'],
        extraSkills: [],
      },
    };
    const ev = mapEvidence(baseScorecard, baseResume, emptyMatch);
    // No per-competency matches -> fallback kicks in: top-2 most recent experience items
    expect(ev.length).toBe(2);
    expect(ev[0].source.type).toBe('experience_fallback');
    expect(ev[0].confidence).toBe('low');
    expect(ev[0].competency).toBe('(опыт из резюме)');
    // Most recent first (index 1 = Google, then index 0 = Yandex)
    expect(ev[0].source.index).toBe(1);
    expect(ev[1].source.index).toBe(0);
    // Evidence text is the first sentence of the description
    expect(ev[0].evidenceText).toContain('TypeScript');
  });

  it('fallback respects EXPERIENCE_FALLBACK_MAX (returns at most 2 entries)', () => {
    const resume = {
      ...baseResume,
      experience: [
        { company: 'A', position: 'P1', period: '2018', description: 'Работа 1.' },
        { company: 'B', position: 'P2', period: '2019', description: 'Работа 2.' },
        { company: 'C', position: 'P3', period: '2020', description: 'Работа 3.' },
        { company: 'D', position: 'P4', period: '2021', description: 'Работа 4.' },
      ],
    };
    const emptyMatch = {
      total: 0,
      breakdown: {},
      details: {
        matchingSkills: [], derivedMatchSkills: [], synonymMatchSkills: [],
        impliedMatchSkills: [], missingSkills: ['React'], extraSkills: [],
      },
    };
    const ev = mapEvidence(baseScorecard, resume, emptyMatch);
    expect(ev.length).toBe(2); // capped at EXPERIENCE_FALLBACK_MAX
    expect(ev[0].source.index).toBe(3); // most recent
    expect(ev[1].source.index).toBe(2);
  });

  it('fallback skipped when resume.experience is empty -> returns []', () => {
    const resume = { ...baseResume, experience: [] };
    const emptyMatch = {
      total: 0,
      breakdown: {},
      details: {
        matchingSkills: [], derivedMatchSkills: [], synonymMatchSkills: [],
        impliedMatchSkills: [], missingSkills: ['React'], extraSkills: [],
      },
    };
    const ev = mapEvidence(baseScorecard, resume, emptyMatch);
    expect(ev).toEqual([]);
  });

  it('confidence high when sentence contains digit/percent/timeframe', () => {
    const resume = {
      ...baseResume,
      experience: [{
        company: 'A', position: 'X', period: '2020-2024',
        description: 'React проект без цифр.',
      }],
    };
    const ev = mapEvidence(baseScorecard, resume, baseMatchResult);
    const react = ev.find(e => e.competency === 'React');
    expect(react).toBeDefined();
    expect(react.confidence).toBe('medium'); // no digit in sentence
  });
});

describe('F-CR-02 -- mentionsSkillStem (v1.9.55.0)', () => {
  const { mentionsSkillStem } = _internal;

  it('matches Russian word-form variation (Управление -> Управлял)', () => {
    expect(mentionsSkillStem('Управлял командой продаж.', 'Управление продажами')).toBe(true);
  });

  it('matches Russian plural variation (продажи -> продаж)', () => {
    expect(mentionsSkillStem('Рост продаж на 30%.', 'продажи')).toBe(true);
  });

  it('matches multi-word skill with all stems present', () => {
    expect(mentionsSkillStem('Управлял B2B продажами.', 'B2B продажи')).toBe(true);
  });

  it('does NOT match when only one stem of a multi-word skill is present', () => {
    expect(mentionsSkillStem('Рост выручки на 30%.', 'Управление продажами')).toBe(false);
  });

  it('does NOT match unrelated sentence', () => {
    expect(mentionsSkillStem('Готовил кофе по утрам.', 'Управление продажами')).toBe(false);
  });

  it('multi-word skill: short tokens require exact match (Gap 2 hardening)', () => {
    // "AI"/"UX" are < MIN_STEM_LEN -> must be present EXACTLY in the sentence.
    // Previously they were silently skipped -> false-positive when absent
    // (same anti-hallucination hole as "C++ разработка").
    expect(mentionsSkillStem('Дизайн интерфейсов.', 'AI UX дизайн')).toBe(false); // AI/UX absent
    expect(mentionsSkillStem('AI и UX дизайн интерфейсов.', 'AI UX дизайн')).toBe(true); // all present
    expect(mentionsSkillStem('Делал интерфейсы.', 'AI UX дизайн')).toBe(false); // AI/UX absent
  });

  it('handles empty inputs gracefully', () => {
    expect(mentionsSkillStem('', 'React')).toBe(false);
    expect(mentionsSkillStem('sentence', '')).toBe(false);
    expect(mentionsSkillStem(null, null)).toBe(false);
  });

  // ============================================================
  // Gap 1: prefix false-positive hardening (anti-hallucination).
  // A short stem must not match a longer unrelated word ("react" vs
  // "Reactive"). Allowed: exact word, or word + inflection suffix.
  // ============================================================
  it('Gap 1: does NOT match a longer word sharing the prefix (reactive)', () => {
    expect(mentionsSkillStem('Reactive programming.', 'react')).toBe(false); // "ive" not a suffix
  });

  it('Gap 1: does NOT match a longer word sharing the prefix (dockerized)', () => {
    expect(mentionsSkillStem('Dockerized deployment.', 'docker')).toBe(false); // "ized" not a suffix
  });

  it('Gap 1: matches exact word', () => {
    expect(mentionsSkillStem('Опыт работы с react.', 'react')).toBe(true);
  });

  it('Gap 1: matches word + Russian inflection (творительный падеж)', () => {
    expect(mentionsSkillStem('Работал с reactом.', 'react')).toBe(true); // "ом" is a RU suffix
  });

  it('Gap 1: matches word + English inflection (plural)', () => {
    expect(mentionsSkillStem('Built several reacts.', 'react')).toBe(true); // "s" is an EN suffix
  });

  // ============================================================
  // Gap 2: short token (< MIN_STEM_LEN) in a multi-word skill MUST be
  // present exactly in the sentence (no skipping). Fixes the
  // "C++ разработка" hole where "C++" was dropped and ignored.
  // ============================================================
  it('Gap 2: short symbolic token must be present exactly (C++)', () => {
    expect(mentionsSkillStem('Руководил разработкой.', 'C++ разработка')).toBe(false); // C++ absent
    expect(mentionsSkillStem('Разработка на C++ для бэкенда.', 'C++ разработка')).toBe(true); // C++ + разраб
  });

  it('Gap 2: short alphanumeric token must be present exactly (B2B)', () => {
    expect(mentionsSkillStem('Работа в команде.', 'B2B продажи')).toBe(false); // B2B absent
    expect(mentionsSkillStem('Управлял B2B продажами.', 'B2B продажи')).toBe(true); // B2B exact + продаж stem
  });

  // ============================================================
  // Gap 3: skills composed ONLY of short tokens. After the Gap 2 fix,
  // short tokens are checked EXACTLY (not skipped), so a skill of only
  // short tokens matches when all of them are literally present.
  // ============================================================
  it('Gap 3: skill of only short tokens matches when all present exactly', () => {
    expect(mentionsSkillStem('Работал с AI и UX.', 'AI UX')).toBe(true); // both present
    expect(mentionsSkillStem('Работал с AI.', 'AI UX')).toBe(false); // UX absent
    expect(mentionsSkillStem('Опыт с Go.', 'Go')).toBe(true);
    expect(mentionsSkillStem('Used ML pipelines.', 'ML')).toBe(true);
    expect(mentionsSkillStem('Знаю C#.', 'C#')).toBe(true);
  });

  // ============================================================
  // Gap 4: special characters / dots in skill names. After Gap 2 fix,
  // short symbolic tokens (C++, .NET) are checked exactly -- so they
  // match when literally present. Node.js (7 chars) uses the stem tier.
  // ============================================================
  it('Gap 4: special-character skills match when present', () => {
    expect(mentionsSkillStem('Опыт с Node.js.', 'Node.js')).toBe(true); // 7 chars -> stem tier
    expect(mentionsSkillStem('.NET framework проект.', '.NET')).toBe(true); // exact (4 chars, symbolic)
    expect(mentionsSkillStem('Работал с C++ в проекте.', 'C++')).toBe(true); // exact (C++ present)
    expect(mentionsSkillStem('Разработка на Python.', 'C++')).toBe(false); // C++ absent
  });

  // ============================================================
  // Gap 5: non-string sentence must not crash (contract hardening).
  // ============================================================
  it('Gap 5: non-string sentence coerced instead of throwing', () => {
    expect(() => mentionsSkillStem(123, 'react')).not.toThrow();
    expect(mentionsSkillStem(123, 'react')).toBe(false);
  });
});

describe('F-CR-02 -- stem matching integration in mapEvidence (v1.9.55.0)', () => {
  it('stem match produces confidence=low and fieldType recorded in source', () => {
    // Resume describes "Управлял командой" -- skill "Управление" should match via stem
    const resume = {
      name: 'X',
      skills: ['Управление'],
      experience: [{
        company: 'A', position: 'Менеджер', period: '2020-2024',
        description: 'Управлял командой из 5 человек. Рост продаж на 30%.',
      }],
    };
    const match = {
      total: 60,
      breakdown: {},
      details: {
        matchingSkills: ['Управление'], derivedMatchSkills: [],
        synonymMatchSkills: [], impliedMatchSkills: [],
        missingSkills: [], extraSkills: [],
      },
    };
    const scorecard = {
      mission: '', outcomes: [],
      competencies: ['Управление'],
    };
    const ev = mapEvidence(scorecard, resume, match);
    const evItem = ev.find(e => e.competency === 'Управление');
    expect(evItem).toBeDefined();
    expect(evItem.confidence).toBe('low'); // stem match -> capped at low
    expect(evItem.source.type).toBe('experience');
    expect(evItem.evidenceText).toMatch(/Управлял/);
  });

  it('exact word match takes priority over stem match (confidence not capped)', () => {
    // Description contains exact word "React" -- should match exactly (high/medium),
    // not via stem (low).
    const resume = {
      name: 'X', skills: ['React'],
      experience: [{
        company: 'A', position: 'P', period: '2020',
        description: 'Работал с React. Ускорил на 50%.',
      }],
    };
    const match = {
      total: 80, breakdown: {},
      details: {
        matchingSkills: ['React'], derivedMatchSkills: [],
        synonymMatchSkills: [], impliedMatchSkills: [],
        missingSkills: [], extraSkills: [],
      },
    };
    const scorecard = { mission: '', outcomes: [], competencies: ['React'] };
    const ev = mapEvidence(scorecard, resume, match);
    const react = ev.find(e => e.competency === 'React');
    expect(react).toBeDefined();
    // Description has "50%" -> confidence high (not low from stem)
    expect(react.confidence).toBe('high');
  });
});

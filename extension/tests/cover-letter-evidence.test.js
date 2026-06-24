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
import { mapEvidence } from '../src/lib/cover-letter-evidence.js';

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

  it('no matching skills at all -> returns []', () => {
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

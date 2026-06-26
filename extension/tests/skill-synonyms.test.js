/**
 * TESTS: skill-synonyms (matching engine supporting module)
 * ==========================================================
 * Characterization tests for findSynonymMatch / getSynonyms / areSynonyms.
 *
 * PURPOSE: this module had ZERO tests until v1.9.68.0, which is why RF-SYN
 * (synonym matching not robust to "навыки"-prefix and word-form variants)
 * went undetected. See docs/audit/...matching-skills-coverletter-audit.md §10.
 *
 * Two kinds of tests:
 *   1. Happy path: exact group members match in both directions (PASS today).
 *   2. [RF-SYN BUG]: real hh.ru vacancy formulations that should match but
 *      currently return null because findSynonymMatch uses exact equality
 *      after normalize() and does not strip service prefixes or stem-match.
 *      These FAIL today. When the fix lands (strip prefixes + stem fallback),
 *      they will pass and the matching engine stops undercounting skills.
 */

import { describe, it, expect } from 'vitest';
import {
  findSynonymMatch,
  getSynonyms,
  areSynonyms,
  SYNONYM_WEIGHT,
} from '../src/lib/skill-synonyms.js';

// A resume skill set that mirrors a real "Руководитель отдела продаж" resume
// (what derive-skills + explicit skills produce). Used in RF-SYN cases below.
const SALES_RESUME_SKILLS = new Set([
  'переговоры',
  'деловое общение',
  'работа с возражениями',
  'коммерческие переговоры',
  'управление командой',
]);

describe('findSynonymMatch -- happy path (exact group members)', () => {
  it('matches a synonym present in the resume set (forward)', () => {
    // "переговоры" is in a group with "работа с возражениями" etc.
    expect(findSynonymMatch('переговоры', SALES_RESUME_SKILLS)).not.toBeNull();
  });

  it('matches bidirectionally within a synonym group', () => {
    // If A matches B, then B matches A.
    const setWithObjections = new Set(['работа с возражениями']);
    expect(findSynonymMatch('переговоры', setWithObjections)).not.toBeNull();
    const setWithNegotiations = new Set(['переговоры']);
    expect(findSynonymMatch('работа с возражениями', setWithNegotiations)).not.toBeNull();
  });

  it('returns null when no synonym of the skill is in the set', () => {
    // "docker" is not in any synonym group with sales terms.
    expect(findSynonymMatch('docker', SALES_RESUME_SKILLS)).toBeNull();
  });

  it('returns null for an unknown skill (not in any group)', () => {
    expect(findSynonymMatch('навык которого нет', SALES_RESUME_SKILLS)).toBeNull();
  });

  it('is case/ё insensitive via normalize', () => {
    // "Ведение переговоров" is a group member (with ё). normalize converts
    // ё->е on both sides, so it matches resume skill "переговоры".
    const set = new Set(['переговоры']);
    expect(findSynonymMatch('Ведение переговоров', set)).not.toBeNull();
  });
});

describe('getSynonyms / areSynonyms -- happy path', () => {
  it('getSynonyms returns the group members for a known skill', () => {
    const syns = getSynonyms('переговоры');
    expect(syns.size).toBeGreaterThan(0);
    expect(syns.has('работа с возражениями')).toBe(true);
  });

  it('getSynonyms returns an empty Set for an unknown skill', () => {
    expect(getSynonyms('несуществующий навык').size).toBe(0);
  });

  it('areSynonyms is true for two members of the same group', () => {
    expect(areSynonyms('переговоры', 'работа с возражениями')).toBe(true);
  });

  it('areSynonyms is false for skills in different groups', () => {
    expect(areSynonyms('переговоры', 'docker')).toBe(false);
  });

  it('SYNONYM_WEIGHT is 0.5 (between derived 0.7 and missing 0)', () => {
    expect(SYNONYM_WEIGHT).toBe(0.5);
  });
});

// ====================================================================
// RF-SYN BUG: characterization of known false-negatives.
// These document the bug measured on a REAL hh.ru vacancy
// (keySkills phrased as "Навыки X", "Деловая коммуникация", etc.).
// The resume demonstrably has these competencies (20+ years sales
// leadership), but findSynonymMatch returns null because it uses exact
// equality and neither strips service prefixes nor stem-matches.
// When the fix lands (Step 2): these flip to .not.toBeNull().
// ====================================================================
describe('findSynonymMatch -- RF-SYN known false-negatives (characterization)', () => {
  it('[RF-SYN BUG] "Навыки переговоров" should match resume "переговоры"', () => {
    // Vacancy writes "Навыки переговоры"; resume has "переговоры".
    // Currently: normalize("Навыки переговоров") = "навыки переговоров" is
    // NOT an index key -> null. Should match the "переговоры" group.
    const matched = findSynonymMatch('Навыки переговоров', SALES_RESUME_SKILLS);
    // BUG: currently null. Flip to .not.toBeNull() after the fix.
    expect(matched).toBeNull();
  });

  it('[RF-SYN BUG] "Деловая коммуникация" should match resume "деловое общение"', () => {
    // "Деловая коммуникация" is semantically the same as "деловое общение"
    // (a member of the negotiations synonym group), but it is not an exact
    // group member -> null today.
    const matched = findSynonymMatch('Деловая коммуникация', SALES_RESUME_SKILLS);
    expect(matched).toBeNull();
  });

  it('[RF-SYN BUG] "отработка возражений" should match resume "работа с возражениями"', () => {
    // Word-form variant of the stored group member "работа с возражениями".
    // Stem "возраж" is shared, but exact lookup fails.
    const matched = findSynonymMatch('отработка возражений', SALES_RESUME_SKILLS);
    expect(matched).toBeNull();
  });
});

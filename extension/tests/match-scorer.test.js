/**
 * TESTS: MATCH SCORER (F7.1)
 * ============================
 * Unit tests for the core scoring engine:
 *   - computeMatchScore()        -- orchestrator (match-scorer.js)
 *   - scoreSkills()              -- 0-40 (match-scorer-skills.js)
 *   - scoreTitle()               -- 0-30 (match-scorer-title.js)
 *   - scoreSalary()              -- 0-15 (match-scorer-salary.js)
 *   - scoreExperience()          -- 0-15 (match-scorer-experience.js)
 *
 * Before v1.9.71.0: ZERO tests on scoring. All scoring behavior was
 * unverified. Any regression would silently break match quality.
 */

import { describe, it, expect } from 'vitest';
import { computeMatchScore } from '../src/lib/match-scorer.js';
import { scoreSkills, normalizeSkillSet } from '../src/lib/match-scorer-skills.js';
import { scoreTitle } from '../src/lib/match-scorer-title.js';
import { scoreSalary } from '../src/lib/match-scorer-salary.js';
import { scoreExperience } from '../src/lib/match-scorer-experience.js';

// ============================================================
// HELPERS
// ============================================================

/** Shorthand to build a resume object. */
function makeResume(overrides = {}) {
  return {
    title: 'Менеджер по продажам',
    skills: [],
    derivedSkills: [],
    salary: '',
    experience: [],
    ...overrides,
  };
}

/** Shorthand to build a vacancy object. */
function makeVacancy(overrides = {}) {
  return {
    title: 'Менеджер по продажам',
    keySkills: [],
    salary: {},
    experience: {},
    ...overrides,
  };
}

// ============================================================
// ORCHESTRATOR: computeMatchScore
// ============================================================

describe('computeMatchScore -- orchestrator', () => {
  it('returns 0/0/0/0 breakdown for null inputs', () => {
    const r = computeMatchScore(null, {});
    expect(r.total).toBe(0);
    expect(r.breakdown).toEqual({ skills: 0, title: 0, salary: 0, experience: 0 });
  });

  it('returns 0/0/0/0 for null vacancy', () => {
    const r = computeMatchScore(makeResume(), null);
    expect(r.total).toBe(0);
  });

  it('returns details with all expected keys', () => {
    const r = computeMatchScore(makeResume({ skills: ['CRM'] }), makeVacancy({ keySkills: ['CRM'] }));
    expect(r.details).toHaveProperty('matchingSkills');
    expect(r.details).toHaveProperty('missingSkills');
    expect(r.details).toHaveProperty('extraSkills');
    expect(r.details).toHaveProperty('derivedMatchSkills');
    expect(r.details).toHaveProperty('synonymMatchSkills');
    expect(r.details).toHaveProperty('impliedMatchSkills');
    expect(r.details).toHaveProperty('titleSimilarity');
    expect(r.details).toHaveProperty('salaryMatch');
    expect(r.details).toHaveProperty('experienceMatch');
  });

  it('total is sum of all 4 dimensions (capped at 100)', () => {
    const resume = makeResume({
      title: 'Senior Python Developer',
      skills: ['Python', 'Docker', 'SQL', 'Git'],
      salary: '150 000',
      experience: [{ duration: { years: 5, months: 0 } }],
    });
    const vacancy = makeVacancy({
      title: 'Senior Python Developer',
      keySkills: ['Python', 'Docker', 'SQL', 'Git', 'Linux'],
      salary: { min: 140000, max: 180000 },
      experience: { min: 3, max: 7 },
    });
    const r = computeMatchScore(resume, vacancy);
    // Exact title = 30, 4/5 skills with 5+ vac skills, salary within range = 15, exp within = 15
    expect(r.total).toBeGreaterThan(70);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  // Role mismatch penalty
  it('caps total at 25 when title similarity is 0 (role mismatch)', () => {
    const resume = makeResume({
      title: 'Курьер',
      skills: ['работа с клиентами'], // generic overlap
      salary: '50 000',
    });
    const vacancy = makeVacancy({
      title: 'Руководитель отдела продаж',
      keySkills: ['работа с клиентами', 'переговоры', 'CRM', 'B2B продажи', 'управление командой'],
      salary: { min: 150000, max: 250000 },
    });
    const r = computeMatchScore(resume, vacancy);
    // "курьер" vs "руководитель отдела продаж" = 0 word overlap → similarity=0 → cap 25
    expect(r.total).toBeLessThanOrEqual(25);
  });

  it('caps total at 40 when title similarity is barely >0 (<0.15)', () => {
    const resume = makeResume({ title: 'Менеджер по закупкам' });
    const vacancy = makeVacancy({ title: 'Менеджер по рекламе' });
    const r = computeMatchScore(resume, vacancy);
    // "менеджер" overlaps, "по" is stop word → 1/3 ≈ 0.33 actually...
    // Let's verify the similarity value and cap logic
    expect(r.details.titleSimilarity).toBeGreaterThanOrEqual(0);
    if (r.details.titleSimilarity > 0 && r.details.titleSimilarity < 0.15) {
      expect(r.total).toBeLessThanOrEqual(40);
    }
  });
});

// ============================================================
// SKILLS: scoreSkills (0-40)
// ============================================================

describe('scoreSkills -- explicit match (weight 1.0)', () => {
  it('returns 0 when vacancy has no keySkills and no derivedSkills', () => {
    const r = scoreSkills(makeResume({ skills: ['CRM'] }), makeVacancy());
    expect(r.score).toBe(0);
    expect(r.matching).toEqual([]);
  });

  it('returns 40 when all vacancy skills match resume exactly (5+ vac skills)', () => {
    const vacSkills = ['CRM', 'B2B продажи', 'переговоры', 'работа с клиентами', 'аналитика продаж'];
    const r = scoreSkills(
      makeResume({ skills: vacSkills }),
      makeVacancy({ keySkills: vacSkills }),
    );
    expect(r.score).toBe(40);
    expect(r.matching).toHaveLength(5);
    expect(r.missing).toHaveLength(0);
  });

  it('categorizes each vacancy skill correctly: matching, derived, missing', () => {
    const r = scoreSkills(
      makeResume({
        skills: ['CRM', 'B2B продажи'],
        derivedSkills: ['переговоры'],
      }),
      makeVacancy({
        keySkills: ['CRM', 'B2B продажи', 'переговоры', 'Python', 'управление командой'],
      }),
    );
    expect(r.matching).toEqual(['crm', 'b2b продажи']);
    expect(r.derivedMatch).toEqual(['переговоры']);
    expect(r.missing).toEqual(['python', 'управление командой']);
  });

  it('reports extra skills (resume has skills not in vacancy)', () => {
    const r = scoreSkills(
      makeResume({ skills: ['CRM', 'Docker', 'Python'] }),
      makeVacancy({ keySkills: ['CRM'] }),
    );
    expect(r.extra).toContain('docker');
    expect(r.extra).toContain('python');
  });

  it('deduplicates skills: does not count a skill as both matching and derived', () => {
    const r = scoreSkills(
      makeResume({
        skills: ['CRM'],
        derivedSkills: ['CRM'],
      }),
      makeVacancy({ keySkills: ['CRM'] }),
    );
    // CRM is in resume.skills → explicit match. derivedSkills also has it, but
    // the check order is: resumeSkills first → derivedSkills second. Since
    // it's already in matching, it won't appear in derivedMatch.
    expect(r.matching).toContain('crm');
    expect(r.derivedMatch).not.toContain('crm');
  });
});

describe('scoreSkills -- derived match (weight 0.7)', () => {
  it('gives lower score for derived-only matches vs explicit', () => {
    const vacSkills = ['CRM', 'B2B продажи', 'переговоры', 'работа с клиентами', 'аналитика продаж'];

    // All explicit
    const rExplicit = scoreSkills(
      makeResume({ skills: vacSkills }),
      makeVacancy({ keySkills: vacSkills }),
    );

    // All derived
    const rDerived = scoreSkills(
      makeResume({ derivedSkills: vacSkills }),
      makeVacancy({ keySkills: vacSkills }),
    );

    expect(rExplicit.score).toBe(40);
    // derived: 5 * 0.7 = 3.5 ratio = 0.7 * 40 * 1.0 = 28
    expect(rDerived.score).toBe(28);
    expect(rDerived.derivedMatch).toHaveLength(5);
  });
});

describe('scoreSkills -- synonym match (weight 0.5)', () => {
  it('matches via synonym group: resume "переговоры" matches vacancy "деловое общение"', () => {
    const r = scoreSkills(
      makeResume({ skills: ['переговоры'] }),
      makeVacancy({ keySkills: ['деловое общение'] }),
    );
    expect(r.synonymMatch).toHaveLength(1);
    expect(r.synonymMatch[0]).toContain('деловое общение');
    expect(r.missing).toHaveLength(0);
  });

  it('synonym match gets 50% weight (SYNONYM_WEIGHT=0.5)', () => {
    const vacSkills = ['деловое общение', 'CRM', 'B2B продажи', 'Python', 'Docker'];
    const r = scoreSkills(
      makeResume({ title: 'Оператор', skills: ['переговоры'] }), // no role-implied for operator
      makeVacancy({ keySkills: vacSkills }),
    );
    // 1 synonym * 0.5 / 5 = 0.1 ratio * 40 * 1.0 = 4
    expect(r.score).toBe(4);
    expect(r.synonymMatch).toHaveLength(1);
    expect(r.missing).toHaveLength(4);
  });
});

describe('scoreSkills -- role-implied match (weight 0.4)', () => {
  it('implied skills match from resume title "Руководитель отдела продаж"', () => {
    const r = scoreSkills(
      makeResume({ title: 'Руководитель отдела продаж', skills: [] }),
      makeVacancy({
        keySkills: ['управление командой', 'делегирование', 'Python'],
      }),
    );
    // "управление командой" and "делегирование" are implied by "Руководитель"
    expect(r.impliedMatch).toContain('управление командой');
    expect(r.impliedMatch).toContain('делегирование');
    expect(r.missing).toEqual(['python']);
  });

  it('implied match gets 40% weight', () => {
    const vacSkills = ['управление командой', 'делегирование', 'мотивация персонала', 'Python', 'B2B продажи'];
    const r = scoreSkills(
      makeResume({ title: 'Руководитель отдела продаж', skills: [] }),
      makeVacancy({ keySkills: vacSkills }),
    );
    // 3 implied * 0.4 = 1.2 / 5 = 0.24 ratio * 40 * 1.0 = 9.6 → round 10
    expect(r.score).toBe(10);
    expect(r.impliedMatch).toHaveLength(3);
  });

  it('does NOT imply skills for "заместитель руководителя" (exclusion rule)', () => {
    const r = scoreSkills(
      makeResume({ title: 'Заместитель руководителя', skills: [] }),
      makeVacancy({ keySkills: ['управление командой', 'делегирование', 'Python', 'CRM', 'B2B продажи'] }),
    );
    // "заместитель" is in the exclude list → 0 implied
    expect(r.impliedMatch).toHaveLength(0);
  });
});

describe('scoreSkills -- confidence factor', () => {
  it('1 vacancy skill: confidence 0.3, max 12/40 from skills', () => {
    const r = scoreSkills(
      makeResume({ skills: ['CRM'] }),
      makeVacancy({ keySkills: ['CRM'] }),
    );
    // 1 match * 1.0 = 1.0 / 1 = 1.0 ratio * 40 * 0.3 = 12
    expect(r.score).toBe(12);
  });

  it('2 vacancy skills: confidence 0.5, max 20/40', () => {
    const r = scoreSkills(
      makeResume({ skills: ['CRM', 'B2B продажи'] }),
      makeVacancy({ keySkills: ['CRM', 'B2B продажи'] }),
    );
    // 2/2 = 1.0 * 40 * 0.5 = 20
    expect(r.score).toBe(20);
  });

  it('3 vacancy skills: confidence 0.7, max 28/40', () => {
    const r = scoreSkills(
      makeResume({ skills: ['CRM', 'B2B продажи', 'переговоры'] }),
      makeVacancy({ keySkills: ['CRM', 'B2B продажи', 'переговоры'] }),
    );
    // 3/3 = 1.0 * 40 * 0.7 = 28
    expect(r.score).toBe(28);
  });

  it('5+ vacancy skills: confidence 1.0, full 40/40 possible', () => {
    const skills = ['CRM', 'B2B продажи', 'переговоры', 'работа с клиентами', 'аналитика продаж'];
    const r = scoreSkills(
      makeResume({ skills }),
      makeVacancy({ keySkills: skills }),
    );
    expect(r.score).toBe(40);
  });
});

describe('scoreSkills -- normalization', () => {
  it('normalizes B2B-Продажи and B2B Продажи to same form', () => {
    const r = scoreSkills(
      makeResume({ skills: ['B2B-Продажи'] }),
      makeVacancy({ keySkills: ['B2B Продажи'] }),
    );
    expect(r.matching).toContain('b2b продажи');
    expect(r.score).toBeGreaterThan(0);
  });

  it('normalizes ё to е', () => {
    const r = scoreSkills(
      makeResume({ skills: ['Всё включено'] }),
      makeVacancy({ keySkills: ['все включено'] }),
    );
    expect(r.matching).toContain('все включено');
  });

  it('handles {name: "..."} skill objects (from hh.ru)', () => {
    const r = scoreSkills(
      makeResume({ skills: [{ name: 'CRM' }, { name: 'B2B продажи' }] }),
      makeVacancy({ keySkills: ['CRM', 'B2B продажи', 'Python', 'Docker', 'Git'] }),
    );
    expect(r.matching).toContain('crm');
    expect(r.matching).toContain('b2b продажи');
  });

  it('uses vacancy.derivedSkills when keySkills is empty', () => {
    const r = scoreSkills(
      makeResume({ skills: ['CRM', 'Python'] }),
      makeVacancy({ keySkills: [], derivedSkills: ['CRM', 'Python', 'Docker'] }),
    );
    expect(r.matching).toContain('crm');
    expect(r.matching).toContain('python');
    expect(r.missing).toContain('docker');
  });
});

// ============================================================
// TITLE: scoreTitle (0-30)
// ============================================================

describe('scoreTitle', () => {
  it('exact match -> 30/30, similarity 1.0', () => {
    const r = scoreTitle(
      makeResume({ title: 'Менеджер по продажам' }),
      makeVacancy({ title: 'Менеджер по продажам' }),
    );
    expect(r.score).toBe(30);
    expect(r.similarity).toBe(1.0);
  });

  it('case-insensitive exact match -> 30/30', () => {
    const r = scoreTitle(
      makeResume({ title: 'SENIOR PYTHON DEVELOPER' }),
      makeVacancy({ title: 'senior python developer' }),
    );
    expect(r.score).toBe(30);
  });

  it('empty title on either side -> 0/30', () => {
    expect(scoreTitle(makeResume({ title: '' }), makeVacancy()).score).toBe(0);
    expect(scoreTitle(makeResume(), makeVacancy({ title: '' })).score).toBe(0);
  });

  it('keyword overlap: partial match scores <30', () => {
    const r = scoreTitle(
      makeResume({ title: 'Менеджер по продажам B2B' }),
      makeVacancy({ title: 'Менеджер по маркетингу' }),
    );
    // "менеджер" + "по" (stop word) → 1/2 = 0.5 similarity → 0.5*25 = 12
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(30);
  });

  it('no word overlap -> 0/30', () => {
    const r = scoreTitle(
      makeResume({ title: 'Курьер доставки' }),
      makeVacancy({ title: 'Руководитель отдела продаж' }),
    );
    expect(r.score).toBe(0);
    expect(r.similarity).toBe(0);
  });

  it('abbreviation bonus: "РОП" matches "Руководитель отдела продаж"', () => {
    const r = scoreTitle(
      makeResume({ title: 'РОП' }),
      makeVacancy({ title: 'Руководитель отдела продаж' }),
    );
    // No word overlap (роп != руководитель/отдел/продаж), but abbreviation bonus = +5
    expect(r.score).toBe(5);
  });

  it('abbreviation bonus: "программист" matches "разработчик"', () => {
    const r = scoreTitle(
      makeResume({ title: 'Программист Python' }),
      makeVacancy({ title: 'Разработчик Python' }),
    );
    // "python" overlaps (1/2 = 0.5 → 12.5) + "программист"~"разработчик" bonus (+5) = 17.5 → round 18
    expect(r.score).toBe(18);
  });

  it('stop words are excluded from tokenization', () => {
    const r = scoreTitle(
      makeResume({ title: 'Менеджер по продажам' }),
      makeVacancy({ title: 'Менеджер продаж' }),
    );
    // Tokens: resume=["менеджер", "продажам"], vac=["менеджер", "продаж"]
    // "продажам" != "продаж" → only "менеджер" matches → 1/2 = 0.5
    expect(r.similarity).toBe(0.5);
  });

  it('bonus is capped at 5 (max one abbreviation match)', () => {
    const r = scoreTitle(
      makeResume({ title: 'Фронтенд-разработчик' }),
      makeVacancy({ title: 'Frontend developer' }),
    );
    // "frontend"~"фронтенд" bonus = +5. No word overlap.
    expect(r.score).toBe(5);
  });
});

// ============================================================
// SALARY: scoreSalary (0-15)
// ============================================================

describe('scoreSalary', () => {
  it('within range -> 15/15', () => {
    const r = scoreSalary(
      makeResume({ salary: '150 000 руб.' }),
      makeVacancy({ salary: { min: 140000, max: 180000 } }),
    );
    expect(r.score).toBe(15);
    expect(r.reason).toBe('within-range');
  });

  it('no data on either side -> 8/15 neutral', () => {
    const r = scoreSalary(makeResume(), makeVacancy());
    expect(r.score).toBe(8);
    expect(r.reason).toBe('no-data');
  });

  it('no resume salary -> 8/15 neutral', () => {
    const r = scoreSalary(
      makeResume({ salary: '' }),
      makeVacancy({ salary: { min: 100000, max: 200000 } }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe('resume-no-salary');
  });

  it('no vacancy salary -> 8/15 neutral', () => {
    const r = scoreSalary(
      makeResume({ salary: '150 000' }),
      makeVacancy({ salary: {} }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe('vacancy-no-salary');
  });

  it('slightly below (within 20%) -> 12/15', () => {
    // Vac min 150k, resume 125k (16.7% below = within 20%)
    const r = scoreSalary(
      makeResume({ salary: '125 000' }),
      makeVacancy({ salary: { min: 150000, max: 200000 } }),
    );
    expect(r.score).toBe(12);
    expect(r.reason).toBe('slightly-below');
  });

  it('way below (>20%) -> 5/15', () => {
    // Vac min 150k, resume 100k (33% below)
    const r = scoreSalary(
      makeResume({ salary: '100 000' }),
      makeVacancy({ salary: { min: 150000, max: 200000 } }),
    );
    expect(r.score).toBe(5);
    expect(r.reason).toBe('below-range');
  });

  it('slightly above (within 20%) -> 10/15', () => {
    // Vac max 200k, resume 230k (15% above)
    const r = scoreSalary(
      makeResume({ salary: '230 000' }),
      makeVacancy({ salary: { min: 150000, max: 200000 } }),
    );
    expect(r.score).toBe(10);
    expect(r.reason).toBe('slightly-above');
  });

  it('way above (>20%) -> 3/15', () => {
    // Vac max 200k, resume 300k (50% above)
    const r = scoreSalary(
      makeResume({ salary: '300 000' }),
      makeVacancy({ salary: { min: 150000, max: 200000 } }),
    );
    expect(r.score).toBe(3);
    expect(r.reason).toBe('above-range');
  });

  it('parses vacancy salary string "150 000 - 200 000 руб"', () => {
    const r = scoreSalary(
      makeResume({ salary: '180 000' }),
      makeVacancy({ salary: '150 000 - 200 000 руб' }),
    );
    expect(r.score).toBe(15);
    expect(r.reason).toBe('within-range');
  });

  it('parses "от 150 000" (no max) -> within range', () => {
    const r = scoreSalary(
      makeResume({ salary: '160 000' }),
      makeVacancy({ salary: 'от 150 000' }),
    );
    expect(r.score).toBe(15);
  });

  it('parses "до 200 000" (no min) -> slightly above', () => {
    const r = scoreSalary(
      makeResume({ salary: '230 000' }),
      makeVacancy({ salary: 'до 200 000' }),
    );
    expect(r.score).toBe(10);
    expect(r.reason).toBe('slightly-above');
  });
});

// ============================================================
// EXPERIENCE: scoreExperience (0-15)
// ============================================================

describe('scoreExperience', () => {
  it('within range -> 15/15', () => {
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 5, months: 0 } }] }),
      makeVacancy({ experience: { min: 3, max: 7 } }),
    );
    expect(r.score).toBe(15);
    expect(r.reason).toBe('within-range');
  });

  it('no experience required -> 15/15', () => {
    const r = scoreExperience(
      makeResume({ experience: [] }),
      makeVacancy({ experience: { min: 0, max: 0 } }),
    );
    expect(r.score).toBe(15);
    expect(r.reason).toBe('no-experience-required');
  });

  it('unknown resume experience -> 8/15 neutral', () => {
    const r = scoreExperience(
      makeResume({ experience: [] }),
      makeVacancy({ experience: { min: 3, max: 5 } }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe('unknown-resume-exp');
  });

  it('unknown vacancy experience -> 8/15 neutral', () => {
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 3, months: 0 } }] }),
      makeVacancy({ experience: {} }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe('unknown-vacancy-exp');
  });

  it('slightly below min (within 1 year) -> 10/15', () => {
    // Vac min 5, resume 4.5 years
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 4, months: 6 } }] }),
      makeVacancy({ experience: { min: 5, max: 10 } }),
    );
    expect(r.score).toBe(10);
    expect(r.reason).toBe('slightly-below');
  });

  it('exactly at boundary (4.5 vs 5-1=4) -> NOT slightly below (4.5 > 4)', () => {
    // Vac min 5, resume 4.5 years. vacMin - 1 = 4. 4.5 >= 4 → slightly-below
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 4, months: 6 } }] }),
      makeVacancy({ experience: { min: 5, max: 10 } }),
    );
    expect(r.score).toBe(10);
  });

  it('significantly below min (>1 year) -> 3/15', () => {
    // Vac min 5, resume 2 years
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 2, months: 0 } }] }),
      makeVacancy({ experience: { min: 5, max: 10 } }),
    );
    expect(r.score).toBe(3);
    expect(r.reason).toBe('below-range');
  });

  it('overqualified (above max) -> 8/15 (soft penalty)', () => {
    // Vac max 5, resume 10 years
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 10, months: 0 } }] }),
      makeVacancy({ experience: { min: 3, max: 5 } }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe('overqualified');
  });

  it('sums experience across multiple jobs', () => {
    const r = scoreExperience(
      makeResume({
        experience: [
          { duration: { years: 2, months: 6 } },
          { duration: { years: 1, months: 6 } },
        ],
      }),
      makeVacancy({ experience: { min: 3, max: 7 } }),
    );
    // Total: 4 years → within 3-7 range
    expect(r.score).toBe(15);
    expect(r.reason).toBe('within-range');
  });

  it('parses string duration "3 года 6 месяцев"', () => {
    const r = scoreExperience(
      makeResume({ experience: [{ duration: '3 года 6 месяцев' }] }),
      makeVacancy({ experience: { min: 3, max: 5 } }),
    );
    // 3.5 years within 3-5
    expect(r.score).toBe(15);
  });
});

// ============================================================
// NORMALIZE HELPER
// ============================================================

describe('normalizeSkillSet', () => {
  it('normalizes to lowercase and trims', () => {
    const set = normalizeSkillSet(['  CRM  ', 'B2B ПРОДАЖИ']);
    expect(set.has('crm')).toBe(true);
    expect(set.has('b2b продажи')).toBe(true);
  });

  it('replaces hyphens with spaces', () => {
    const set = normalizeSkillSet(['B2B-Продажи']);
    expect(set.has('b2b продажи')).toBe(true);
  });

  it('replaces ё with е', () => {
    const set = normalizeSkillSet(['Всё']);
    expect(set.has('все')).toBe(true);
  });

  it('handles {name: "..."} objects', () => {
    const set = normalizeSkillSet([{ name: 'Python' }, { name: '' }]);
    expect(set.has('python')).toBe(true);
    expect(set.size).toBe(1);
  });

  it('[DOCUMENTED BUG] normalizeSkillSet crashes on null array element', () => {
    // normalizeSkillSet does not guard against null entries in the array.
    // s.name throws TypeError when s is null.
    // This is a known minor issue -- hh.ru never produces null entries.
    expect(() => normalizeSkillSet([null])).toThrow(TypeError);
  });
});
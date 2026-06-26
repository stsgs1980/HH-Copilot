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

import { describe, it, expect } from 'vitest';
import { computeMatchScore } from '../src/lib/match-scorer.js';
import { scoreSkills, normalizeSkillSet } from '../src/lib/match-scorer-skills.js';
import { scoreTitle } from '../src/lib/match-scorer-title.js';
import { scoreSalary } from '../src/lib/match-scorer-salary.js';
import { scoreExperience } from '../src/lib/match-scorer-experience.js';
import { scoreLocation, identifyCity, getRegion, detectWorkFormat } from '../src/lib/match-scorer-location.js';

// ============================================================
// HELPERS
// ============================================================

function makeResume(overrides = {}) {
  return {
    title: 'Менеджер по продажам',
    skills: [],
    derivedSkills: [],
    salary: '',
    experience: [],
    address: '',
    workFormat: '',
    ...overrides,
  };
}

function makeVacancy(overrides = {}) {
  return {
    title: 'Менеджер по продажам',
    keySkills: [],
    salary: {},
    experience: {},
    location: '',
    schedule: '',
    ...overrides,
  };
}

// ============================================================
// ORCHESTRATOR: computeMatchScore
// ============================================================

describe('computeMatchScore -- orchestrator', () => {
  it('returns 0/0/0/0/0 breakdown for null inputs', () => {
    const r = computeMatchScore(null, {});
    expect(r.total).toBe(0);
    expect(r.breakdown).toEqual({ skills: 0, title: 0, salary: 0, experience: 0, location: 0 });
  });

  it('returns 0 for null vacancy', () => {
    const r = computeMatchScore(makeResume(), null);
    expect(r.total).toBe(0);
  });

  it('returns details with all expected keys including locationMatch', () => {
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
    expect(r.details).toHaveProperty('locationMatch');
  });

  it('breakdown includes location dimension', () => {
    const r = computeMatchScore(makeResume({ address: 'Москва' }), makeVacancy({ location: 'Москва' }));
    expect(r.breakdown).toHaveProperty('location');
    expect(r.breakdown.location).toBe(15);
  });

  it('total is sum of all 5 dimensions (capped at 100)', () => {
    const resume = makeResume({
      title: 'Senior Python Developer',
      skills: ['Python', 'Docker', 'SQL', 'Git'],
      salary: '150 000',
      experience: [{ duration: { years: 5, months: 0 } }],
      address: 'Москва',
    });
    const vacancy = makeVacancy({
      title: 'Senior Python Developer',
      keySkills: ['Python', 'Docker', 'SQL', 'Git', 'Linux'],
      salary: { min: 140000, max: 180000 },
      experience: { min: 3, max: 7 },
      location: 'Москва',
    });
    const r = computeMatchScore(resume, vacancy);
    expect(r.total).toBeGreaterThan(60);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it('caps total at 25 when title similarity is 0 (role mismatch)', () => {
    const resume = makeResume({
      title: 'Курьер',
      skills: ['работа с клиентами'],
      salary: '50 000',
    });
    const vacancy = makeVacancy({
      title: 'Руководитель отдела продаж',
      keySkills: ['работа с клиентами', 'переговоры', 'CRM', 'B2B продажи', 'управление командой'],
      salary: { min: 150000, max: 250000 },
    });
    const r = computeMatchScore(resume, vacancy);
    expect(r.total).toBeLessThanOrEqual(25);
  });

  it('caps total at 40 when title similarity is barely >0 (<0.15)', () => {
    const resume = makeResume({ title: 'Менеджер по закупкам' });
    const vacancy = makeVacancy({ title: 'Менеджер по рекламе' });
    const r = computeMatchScore(resume, vacancy);
    expect(r.details.titleSimilarity).toBeGreaterThanOrEqual(0);
    if (r.details.titleSimilarity > 0 && r.details.titleSimilarity < 0.15) {
      expect(r.total).toBeLessThanOrEqual(40);
    }
  });
});

// ============================================================
// SKILLS: scoreSkills (raw 0-40, orchestrator scales to 0-35)
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
    expect(r.matching).toContain('crm');
    expect(r.derivedMatch).not.toContain('crm');
  });
});

describe('scoreSkills -- derived match (weight 0.7)', () => {
  it('gives lower score for derived-only matches vs explicit', () => {
    const vacSkills = ['CRM', 'B2B продажи', 'переговоры', 'работа с клиентами', 'аналитика продаж'];
    const rExplicit = scoreSkills(
      makeResume({ skills: vacSkills }),
      makeVacancy({ keySkills: vacSkills }),
    );
    const rDerived = scoreSkills(
      makeResume({ derivedSkills: vacSkills }),
      makeVacancy({ keySkills: vacSkills }),
    );
    expect(rExplicit.score).toBe(40);
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
      makeResume({ title: 'Оператор', skills: ['переговоры'] }),
      makeVacancy({ keySkills: vacSkills }),
    );
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
    expect(r.score).toBe(10);
    expect(r.impliedMatch).toHaveLength(3);
  });

  it('does NOT imply skills for "заместитель руководителя" (exclusion rule)', () => {
    const r = scoreSkills(
      makeResume({ title: 'Заместитель руководителя', skills: [] }),
      makeVacancy({ keySkills: ['управление командой', 'делегирование', 'Python', 'CRM', 'B2B продажи'] }),
    );
    expect(r.impliedMatch).toHaveLength(0);
  });
});

describe('scoreSkills -- confidence factor', () => {
  it('1 vacancy skill: confidence 0.3, max 12/40 from skills', () => {
    const r = scoreSkills(
      makeResume({ skills: ['CRM'] }),
      makeVacancy({ keySkills: ['CRM'] }),
    );
    expect(r.score).toBe(12);
  });

  it('2 vacancy skills: confidence 0.5, max 20/40', () => {
    const r = scoreSkills(
      makeResume({ skills: ['CRM', 'B2B продажи'] }),
      makeVacancy({ keySkills: ['CRM', 'B2B продажи'] }),
    );
    expect(r.score).toBe(20);
  });

  it('3 vacancy skills: confidence 0.7, max 28/40', () => {
    const r = scoreSkills(
      makeResume({ skills: ['CRM', 'B2B продажи', 'переговоры'] }),
      makeVacancy({ keySkills: ['CRM', 'B2B продажи', 'переговоры'] }),
    );
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
// TITLE: scoreTitle (raw 0-30, orchestrator scales to 0-25)
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
    expect(r.score).toBe(5);
  });

  it('abbreviation bonus: "программист" matches "разработчик"', () => {
    const r = scoreTitle(
      makeResume({ title: 'Программист Python' }),
      makeVacancy({ title: 'Разработчик Python' }),
    );
    expect(r.score).toBe(18);
  });

  it('stop words are excluded from tokenization', () => {
    const r = scoreTitle(
      makeResume({ title: 'Менеджер по продажам' }),
      makeVacancy({ title: 'Менеджер продаж' }),
    );
    expect(r.similarity).toBe(0.5);
  });

  it('bonus is capped at 5 (max one abbreviation match)', () => {
    const r = scoreTitle(
      makeResume({ title: 'Фронтенд-разработчик' }),
      makeVacancy({ title: 'Frontend developer' }),
    );
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
    const r = scoreSalary(
      makeResume({ salary: '125 000' }),
      makeVacancy({ salary: { min: 150000, max: 200000 } }),
    );
    expect(r.score).toBe(12);
    expect(r.reason).toBe('slightly-below');
  });

  it('way below (>20%) -> 5/15', () => {
    const r = scoreSalary(
      makeResume({ salary: '100 000' }),
      makeVacancy({ salary: { min: 150000, max: 200000 } }),
    );
    expect(r.score).toBe(5);
    expect(r.reason).toBe('below-range');
  });

  it('slightly above (within 20%) -> 10/15', () => {
    const r = scoreSalary(
      makeResume({ salary: '230 000' }),
      makeVacancy({ salary: { min: 150000, max: 200000 } }),
    );
    expect(r.score).toBe(10);
    expect(r.reason).toBe('slightly-above');
  });

  it('way above (>20%) -> 3/15', () => {
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
// EXPERIENCE: scoreExperience (raw 0-15, orchestrator scales to 0-10)
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
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 4, months: 6 } }] }),
      makeVacancy({ experience: { min: 5, max: 10 } }),
    );
    expect(r.score).toBe(10);
    expect(r.reason).toBe('slightly-below');
  });

  it('exactly at boundary (4.5 vs 5-1=4) -> slightly-below', () => {
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 4, months: 6 } }] }),
      makeVacancy({ experience: { min: 5, max: 10 } }),
    );
    expect(r.score).toBe(10);
  });

  it('significantly below min (>1 year) -> 3/15', () => {
    const r = scoreExperience(
      makeResume({ experience: [{ duration: { years: 2, months: 0 } }] }),
      makeVacancy({ experience: { min: 5, max: 10 } }),
    );
    expect(r.score).toBe(3);
    expect(r.reason).toBe('below-range');
  });

  it('overqualified (above max) -> 8/15 (soft penalty)', () => {
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
    expect(r.score).toBe(15);
    expect(r.reason).toBe('within-range');
  });

  it('parses string duration "3 года 6 месяцев"', () => {
    const r = scoreExperience(
      makeResume({ experience: [{ duration: '3 года 6 месяцев' }] }),
      makeVacancy({ experience: { min: 3, max: 5 } }),
    );
    expect(r.score).toBe(15);
  });
});

// ============================================================
// LOCATION: scoreLocation (0-15) -- F7.2
// ============================================================

describe('scoreLocation -- city matching', () => {
  it('same city "Москва" -> 15/15', () => {
    const r = scoreLocation(
      makeResume({ address: 'Москва' }),
      makeVacancy({ location: 'Москва' }),
    );
    expect(r.score).toBe(15);
    expect(r.reason).toBe('same-city');
  });

  it('same city "Санкт-Петербург" -> 15/15', () => {
    const r = scoreLocation(
      makeResume({ address: 'Санкт-Петербург' }),
      makeVacancy({ location: 'Санкт-Петербург' }),
    );
    expect(r.score).toBe(15);
  });

  it('same city via abbreviation: "МСК" and "Москва" -> 15/15', () => {
    const r = scoreLocation(
      makeResume({ address: 'МСК' }),
      makeVacancy({ location: 'Москва' }),
    );
    expect(r.score).toBe(15);
    expect(r.reason).toBe('same-city');
  });

  it('same city via abbreviation: "СПб" and "Санкт-Петербург" -> 15/15', () => {
    const r = scoreLocation(
      makeResume({ address: 'СПб' }),
      makeVacancy({ location: 'Санкт-Петербург' }),
    );
    expect(r.score).toBe(15);
  });

  it('nearby region: Москва vs Химки -> 12/15', () => {
    const r = scoreLocation(
      makeResume({ address: 'Москва' }),
      makeVacancy({ location: 'Химки' }),
    );
    expect(r.score).toBe(12);
    expect(r.reason).toBe('nearby-region');
  });

  it('nearby region: СПб vs Всеволожск -> 12/15', () => {
    const r = scoreLocation(
      makeResume({ address: 'Санкт-Петербург' }),
      makeVacancy({ location: 'Всеволожск' }),
    );
    expect(r.score).toBe(12);
    expect(r.reason).toBe('nearby-region');
  });

  it('different known cities: Москва vs Новосибирск -> 8/15', () => {
    const r = scoreLocation(
      makeResume({ address: 'Москва' }),
      makeVacancy({ location: 'Новосибирск' }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe('different-city');
  });

  it('different regions: Казань vs Екатеринбург -> 8/15', () => {
    const r = scoreLocation(
      makeResume({ address: 'Казань' }),
      makeVacancy({ location: 'Екатеринбург' }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe('different-city');
  });
});

describe('scoreLocation -- remote/hybrid', () => {
  it('remote matches remote -> 12/15', () => {
    const r = scoreLocation(
      makeResume({ address: 'Удаленная работа' }),
      makeVacancy({ location: 'Удаленно', schedule: 'remote' }),
    );
    expect(r.score).toBe(12);
    expect(r.reason).toBe('remote-remote');
  });

  it('resume remote + vacancy office -> 12/15 (remote can do office)', () => {
    const r = scoreLocation(
      makeResume({ workFormat: 'удаленная работа' }),
      makeVacancy({ location: 'Москва', schedule: 'office' }),
    );
    expect(r.score).toBe(12);
    expect(r.reason).toBe('remote-can-do-office');
  });

  it('resume office + vacancy remote -> 8/15 (office wants remote)', () => {
    const r = scoreLocation(
      makeResume({ address: 'Москва' }),
      makeVacancy({ location: 'Удаленно', schedule: 'remote' }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe('office-wants-remote');
  });

  it('hybrid + hybrid -> 13/15', () => {
    const r = scoreLocation(
      makeResume({ workFormat: 'гибрид' }),
      makeVacancy({ location: 'Москва, удаленно', schedule: 'hybrid' }),
    );
    expect(r.score).toBe(13);
    expect(r.reason).toBe('hybrid-hybrid');
  });

  it('hybrid + office -> 12/15', () => {
    const r = scoreLocation(
      makeResume({ workFormat: 'гибрид' }),
      makeVacancy({ location: 'Москва', schedule: 'office' }),
    );
    expect(r.score).toBe(12);
    expect(r.reason).toBe('hybrid-can-do-office');
  });
});

describe('scoreLocation -- unknown/missing', () => {
  it('no data on either side -> 8/15 neutral', () => {
    const r = scoreLocation(makeResume(), makeVacancy());
    expect(r.score).toBe(8);
    expect(r.reason).toBe('no-data');
  });

  it('no resume address -> 8/15 neutral', () => {
    const r = scoreLocation(
      makeResume(),
      makeVacancy({ location: 'Москва' }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe('no-resume-location');
  });

  it('no vacancy location -> 8/15 neutral', () => {
    const r = scoreLocation(
      makeResume({ address: 'Москва' }),
      makeVacancy(),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe('no-vacancy-location');
  });

  it('unknown city text -> 8/15 neutral', () => {
    const r = scoreLocation(
      makeResume({ address: 'какой-то населенный пункт' }),
      makeVacancy({ location: 'еще один городок' }),
    );
    expect(r.score).toBe(8);
    expect(r.reason).toBe('unknown-city');
  });
});

describe('identifyCity -- helper', () => {
  it('identifies "Москва"', () => {
    expect(identifyCity('Москва')).toBe('москва');
  });

  it('expands "МСК" to "москва"', () => {
    expect(identifyCity('МСК')).toBe('москва');
  });

  it('expands "СПб" to "санкт-петербург"', () => {
    expect(identifyCity('СПб')).toBe('санкт-петербург');
  });

  it('handles "Москва, Россия" (strips country)', () => {
    expect(identifyCity('Москва, Россия')).toBe('москва');
  });

  it('returns null for empty string', () => {
    expect(identifyCity('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(identifyCity(null)).toBeNull();
  });

  it('returns null for unknown city', () => {
    expect(identifyCity('Букингем')).toBeNull();
  });

  it('identifies "Нижний Новгород" as full form', () => {
    expect(identifyCity('Нижний Новгород')).toBe('нижний новгород');
  });

  it('identifies "НН" abbreviation', () => {
    expect(identifyCity('НН')).toBe('нижний новгород');
  });
});

describe('getRegion -- helper', () => {
  it('Москва region is "moscow"', () => {
    expect(getRegion('москва')).toBe('moscow');
  });

  it('Химки is in moscow region', () => {
    expect(getRegion('химки')).toBe('moscow');
  });

  it('СПб region is "spb"', () => {
    expect(getRegion('санкт-петербург')).toBe('spb');
  });

  it('null for unknown city', () => {
    expect(getRegion(null)).toBeNull();
  });

  it('different cities have different regions', () => {
    expect(getRegion('москва')).not.toBe(getRegion('санкт-петербург'));
  });
});

describe('detectWorkFormat -- helper', () => {
  it('detects remote from "Удаленно"', () => {
    expect(detectWorkFormat('Удаленно')).toBe('remote');
  });

  it('detects hybrid from "Гибрид"', () => {
    expect(detectWorkFormat('Гибрид')).toBe('hybrid');
  });

  it('detects hybrid from "Москва, удаленно"', () => {
    expect(detectWorkFormat('Москва, удаленно')).toBe('hybrid');
  });

  it('detects office from "Москва"', () => {
    expect(detectWorkFormat('Москва')).toBe('office');
  });

  it('returns unknown for empty', () => {
    expect(detectWorkFormat('')).toBe('unknown');
  });

  it('returns unknown for null', () => {
    expect(detectWorkFormat(null)).toBe('unknown');
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
    expect(() => normalizeSkillSet([null])).toThrow(TypeError);
  });
});
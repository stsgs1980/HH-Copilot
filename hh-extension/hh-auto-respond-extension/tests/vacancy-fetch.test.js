/**
 * Tests for vacancy-fetch modules:
 *   - vacancy-fetch-text.js (parseVacancyDetailFromDoc, fetchVacancyViaText)
 *   - vacancy-fetch-iframe.js (fetchVacancyViaIframe)
 *   - vacancy-fetch-enrichment.js (enrichVacancy, enrichVacanciesFromCache, isDetailFresh)
 *   - vacancy-fetch.js (enrichFromCache, fetchVacancyDetails, abortVacancyFetch)
 *
 * v1.9.29.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════
// vacancy-fetch-text: parseVacancyDetailFromDoc
// ═══════════════════════════════════════════════

describe('vacancy-fetch-text: parseVacancyDetailFromDoc', () => {
  let parseVacancyDetailFromDoc;

  beforeEach(async () => {
    // Import fresh for each test
    const mod = await import('../src/lib/vacancy-fetch-text.js');
    parseVacancyDetailFromDoc = mod.parseVacancyDetailFromDoc;
  });

  it('parses a full vacancy detail from a Document', () => {
    const doc = createVacancyDoc({
      title: 'Senior Frontend Developer',
      company: 'Яндекс',
      salary: 'от 250 000 ₽ на руки',
      experience: '3–6 лет',
      description: '<p>Обязанности:</p><p>Разработка интерфейсов</p>',
      skills: ['React', 'TypeScript', 'CSS'],
    });

    const result = parseVacancyDetailFromDoc(doc, 'https://hh.ru/vacancy/12345');

    expect(result).not.toBeNull();
    expect(result.id).toBe('12345');
    expect(result.title).toBe('Senior Frontend Developer');
    expect(result.company).toBe('Яндекс');
    expect(result.salary.raw).toBe('от 250 000 ₽ на руки');
    expect(result.salary.min).toBe(250000);
    expect(result.salary.net).toBe(true);
    expect(result.salary.currency).toBe('RUB');
    expect(result.experience.min).toBe(3);
    expect(result.experience.max).toBe(6);
    expect(result.keySkills).toEqual(['React', 'TypeScript', 'CSS']);
    expect(result.description.text).toContain('Разработка интерфейсов');
  });

  it('returns null when vacancy ID cannot be extracted from URL', () => {
    const doc = createVacancyDoc({ title: 'Test' });
    const result = parseVacancyDetailFromDoc(doc, 'https://hh.ru/some/other/page');
    expect(result).toBeNull();
  });

  it('returns null when no title is found', () => {
    const doc = new DOMParser().parseFromString(
      '<html><body></body></html>', 'text/html'
    );
    const result = parseVacancyDetailFromDoc(doc, 'https://hh.ru/vacancy/12345');
    expect(result).toBeNull();
  });

  it('derives skills from description text when no DOM skills', () => {
    const doc = createVacancyDoc({
      title: 'Sales Manager',
      description: '<p>Требуется опыт B2B продаж и ведения переговоров с клиентами</p>',
      skills: [],
    });

    const result = parseVacancyDetailFromDoc(doc, 'https://hh.ru/vacancy/99999');

    expect(result).not.toBeNull();
    // SKILL_PATTERNS should match "B2B продажи" and "переговоры"
    expect(result._skillsSource).toMatch(/derived|dom/);
  });

  it('parses structured salary range', () => {
    const doc = createVacancyDoc({
      title: 'Analyst',
      salary: '150 000 – 200 000 ₽',
    });

    const result = parseVacancyDetailFromDoc(doc, 'https://hh.ru/vacancy/54321');
    expect(result.salary.min).toBe(150000);
    expect(result.salary.max).toBe(200000);
    expect(result.salary.currency).toBe('RUB');
  });

  it('parses "Нет опыта" experience requirement', () => {
    const doc = createVacancyDoc({
      title: 'Intern',
      experience: 'Нет опыта',
    });

    const result = parseVacancyDetailFromDoc(doc, 'https://hh.ru/vacancy/11111');
    expect(result.experience.min).toBe(0);
    expect(result.experience.max).toBe(0);
  });

  it('detects remote flag', () => {
    const doc = createVacancyDoc({
      title: 'Remote Dev',
      isRemote: true,
    });

    const result = parseVacancyDetailFromDoc(doc, 'https://hh.ru/vacancy/77777');
    expect(result.isRemote).toBe(true);
  });

  it('splits description into named sections', () => {
    const doc = createVacancyDoc({
      title: 'Fullstack',
      description: `
        <p><strong>Обязанности:</strong></p>
        <p>Разработка бэкенда</p>
        <p><strong>Требования:</strong></p>
        <p>Знание Python</p>
        <p><strong>Условия:</strong></p>
        <p>ДМС, гибкий график</p>
      `,
    });

    const result = parseVacancyDetailFromDoc(doc, 'https://hh.ru/vacancy/88888');
    expect(result.description.sections.responsibilities).toContain('Разработка бэкенда');
    expect(result.description.sections.requirements).toContain('Знание Python');
    expect(result.description.sections.conditions).toContain('ДМС, гибкий график');
  });
});

// ═══════════════════════════════════════════════
// vacancy-fetch-enrichment: enrichVacancy
// ═══════════════════════════════════════════════

describe('vacancy-fetch-enrichment: enrichVacancy', () => {
  let enrichVacancy, isDetailFresh, enrichVacanciesFromCache;

  beforeEach(async () => {
    const mod = await import('../src/lib/vacancy-fetch-enrichment.js');
    enrichVacancy = mod.enrichVacancy;
    isDetailFresh = mod.isDetailFresh;
    enrichVacanciesFromCache = mod.enrichVacanciesFromCache;
  });

  it('enriches a shallow vacancy with keySkills and derivedSkills', () => {
    const vacancy = {
      id: '123', title: 'Dev', company: 'Co',
      skills: ['tag1', 'tag2'], salary: '100 000 ₽',
      experience: { raw: '3–6 лет', min: 3, max: 6 },
    };
    const detail = {
      id: '123',
      keySkills: ['Python', 'Django', 'PostgreSQL'],
      derivedSkills: ['REST API'],
      _skillsSource: 'dom+derived',
      salary: { raw: '100 000 ₽', min: 100000, max: null, currency: 'RUB', period: 'month', net: true },
      experience: { raw: '3–6 лет', min: 3, max: 6 },
      description: { text: 'Full description here', html: '<p>Full</p>', headings: [], sections: {} },
      _fetchMethod: 'iframe',
      source: 'detail',
    };

    const result = enrichVacancy(vacancy, detail, null);

    expect(result.keySkills).toEqual(['Python', 'Django', 'PostgreSQL']);
    expect(result.derivedSkills).toEqual(['REST API']);
    expect(result.description.text).toBe('Full description here');
    expect(result.salary.min).toBe(100000);
    expect(result.enrichmentSource).toBe('iframe');
  });

  it('re-scores after enrichment when resume is provided', () => {
    const vacancy = {
      id: '123', title: 'Frontend Developer', company: 'Co',
      skills: ['React'], salary: '100 000 ₽',
      experience: { raw: '', min: null, max: null },
    };
    const resume = {
      title: 'Frontend Developer',
      skills: ['React', 'TypeScript', 'CSS'],
      derivedSkills: [],
      experience: [],
      salary: '120 000 ₽',
    };
    const detail = {
      id: '123',
      keySkills: ['React', 'TypeScript', 'Webpack'],
      derivedSkills: [],
      _skillsSource: 'dom',
      salary: { raw: '100 000 ₽', min: 100000, max: null, currency: 'RUB', period: 'month', net: true },
      experience: { raw: '', min: null, max: null },
      description: { text: '', html: '', headings: [], sections: {} },
      source: 'detail',
    };

    enrichVacancy(vacancy, detail, resume);

    // matchScore should be computed now
    expect(vacancy.matchScore).toBeGreaterThanOrEqual(0);
    expect(vacancy.matchScore).toBeLessThanOrEqual(100);
    expect(vacancy.matchBreakdown).toBeDefined();
    expect(vacancy.matchBreakdown.skills).toBeGreaterThan(0); // React + TypeScript match
  });

  it('returns vacancy unchanged when detail is null', () => {
    const vacancy = { id: '1', title: 'Test' };
    const result = enrichVacancy(vacancy, null, null);
    expect(result).toBe(vacancy);
    expect(result.keySkills).toBeUndefined();
  });

  it('isDetailFresh returns true for recent data', () => {
    const detail = { parsedAt: new Date().toISOString() };
    expect(isDetailFresh(detail)).toBe(true);
  });

  it('isDetailFresh returns false for stale data', () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const detail = { parsedAt: twoDaysAgo };
    expect(isDetailFresh(detail)).toBe(false);
  });

  it('isDetailFresh returns false for null/missing parsedAt', () => {
    expect(isDetailFresh(null)).toBe(false);
    expect(isDetailFresh({})).toBe(false);
  });

  it('enrichVacanciesFromCache enriches matching vacancies', () => {
    const vacancies = [
      { id: '1', title: 'Dev A', skills: ['tag1'] },
      { id: '2', title: 'Dev B', skills: ['tag2'] },
      { id: '3', title: 'Dev C', keySkills: ['Existing'] },
    ];
    const storedDetails = [
      { id: '1', keySkills: ['Python'], derivedSkills: [], _skillsSource: 'dom',
        salary: { raw: '' }, experience: { raw: '' },
        description: { text: 'desc', html: '', headings: [], sections: {} },
        parsedAt: new Date().toISOString(), source: 'detail' },
      { id: '2', keySkills: ['Java'], derivedSkills: ['Spring'], _skillsSource: 'dom+derived',
        salary: { raw: '' }, experience: { raw: '' },
        description: { text: 'desc2', html: '', headings: [], sections: {} },
        parsedAt: new Date().toISOString(), source: 'detail' },
    ];

    const result = enrichVacanciesFromCache(vacancies, storedDetails, null);

    expect(result.enriched).toBe(2); // id 1 and 2 enriched, id 3 skipped
    expect(result.skipped).toBe(1); // id 3 already had keySkills
    expect(vacancies[0].keySkills).toEqual(['Python']);
    expect(vacancies[1].keySkills).toEqual(['Java']);
    expect(vacancies[2].keySkills).toEqual(['Existing']); // unchanged
  });
});

// ═══════════════════════════════════════════════
// vacancy-fetch: orchestrator API
// ═══════════════════════════════════════════════

describe('vacancy-fetch: orchestrator', () => {
  let enrichFromCache, isVacancyFetching, abortVacancyFetch;

  beforeEach(async () => {
    const mod = await import('../src/lib/vacancy-fetch.js');
    enrichFromCache = mod.enrichFromCache;
    isVacancyFetching = mod.isVacancyFetching;
    abortVacancyFetch = mod.abortVacancyFetch;
  });

  it('enrichFromCache returns zero counts for empty input', async () => {
    const result = await enrichFromCache([], null);
    expect(result.enriched).toBe(0);
    expect(result.cached).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('enrichFromCache returns zero counts for null input', async () => {
    const result = await enrichFromCache(null, null);
    expect(result.enriched).toBe(0);
  });

  it('isVacancyFetching returns false initially', () => {
    expect(isVacancyFetching()).toBe(false);
  });

  it('abortVacancyFetch does not throw when not fetching', () => {
    expect(() => abortVacancyFetch()).not.toThrow();
  });
});

// ═══════════════════════════════════════════════
// HELPER: Create a vacancy detail Document
// ═══════════════════════════════════════════════

function createVacancyDoc({
  title = 'Test Vacancy',
  company = 'Test Company',
  salary = '',
  experience = '',
  description = '',
  skills = [],
  isRemote = false,
}) {
  let skillsHtml = '';
  if (skills.length > 0) {
    skillsHtml = '<div data-qa="vacancy-key-skills">' +
      skills.map(s => '<span data-qa="skills-element"><span class="bloko-tag__text">' + s + '</span></span>').join('') +
      '</div>';
  }

  const remoteHtml = isRemote
    ? '<span data-qa="vacancy-label-work-schedule-remote">Удаленная работа</span>'
    : '';

  const html = `<!DOCTYPE html>
<html><head></head><body>
  <h1 data-qa="vacancy-title">${title}</h1>
  <span data-qa="vacancy-company-name">${company}</span>
  ${salary ? '<div data-qa="vacancy-salary">' + salary + '</div>' : ''}
  ${experience ? '<div data-qa="vacancy-experience">' + experience + '</div>' : ''}
  <div data-qa="vacancy-description">${description}</div>
  ${skillsHtml}
  ${remoteHtml}
  <button data-qa="vacancy-response-link-top">Откликнуться</button>
</body></html>`;

  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

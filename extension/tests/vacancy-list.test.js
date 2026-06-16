/**
 * TESTS: vacancy-list.js -- parseVacanciesFromPage + parseVacanciesOfTheDay
 * Uses jsdom to mock hh.ru DOM structure
 *
 * ANTI-MONOLITH exception (Rule 12): 295 lines.
 * Single cohesion block -- 14 tests for one parser (vacancy-list.js).
 * Splitting would break test readability without reducing complexity.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock storage before importing parsers
vi.mock('../src/lib/storage.js', () => ({
  getAppliedVacancies: vi.fn().mockResolvedValue([]),
  getBlacklistedCompanies: vi.fn().mockResolvedValue([]),
}));

vi.mock('../src/lib/match-scorer.js', () => ({
  computeMatchScore: vi.fn().mockReturnValue({ total: 75, breakdown: {} }),
}));

import { parseVacanciesFromPage, parseVacanciesOfTheDay } from '../src/parsers/vacancy-list.js';

/**
 * Build a mock vacancy card matching hh.ru search page DOM structure.
 */
function createSearchVacancyCard(opts = {}) {
  const card = document.createElement('div');
  card.setAttribute('data-qa', opts.dataQa || 'vacancy-serp__vacancy');
  card.innerHTML = `
    <a data-qa="serp-item__title" href="${opts.url || 'https://hh.ru/vacancy/12345678'}">${opts.title || 'Руководитель отдела продаж'}</a>
    <a data-qa="vacancy-serp__vacancy-employer" href="#">${opts.company || 'ООО ТестКомпания'}</a>
    <span data-qa="vacancy-serp__vacancy-address">${opts.location || 'Москва'}</span>
    <span data-qa="vacancy-serp__vacancy-work-experience-between1And3">${opts.experience || 'Опыт 1-3 года'}</span>
    <a data-qa="vacancy-serp__vacancy_response">Откликнуться</a>
  `;
  return card;
}

/**
 * Build a mock vacancy card matching hh.ru MAIN page DOM structure.
 * Key difference: data-qa has space-separated words, title link may lack data-qa.
 */
function createMainPageVacancyCard(opts = {}) {
  const card = document.createElement('div');
  // Main page uses space-separated data-qa!
  card.setAttribute('data-qa', 'vacancy-serp__vacancy vacancy-serp-item_clickme');
  card.innerHTML = `
    <a href="${opts.url || 'https://hh.ru/vacancy/98765432'}">${opts.title || 'РОП -- IT для медбизнеса'}</a>
    <span data-qa="vacancy-serp__vacancy-employer-text">${opts.company || 'Maicube'}</span>
    <span data-qa="vacancy-serp__vacancy-address">${opts.location || 'Москва'}</span>
    <span data-qa="vacancy-serp__vacancy-work-experience-between3And6">${opts.experience || 'Опыт 3-6 лет'}</span>
    <a data-qa="vacancy-serp__vacancy_response">Откликнуться</a>
  `;
  return card;
}

/**
 * Build a mock "Vacancy of the Day" block matching REAL hh.ru main page DOM.
 * Structure from console: title <div> is inside an <a> with tracking click-URL.
 *   <a href="content.hh.ru/api/v1/vacancy_of_the_day/click?vacancyId=XXX...">
 *     <div data-qa="vacancy_of_the_day_title">Title</div>
 *   </a>
 *   <div data-qa="vacancy_of_the_day_compensation">Salary</div>
 *   <div data-qa="vacancy_of_the_day_company">Company</div>
 */
function createVotDBlock(opts = {}) {
  const vacancyId = opts.vacancyId || '132537734';
  const clickUrl = opts.clickUrl || `https://content.hh.ru/api/v1/vacancy_of_the_day/click?vacancyId=${vacancyId}&contentId=21001&domainAreaId=1`;
  const wrapper = document.createElement('div');
  wrapper.className = 'vacancy-of-the-day-item';
  wrapper.innerHTML = `
    <div class="votd-inner">
      <a href="${clickUrl}">
        <div data-qa="vacancy_of_the_day_title">${opts.title || 'Курьер в Озон фреш'}</div>
      </a>
      <div data-qa="vacancy_of_the_day_compensation">${opts.salary || 'от 120 000 до 250 000 \u20BD'}</div>
      <div data-qa="vacancy_of_the_day_company">${opts.company || 'Ozon'}</div>
    </div>
  `;
  return wrapper;
}

// ===============================================
// parseVacanciesFromPage -- Search Page
// ===============================================

describe('parseVacanciesFromPage -- search page cards', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('parses a single search page vacancy card', async () => {
    document.body.appendChild(createSearchVacancyCard());

    const vacancies = await parseVacanciesFromPage(null);
    expect(vacancies.length).toBe(1);
    expect(vacancies[0].title).toBe('Руководитель отдела продаж');
    expect(vacancies[0].id).toBe('12345678');
    expect(vacancies[0].company).toBe('ООО ТестКомпания');
    expect(vacancies[0].hasReply).toBe(true);
  });

  it('parses multiple search page cards', async () => {
    for (let i = 0; i < 3; i++) {
      document.body.appendChild(createSearchVacancyCard({
        url: `https://hh.ru/vacancy/10000${i}`,
        title: `Вакансия ${i}`,
        company: `Компания ${i}`,
      }));
    }

    const vacancies = await parseVacanciesFromPage(null);
    expect(vacancies.length).toBe(3);
  });

  it('skips cards without title', async () => {
    const card = document.createElement('div');
    card.setAttribute('data-qa', 'vacancy-serp__vacancy');
    card.innerHTML = '<span>No title link here</span>';
    document.body.appendChild(card);

    const vacancies = await parseVacanciesFromPage(null);
    expect(vacancies.length).toBe(0);
  });

  it('skips cards without vacancy ID in URL', async () => {
    const card = document.createElement('div');
    card.setAttribute('data-qa', 'vacancy-serp__vacancy');
    card.innerHTML = '<a data-qa="serp-item__title" href="https://hh.ru/some/other/page">No vacancy ID</a>';
    document.body.appendChild(card);

    const vacancies = await parseVacanciesFromPage(null);
    expect(vacancies.length).toBe(0);
  });
});

// ===============================================
// parseVacanciesFromPage -- Main Page (space-separated data-qa)
// ===============================================

describe('parseVacanciesFromPage -- main page cards (space-separated data-qa)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('parses main page vacancy card with space-separated data-qa', async () => {
    document.body.appendChild(createMainPageVacancyCard());

    const vacancies = await parseVacanciesFromPage(null);
    expect(vacancies.length).toBe(1);
    expect(vacancies[0].title).toBe('РОП -- IT для медбизнеса');
    expect(vacancies[0].id).toBe('98765432');
    expect(vacancies[0].company).toBe('Maicube');
  });

  it('uses fallback href selector when no data-qa on title link', async () => {
    const card = document.createElement('div');
    card.setAttribute('data-qa', 'vacancy-serp__vacancy vacancy-serp-item_clickme');
    // No data-qa on <a> -- fallback must find it by href pattern
    card.innerHTML = `
      <a href="https://hh.ru/vacancy/111222333">Fallback Title</a>
      <span data-qa="vacancy-serp__vacancy-employer-text">Fallback Corp</span>
      <span data-qa="vacancy-serp__vacancy-address">Санкт-Петербург</span>
    `;
    document.body.appendChild(card);

    const vacancies = await parseVacanciesFromPage(null);
    expect(vacancies.length).toBe(1);
    expect(vacancies[0].title).toBe('Fallback Title');
    expect(vacancies[0].id).toBe('111222333');
  });

  it('parses mixed search + main page cards together', async () => {
    document.body.appendChild(createSearchVacancyCard({
      url: 'https://hh.ru/vacancy/100001',
      title: 'Search Card',
    }));
    document.body.appendChild(createMainPageVacancyCard({
      url: 'https://hh.ru/vacancy/200002',
      title: 'Main Page Card',
    }));

    const vacancies = await parseVacanciesFromPage(null);
    expect(vacancies.length).toBe(2);
    const titles = vacancies.map(v => v.title);
    expect(titles).toContain('Search Card');
    expect(titles).toContain('Main Page Card');
  });
});

// ===============================================
// parseVacanciesOfTheDay
// ===============================================

describe('parseVacanciesOfTheDay', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('parses a single VotD block with tracking click-URL', async () => {
    document.body.appendChild(createVotDBlock());

    const vacancies = await parseVacanciesOfTheDay(null);
    expect(vacancies.length).toBe(1);
    expect(vacancies[0].title).toBe('Курьер в Озон фреш');
    expect(vacancies[0].id).toBe('132537734');
    expect(vacancies[0].url).toBe('https://hh.ru/vacancy/132537734');
    expect(vacancies[0].company).toBe('Ozon');
    expect(vacancies[0].salary).toContain('120 000');
    expect(vacancies[0].source).toBe('votd');
  });

  it('parses VotD block with adsrv.hh.ru tracking URL', async () => {
    document.body.appendChild(createVotDBlock({
      clickUrl: 'https://adsrv.hh.ru/click?b=2090206&vacancyId=109478297&domainAreaId=1&source=vacancies_of_the_day',
      vacancyId: '109478297',
      title: 'Senior Developer',
      company: 'Yandex',
      salary: 'от 300 000 \u20BD',
    }));

    const vacancies = await parseVacanciesOfTheDay(null);
    expect(vacancies.length).toBe(1);
    expect(vacancies[0].id).toBe('109478297');
    expect(vacancies[0].url).toBe('https://hh.ru/vacancy/109478297');
    expect(vacancies[0].title).toBe('Senior Developer');
  });

  it('parses multiple VotD blocks', async () => {
    for (let i = 0; i < 3; i++) {
      document.body.appendChild(createVotDBlock({
        title: `VotD ${i}`,
        vacancyId: `77000${i}`,
        company: `Company ${i}`,
      }));
    }

    const vacancies = await parseVacanciesOfTheDay(null);
    expect(vacancies.length).toBe(3);
    const ids = vacancies.map(v => v.id);
    expect(ids).toContain('770000');
    expect(ids).toContain('770001');
    expect(ids).toContain('770002');
  });

  it('returns empty array when no VotD blocks exist', async () => {
    const vacancies = await parseVacanciesOfTheDay(null);
    expect(vacancies).toEqual([]);
  });

  it('skips VotD blocks without extractable vacancy ID', async () => {
    const block = document.createElement('div');
    block.innerHTML = `
      <div data-qa="vacancy_of_the_day_title">No ID Vacancy</div>
      <div data-qa="vacancy_of_the_day_compensation">от 50 000 \u20BD</div>
      <div data-qa="vacancy_of_the_day_company">Test</div>
      <!-- No link with vacancy ID -- no <a> parent, no vacancyId param -->
    `;
    document.body.appendChild(block);

    const vacancies = await parseVacanciesOfTheDay(null);
    expect(vacancies.length).toBe(0);
  });

  it('sets canonical hh.ru URL for VotD items (not tracking URL)', async () => {
    document.body.appendChild(createVotDBlock({ vacancyId: '12345678' }));

    const vacancies = await parseVacanciesOfTheDay(null);
    expect(vacancies[0].url).toBe('https://hh.ru/vacancy/12345678');
    // URL must NOT be the tracking URL
    expect(vacancies[0].url).not.toContain('content.hh.ru');
    expect(vacancies[0].url).not.toContain('adsrv.hh.ru');
  });

  it('extracts ID from parent element id attribute (sponsored/adsrv VotD)', async () => {
    // Sponsored VotD: adsrv.hh.ru/click?meta=... -- NO vacancyId in URL
    // But parent <div id="131408939"> has the vacancy ID
    const wrapper = document.createElement('div');
    wrapper.id = '131408939';
    wrapper.className = 'vacancy-of-the-day-sponsored';
    wrapper.innerHTML = `
      <div class="votd-inner">
        <a href="https://adsrv.hh.ru/click?b=2091117&meta=pQNVxNN0As4hRaEh9OAXo1NOzBrasz1EJyRKTSE2OxtDc9TdIEjg">
          <div data-qa="vacancy_of_the_day_title">Спонсируемая вакансия</div>
        </a>
        <div data-qa="vacancy_of_the_day_compensation">от 200 000 \u20BD</div>
        <div data-qa="vacancy_of_the_day_company">Спонсор Corp</div>
      </div>
    `;
    document.body.appendChild(wrapper);

    const vacancies = await parseVacanciesOfTheDay(null);
    expect(vacancies.length).toBe(1);
    expect(vacancies[0].id).toBe('131408939');
    expect(vacancies[0].url).toBe('https://hh.ru/vacancy/131408939');
    expect(vacancies[0].title).toBe('Спонсируемая вакансия');
  });
});

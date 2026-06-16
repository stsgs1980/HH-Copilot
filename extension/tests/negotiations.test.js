/**
 * TESTS: negotiations parser + diagnostic
 * Covers F1.4 acceptance criteria:
 *   - Selectors find elements with primary + fallback chain
 *   - diagnoseNegotiationsDOM returns structured dump
 *   - Correct with long lists (50+ items) -- anti-hallucination criterion
 *
 * DOM samples are based on docs/research/04-negotiations-dom-analysis.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HH_SELECTORS, findElement, findAllElements } from '../src/lib/selectors.js';
import {
  parseSingleItem,
  findListContainer,
  findNegotiationItems,
  parseNegotiations,
} from '../src/parsers/negotiations.js';
import { diagnoseNegotiationsDOM } from '../src/parsers/negotiations-diagnostic.js';

// ===============================================
// DOM fixtures
// ===============================================

/**
 * Build one negotiations-item element matching the documented DOM structure.
 *
 * @param {Object} opts
 * @param {string} opts.vacancyTitle
 * @param {string} opts.vacancyId
 * @param {string} opts.company
 * @param {string} opts.date
 * @param {string} opts.statusQa - e.g. "negotiations-tag negotiations-item-not-viewed"
 * @param {string} opts.statusText
 * @returns {HTMLDivElement}
 */
function buildItem(opts) {
  const item = document.createElement('div');
  item.setAttribute('data-qa', 'negotiations-item');

  // Tag (status badge)
  const tag = document.createElement('span');
  tag.setAttribute('data-qa', opts.statusQa);
  tag.textContent = opts.statusText;
  item.appendChild(tag);

  // Vacancy link
  const vacancy = document.createElement('a');
  vacancy.setAttribute('data-qa', 'negotiations-item-vacancy');
  vacancy.setAttribute('href', '/vacancy/' + opts.vacancyId + '?hhtmFrom=negotiation_list');
  vacancy.textContent = opts.vacancyTitle;
  item.appendChild(vacancy);

  // Company
  const company = document.createElement('span');
  company.setAttribute('data-qa', 'negotiations-item-company');
  company.textContent = opts.company;
  item.appendChild(company);

  // Date
  const date = document.createElement('span');
  date.setAttribute('data-qa', 'negotiations-item-date');
  date.textContent = opts.date;
  item.appendChild(date);

  return item;
}

/**
 * Build a full negotiations page DOM inside document.body.
 *
 * @param {number} itemCount - how many items to render
 * @param {Object} [overrides] - per-item override map { idx: partialOpts }
 * @returns {HTMLDivElement} the list container
 */
function buildPage(itemCount, overrides) {
  overrides = overrides || {};
  document.body.innerHTML = '';

  const list = document.createElement('div');
  list.setAttribute('data-qa', 'negotiations-list');

  for (let i = 0; i < itemCount; i++) {
    const override = overrides[i] || {};
    const item = buildItem({
      vacancyTitle: override.vacancyTitle || ('Frontend Developer #' + i),
      vacancyId: override.vacancyId || String(1000000 + i),
      company: override.company || ('Company ' + i),
      date: override.date || '9 iyunya',
      statusQa: override.statusQa || 'negotiations-tag negotiations-item-not-viewed',
      statusText: override.statusText || 'Ne prosmotren',
    });
    list.appendChild(item);
  }

  document.body.appendChild(list);
  return list;
}

// ===============================================
// SELECTORS
// ===============================================

describe('HH_SELECTORS -- negotiations', () => {
  it('has all 8 negotiations selector keys', () => {
    expect(HH_SELECTORS.negotiationsList).toBeDefined();
    expect(HH_SELECTORS.negotiationsItem).toBeDefined();
    expect(HH_SELECTORS.negotiationsItemCheckbox).toBeDefined();
    expect(HH_SELECTORS.negotiationsItemVacancy).toBeDefined();
    expect(HH_SELECTORS.negotiationsItemCompany).toBeDefined();
    expect(HH_SELECTORS.negotiationsItemDate).toBeDefined();
    expect(HH_SELECTORS.negotiationsItemTag).toBeDefined();
    expect(HH_SELECTORS.negotiationsEmployerStats).toBeDefined();
  });

  it('each selector has at least one fallback (chain length >= 2)', () => {
    // Anti-hallucination: no single-point-of-failure selector
    const keys = [
      'negotiationsList', 'negotiationsItem', 'negotiationsItemVacancy',
      'negotiationsItemCompany', 'negotiationsItemDate', 'negotiationsItemTag',
    ];
    for (const k of keys) {
      expect(HH_SELECTORS[k].length).toBeGreaterThanOrEqual(2);
    }
  });

  it('all selectors use data-qa as primary (not hashed classes)', () => {
    // Anti-hallucination criterion: data-qa stable, no Magritte hashed classes
    const keys = ['negotiationsList', 'negotiationsItem', 'negotiationsItemVacancy',
      'negotiationsItemCompany', 'negotiationsItemDate', 'negotiationsItemTag'];
    for (const k of keys) {
      const first = HH_SELECTORS[k][0];
      expect(first).toContain('data-qa');
    }
  });
});

describe('findElement / findAllElements -- negotiations', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('findElement finds list container via primary data-qa', () => {
    buildPage(1);
    const list = findElement('negotiationsList');
    expect(list).not.toBeNull();
    expect(list.getAttribute('data-qa')).toBe('negotiations-list');
  });

  it('findAllElements returns all negotiation items', () => {
    buildPage(3);
    const items = findAllElements('negotiationsItem');
    expect(items.length).toBe(3);
  });

  it('returns empty array when nothing matches', () => {
    const items = findAllElements('negotiationsItem');
    expect(items).toEqual([]);
  });

  it('findElement returns null when list absent', () => {
    const list = findElement('negotiationsList');
    expect(list).toBeNull();
  });
});

// ===============================================
// PARSER
// ===============================================

describe('parseSingleItem', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts all fields from a well-formed item', () => {
    buildPage(1, {
      0: {
        vacancyTitle: 'Senior Backend Engineer',
        vacancyId: '133218911',
        company: 'Yandex',
        date: '15 iyunya',
        statusQa: 'negotiations-tag negotiations-item-invite',
        statusText: 'Priglashenie',
      }
    });
    const item = document.querySelector('[data-qa="negotiations-item"]');
    const parsed = parseSingleItem(item, 0);

    expect(parsed).not.toBeNull();
    expect(parsed.vacancyTitle).toBe('Senior Backend Engineer');
    expect(parsed.vacancyId).toBe('133218911');
    expect(parsed.vacancyUrl).toContain('/vacancy/133218911');
    expect(parsed.company).toBe('Yandex');
    expect(parsed.date).toBe('15 iyunya');
    expect(parsed.status).toBe('invite');
    expect(parsed.statusText).toBe('Priglashenie');
    expect(parsed.unread).toBe(true);
    expect(parsed.id).toBe('133218911');
  });

  it('extracts discard status correctly', () => {
    buildPage(1, {
      0: {
        statusQa: 'negotiations-tag negotiations-item-discard',
        statusText: 'Otkaz',
      }
    });
    const item = document.querySelector('[data-qa="negotiations-item"]');
    const parsed = parseSingleItem(item, 0);

    expect(parsed.status).toBe('discard');
    expect(parsed.statusText).toBe('Otkaz');
    expect(parsed.unread).toBe(false);
  });

  it('extracts viewed status', () => {
    buildPage(1, {
      0: {
        statusQa: 'negotiations-tag negotiations-item-viewed',
        statusText: 'Prosmotren',
      }
    });
    const item = document.querySelector('[data-qa="negotiations-item"]');
    const parsed = parseSingleItem(item, 0);

    expect(parsed.status).toBe('viewed');
    expect(parsed.unread).toBe(false);
  });

  it('handles missing tag (status=unknown, still parses other fields)', () => {
    document.body.innerHTML = '';
    const list = document.createElement('div');
    list.setAttribute('data-qa', 'negotiations-list');

    const item = document.createElement('div');
    item.setAttribute('data-qa', 'negotiations-item');

    const vac = document.createElement('a');
    vac.setAttribute('data-qa', 'negotiations-item-vacancy');
    vac.setAttribute('href', '/vacancy/999');
    vac.textContent = 'Some Vacancy';
    item.appendChild(vac);

    const comp = document.createElement('span');
    comp.setAttribute('data-qa', 'negotiations-item-company');
    comp.textContent = 'Some Company';
    item.appendChild(comp);

    list.appendChild(item);
    document.body.appendChild(list);

    const parsed = parseSingleItem(item, 0);
    expect(parsed).not.toBeNull();
    expect(parsed.status).toBe('unknown');
    expect(parsed.vacancyTitle).toBe('Some Vacancy');
    expect(parsed.company).toBe('Some Company');
  });

  it('returns null for completely empty item (anti-hallucination: no ghost rows)', () => {
    const item = document.createElement('div');
    item.setAttribute('data-qa', 'negotiations-item');
    // no children, no text
    const parsed = parseSingleItem(item, 0);
    expect(parsed).toBeNull();
  });

  it('handles null item gracefully (does not throw)', () => {
    expect(() => parseSingleItem(null, 0)).not.toThrow();
  });

  it('uses fallback ID when vacancyId cannot be extracted', () => {
    document.body.innerHTML = '';
    const list = document.createElement('div');
    list.setAttribute('data-qa', 'negotiations-list');
    const item = document.createElement('div');
    item.setAttribute('data-qa', 'negotiations-item');

    const vac = document.createElement('a');
    vac.setAttribute('data-qa', 'negotiations-item-vacancy');
    vac.setAttribute('href', '/not-a-vacancy-url'); // no /vacancy/{id}
    vac.textContent = 'Title';
    item.appendChild(vac);

    list.appendChild(item);
    document.body.appendChild(list);

    const parsed = parseSingleItem(item, 7);
    expect(parsed.id).toBe('neg-7');
  });
});

describe('findListContainer / findNegotiationItems', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('findListContainer returns list element', () => {
    buildPage(2);
    const list = findListContainer(document);
    expect(list).not.toBeNull();
    expect(list.getAttribute('data-qa')).toBe('negotiations-list');
  });

  it('findNegotiationItems returns array of item elements', () => {
    buildPage(3);
    const items = findNegotiationItems(document);
    expect(items.length).toBe(3);
    items.forEach(it => expect(it.getAttribute('data-qa')).toBe('negotiations-item'));
  });

  it('findNegotiationItems returns [] when list is absent', () => {
    const items = findNegotiationItems(document);
    expect(items).toEqual([]);
  });
});

describe('parseNegotiations', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('parses all items on the page', async () => {
    buildPage(5);
    const result = await parseNegotiations();
    expect(result.length).toBe(5);
    expect(result[0].vacancyTitle).toBe('Frontend Developer #0');
    expect(result[4].vacancyTitle).toBe('Frontend Developer #4');
  });

  it('returns [] when no list container', async () => {
    const result = await parseNegotiations();
    expect(result).toEqual([]);
  });
});

// ===============================================
// 50+ ITEMS -- ANTI-HALLUCINATION CRITERION
// ===============================================

describe('Long lists (50+ items) -- anti-hallucination', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('parses 50 items without losing any', () => {
    buildPage(50);
    const items = findNegotiationItems(document);
    expect(items.length).toBe(50);
  });

  it('parses 100 items without losing any', () => {
    buildPage(100);
    const items = findNegotiationItems(document);
    expect(items.length).toBe(100);
  });

  it('parseSingleItem works correctly for item #75 (long list)', () => {
    buildPage(100, {
      75: {
        vacancyTitle: 'Senior QA Engineer',
        vacancyId: '777777',
        company: 'Sber',
        date: '1 maya',
        statusQa: 'negotiations-tag negotiations-item-discard',
        statusText: 'Otkaz',
      }
    });
    const items = findNegotiationItems(document);
    const parsed = parseSingleItem(items[75], 75);

    expect(parsed).not.toBeNull();
    expect(parsed.vacancyTitle).toBe('Senior QA Engineer');
    expect(parsed.vacancyId).toBe('777777');
    expect(parsed.company).toBe('Sber');
    expect(parsed.status).toBe('discard');
  });

  it('mixed status distribution counts correctly (100 items, 4 statuses)', () => {
    const overrides = {};
    const statuses = ['not-viewed', 'viewed', 'discard', 'invite'];
    for (let i = 0; i < 100; i++) {
      const st = statuses[i % 4];
      overrides[i] = {
        statusQa: 'negotiations-tag negotiations-item-' + st,
        statusText: st,
      };
    }
    buildPage(100, overrides);

    const items = findNegotiationItems(document);
    const counts = { 'not-viewed': 0, 'viewed': 0, 'discard': 0, 'invite': 0 };
    for (let i = 0; i < items.length; i++) {
      const parsed = parseSingleItem(items[i], i);
      counts[parsed.status]++;
    }
    // 100 items, 4 statuses evenly distributed = 25 each
    expect(counts['not-viewed']).toBe(25);
    expect(counts['viewed']).toBe(25);
    expect(counts['discard']).toBe(25);
    expect(counts['invite']).toBe(25);
  });

  it('parseNegotiations returns all 50 items with unique IDs', async () => {
    buildPage(50);
    const result = await parseNegotiations();
    expect(result.length).toBe(50);
    const ids = result.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(50);
  });
});

// ===============================================
// DIAGNOSTIC
// ===============================================

describe('diagnoseNegotiationsDOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns structured object with expected top-level keys', () => {
    buildPage(3);
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });

    expect(diag).toHaveProperty('timestamp');
    expect(diag).toHaveProperty('selectors');
    expect(diag).toHaveProperty('listContainer');
    expect(diag).toHaveProperty('items');
    expect(diag).toHaveProperty('statuses');
    expect(diag).toHaveProperty('rawScan');
  });

  it('reports listContainer.found=true when list present', () => {
    buildPage(2);
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });
    expect(diag.listContainer.found).toBe(true);
    expect(diag.listContainer.tag).toBe('DIV');
    expect(diag.listContainer.dataQa).toBe('negotiations-list');
  });

  it('reports listContainer.found=false when list absent', () => {
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => null,
      findItems: () => [],
      parseItem: () => null,
    });
    expect(diag.listContainer.found).toBe(false);
  });

  it('probes all 8 selector keys', () => {
    buildPage(1);
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });
    const expectedKeys = [
      'negotiationsList',
      'negotiationsItem',
      'negotiationsItemCheckbox',
      'negotiationsItemVacancy',
      'negotiationsItemCompany',
      'negotiationsItemDate',
      'negotiationsItemTag',
      'negotiationsEmployerStats',
    ];
    for (const k of expectedKeys) {
      expect(diag.selectors).toHaveProperty(k);
      expect(diag.selectors[k]).toHaveProperty('found');
      expect(diag.selectors[k]).toHaveProperty('matchedSelector');
      expect(diag.selectors[k]).toHaveProperty('chainLength');
    }
  });

  it('items.totalFound and items.parsedOk are correct (5 items)', () => {
    buildPage(5);
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });
    expect(diag.items.totalFound).toBe(5);
    expect(diag.items.parsedOk).toBe(5);
    expect(diag.items.empty).toBe(0);
  });

  it('sample size limits sample array length', () => {
    buildPage(20);
    const diag = diagnoseNegotiationsDOM({
      itemSampleSize: 3,
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });
    expect(diag.items.sample.length).toBe(3);
    expect(diag.items.sample[0].index).toBe(0);
    expect(diag.items.sample[2].index).toBe(2);
  });

  it('statuses.unique and statuses.counts correct for mixed statuses', () => {
    buildPage(8, {
      0: { statusQa: 'negotiations-tag negotiations-item-not-viewed', statusText: 'a' },
      1: { statusQa: 'negotiations-tag negotiations-item-not-viewed', statusText: 'a' },
      2: { statusQa: 'negotiations-tag negotiations-item-viewed', statusText: 'b' },
      3: { statusQa: 'negotiations-tag negotiations-item-discard', statusText: 'c' },
      4: { statusQa: 'negotiations-tag negotiations-item-invite', statusText: 'd' },
      5: { statusQa: 'negotiations-tag negotiations-item-invite', statusText: 'd' },
      6: { statusQa: 'negotiations-tag negotiations-item-invite', statusText: 'd' },
      7: { statusQa: 'negotiations-tag negotiations-item-not-viewed', statusText: 'a' },
    });
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });

    expect(diag.statuses.unique.sort()).toEqual(['discard', 'invite', 'not-viewed', 'viewed']);
    expect(diag.statuses.counts['not-viewed']).toBe(3);
    expect(diag.statuses.counts['viewed']).toBe(1);
    expect(diag.statuses.counts['discard']).toBe(1);
    expect(diag.statuses.counts['invite']).toBe(3);
  });

  it('rawScan.dataQaContainingNegotiations lists unique data-qa values', () => {
    buildPage(2);
    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });

    // Expect at least: negotiations-list, negotiations-item, negotiations-item-vacancy,
    // negotiations-item-company, negotiations-item-date, and one tag (with status suffix)
    expect(diag.rawScan.dataQaContainingNegotiations.length).toBeGreaterThanOrEqual(5);
    expect(diag.rawScan.dataQaContainingNegotiations).toContain('negotiations-list');
    expect(diag.rawScan.dataQaContainingNegotiations).toContain('negotiations-item');
  });

  it('handles 100 items correctly (anti-hallucination: long lists)', () => {
    buildPage(100);
    const diag = diagnoseNegotiationsDOM({
      itemSampleSize: 5,
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });
    expect(diag.items.totalFound).toBe(100);
    expect(diag.items.parsedOk).toBe(100);
    expect(diag.items.empty).toBe(0);
    expect(diag.items.sample.length).toBe(5);
  });

  it('counts empty items correctly when some fail to parse', () => {
    buildPage(3);
    // Inject one empty item at the end
    const list = document.querySelector('[data-qa="negotiations-list"]');
    const empty = document.createElement('div');
    empty.setAttribute('data-qa', 'negotiations-item');
    list.appendChild(empty);

    const diag = diagnoseNegotiationsDOM({
      findListContainer: () => findListContainer(document),
      findItems: () => findNegotiationItems(document),
      parseItem: (el, idx) => parseSingleItem(el, idx),
    });
    expect(diag.items.totalFound).toBe(4);
    expect(diag.items.parsedOk).toBe(3);
    expect(diag.items.empty).toBe(1);
  });
});

/**
 * TESTS: selectors.js
 * Tests selector matching against mock DOM -- verifies ~= word-match, fallbacks
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HH_SELECTORS, findElement, findAllElements } from '../src/lib/selectors.js';

describe('HH_SELECTORS', () => {
  it('has vacancyCard selectors', () => {
    expect(HH_SELECTORS.vacancyCard).toBeDefined();
    expect(HH_SELECTORS.vacancyCard.length).toBeGreaterThan(0);
  });

  it('has Vacancy of the Day selectors', () => {
    expect(HH_SELECTORS.vacancyOfTheDayCard).toBeDefined();
    expect(HH_SELECTORS.vacancyOfTheDayTitle).toBeDefined();
    expect(HH_SELECTORS.vacancyOfTheDayCompensation).toBeDefined();
    expect(HH_SELECTORS.vacancyOfTheDayCompany).toBeDefined();
    expect(HH_SELECTORS.vacancyOfTheDayReply).toBeDefined();
  });

  it('vacancyCard includes ~= word-match selector', () => {
    const hasWordMatch = HH_SELECTORS.vacancyCard.some(s => s.includes('~='));
    expect(hasWordMatch).toBe(true);
  });

  it('vacancyTitleLink includes fallback href selector', () => {
    const hasHrefFallback = HH_SELECTORS.vacancyTitleLink.some(s => s.includes('href*'));
    expect(hasHrefFallback).toBe(true);
  });
});

describe('findElement -- word-match ~= selector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('finds element with space-separated data-qa using ~=', () => {
    // This is the exact case from hh.ru main page:
    // data-qa="vacancy-serp__vacancy vacancy-serp-item_clickme"
    const div = document.createElement('div');
    div.setAttribute('data-qa', 'vacancy-serp__vacancy vacancy-serp-item_clickme');
    div.textContent = 'Test Vacancy';
    document.body.appendChild(div);

    const found = findElement('vacancyCard');
    expect(found).not.toBeNull();
    expect(found.textContent).toBe('Test Vacancy');
  });

  it('finds element with exact data-qa match', () => {
    const div = document.createElement('div');
    div.setAttribute('data-qa', 'vacancy-serp__vacancy');
    div.textContent = 'Exact Match';
    document.body.appendChild(div);

    const found = findElement('vacancyCard');
    expect(found).not.toBeNull();
    expect(found.textContent).toBe('Exact Match');
  });

  it('finds Vacancy of the Day title', () => {
    const div = document.createElement('div');
    div.setAttribute('data-qa', 'vacancy_of_the_day_title');
    div.textContent = 'Курьер в Озон фреш';
    document.body.appendChild(div);

    const found = findElement('vacancyOfTheDayTitle');
    expect(found).not.toBeNull();
    expect(found.textContent).toBe('Курьер в Озон фреш');
  });
});

describe('findAllElements -- multiple cards', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('finds all vacancy cards with space-separated data-qa', () => {
    for (let i = 0; i < 5; i++) {
      const div = document.createElement('div');
      div.setAttribute('data-qa', 'vacancy-serp__vacancy vacancy-serp-item_clickme');
      div.textContent = 'Vacancy ' + i;
      document.body.appendChild(div);
    }

    const cards = findAllElements('vacancyCard');
    expect(cards.length).toBe(5);
  });

  it('returns empty array when nothing matches', () => {
    const cards = findAllElements('vacancyCard');
    expect(cards).toEqual([]);
  });
});

/**
 * PARSER: VACANCY LIST HELPERS
 * ==============================
 * Shared helpers for vacancy list parsing: schedule detection,
 * card traversal, applied/blacklist lookup, match scoring.
 *
 * Split from vacancy-list.js (AHG Rule 12).
 * v1.9.41.0
 */

import { findElement } from '../lib/selectors.js';
import { getBlacklistedCompanies, getAppliedVacancies } from '../lib/storage.js';
import { computeMatchScore } from '../lib/match-scorer.js';

/**
 * Detect work schedule from location/address text.
 * v1.9.38.0: Extracted for schedule filter in sidebar.
 *
 * hh.ru location patterns:
 *   "Москва" -> office
 *   "Москва, удаленно" -> hybrid
 *   "Удаленно" -> remote
 *   "Можно удаленно" -> remote
 *
 * @param {string} locationText -- raw location string from vacancy card
 * @returns {'remote'|'hybrid'|'office'|'unknown'}
 */
export function detectSchedule(locationText) {
  if (!locationText) return 'unknown';
  const lower = locationText.toLowerCase();
  const hasRemote = /удал[её]нн|remote|дистанцион/.test(lower);
  const hasCity = /[а-яё]{3,}/.test(lower.replace(/удал[её]нн|remote|дистанцион/g, '').trim());
  if (hasRemote && hasCity) return 'hybrid';
  if (hasRemote) return 'remote';
  if (hasCity) return 'office';
  return 'unknown';
}

/**
 * Find title link element within a vacancy card.
 * Tries standard data-qa selectors first, then falls back to any <a>
 * linking to /vacancy/ (needed on main page where data-qa may differ).
 *
 * @param {Element} card
 * @returns {Element|null}
 */
export function findTitleLink(card) {
  // Standard selectors: data-qa="serp-item__title" or "vacancy-serp__vacancy-title"
  const titleEl = findElement('vacancyTitleLink', card);
  if (titleEl) return titleEl;

  // Fallback: find any <a> inside card that links to a vacancy detail page
  const links = card.querySelectorAll('a[href*="/vacancy/"]');
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    if (/\/vacancy\/\d+/.test(href)) return link;
  }

  return null;
}

/**
 * Load applied vacancies and blacklisted companies in one go.
 * Returns empty arrays on error (best-effort).
 *
 * @returns {Promise<{appliedIds: string[], blacklisted: string[]}>}
 */
export async function loadAppliedAndBlacklisted() {
  try {
    const [appliedIds, blacklisted] = await Promise.all([
      getAppliedVacancies(),
      getBlacklistedCompanies(),
    ]);
    return { appliedIds, blacklisted };
  } catch (_e) {
    return { appliedIds: [], blacklisted: [] };
  }
}

/**
 * Apply status (applied/blacklisted) and match score to a vacancy
 * object, in-place where applicable.
 *
 * @param {Object} vacancy -- mutated: status + matchScore
 * @param {string[]} appliedIds
 * @param {string[]} blacklisted
 * @param {Object|null} resume -- for match scoring
 */
export function applyStatusAndScore(vacancy, appliedIds, blacklisted, resume) {
  if (appliedIds.includes(vacancy.id)) vacancy.status = 'applied';
  if (blacklisted.includes(vacancy.company)) vacancy.status = 'blacklisted';

  if (resume) {
    try {
      const score = computeMatchScore(resume, vacancy);
      vacancy.matchScore = score.total;
    } catch (_e) {
      // score failure is non-fatal
    }
  }
}

/**
 * Sort vacancies: highest match score first, then 'new' before
 * 'applied'/'blacklisted' at equal scores.
 *
 * @param {Object[]} vacancies -- sorted in-place
 */
export function sortVacanciesByScore(vacancies) {
  vacancies.sort((a, b) => {
    const scoreA = a.matchScore != null ? a.matchScore : -1;
    const scoreB = b.matchScore != null ? b.matchScore : -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    if (a.status === 'new' && b.status !== 'new') return -1;
    if (b.status === 'new' && a.status !== 'new') return 1;
    return 0;
  });
}

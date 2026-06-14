/**
 * VACANCY FETCH -- Enrichment Logic
 * ===================================
 * Merges deep vacancy detail data into shallow SERP vacancy objects.
 * When a vacancy is parsed from a search results card, it only has
 * 2-5 tag skills and raw salary/experience strings. This module
 * enriches it with data from a full detail parse:
 *   - keySkills[] (10-20+ skills from vacancy detail page)
 *   - derivedSkills[] (skills mined from description text)
 *   - description (full text + sections)
 *   - structured salary { min, max, currency, period, net }
 *   - structured experience { min, max }
 *   - employment type, schedule, remote flag
 *
 * After enrichment, the vacancy object has the same shape as if
 * the user had visited the detail page directly.
 *
 * v1.9.29.0
 */

import { createLogger } from './anti-hallucination.js';
import { computeMatchScore } from './match-scorer.js';

const enrichLog = createLogger('VacEnrich');

/** Max age of cached detail data to use for enrichment (24 hours in ms) */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Enrich a shallow vacancy with data from a detail object.
 * Merges detail fields into the vacancy without overwriting
 * SERP-only data (like hasReply, status, source).
 *
 * After merging, recomputes matchScore if resume is provided.
 *
 * @param {Object} vacancy -- Shallow vacancy from vacancy-list parser
 * @param {Object} detail -- Full vacancy detail from fetch/cache
 * @param {Object|null} resume -- Active resume for re-scoring (optional)
 * @returns {Object} The enriched vacancy (mutated in place, also returned)
 */
export function enrichVacancy(vacancy, detail, resume) {
  if (!vacancy || !detail) return vacancy;

  // -- Skills enrichment (the most impactful) --
  if (detail.keySkills && detail.keySkills.length > 0) {
    vacancy.keySkills = detail.keySkills;
  }
  if (detail.derivedSkills && detail.derivedSkills.length > 0) {
    vacancy.derivedSkills = detail.derivedSkills;
  }
  if (detail._skillsSource) {
    vacancy._skillsSource = detail._skillsSource;
  }

  // -- Description --
  if (detail.description && detail.description.text) {
    vacancy.description = detail.description;
  }

  // -- Structured salary (merge into top-level salary field) --
  if (detail.salary && typeof detail.salary === 'object' && detail.salary.raw) {
    // Merge: keep the display string from SERP in .raw, add structured data
    if (typeof vacancy.salary === 'string') {
      vacancy.salary = { raw: vacancy.salary, min: null, max: null, currency: 'RUB', period: 'month', net: true };
    }
    // Overwrite with structured data from detail (keeps .raw if already set)
    vacancy.salary = { ...vacancy.salary, ...detail.salary };
  }

  // -- Structured experience (merge into top-level experience field) --
  if (detail.experience && typeof detail.experience === 'object' && detail.experience.raw) {
    vacancy.experience = { ...vacancy.experience, ...detail.experience };
  }

  // -- Location (detail page has more precise address with map) --
  if (detail.location && (!vacancy.location || vacancy.location.length < detail.location.length)) {
    vacancy.location = detail.location;
  }

  // -- Employment details --
  if (detail.employment) vacancy.employment = detail.employment;
  if (detail.schedule) vacancy.schedule = detail.schedule;
  if (detail.isRemote !== undefined) vacancy.isRemote = detail.isRemote;
  if (detail.hiringFormat) vacancy.hiringFormat = detail.hiringFormat;

  // -- Company URL --
  if (detail.companyUrl) vacancy.companyUrl = detail.companyUrl;

  // -- Mark as enriched --
  vacancy.enrichedAt = new Date().toISOString();
  // If detail came from storage (no _fetchMethod), mark as 'cache';
  // otherwise use the fetch method ('iframe' or 'text')
  vacancy.enrichmentSource = detail._fetchMethod || 'cache';

  // -- Re-compute match score with enriched data --
  if (resume) {
    try {
      // Build a scoring-compatible vacancy object:
      // merge structured salary/experience into top-level for scorer
      const scoreVacancy = buildScoringVacancy(vacancy);
      const score = computeMatchScore(resume, scoreVacancy);
      vacancy.matchScore = score.total;
      vacancy.matchBreakdown = score.breakdown;
      vacancy.matchDetails = score.details;
      enrichLog.info(
        'Re-scored "' + vacancy.title.substring(0, 30) + '": ' +
        score.total + '% (skills=' + score.breakdown.skills + ', title=' + score.breakdown.title +
        ', salary=' + score.breakdown.salary + ', exp=' + score.breakdown.experience + ')'
      );
    } catch (err) {
      enrichLog.warn('Re-scoring failed for ' + vacancy.id + ': ' + err.message);
    }
  }

  return vacancy;
}

/**
 * Build a vacancy object compatible with computeMatchScore().
 * The scorer expects:
 *   - vacancy.skills[] or vacancy.keySkills[] -- for skill matching
 *   - vacancy.salary -- string or { min, max, ... } for salary scoring
 *   - vacancy.experience -- string or { raw, min, max } for experience scoring
 *   - vacancy.title -- for title matching
 *
 * When enrichment provides structured data, we need to put it
 * where the scorer expects it.
 *
 * @param {Object} vacancy -- Enriched vacancy object
 * @returns {Object} Scorer-compatible vacancy
 */
function buildScoringVacancy(vacancy) {
  const sv = {
    id: vacancy.id,
    title: vacancy.title,
    // Skills: prefer keySkills (from detail), fall back to skills[] (from SERP tags)
    keySkills: vacancy.keySkills || [],
    skills: vacancy.skills || [],
    derivedSkills: vacancy.derivedSkills || [],
  };

  // Salary: structured object (after enrichment) or string (from SERP)
  sv.salary = vacancy.salary;

  // Experience: always an object (SERP uses parseExperienceString)
  sv.experience = vacancy.experience;

  return sv;
}

/**
 * Check if cached detail data is fresh enough for enrichment.
 * @param {Object} detail -- Stored vacancy detail
 * @param {number} [ttlMs=CACHE_TTL_MS] -- Max age in milliseconds
 * @returns {boolean}
 */
export function isDetailFresh(detail, ttlMs) {
  if (!detail || !detail.parsedAt) return false;
  const age = Date.now() - new Date(detail.parsedAt).getTime();
  return age < (ttlMs || CACHE_TTL_MS);
}

/**
 * Enrich a list of shallow vacancies using stored detail data.
 * Skips vacancies that already have keySkills from a detail parse.
 *
 * @param {Object[]} vacancies -- Array of shallow vacancy objects
 * @param {Object[]} storedDetails -- Array of stored detail objects from storage
 * @param {Object|null} resume -- Active resume for re-scoring
 * @returns {{ enriched: number, cached: number, skipped: number }}
 */
export function enrichVacanciesFromCache(vacancies, storedDetails, resume) {
  const detailMap = new Map();
  for (const d of storedDetails) {
    if (d && d.id) detailMap.set(d.id, d);
  }

  let enriched = 0;
  let cached = 0;
  let skipped = 0;

  for (const vacancy of vacancies) {
    // Skip if already enriched with key skills
    if (vacancy.keySkills && vacancy.keySkills.length > 0) {
      skipped++;
      continue;
    }

    const detail = detailMap.get(vacancy.id);
    if (!detail) {
      skipped++;
      continue;
    }

    if (!isDetailFresh(detail)) {
      enrichLog.info('Cached detail for ' + vacancy.id + ' is stale, skipping');
      skipped++;
      continue;
    }

    // Tag detail as cache-sourced so enrichVacancy sets enrichmentSource correctly
    if (!detail._fetchMethod) detail._fetchMethod = 'cache';
    enrichVacancy(vacancy, detail, resume);
    cached++;
    enriched++;
  }

  enrichLog.info('Cache enrichment: ' + enriched + ' enriched, ' + cached + ' from cache, ' + skipped + ' skipped');
  return { enriched, cached, skipped };
}

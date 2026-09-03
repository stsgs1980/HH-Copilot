/**
 * MATCH SCORER: EXPERIENCE (0-15)
 * =================================
 * Experience requirement match between resume and vacancy.
 * Split from match-scorer.js for anti-monolith compliance.
 *
 * Scoring:
 *   Within range              -> 15/15
 *   No experience required    -> 15/15
 *   Slightly below (<=1 year)  -> 10/15
 *   Above max (overqualified) -> 8/15 (NOT a penalty in Russian market)
 *   Unknown on either side    -> 8/15 (neutral)
 *   Significantly below       -> 3/15
 *
 * v1.9.23.0: extracted from match-scorer.js
 */

import { parseExperienceString } from "./parse-experience.js";

/**
 * Score experience match between resume and vacancy.
 * @param {Object} resume
 * @param {Object} vacancy
 * @returns {{ score: number, reason: string }}
 */
export function scoreExperience(resume, vacancy) {
  let vacExp = vacancy.experience || {};

  // Handle legacy string format from vacancy-list parser
  if (typeof vacExp === "string") {
    vacExp = parseExperienceString(vacExp);
  }

  // If vacancy requires no experience
  if (vacExp.min === 0 && vacExp.max === 0) {
    return { score: 15, reason: "no-experience-required" };
  }

  // Calculate resume total experience from experience[] array
  const resumeYears = calcResumeYears(resume.experience || []);

  // If we can't determine resume experience
  if (resumeYears === null) {
    return { score: 8, reason: "unknown-resume-exp" };
  }

  // If we can't determine vacancy experience requirement
  // Use == null to catch both null and undefined (defensive against empty string experience)
  if (vacExp.min == null && vacExp.max == null) {
    return { score: 8, reason: "unknown-vacancy-exp" };
  }

  const vacMin = vacExp.min || 0;
  const vacMax = vacExp.max || 99;

  // Resume experience within required range
  if (resumeYears >= vacMin && resumeYears <= vacMax) {
    return { score: 15, reason: "within-range" };
  }

  // Resume slightly below minimum (within 1 year)
  if (resumeYears < vacMin && resumeYears >= vacMin - 1) {
    return { score: 10, reason: "slightly-below" };
  }

  // Resume above maximum (overqualified)
  if (resumeYears > vacMax) {
    return { score: 8, reason: "overqualified" };
  }

  // Resume significantly below minimum
  return { score: 3, reason: "below-range" };
}

// ===============================================
// HELPERS
// ===============================================

/**
 * Parse russian period string into { start, end } Date objects.
 * Handles: "март 2020 — настоящее время", "январь 2021 -- декабрь 2022",
 * short months ("мар. 2020"), separators — / – / --.
 * Returns null if unparseable.
 */
function parsePeriodString(periodStr) {
  if (!periodStr || typeof periodStr !== "string") return null;
  const MONTHS = {
    январ: 0,
    феврал: 1,
    март: 2,
    апрел: 3,
    ма: 4,
    июн: 5,
    июл: 6,
    август: 7,
    сентябр: 8,
    октябр: 9,
    ноябр: 10,
    декабр: 11,
  };
  const s = periodStr.toLowerCase().replace(/--/g, "\u2014");
  const parts = s.split("\u2014").map((p) => p.trim());
  if (parts.length !== 2) return null;

  function parseMonthYear(str, isEnd) {
    if (!str) return null;
    if (/настоящее|current|по\s+сей/.test(str)) {
      return isEnd ? new Date() : null;
    }
    const m = str.match(/([а-яё]+)\.?\s*(\d{4})/iu);
    if (!m) return null;
    const monthKey = Object.keys(MONTHS)
      .sort((a, b) => b.length - a.length)
      .find((k) => m[1].startsWith(k) || k.startsWith(m[1]));
    if (monthKey === undefined) return null;
    return new Date(parseInt(m[2], 10), MONTHS[monthKey], 1);
  }

  const start = parseMonthYear(parts[0], false);
  if (!start) return null;
  const end = parseMonthYear(parts[1], true);
  return { start, end: end || new Date() };
}

/**
 * Merge overlapping [start, end] intervals, return total months (union).
 * Classic sweep: sort by start, extend or close segments.
 */
function mergeIntervalsMonths(intervals) {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let total = 0;
  let curStart = sorted[0].start;
  let curEnd = sorted[0].end;
  for (let i = 1; i < sorted.length; i++) {
    const { start, end } = sorted[i];
    if (start <= curEnd) {
      if (end > curEnd) curEnd = end; // extend
    } else {
      total += curEnd - curStart; // close segment
      curStart = start;
      curEnd = end;
    }
  }
  total += curEnd - curStart;
  return Math.round(total / (30.44 * 24 * 3600 * 1000));
}

/**
 * Total years of experience from resume experience array.
 * v1.10 (#14): parse period strings and merge overlapping intervals
 * (parallel jobs no longer double-count).
 * Fallback: if fewer than 2 parseable periods, sum durations as before.
 * @returns {number|null} years with 1 decimal, null when unknown.
 */
export function calcResumeYears(experience) {
  if (!Array.isArray(experience) || experience.length === 0) return null;

  const intervals = [];
  for (const exp of experience) {
    const parsed = parsePeriodString(exp.period);
    if (parsed && parsed.end > parsed.start) intervals.push(parsed);
  }

  // Enough data for union: merge intervals
  if (intervals.length >= 2) {
    const months = mergeIntervalsMonths(intervals);
    if (months > 0) return Math.round((months / 12) * 10) / 10;
  }

  // Fallback: old behavior — sum duration strings/objects
  let totalMonths = 0;
  for (const exp of experience) {
    const d = exp.duration;
    if (typeof d === "string") {
      const y = d.match(/(\d+)\s*(?:год|лет)/i);
      const m = d.match(/(\d+)\s*мес/i);
      if (y) totalMonths += parseInt(y[1], 10) * 12;
      if (m) totalMonths += parseInt(m[1], 10);
    } else if (d && typeof d === "object") {
      totalMonths += (d.years || 0) * 12 + (d.months || 0);
    }
  }
  if (totalMonths === 0) return null;
  return Math.round((totalMonths / 12) * 10) / 10;
}

/**
 * LIB: COVER LETTER EXPERIENCE EXTRACTION
 * =======================================
 * Experience duration parsing for cover letter placeholders.
 * Extracted from cover-letter-placeholders.js (AHG Rule 12).
 * v1.9.43.0
 */

import { pluralMonths, pluralYears } from "./cover-letter-format.js";

/**
 * Extract years of experience from resume object.
 *
 * @param {Object|null} resume
 * @returns {string}
 */
export function extractExperienceText(resume) {
  if (!resume) return "relevant";

  // Try total experience from resume
  if (resume.experienceTotal) {
    return resume.experienceTotal;
  }

  // Calculate from experience entries
  if (resume.experience && Array.isArray(resume.experience) && resume.experience.length > 0) {
    let totalMonths = 0;

    for (const entry of resume.experience) {
      if (entry.duration) {
        // Parse "X лет Y месяцев" or "X год/года/лет" or "Y месяцев/месяца"
        const years = entry.duration.match(/(\d+)\s*(лет|год|года)/i);
        const months = entry.duration.match(/(\d+)\s*(месяц|месяца|месяцев)/i);
        if (years) totalMonths += parseInt(years[1], 10) * 12;
        if (months) totalMonths += parseInt(months[1], 10);
      } else if (entry.period) {
        // Parse period "MMM YYYY -- Present" or "MMM YYYY -- MMM YYYY"
        const periodMonths = parsePeriodToMonths(entry.period);
        if (periodMonths > 0) totalMonths += periodMonths;
      }
    }

    if (totalMonths > 0) {
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;
      if (years > 0 && months > 0) {
        return years + " " + pluralYears(years) + " " + months + " " + pluralMonths(months);
      } else if (years > 0) {
        return years + " " + pluralYears(years);
      } else {
        return months + " " + pluralMonths(months);
      }
    }
  }

  // Count experience entries as a rough indicator
  if (resume.experience && resume.experience.length > 0) {
    return "опыт в " + resume.experience[0].position || "сфере";
  }

  return "relevant";
}

/**
 * Parse a date period string into approximate months.
 * Handles: "Январь 2020 -- Настоящее время", "Jan 2020 -- Present",
 * "Мар 2018 -- Июн 2022"
 *
 * @param {string} period
 * @returns {number} months
 */
export function parsePeriodToMonths(period) {
  if (!period) return 0;

  const months = {
    янв: 1,
    фев: 2,
    мар: 3,
    апр: 4,
    мая: 5,
    июн: 6,
    июл: 7,
    авг: 8,
    сен: 9,
    окт: 10,
    ноя: 11,
    дек: 12,
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };

  // Match "Month Year -- Month Year" or "Month Year -- Present/Настоящее"
  const rangeMatch = period.match(
    /(\w{3})\s*(\d{4})\s*[\u2013\u2014-]\s*(?:(\w{3})\s*(\d{4})|(настоящее|настоящее время|present|сейчас))/i,
  );
  if (!rangeMatch) return 0;

  const startMonth = months[rangeMatch[1].toLowerCase().substring(0, 3)] || 1;
  const startYear = parseInt(rangeMatch[2], 10);

  let endMonth, endYear;
  if (rangeMatch[5]) {
    // Present time
    const now = new Date();
    endMonth = now.getMonth() + 1;
    endYear = now.getFullYear();
  } else {
    endMonth = months[rangeMatch[3].toLowerCase().substring(0, 3)] || 1;
    endYear = parseInt(rangeMatch[4], 10);
  }

  const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
  return Math.max(0, totalMonths);
}

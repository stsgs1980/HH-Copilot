/**
 * MATCH SCORER: SALARY (0-15)
 * =============================
 * Salary compatibility between resume expectation and vacancy range.
 * Split from match-scorer.js for anti-monolith compliance.
 *
 * Scoring:
 *   Within range          -> 15/15
 *   Slightly below (<=20%) -> 12/15
 *   Slightly above (<=20%) -> 10/15
 *   No data on either     -> 8/15  (neutral)
 *   Way below             -> 5/15
 *   Way above             -> 3/15
 *
 * v1.9.23.0: extracted from match-scorer.js
 */

/**
 * Score salary compatibility between resume and vacancy.
 * @param {Object} resume
 * @param {Object} vacancy
 * @returns {{ score: number, reason: string }}
 */
export function scoreSalary(resume, vacancy) {
  // Parse resume salary expectation
  const resumeSalary = parseResumeSalary(resume.salary || "");
  let vacSalary = vacancy.salary || {};

  // Handle string salary from vacancy-list parser (e.g., "150 000 - 200 000 rub")
  if (typeof vacSalary === "string") {
    vacSalary = parseVacancySalaryString(vacSalary);
  }

  // v1.9.87.0: Reduced neutral score from 8 to 4 for missing salary data.
  // Previously, a vacancy with "Не указана" salary got 8/15 — same as a
  // vacancy with a salary that matches the resume expectation. This inflated
  // irrelevant vacancies above the minShowScore threshold.
  // 4/15 still contributes something (not 0) but penalizes missing info.

  // If no salary info on either side -- low neutral score
  if (!resumeSalary && !vacSalary.min && !vacSalary.max) {
    return { score: 4, reason: "no-data" };
  }

  if (!resumeSalary) {
    return { score: 4, reason: "resume-no-salary" };
  }

  if (!vacSalary.min && !vacSalary.max) {
    return { score: 4, reason: "vacancy-no-salary" };
  }

  // Check overlap between resume expectation and vacancy range
  const vacMin = vacSalary.min || 0;
  const vacMax = vacSalary.max || Infinity;

  // Resume salary within vacancy range
  if (resumeSalary >= vacMin && resumeSalary <= vacMax) {
    return { score: 15, reason: "within-range" };
  }

  // Resume salary slightly below vacancy min (within 20%)
  if (resumeSalary < vacMin && resumeSalary >= vacMin * 0.8) {
    return { score: 12, reason: "slightly-below" };
  }

  // Resume salary slightly above vacancy max (within 20%)
  if (resumeSalary > vacMax && resumeSalary <= vacMax * 1.2) {
    return { score: 10, reason: "slightly-above" };
  }

  // Resume salary way below
  if (resumeSalary < vacMin) {
    return { score: 5, reason: "below-range" };
  }

  // Resume salary way above
  return { score: 3, reason: "above-range" };
}

// ===============================================
// HELPERS
// ===============================================

/** Parse resume salary string into a number. */
export function parseResumeSalary(salaryStr) {
  if (!salaryStr || typeof salaryStr !== "string") return null;
  const nums = salaryStr.match(/\d[\d\s]*\d/g);
  if (!nums || nums.length === 0) return null;
  // Take the first number (expected salary)
  return parseInt(nums[0].replace(/\s/g, ""), 10) || null;
}

/** Parse vacancy salary string like "150 000 - 200 000 rub" into { min, max }. */
export function parseVacancySalaryString(salaryStr) {
  if (!salaryStr || typeof salaryStr !== "string") return {};

  const lowerStr = salaryStr.toLowerCase().trim();

  // «от»/«до» заменяем на дефис ДО чистки, иначе после удаления букв
  // «80 000 до 120 000» склеивается в одно число 80000120000.
  // Границы слов через \p{L}, т.к. \b в JS не работает с кириллицей.
  const cleaned = salaryStr
    .toLowerCase()
    .replace(/(?<![\p{L}])от(?![\p{L}])/giu, "-")
    .replace(/(?<![\p{L}])до(?![\p{L}])/giu, "-")
    .replace(/[–—−]/g, "-")
    .replace(/[^\d\s\-.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const nums = cleaned.match(/\d[\d\s]*\d/g) || [];
  const parsed = nums.map((n) => parseInt(n.replace(/\s/g, ""), 10)).filter((n) => Number.isFinite(n) && n > 0);
  if (parsed.length === 0) return {};

  // «от X до Y»: префикс «от» + два числа.
  // «от 80 000, до вычета» даст одно число — max останется null.
  if (/^от/.test(lowerStr)) {
    // «от X до Y» даёт два числа; «от X, до вычета...» — одно
    // (слово «до» заменено на дефис до чистки, «вычета» стёрт)
    return { min: parsed[0], max: parsed.length > 1 ? parsed[1] : null };
  }
  if (/^до|^up\s*to/i.test(lowerStr)) {
    return { min: null, max: parsed[0] };
  }

  if (parsed.length === 1) return { min: parsed[0], max: parsed[0] };
  return { min: parsed[0], max: parsed[1] };
}

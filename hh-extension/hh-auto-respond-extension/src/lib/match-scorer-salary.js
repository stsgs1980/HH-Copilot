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
  const resumeSalary = parseResumeSalary(resume.salary || '');
  let vacSalary = vacancy.salary || {};

  // Handle string salary from vacancy-list parser (e.g., "150 000 - 200 000 rub")
  if (typeof vacSalary === 'string') {
    vacSalary = parseVacancySalaryString(vacSalary);
  }

  // If no salary info on either side -- neutral score
  if (!resumeSalary && !vacSalary.min && !vacSalary.max) {
    return { score: 8, reason: 'no-data' };
  }

  if (!resumeSalary) {
    return { score: 8, reason: 'resume-no-salary' };
  }

  if (!vacSalary.min && !vacSalary.max) {
    return { score: 8, reason: 'vacancy-no-salary' };
  }

  // Check overlap between resume expectation and vacancy range
  const vacMin = vacSalary.min || 0;
  const vacMax = vacSalary.max || Infinity;

  // Resume salary within vacancy range
  if (resumeSalary >= vacMin && resumeSalary <= vacMax) {
    return { score: 15, reason: 'within-range' };
  }

  // Resume salary slightly below vacancy min (within 20%)
  if (resumeSalary < vacMin && resumeSalary >= vacMin * 0.8) {
    return { score: 12, reason: 'slightly-below' };
  }

  // Resume salary slightly above vacancy max (within 20%)
  if (resumeSalary > vacMax && resumeSalary <= vacMax * 1.2) {
    return { score: 10, reason: 'slightly-above' };
  }

  // Resume salary way below
  if (resumeSalary < vacMin) {
    return { score: 5, reason: 'below-range' };
  }

  // Resume salary way above
  return { score: 3, reason: 'above-range' };
}

// ===============================================
// HELPERS
// ===============================================

/** Parse resume salary string into a number. */
function parseResumeSalary(salaryStr) {
  if (!salaryStr || typeof salaryStr !== 'string') return null;
  const nums = salaryStr.match(/\d[\d\s]*\d/g);
  if (!nums || nums.length === 0) return null;
  // Take the first number (expected salary)
  return parseInt(nums[0].replace(/\s/g, ''), 10) || null;
}

/** Parse vacancy salary string like "150 000 - 200 000 rub" into { min, max }. */
function parseVacancySalaryString(salaryStr) {
  if (!salaryStr || typeof salaryStr !== 'string') return {};
  // Remove currency symbols and normalize spaces
  const cleaned = salaryStr.replace(/[руб.$евроруб.]/gi, '').replace(/\s+/g, ' ');
  // Find all number groups (e.g., "150 000" -> "150000")
  const nums = cleaned.match(/\d[\d\s]*\d/g);
  if (!nums || nums.length === 0) return {};
  const parsed = nums.map(n => parseInt(n.replace(/\s/g, ''), 10)).filter(n => !isNaN(n));
  if (parsed.length === 0) return {};

  // Handle "от N" / "до N" prefixes (SERP salary strings)
  const lowerStr = salaryStr.toLowerCase();
  if (/^от|^from/i.test(lowerStr) && parsed.length >= 1) {
    return { min: parsed[0], max: null };
  }
  if (/^до|^up\s*to/i.test(lowerStr) && parsed.length >= 1) {
    return { min: null, max: parsed[0] };
  }

  if (parsed.length === 1) return { min: parsed[0], max: parsed[0] };
  // Take first two numbers as min/max
  return { min: parsed[0], max: parsed[1] };
}

/**
 * LIB: PARSE EXPERIENCE STRING
 * ===============================
 * Shared parser for vacancy experience requirement strings.
 * Used by both vacancy-list.js and match-scorer.js.
 *
 * Input:  "1-3 года", "Более 6 лет", "Нет опыта", "3 года", "6 месяцев"
 * Output: { raw: string, min: number|null, max: number|null }
 */

export function parseExperienceString(raw) {
  if (!raw) return { raw: '', min: null, max: null };

  const text = raw.toLowerCase().trim();

  // "Нет опыта" / "Не требуется" / "Без опыта"
  if (/нет\s*опыт|не\s*требу|без\s*опыт/.test(text)) {
    return { raw, min: 0, max: 0 };
  }

  // "Более N лет" / "От N лет" / "Свыше N лет"
  const moreMatch = text.match(/(?:более|от|свыше)\s+(\d+)/);
  if (moreMatch) {
    return { raw, min: parseInt(moreMatch[1], 10), max: null };
  }

  // "N-M лет" / "N-M лет" / "N -- M лет" (range)
  const rangeMatch = text.match(/(\d+)\s*[\u2013\u2014-\s]+\s*(\d+)/);
  if (rangeMatch) {
    return { raw, min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
  }

  // "N лет" / "N год" (exact)
  const exactMatch = text.match(/(\d+)\s*(?:год|лет)/);
  if (exactMatch) {
    return { raw, min: parseInt(exactMatch[1], 10), max: null };
  }

  // Months-only: "6 месяцев" -> 0.5 years
  const monthOnlyMatch = text.match(/(\d+)\s*мес/);
  if (monthOnlyMatch) {
    const years = parseInt(monthOnlyMatch[1], 10) / 12;
    return { raw, min: Math.round(years * 10) / 10, max: Math.round(years * 10) / 10 };
  }

  // Couldn't parse
  return { raw, min: null, max: null };
}

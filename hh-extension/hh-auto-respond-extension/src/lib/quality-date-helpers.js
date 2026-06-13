/**
 * QUALITY DATE HELPERS — парсинг дат, длительности, поиск пробелов в стаже.
 * Используется quality-flags.js для детекции красных флагов.
 */

const RU_MONTHS = {
  'январ': 0, 'феврал': 1, 'март': 2, 'апрел': 3, 'ма': 4, 'июн': 5,
  'июл': 6, 'август': 7, 'сентябр': 8, 'октябр': 9, 'ноябр': 10, 'декабр': 11,
};

/**
 * Найти пробелы в стаже между местами работы (>3 месяцев).
 * @returns {Array<{label: string, months: number}>}
 */
export function findEmploymentGaps(exps) {
  const gaps = [];
  const parsedDates = exps.map(e => parsePeriodDates(e.period || e.duration || ''));

  for (let i = 0; i < parsedDates.length - 1; i++) {
    const curr = parsedDates[i];
    const next = parsedDates[i + 1];
    if (curr.end && next.start) {
      const gapMonths = monthDiff(curr.end, next.start);
      if (gapMonths > 3) {
        const label = gapMonths >= 12
          ? Math.round(gapMonths / 12) + ' г.'
          : gapMonths + ' мес.';
        gaps.push({ label, months: gapMonths });
      }
    }
  }
  return gaps;
}

/**
 * Распарсить период типа "Март 2020 — Июнь 2023" или "2020 — 2023".
 * @returns {{start: Date|null, end: Date|null}}
 */
export function parsePeriodDates(period) {
  const result = { start: null, end: null };

  const m = period.match(
    /([а-яА-ЯёЁ]+\s+\d{4})\s*[—–-]\s*([а-яА-ЯёЁ]+\s+\d{4}|Настоящее\s+время|настоящее\s+время|по\s+настоящее)/i
  );
  if (m) {
    result.start = parseRuDate(m[1]);
    if (!/настоящее/i.test(m[2])) {
      result.end = parseRuDate(m[2]);
    }
    return result;
  }

  const m2 = period.match(/(\d{4})\s*[—–-]\s*(\d{4})/);
  if (m2) {
    result.start = new Date(parseInt(m2[1]), 0);
    result.end = new Date(parseInt(m2[2]), 11);
  }
  return result;
}

/**
 * Распарсить длительность типа "3 года 6 месяцев" → 42 месяца.
 */
export function parseDurationToMonths(duration) {
  if (!duration) return 0;
  let months = 0;
  const ym = duration.match(/(\d+)\s*(?:лет|год|года)/i);
  if (ym) months += parseInt(ym[1]) * 12;
  const mm = duration.match(/(\d+)\s*(?:мес)/i);
  if (mm) months += parseInt(mm[1]);
  return months;
}

function parseRuDate(str) {
  const s = str.trim().toLowerCase();
  for (const [prefix, month] of Object.entries(RU_MONTHS)) {
    if (s.startsWith(prefix)) {
      const year = parseInt(s.match(/\d{4}/)?.[0] || '0');
      if (year > 1990 && year <= 2030) return new Date(year, month);
    }
  }
  return null;
}

function monthDiff(d1, d2) {
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

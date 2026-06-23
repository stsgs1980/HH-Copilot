/**
 * UI: NEGOTIATIONS FORMAT (F4.1)
 * ==============================
 * Pure helper: convert an hh.ru negotiations list-page date string into a
 * short relative label for the chat-list row.
 *
 * IMPORTANT: the hh.ru list page exposes only calendar strings like
 * "9 июня" without a time component, so we CANNOT reliably compute "2ч назад".
 * We pass recognized human labels through ("вчера", "сегодня", and anything
 * that already looks relative like "2ч назад") and return '' for anything we
 * cannot safely interpret. Returning '' (never undefined) lets the caller omit
 * the timestamp + separator cleanly.
 *
 * Real relative timestamps require the chatik interface (full timestamps) and
 * are part of F4.5.
 *
 * Never throws. Never returns undefined.
 */

/** Strings hh.ru already renders as human relative labels -- pass through. */
const HUMAN_PASS_THROUGH = new Set(['вчера', 'сегодня']);

/**
 * Heuristic: does the string already look like a relative time label?
 * Matches forms like "2ч назад", "5 мин назад", "3 часа назад", "только что".
 *
 * NOTE: JavaScript \b is ASCII-only (\w = [A-Za-z0-9_]) and yields no boundary
 * next to Cyrillic, so we deliberately avoid \b here and anchor on the two
 * reliable signals instead: a digit somewhere before "назад", or the literal
 * "только что". This is a pass-through detector, not a transform, so leaning
 * generous is safe.
 * @param {string} s
 * @returns {boolean}
 */
function looksRelative(s) {
  return /\d.*назад/i.test(s) || /^только что$/i.test(s.trim());
}

/**
 * Convert an hh.ru negotiations date string to a short relative label.
 * @param {string} dateStr
 * @param {Date} [_now=new Date()] - reserved for F4.5 (relative "ago" math);
 *   unused today because list-page dates lack a time component. Underscore
 *   prefix satisfies the AHG/ESLint unused-arg rule.
 * @returns {string} relative label or '' if unrecognized
 */
export function formatRelativeTime(dateStr, _now = new Date()) {
  if (dateStr === undefined || dateStr === null) return '';
  const s = String(dateStr).trim();
  if (s === '') return '';

  // Bare clock time with no calendar date -> we can't anchor "ago", so omit.
  if (/^\d{1,2}:\d{2}$/.test(s)) return '';

  if (HUMAN_PASS_THROUGH.has(s.toLowerCase())) return s;
  if (looksRelative(s)) return s;

  // Anything else (calendar strings like "9 июня", "5 июня 2025", garbage):
  // we do not have enough to compute a safe relative label -> omit.
  return '';
}

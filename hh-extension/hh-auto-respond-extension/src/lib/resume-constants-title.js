/**
 * LIB: RESUME CONSTANTS -- Title cleaning utilities.
 * Shared regex patterns and cleanResumeTitle() for extracting resume titles
 * from hh.ru's Magritte-concatenated link text.
 */
import { normalizeWs } from './resume-constants-core.js';

/**
 * Regex for UI text that appears inside resume links but is NOT a title.
 */
export const UI_NOISE = /^(сделать видимым|скрыть|обновить|поднять|продлить|дублировать|удалить|перейти к вакансиям|перейти|постоянная работа|многие не видят|копировать|редактировать|частичная занятость|проектная работа|стажировка|волонтёрство)/i;

/**
 * Regex for employment-type noise that hh.ru appends to resume titles.
 */
export const TITLE_SUFFIX_NOISE = /\s*(Постоянная работа|Частичная занятость|Проектная работа|Стажировка|Волонтёрство)\s*$/i;

/**
 * Patterns that Magritte concatenates into a single line with the title.
 */
export const LINE_BREAK_INJECTORS = [
  /Многие\s+не\s+видят[^\n]*/gi,
  /Сделать\s+видимым/gi,
  /Постоянная\s+работа/gi,
  /Частичная\s+занятость/gi,
  /Проектная\s+работа/gi,
  /Стажировка/gi,
  /Волонтёрство/gi,
  /Перейти\s+к\s+вакансиям/gi,
];

/**
 * Clean a raw title string from hh.ru DOM.
 * Steps: normalize ws -> inject newlines -> filter lines -> strip suffixes -> fallback.
 */
export function cleanResumeTitle(rawText, fallback) {
  fallback = fallback || 'Untitled';
  if (!rawText) return fallback;

  let text = normalizeWs(rawText);

  for (const pattern of LINE_BREAK_INJECTORS) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, '\n$&');
  }

  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 2);
  let title = lines.find(l => !UI_NOISE.test(l)) || '';
  title = title.replace(TITLE_SUFFIX_NOISE, '').trim();

  return title || fallback;
}

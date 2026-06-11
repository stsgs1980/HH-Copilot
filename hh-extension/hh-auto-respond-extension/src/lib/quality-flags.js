/**
 * QUALITY FLAGS — красные флаги, сильные стороны, рекомендации.
 *
 * Красные флаги — то, что заставит HR усомниться:
 *  - Пробелы в стаже, короткие места работы
 *  - Отсутствие описаний, размытые формулировки
 *
 * Сильные стороны — что выделяет резюме:
 *  - Метрики, глаголы достижений, подтверждённые навыки
 */

import { ACHIEVEMENT_VERBS, VAGUE_PHRASES, METRIC_PATTERNS } from './quality-patterns.js';
import { detectProgression } from './quality-experience.js';
import { findEmploymentGaps, parseDurationToMonths } from './quality-date-helpers.js';

// ═══════════════════════════════════════════════
// КРАСНЫЕ ФЛАГИ
// ═══════════════════════════════════════════════

/**
 * Детекция красных флагов в резюме.
 * @returns {string[]}
 */
export function detectRedFlags(r) {
  const flags = [];
  const exps = r.experience || [];

  // ── Пробелы между местами работы ──
  if (exps.length >= 2) {
    const gaps = findEmploymentGaps(exps);
    if (gaps.length > 0) {
      flags.push('Пробел в стаже: ' + gaps.map(g => g.label).join(', ') + ' — HR спросит об этом');
    }
  }

  // ── Короткие места работы ──
  const shortJobs = exps.filter(e => {
    const months = parseDurationToMonths(e.duration || e.period || '');
    return months > 0 && months < 6;
  });
  if (shortJobs.length >= 2) {
    flags.push(shortJobs.length + ' места < 6 месяцев — выглядит как нестабильность');
  }

  // ── Нет описаний к опыту ──
  const noDesc = exps.filter(e => !e.description || e.description.length < 20);
  if (noDesc.length > 0 && exps.length > 0) {
    flags.push(noDesc.length + ' из ' + exps.length + ' позиций без описания — HR не поймёт ваш вклад');
  }

  // ── Нет контактов ──
  if (!r.phone && !r.email) {
    flags.push('Нет ни телефона, ни email — работодатель не сможет связаться');
  }

  // ── Размытые описания ──
  const allDesc = exps.map(e => e.description || '').join(' ').toLowerCase();
  const vagueCount = VAGUE_PHRASES.filter(v => allDesc.includes(v)).length;
  if (vagueCount >= 2) {
    flags.push('Размытые формулировки: "участие в", "помощь в" — звучит как наблюдатель, а не деятель');
  }

  // ── Нет навыков ──
  if ((r.skills || []).length === 0) {
    flags.push('Нет ни одного навыка — ATS не найдёт ваше резюме');
  }

  // ── Нет "О себе" ──
  if (!r.additionalInfo || r.additionalInfo.length < 20) {
    flags.push('Нет блока "О себе" — HR не сможет быстро понять ваш профиль');
  }

  return flags;
}

// ═══════════════════════════════════════════════
// СИЛЬНЫЕ СТОРОНЫ
// ═══════════════════════════════════════════════

/**
 * Детекция сильных сторон резюме.
 * @returns {string[]}
 */
export function detectStrengths(r) {
  const strengths = [];
  const exps = r.experience || [];
  const skills = r.skills || [];
  const allDesc = exps.map(e => e.description || '').join(' ');
  const descLower = allDesc.toLowerCase();

  // ── Метрики ──
  const metricCount = METRIC_PATTERNS.filter(p => p.test(allDesc)).length;
  if (metricCount >= 3) {
    strengths.push('Сильные метрики в опыте — ' + metricCount + ' количественных результата');
  } else if (metricCount >= 1) {
    strengths.push('Есть количественные результаты — отлично, добавьте ещё');
  }

  // ── Глаголы достижений ──
  const verbCount = ACHIEVEMENT_VERBS.filter(v => descLower.includes(v)).length;
  if (verbCount >= 3) {
    strengths.push('Язык достижений — ' + verbCount + ' глаголов результата ("внедрил", "увеличил")');
  } else if (verbCount >= 1) {
    strengths.push('Есть глаголы достижений — усильте остальные описания');
  }

  // ── Навыки ──
  if (skills.length >= 10) {
    strengths.push('Широкий набор навыков (' + skills.length + ') — хорошее покрытие ATS-поиска');
  } else if (skills.length >= 5) {
    strengths.push('Неплохой набор навыков (' + skills.length + ') — можно добавить ещё');
  }

  // ── Навыки подтверждены в опыте ──
  const skillLower = skills.map(s => s.toLowerCase().trim());
  const skillsInDesc = skillLower.filter(s => s.length > 2 && descLower.includes(s));
  if (skillsInDesc.length >= 5) {
    strengths.push(skillsInDesc.length + ' навыков подтверждены в описаниях опыта — credibility');
  }

  // ── Карьерный рост ──
  const positions = exps.map(e => e.position || '').filter(p => p.length > 0);
  if (detectProgression(positions)) {
    strengths.push('Карьерный рост в должностях — HR видит развитие');
  }

  // ── Контакты ──
  if (r.phone && r.email) {
    strengths.push('Полные контакты (телефон + email) — работодатель легко свяжется');
  }

  // ── О себе ──
  if (r.additionalInfo && r.additionalInfo.length > 100) {
    strengths.push('Подробный блок "О себе" — HR быстро поймёт ваш профиль');
  }

  // ── Длинные описания опыта ──
  const longDescs = exps.filter(e => e.description && e.description.length > 200);
  if (longDescs.length >= 2) {
    strengths.push('Детальные описания опыта — HR видит конкретику, а не общие фразы');
  }

  return strengths;
}

// ═══════════════════════════════════════════════
// РЕКОМЕНДАЦИИ
// ═══════════════════════════════════════════════

/**
 * Построить приоритизированные рекомендации.
 * @returns {Array<{priority: string, text: string}>}
 */
export function buildRecommendations(ats, exp, flags, r) {
  const recs = [];

  // ── Приоритет: ATS-критичные ──
  const atsFailed = ats.checks.filter(c => !c.passed).sort((a, b) => b.weight - a.weight);
  for (const c of atsFailed.slice(0, 2)) {
    recs.push({ priority: 'critical', text: c.tip });
  }

  // ── Качество опыта ──
  const expFailed = exp.checks.filter(c => !c.passed).sort((a, b) => b.weight - a.weight);
  for (const c of expFailed.slice(0, 2)) {
    recs.push({ priority: 'high', text: c.tip });
  }

  // ── Красные флаги ──
  for (const f of flags.slice(0, 2)) {
    recs.push({ priority: 'high', text: f });
  }

  // ── Общие советы ──
  if ((r.skills || []).length > 0 && (r.experience || []).length > 0) {
    const skillLower = (r.skills || []).map(s => s.toLowerCase().trim());
    const descText = (r.experience || []).map(e => e.description || '').join(' ').toLowerCase();
    const uncovered = skillLower.filter(s => s.length > 2 && !descText.includes(s));
    if (uncovered.length > 3) {
      const sample = uncovered.slice(0, 5).map(s => '«' + s + '»').join(', ');
      const suffix = uncovered.length > 5 ? ' и ещё ' + (uncovered.length - 5) : '';
      recs.push({
        priority: 'medium',
        text: uncovered.length + ' навыков не в описаниях опыта: ' + sample + suffix + ' — упомяните, чтобы HR их увидел',
        tooltip: uncovered.map(s => '«' + s + '»').join(', ')
      });
    }
  }

  return recs;
}

/**
 * QUALITY FLAGS -- red flags, strengths.
 *
 * Red flags -- what makes HR doubt:
 *  - Gaps in employment, short jobs
 *  - Missing descriptions, vague wording
 *
 * Strengths -- what makes the resume stand out:
 *  - Metrics, achievement verbs, confirmed skills
 *
 * Recommendations moved to quality-recommendations.js.
 */

import { ACHIEVEMENT_VERBS, VAGUE_PHRASES, METRIC_PATTERNS } from './quality-patterns.js';
import { detectProgression } from './quality-experience.js';
import { findEmploymentGaps, parseDurationToMonths } from './quality-date-helpers.js';

// ===============================================
// RED FLAGS
// ===============================================

/**
 * Detect red flags in a resume.
 * @returns {string[]}
 */
export function detectRedFlags(r) {
  const flags = [];
  const exps = r.experience || [];

  // Employment gaps
  if (exps.length >= 2) {
    const gaps = findEmploymentGaps(exps);
    if (gaps.length > 0) {
      flags.push('Пробел в стаже: ' + gaps.map(g => g.label).join(', ') + ' -- HR спросит об этом');
    }
  }

  // Short jobs
  const shortJobs = exps.filter(e => {
    const months = parseDurationToMonths(e.duration || e.period || '');
    return months > 0 && months < 6;
  });
  if (shortJobs.length >= 2) {
    flags.push(shortJobs.length + ' места < 6 месяцев -- выглядит как нестабильность');
  }

  // No descriptions
  const noDesc = exps.filter(e => !e.description || e.description.length < 20);
  if (noDesc.length > 0 && exps.length > 0) {
    flags.push(noDesc.length + ' из ' + exps.length + ' позиций без описания -- HR не поймёт ваш вклад');
  }

  // No contacts
  if (!r.phone && !r.email) {
    flags.push('Нет ни телефона, ни email -- работодатель не сможет связаться');
  }

  // Vague descriptions
  const allDesc = exps.map(e => e.description || '').join(' ').toLowerCase();
  const vagueCount = VAGUE_PHRASES.filter(v => allDesc.includes(v)).length;
  if (vagueCount >= 2) {
    flags.push('Размытые формулировки: "участие в", "помощь в" -- звучит как наблюдатель, а не деятель');
  }

  // No skills
  if ((r.skills || []).length === 0) {
    flags.push('Нет ни одного навыка -- ATS не найдёт ваше резюме');
  }

  // No "About me"
  if (!r.additionalInfo || r.additionalInfo.length < 20) {
    flags.push('Нет блока "О себе" -- HR не сможет быстро понять ваш профиль');
  }

  return flags;
}

// ===============================================
// STRENGTHS
// ===============================================

/**
 * Detect resume strengths.
 * @returns {string[]}
 */
export function detectStrengths(r) {
  const strengths = [];
  const exps = r.experience || [];
  const skills = r.skills || [];
  const allDesc = exps.map(e => e.description || '').join(' ');
  const descLower = allDesc.toLowerCase();

  // Metrics
  const metricCount = METRIC_PATTERNS.filter(p => p.test(allDesc)).length;
  if (metricCount >= 3) {
    strengths.push('Сильные метрики в опыте -- ' + metricCount + ' количественных результата');
  } else if (metricCount >= 1) {
    strengths.push('Есть количественные результаты -- отлично, добавьте ещё');
  }

  // Achievement verbs
  const verbCount = ACHIEVEMENT_VERBS.filter(v => descLower.includes(v)).length;
  if (verbCount >= 3) {
    strengths.push('Язык достижений -- ' + verbCount + ' глаголов результата ("внедрил", "увеличил")');
  } else if (verbCount >= 1) {
    strengths.push('Есть глаголы достижений -- усильте остальные описания');
  }

  // Skills coverage
  if (skills.length >= 10) {
    strengths.push('Широкий набор навыков (' + skills.length + ') -- хорошее покрытие ATS-поиска');
  } else if (skills.length >= 5) {
    strengths.push('Неплохой набор навыков (' + skills.length + ') -- можно добавить ещё');
  }

  // Skills confirmed in experience
  const skillLower = skills.map(s => s.toLowerCase().trim());
  const skillsInDesc = skillLower.filter(s => s.length > 2 && descLower.includes(s));
  if (skillsInDesc.length >= 5) {
    strengths.push(skillsInDesc.length + ' навыков подтверждены в описаниях опыта -- credibility');
  }

  // Career progression
  const positions = exps.map(e => e.position || '').filter(p => p.length > 0);
  if (detectProgression(positions)) {
    strengths.push('Карьерный рост в должностях -- HR видит развитие');
  }

  // Contacts
  if (r.phone && r.email) {
    strengths.push('Полные контакты (телефон + email) -- работодатель легко свяжется');
  }

  // About me
  if (r.additionalInfo && r.additionalInfo.length > 100) {
    strengths.push('Подробный блок "О себе" -- HR быстро поймёт ваш профиль');
  }

  // Detailed experience descriptions
  const longDescs = exps.filter(e => e.description && e.description.length > 200);
  if (longDescs.length >= 2) {
    strengths.push('Детальные описания опыта -- HR видит конкретику, а не общие фразы');
  }

  return strengths;
}

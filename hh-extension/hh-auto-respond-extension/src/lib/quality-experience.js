/**
 * QUALITY EXPERIENCE — анализ качества опыта в резюме.
 *
 * HR оценивает:
 *  - Достижения vs обязанности (есть ли метрики/результаты)
 *  - Полнота описания (достаточно ли деталей)
 *  - Связь навыков и опыта (подтверждены ли навыки в описаниях)
 *  - Карьерный рост (прогрессия должностей)
 */

import { ACHIEVEMENT_VERBS, VAGUE_PHRASES, METRIC_PATTERNS } from './quality-patterns.js';

/**
 * Анализ качества опыта.
 * @returns {{ score: number, checks: Array, earned: number, total: number, metrics: Object }}
 */
export function analyzeExperience(r) {
  const exps = r.experience || [];
  const skills = r.skills || [];
  const title = r.title || '';

  if (exps.length === 0) {
    return { score: 0, checks: [], earned: 0, total: 0, metrics: {} };
  }

  const checks = [];
  let earned = 0;
  let total = 0;

  const add = (label, weight, passed, tip) => {
    checks.push({ label, weight, passed, tip });
    total += weight;
    if (passed) earned += weight;
  };

  // ── Метрики в описаниях ──
  const allDescriptions = exps
    .map(e => e.description || '')
    .filter(d => d.length > 0);
  const descText = allDescriptions.join(' ');

  const hasMetrics = METRIC_PATTERNS.some(p => p.test(descText));
  const metricCount = METRIC_PATTERNS.filter(p => p.test(descText)).length;

  add('Метрики в описаниях', 18,
    hasMetrics,
    'HR ищет цифры: "на 30%", "в 2 раза", "100+ серверов" — без них описание = перечень обязанностей'
  );
  add('3+ метрики', 7,
    metricCount >= 3,
    '3 и более метрик — сигнал что вы фокусируетесь на результатах, а не процессе'
  );

  // ── Глаголы достижений ──
  const descLower = descText.toLowerCase();
  const achievementVerbCount = ACHIEVEMENT_VERBS.filter(v => descLower.includes(v)).length;
  add('Глаголы достижений', 12,
    achievementVerbCount > 0,
    'Начинайте с "увеличил", "внедрил", "автоматизировал" — это язык результатов, не обязанностей'
  );

  // ── Нет размытых формулировок ──
  const vagueCount = VAGUE_PHRASES.filter(v => descLower.includes(v)).length;
  add('Без размытых формулировок', 8,
    vagueCount === 0,
    'Замените "участие в", "помощь в" на конкретные действия и результаты'
  );

  // ── Полнота описаний ──
  const expsWithDesc = exps.filter(e => e.description && e.description.length > 50);
  add('Описания к позициям', 10,
    expsWithDesc.length > 0,
    'HR не видит ценности в позиции без описания — что вы там делали?'
  );
  add('Все позиции с описанием ≥50 символов', 5,
    exps.length > 0 && expsWithDesc.length === exps.length,
    'Каждая позиция заслуживает описания хотя бы в 2-3 предложения'
  );

  // ── Связь навыков с опытом ──
  const skillLower = skills.map(s => s.toLowerCase().trim());
  const skillsInDesc = skillLower.filter(s => s.length > 2 && descLower.includes(s));
  const skillCoverage = skillLower.length > 0
    ? Math.round((skillsInDesc.length / skillLower.length) * 100)
    : 0;
  add('Навыки подтверждены в опыте', 10,
    skillsInDesc.length >= 3,
    'HR сверяет: навыки должны упоминаться в описаниях опыта'
  );

  // ── Карьерный рост ──
  const positions = exps.map(e => e.position || '').filter(p => p.length > 0);
  const hasProgression = detectProgression(positions);
  // Если человек уже на руководящей позиции — считаем рост достигнутым
  const isTopLevel = positions.some(p =>
    /(?:^|[\s/(-])(head|руководител|руководств|director|директор|начальник|cто|cto|vp)(?:$|[\s/)-,.])/i.test(p)
  );
  const progressionPassed = hasProgression || isTopLevel;
  const progressionTip = progressionPassed
    ? ''
    : 'Рост в должностях — сильный сигнал для HR (специалист → старший → руководитель)';
  add('Карьерный рост', 8,
    progressionPassed,
    progressionTip
  );

  // ── Релевантность заголовка ──
  const titleRelevant = title.length > 0 && positions.some(p =>
    p.toLowerCase().includes(title.toLowerCase().split(/\s+/)[0]) ||
    title.toLowerCase().split(/\s+/).some(w => w.length > 3 && p.toLowerCase().includes(w))
  );
  add('Позиция релевантна опыту', 7,
    titleRelevant || positions.length === 0,
    'Заголовок резюме должен соответствовать последней позиции — иначе HR запутается'
  );

  // ── О себе ──
  const aboutLen = (r.additionalInfo || '').length;
  add('Блок "О себе"', 5,
    aboutLen > 50,
    'Краткое саммари из 2-3 предложений — первое, что читает HR'
  );

  const score = total > 0 ? Math.round((earned / total) * 100) : 0;

  return {
    score, checks, earned, total,
    metrics: { metricCount, achievementVerbCount, vagueCount, skillCoverage }
  };
}

// ═══════════════════════════════════════════════
// CAREER PROGRESSION DETECTION
// ═══════════════════════════════════════════════

/**
 * Распознать карьерный рост в последовательности должностей.
 * Ищем повышение уровня: junior → middle → senior, etc.
 */
export function detectProgression(positions) {
  if (positions.length < 2) return false;

  const lvl = (p) => {
    const pl = p.toLowerCase();
    if (/(?:^|[\s/(-])(intern|стажёр|стажер|junior|младш|trainee)(?:$|[\s/)-,.])/i.test(pl)) return 1;
    if (/(?:^|[\s/(-])(middle|средн)(?:$|[\s/)-,.])/i.test(pl)) return 2;
    if (/(?:^|[\s/(-])(senior|ведущ|старш|lead|principal|staff)(?:$|[\s/)-,.])/i.test(pl)) return 3;
    if (/(?:^|[\s/(-])(head|руководител|руководств|director|директор|начальник|cто|cto|vp)(?:$|[\s/)-,.])/i.test(pl)) return 4;
    return 2;
  };

  for (let i = 0; i < positions.length - 1; i++) {
    const currentLvl = lvl(positions[i]);
    for (let j = i + 1; j < positions.length; j++) {
      if (lvl(positions[j]) > currentLvl) return true;
    }
  }
  return false;
}

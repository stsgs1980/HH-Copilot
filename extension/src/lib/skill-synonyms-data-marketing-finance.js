/**
 * DATA: SKILL SYNONYMS -- Marketing + Finance groups
 * ===================================================
 * Extracted from skill-synonyms.js (AHG Rule 12 anti-monolith).
 *
 * Each group is an array of normalized skill names (lowercase, hyphens->spaces, ё->е).
 * All skills in a group are considered semantically related.
 */

export const MARKETING_FINANCE_SYNONYM_GROUPS = [

  // ===========================================
  // МАРКЕТИНГ / АНАЛИТИКА
  // ===========================================
  [
    'маркетинг',
    'продвижение',
    'маркетинговые исследования',
    'исследование рынка',
    'анализ конкурентов',
  ],
  [
    'аналитика',
    'анализ данных',
    'data driven',
    'business intelligence',
  ],
  [
    'цифровой маркетинг',
    'digital маркетинг',
    'интернет маркетинг',
    'онлайн маркетинг',
  ],

  // ===========================================
  // ФИНАНСЫ
  // ===========================================
  [
    'p&l',
    'план факт',
    'управление прибылью',
    'отчет о прибылях и убытках',
    'profit and loss',
  ],
  [
    'финансовый анализ',
    'финансовое планирование',
    'бизнес планирование',
    'бюджетирование',
  ],
];

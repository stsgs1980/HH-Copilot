/**
 * DATA: SKILL SYNONYMS -- Product + HR + Logistics + IT groups
 * ============================================================
 * Extracted from skill-synonyms.js (AHG Rule 12 anti-monolith).
 *
 * Each group is an array of normalized skill names (lowercase, hyphens->spaces, ё->е).
 * All skills in a group are considered semantically related.
 */

export const PRODUCT_HR_IT_SYNONYM_GROUPS = [

  // ===========================================
  // ПРОЕКТЫ / ПРОДУКТ
  // ===========================================
  [
    'управление проектами',
    'project management',
    'руководство проектами',
  ],
  [
    'продуктовый менеджмент',
    'продакт менеджмент',
    'product management',
    'product owner',
  ],
  [
    'запуск продукта',
    'go to market',
    'gtm',
    'вывод продукта на рынок',
  ],

  // ===========================================
  // HR / КАДРЫ
  // ===========================================
  [
    'подбор персонала',
    'рекрутинг',
    'найм сотрудников',
    'подбор сотрудников',
  ],
  [
    'адаптация персонала',
    'онбординг',
    'onboarding',
  ],
  [
    'оценка персонала',
    'ассессмент',
    'performance review',
  ],

  // ===========================================
  // ЛОГИСТИКА / СЕТЬ
  // ===========================================
  [
    'работа с поставщиками',
    'закупки',
    'vendor management',
    'управление поставщиками',
  ],
  [
    'ритейл',
    'розничная торговля',
    'торговая сеть',
    'fmcg',
  ],

  // ===========================================
  // IT -- related tech skills
  // ===========================================
  [
    'javascript',
    'js',
    'ecmascript',
  ],
  [
    'typescript',
    'ts',
  ],
  [
    'ci/cd',
    'continuous integration',
    'continuous delivery',
  ],
  [
    'автоматизация процессов',
    'роботизация процессов',
    'rpa',
    'автоматизация',
  ],
];

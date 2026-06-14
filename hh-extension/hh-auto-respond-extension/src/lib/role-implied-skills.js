/**
 * ROLE-IMPLIED SKILLS
 * ====================
 * Skills automatically implied by job position title.
 * Based on ESCO essential/optional concept adapted for hh.ru Russian job market.
 *
 * When a person holds position "Руководитель отделов продаж",
 * skills like "руководство коллективом", "управление проектами"
 * are self-evident from the title and should NOT be shown as "missing".
 *
 * Research: docs/research/01-role-implied-skills.md
 * v1.9.31.0
 */

/**
 * Role-implied skill map.
 * Each entry: { triggers, exclude, implied }
 *   triggers — word stems/patterns in the position title (normalized lowercase)
 *   exclude  — if ANY of these found in title, skip this group
 *   implied  — skill names (normalized) that are self-evident for this role
 *
 * All strings are lowercase, ё→е, hyphens→spaces, trimmed.
 */
const ROLE_SKILL_MAP = [

  // ═══════════════════════════════════════════
  // РУКОВОДИТЕЛЬ / ДИРЕКТОР / НАЧАЛЬНИК / HEAD
  // ═══════════════════════════════════════════
  {
    triggers: ['руководител', 'директор', 'начальник', 'head of', 'director', 'chief', 'vp', 'cто', 'cto', 'ceo', 'coo', 'cfo'],
    exclude: ['заместитель', 'зам ', 'зам.', 'помощник', 'assistant', 'deputy', 'стажер', 'стажёр'],
    implied: [
      'управление командой',
      'руководство командой',
      'руководство коллективом',
      'делегирование',
      'постановка задач',
      'мотивация персонала',
      'развитие персонала',
      'управление проектами',
      'стратегическое планирование',
      'оценка персонала',
      'операционное управление',
      'контроль исполнения',
      'планирование',
      'принятие решений',
      'управление персоналом',
    ],
  },

  // ═══════════════════════════════════════════
  // РУКОВОДИТЕЛЬ ОТДЕЛА ПРОДАЖ (комбинация)
  // ═══════════════════════════════════════════
  {
    triggers: ['руководитель отдел', 'руководитель продаж', 'head of sales', 'директор по продажам', 'директор продаж', 'коммерческий директор', 'начальник отдел продаж'],
    exclude: ['заместитель', 'зам ', 'зам.', 'помощник', 'deputy'],
    implied: [
      // From leadership
      'управление командой',
      'руководство командой',
      'руководство коллективом',
      'делегирование',
      'мотивация персонала',
      'развитие персонала',
      'управление проектами',
      'стратегическое планирование',
      'оценка персонала',
      'операционное управление',
      'контроль исполнения',
      'принятие решений',
      'управление персоналом',
      // From sales
      'переговоры',
      'ведение переговоров',
      'работа с клиентами',
      'воронка продаж',
      'активные продажи',
      'прямые продажи',
      'заключение договоров',
      'аналитика продаж',
      'работа с возражениями',
      'управление продажами',
      'руководство отделом продаж',
      'стратегия продаж',
      'kpi',
    ],
  },

  // ═══════════════════════════════════════════
  // МЕНЕДЖЕР ПО ПРОДАЖАМ
  // ═══════════════════════════════════════════
  {
    triggers: ['менеджер по продажам', 'менеджер продаж', 'sales manager', 'sales representative', 'торговый представитель', 'агент по продажам', 'специалист по продажам'],
    exclude: ['ассистент', 'помощник', 'стажер', 'стажёр', 'junior'],
    implied: [
      'переговоры',
      'ведение переговоров',
      'работа с клиентами',
      'воронка продаж',
      'активные продажи',
      'прямые продажи',
      'заключение договоров',
      'аналитика продаж',
      'работа с возражениями',
      'обслуживание клиентов',
    ],
  },

  // ═══════════════════════════════════════════
  // МАРКЕТОЛОГ
  // ═══════════════════════════════════════════
  {
    triggers: ['маркетолог', 'marketing manager', 'маркетинг менеджер', 'менеджер по маркетингу', 'digital маркетолог', 'director of marketing', 'директор по маркетингу', 'руководитель маркетинг', 'cmo'],
    exclude: ['ассистент', 'помощник', 'стажер', 'стажёр'],
    implied: [
      'маркетинг',
      'продвижение',
      'маркетинговые исследования',
      'анализ конкурентов',
      'цифровой маркетинг',
      'digital маркетинг',
      'создание контента',
      'стратегическое планирование',
      'аналитика',
    ],
  },

  // ═══════════════════════════════════════════
  // HR-СПЕЦИАЛИСТ
  // ═══════════════════════════════════════════
  {
    triggers: ['hr', 'кадров', 'рекрутер', 'recruiter', 'hr менеджер', 'hr специалист', 'специалист по персоналу', 'менеджер по персоналу', 'руководитель hr', 'директор по персоналу', 'hr director', 'hrbp'],
    exclude: ['ассистент', 'помощник', 'стажер', 'стажёр'],
    implied: [
      'подбор персонала',
      'рекрутинг',
      'адаптация персонала',
      'онбординг',
      'оценка персонала',
      'обучение персонала',
      'мотивация персонала',
      'развитие персонала',
      'кадровое делопроизводство',
    ],
  },

  // ═══════════════════════════════════════════
  // ПРОЕКТНЫЙ МЕНЕДЖЕР
  // ═══════════════════════════════════════════
  {
    triggers: ['project manager', 'руководитель проект', 'менеджер проект', 'pm ', 'проджект менеджер'],
    exclude: ['ассистент', 'помощник', 'стажер', 'стажёр'],
    implied: [
      'управление проектами',
      'project management',
      'делегирование',
      'постановка задач',
      'контроль исполнения',
      'планирование',
      'управление командой',
      'стратегическое планирование',
    ],
  },

  // ═══════════════════════════════════════════
  // ФИНАНСОВЫЙ СПЕЦИАЛИСТ
  // ═══════════════════════════════════════════
  {
    triggers: ['финансов', 'бухгалтер', 'accountant', 'cfo', 'financial', 'экономист', 'аудитор', 'auditor'],
    exclude: ['ассистент', 'помощник', 'стажер', 'стажёр'],
    implied: [
      'финансовый анализ',
      'финансовое планирование',
      'бюджетирование',
      'отчетность',
      'анализ данных',
      'p&l',
    ],
  },
];

// ═══════════════════════════════════════════════
// LOOKUP ENGINE
// ═══════════════════════════════════════════════

/**
 * Normalize a string for comparison.
 * Same rules as match-scorer.normalizeSkillSet.
 */
function normalize(str) {
  return (str || '')
    .toLowerCase().trim()
    .replace(/[-–—]/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

/**
 * Get role-implied skills for a given position title.
 *
 * Returns a Set of normalized skill names that are self-evident
 * from the position title and should NOT be shown as "missing".
 *
 * @param {string} title — Position title (e.g. "Руководитель отделов продаж")
 * @returns {Set<string>} — Set of normalized implied skill names
 */
export function getRoleImpliedSkills(title) {
  const result = new Set();
  if (!title) return result;

  const normalizedTitle = normalize(title);

  for (const group of ROLE_SKILL_MAP) {
    // Check if any trigger matches the title
    const triggered = group.triggers.some(trigger => normalizedTitle.includes(normalize(trigger)));
    if (!triggered) continue;

    // Check if any exclude word is present
    const excluded = group.exclude.some(exc => normalizedTitle.includes(normalize(exc)));
    if (excluded) continue;

    // Add all implied skills
    for (const skill of group.implied) {
      result.add(normalize(skill));
    }
  }

  return result;
}

/**
 * Weight for role-implied skill matches.
 * Between synonym (50%) and missing (0%).
 * Implied = position self-evidently provides this skill,
 * but we can't be 100% certain → partial credit.
 */
export const IMPLIED_WEIGHT = 0.4;

/**
 * Check if a skill is implied by the given position title.
 *
 * @param {string} skill — Normalized skill name
 * @param {string} title — Position title
 * @returns {boolean}
 */
export function isSkillImpliedByRole(skill, title) {
  return getRoleImpliedSkills(title).has(normalize(skill));
}

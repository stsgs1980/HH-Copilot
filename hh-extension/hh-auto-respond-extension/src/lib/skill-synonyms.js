/**
 * LIB: SKILL SYNONYMS
 * ====================
 * ANTI-MONOLITH exception (Rule 12): 333 lines. Russian-language data dictionary -- cannot be meaningfully split.
 * Synonym groups for related skills.
 * When a vacancy requires skill A and the resume has skill B from the same
 * group, they count as a partial match (synonym match) instead of "missing".
 *
 * This solves the problem: "переговоры" should partially match
 * "работа с возражениями" because objection handling IS part of negotiations.
 *
 * Weight: synonym matches count at 50% (between derived 70% and missing 0%).
 * Rationale: synonyms indicate related competence, not exact skill.
 *
 * v1.9.22.0
 */

/**
 * Each group is an array of normalized skill names (lowercase, hyphens->spaces, ё->е).
 * All skills in a group are considered semantically related.
 */
const SYNONYM_GROUPS = [

  // ===========================================
  // ПРОДАЖИ / ПЕРЕГОВОРЫ
  // ===========================================
  [
    'переговоры',
    'работа с возражениями',
    'коммерческие переговоры',
    'деловое общение',
    'ведение переговоров',
    'заключение договоров',
  ],
  [
    'прямые продажи',
    'активные продажи',
    'холодные продажи',
    'холодные звонки',
    'исходящие звонки',
  ],
  [
    'b2b продажи',
    'продажи b2b',
    'корпоративные продажи',
    'продажи юридическим лицам',
  ],
  [
    'b2c продажи',
    'продажи b2c',
    'розничные продажи',
    'продажи физическим лицам',
  ],
  [
    'управление продажами',
    'руководство отделом продаж',
    'руководство отделом',
    'управление отделом продаж',
  ],
  [
    'воронка продаж',
    'воронка конверсии',
    'конверсия продаж',
    'управление воронкой',
  ],
  [
    'работа с клиентами',
    'клиентоориентированность',
    'обслуживание клиентов',
    'удержание клиентов',
    'клиентский сервис',
  ],
  [
    'аналитика продаж',
    'анализ продаж',
    'отчетность по продажам',
    'ведение отчетности',
  ],

  // ===========================================
  // УПРАВЛЕНИЕ / ЛИДЕРСТВО
  // ===========================================
  [
    'управление командой',
    'руководство командой',
    'развитие команды',
    'формирование команды',
    'лидерство',
  ],
  [
    'управленческие навыки',
    'менеджмент',
    'руководство',
    'управление персоналом',
  ],
  [
    'мотивация персонала',
    'стимулирование персонала',
    'развитие персонала',
    'обучение персонала',
    'наставничество',
  ],
  [
    'операционное управление',
    'операционный менеджмент',
    'управление бизнес процессами',
    'оптимизация процессов',
    'управление процессами',
  ],
  [
    'стратегическое планирование',
    'разработка стратегии',
    'стратегическое управление',
    'стратегический менеджмент',
  ],
  [
    'делегирование',
    'постановка задач',
    'распределение задач',
  ],

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

// ===============================================
// LOOKUP ENGINE
// ===============================================

/**
 * Build a reverse index: normalized skill name -> Set of synonym group members.
 * Built once on first call, then cached.
 */
let _synonymIndex = null;

function buildSynonymIndex() {
  const index = new Map();
  for (const group of SYNONYM_GROUPS) {
    // Normalize all members
    const normalizedGroup = group.map(s => normalize(s));
    for (const skill of normalizedGroup) {
      if (!index.has(skill)) {
        index.set(skill, new Set());
      }
      for (const other of normalizedGroup) {
        if (other !== skill) {
          index.get(skill).add(other);
        }
      }
    }
  }
  return index;
}

/**
 * Normalize a skill name for lookup.
 * Same rules as match-scorer.normalizeSkillSet.
 */
function normalize(name) {
  return (name || '')
    .toLowerCase().trim()
    .replace(/[-\u2013\u2014]/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

/**
 * Check if skillA has a synonym match with any skill in the provided set.
 * Returns the matched synonym from the set, or null if no synonym match.
 *
 * @param {string} skillA -- normalized skill name to check
 * @param {Set<string>} skillSet -- set of normalized skill names
 * @returns {string|null} -- the synonym found in skillSet, or null
 */
export function findSynonymMatch(skillA, skillSet) {
  if (!_synonymIndex) _synonymIndex = buildSynonymIndex();

  const synonyms = _synonymIndex.get(normalize(skillA));
  if (!synonyms) return null;

  for (const syn of synonyms) {
    if (skillSet.has(syn)) return syn;
  }
  return null;
}

/**
 * Get all synonyms for a skill (normalized).
 * Returns an empty Set if the skill has no synonym group.
 *
 * @param {string} skill -- skill name (will be normalized)
 * @returns {Set<string>}
 */
export function getSynonyms(skill) {
  if (!_synonymIndex) _synonymIndex = buildSynonymIndex();
  return _synonymIndex.get(normalize(skill)) || new Set();
}

/**
 * Check if two normalized skills are in the same synonym group.
 *
 * @param {string} skillA -- normalized skill name
 * @param {string} skillB -- normalized skill name
 * @returns {boolean}
 */
export function areSynonyms(skillA, skillB) {
  if (!_synonymIndex) _synonymIndex = buildSynonymIndex();
  const synonyms = _synonymIndex.get(normalize(skillA));
  return synonyms ? synonyms.has(normalize(skillB)) : false;
}

/**
 * Weight for synonym matches (between derived 0.7 and missing 0).
 * Synonym = related but not identical skill.
 */
export const SYNONYM_WEIGHT = 0.5;

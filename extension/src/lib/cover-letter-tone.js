/**
 * LIB: COVER LETTER TONE (F3.2)
 * =========================================
 * Tone-aware text adjustments for cover letters.
 *
 * Public API:
 *   - TONES -- 4 tones (formal/friendly/concise/enthusiastic) with labels
 *   - applyTone(text, tone) -- swaps greeting + closing per tone
 *   - getTemplateForTone(tone) -- returns tone-specific default template
 *   - validateTone(tone) -- returns 'formal' for invalid input
 *
 * Anti-hallucination:
 *   - Unknown tone -> 'formal' (never crashes)
 *   - Empty text -> '' returned unchanged
 *   - Tone never breaks {placeholder} syntax
 *
 * v1.9.46.0
 */

/** Tone IDs and their display labels. */
export const TONES = [
  { id: 'formal', label: 'Формальный' },
  { id: 'friendly', label: 'Дружелюбный' },
  { id: 'concise', label: 'Краткий' },
  { id: 'enthusiastic', label: 'Энтузиаст' },
];

/** Map of tone id -> greeting string. */
const GREETINGS = {
  formal: 'Здравствуйте!',
  friendly: 'Добрый день!',
  concise: '',
  enthusiastic: 'Здравствуйте! Очень рад возможности откликнуться!',
};

/** Map of tone id -> closing string. */
const CLOSINGS = {
  formal: 'Буду рад обсудить детали на интервью.',
  friendly: 'Буду очень рад пообщаться и узнать больше о позиции!',
  concise: '',
  enthusiastic: 'Готов начать работу в ближайшее время. Очень жду обратной связи!',
};

/** Default formal template (used as fallback). */
const DEFAULT_TEMPLATE_FORMAL =
  'Здравствуйте! Меня заинтересовала вакансия {position} в {company}. ' +
  'Имею {experience} опыта в {skills}. {matching_sentence}' +
  'Буду рад обсудить детали на интервью.';

/** Friendly template variant. */
const DEFAULT_TEMPLATE_FRIENDLY =
  'Добрый день! Очень понравилась вакансия {position} в {company}. ' +
  'У меня {experience} опыта в {skills}. {matching_sentence}' +
  'Буду очень рад пообщаться и узнать больше о позиции!';

/** Concise template variant -- no greeting/closing, just the body. */
const DEFAULT_TEMPLATE_CONCISE =
  'Интересует вакансия {position} в {company}. ' +
  'Опыт: {experience}. Навыки: {skills}. {matching_sentence}';

/** Enthusiastic template variant. */
const DEFAULT_TEMPLATE_ENTHUSIASTIC =
  'Здравствуйте! Очень рад возможности откликнуться на {position} в {company}! ' +
  'Имею {experience} опыта в {skills}. {matching_sentence}' +
  'Готов начать работу в ближайшее время. Очень жду обратной связи!';

/** Map of tone id -> default template. */
const TEMPLATES = {
  formal: DEFAULT_TEMPLATE_FORMAL,
  friendly: DEFAULT_TEMPLATE_FRIENDLY,
  concise: DEFAULT_TEMPLATE_CONCISE,
  enthusiastic: DEFAULT_TEMPLATE_ENTHUSIASTIC,
};

/**
 * Validate tone id. Returns 'formal' for unknown/empty input.
 * @param {string} tone
 * @returns {string}
 */
export function validateTone(tone) {
  if (typeof tone !== 'string') return 'formal';
  return TONES.find(t => t.id === tone) ? tone : 'formal';
}

/**
 * Get the default template for a given tone.
 * @param {string} tone
 * @returns {string}
 */
export function getTemplateForTone(tone) {
  return TEMPLATES[validateTone(tone)] || DEFAULT_TEMPLATE_FORMAL;
}

/**
 * Apply tone-specific greeting + closing adjustments to a generated letter.
 *
 * This is a post-processor: it detects existing greeting/closing patterns
 * and replaces them with tone-appropriate versions. If the template already
 * has no greeting/closing (e.g., concise template), nothing is replaced.
 *
 * @param {string} text -- generated letter text
 * @param {string} tone -- tone id
 * @returns {string}
 */
export function applyTone(text, tone) {
  if (!text || typeof text !== 'string') return '';
  const t = validateTone(tone);
  let out = text;

  // Replace known greetings (formal default + friendly + enthusiastic)
  const knownGreetings = [
    'Здравствуйте!',
    'Добрый день!',
    'Здравствуйте! Очень рад возможности откликнуться!',
  ];
  for (const g of knownGreetings) {
    if (out.startsWith(g)) {
      out = out.slice(g.length).trimStart();
      break;
    }
  }
  // Prepend tone greeting (if any)
  const newGreeting = GREETINGS[t];
  if (newGreeting) {
    out = newGreeting + ' ' + out;
  }

  // Replace known closings
  const knownClosings = [
    'Буду рад обсудить детали на интервью.',
    'Буду очень рад пообщаться и узнать больше о позиции!',
    'Готов начать работу в ближайшее время. Очень жду обратной связи!',
  ];
  for (const c of knownClosings) {
    if (out.endsWith(c)) {
      out = out.slice(0, -c.length).trimEnd();
      break;
    }
  }
  // Append tone closing (if any)
  const newClosing = CLOSINGS[t];
  if (newClosing) {
    out = out + ' ' + newClosing;
  }

  return out.trim();
}

/** Exported for tests. */
export const _internal = {
  GREETINGS,
  CLOSINGS,
  TEMPLATES,
};

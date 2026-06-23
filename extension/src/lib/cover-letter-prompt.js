/**
 * LIB: COVER LETTER PROMPT BUILDER (F-CR-02)
 * ============================================
 * buildPrompt(scorecard, evidence, tone) -> { messages, estimatedTokens }
 *
 * Builds a structured LLM prompt with:
 *   - System: anti-hallucination rules + 11 banned AI patterns (from humanizer)
 *   - User: scorecard mission/outcomes/competencies + curated evidence list
 *
 * Pure function: no I/O.
 *
 * v1.9.50.0
 */

const TONE_DESCRIPTIONS = {
  formal: 'formal and respectful (формальный)',
  friendly: 'friendly and warm (дружелюбный)',
  concise: 'concise and to the point (краткий)',
  enthusiastic: 'enthusiastic and motivated (энтузиазм)',
};

const SYSTEM_PROMPT_TEMPLATE = `Ты -- эксперт по составлению сопроводительных писем для hh.ru.
Тон: {tone}.

ЖЁСТКИЕ ПРАВИЛА (anti-hallucination):
1. Используй ТОЛЬКО факты из блока "Доказательства" ниже.
2. Не выдумывай навыки, места работы, даты, цифры, достижения.
3. Если для компетенции нет доказательства -- не упоминай её.
4. Не более 2500 символов.
5. Структура: приветствие -> 2-3 ключевых аргумента (каждый = компетенция + доказательство + проекция) -> закрытие.
6. Без "Здравствуйте, меня зовут..." -- обращение по компании если известно, иначе "Здравствуйте".

ЗАПРЕЩЁННЫЕ AI-ПАТТЕРНЫ (по humanizer skill, русские аналоги):
- Inflated symbolism: "служит testamentом", "подчёркивает важность", "выступает доказательством", "свидетельствует о"
- AI vocabulary: "кроме того", "более того", "вместе с тем", "важно отметить", "следует подчеркнуть"
- Negative parallelism: "не только..., но и...", "это не просто..., это..."
- Деепричастия-наполнитель: "обеспечивая", "подчёркивая", "отражая", "демонстрируя"
- Rule of three (3 однородных): "эффективность, надёжность и масштабируемость"
- Em dash вместо запятых
- Generic positive conclusions: "буду рад принести ценность", "уверен, что мой опыт..."
- Filler: "важно отметить, что", "следует подчеркнуть"
- **Жирный шрифт** в письме
- Inline-header списки: "- **Опыт:** ..."
- Sycophantic: "большое спасибо за внимание к моему резюме!"

Пиши конкретно. Если есть цифра -- пиши цифру. Если нет -- лучше короткое предложение без понтов, чем длинное с водой.`;

/**
 * Build the structured prompt for cover letter generation.
 *
 * @param {Object} scorecard -- { mission, outcomes[], competencies[] }
 * @param {Array} evidence -- [{ competency, evidenceText, confidence }]
 * @param {string} tone -- 'formal' | 'friendly' | 'concise' | 'enthusiastic'
 * @returns {{ messages: Array<{role, content}>, estimatedTokens: number }}
 */
export function buildPrompt(scorecard, evidence, tone) {
  const toneDesc = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.formal;
  const system = SYSTEM_PROMPT_TEMPLATE.replace('{tone}', toneDesc);

  const outcomes = (scorecard.outcomes || [])
    .map((o, i) => '    - ' + o)
    .join('\n');

  const evidenceLines = (evidence || [])
    .map(e => '  [' + e.competency + ']: ' + e.evidenceText + '  [уверенность: ' + e.confidence + ']')
    .join('\n');

  const user = `ВАКАНСИЯ:
  Позиция: ${scorecard.position || '(не указана)'}
  Компания: ${scorecard.company || '(не указана)'}
  Миссия роли: ${scorecard.mission || ''}
  Ожидаемые результаты за 12 мес:
${outcomes || '    (не указаны)'}

КОМПЕТЕНЦИИ + ДОКАЗАТЕЛЬСТВА (используй только эти):
${evidenceLines || '  (нет доказательств)'}

ТОН: ${tone}

Напиши сопроводительное письмо по структуре из системного промпта.`;

  const totalChars = system.length + user.length;
  const estimatedTokens = Math.ceil(totalChars / 4); // rough estimate for Russian + Latin mix

  return {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    estimatedTokens,
  };
}

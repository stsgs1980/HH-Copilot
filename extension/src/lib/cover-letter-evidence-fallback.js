/**
 * LIB: COVER LETTER EVIDENCE FALLBACK (extracted v1.9.56.0)
 * ==========================================================
 * Sentence splitter + experience-based fallback evidence builder.
 * Extracted from cover-letter-evidence.js to satisfy AHG Rule 12 (<250 lines).
 *
 * Anti-hallucination: the fallback ONLY quotes verbatim from resume.experience
 * (first sentence of description, or position/company if description is empty).
 * competency is marked '(опыт из резюме)' so the LLM knows this is generic
 * experience, not a specific skill match.
 */

export const MAX_EVIDENCE_SENTENCE_LEN = 280;

/** Split text into sentences (Russian + English aware). */
export function splitSentences(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

/** Truncate to MAX_EVIDENCE_SENTENCE_LEN with an ellipsis. */
function truncate(text) {
  return text.length > MAX_EVIDENCE_SENTENCE_LEN
    ? text.substring(0, MAX_EVIDENCE_SENTENCE_LEN) + '...'
    : text;
}

/**
 * FINAL FALLBACK (v1.9.55.0): when no per-competency evidence was found,
 * return the top-N most recent experience entries as low-confidence evidence.
 * This guarantees the cover letter can always be generated when the resume
 * has any experience at all (user explicitly requested no silent NO_EVIDENCE).
 *
 * @param {Array} experience - resume.experience array
 * @param {number} max - EXPERIENCE_FALLBACK_MAX
 * @returns {Array} evidence items (may be empty)
 */
export function buildExperienceFallback(experience, max) {
  const out = [];
  if (!Array.isArray(experience) || experience.length === 0) return out;
  const startIdx = Math.max(0, experience.length - max);
  for (let i = experience.length - 1; i >= startIdx; i--) {
    const exp = experience[i];
    if (!exp) continue;
    const sentences = exp.description ? splitSentences(exp.description) : [];
    const sentence = sentences[0] || exp.position || exp.company || '';
    if (!sentence) continue;
    out.push({
      competency: '(опыт из резюме)',
      evidenceText: truncate(sentence),
      source: {
        type: 'experience_fallback',
        index: i,
        sentence,
        company: exp.company || '',
        position: exp.position || '',
        period: exp.period || '',
      },
      confidence: 'low',
    });
  }
  return out;
}

/** Truncate helper re-exported for the main mapper. */
export { truncate };

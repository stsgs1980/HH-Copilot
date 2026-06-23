/**
 * LIB: COVER LETTER AI ORCHESTRATOR (F-CR-02)
 * =============================================
 * generateAICoverLetter(vacancy, resume, opts) -> { ok, text?, method, warnings?, error?, code? }
 *
 * Pipeline:
 *   1. isAiAvailable -> NO_API_KEY if not configured
 *   2. extractScorecard(vacancy)
 *   3. computeMatchScore(resume, vacancy)
 *   4. mapEvidence(scorecard, resume, matchResult) -> NO_EVIDENCE if empty
 *   5. buildPrompt(scorecard, evidence, tone)
 *   6. sendMessage(messages, { temperature: 0.4, fetchImpl })
 *   7. validateLetter(text, evidence, resume.skills)
 *   8. applyTone(text, tone) for greeting/closing consistency
 *
 * v1.9.50.0
 */

import { createLogger } from './anti-hallucination.js';
import { extractScorecard } from './cover-letter-scorecard.js';
import { mapEvidence } from './cover-letter-evidence.js';
import { buildPrompt } from './cover-letter-prompt.js';
import { validateLetter } from './cover-letter-validator.js';
import { applyTone, validateTone } from './cover-letter-tone.js';
import { computeMatchScore } from './match-scorer.js';
import { isAiAvailable, sendMessage } from '../services/ai-service.js';

const aiLetterLog = createLogger('AICoverLetter');

/**
 * Generate an AI cover letter via structured pipeline.
 *
 * @param {Object} vacancy -- parsed vacancy
 * @param {Object} resume -- parsed resume
 * @param {Object} [opts] -- { tone, fetchImpl }
 * @returns {Promise<{ ok: boolean, text?: string, method?: string, warnings?: string[], error?: string, code?: string }>}
 */
export async function generateAICoverLetter(vacancy, resume, opts) {
  if (!vacancy || !resume) {
    return { ok: false, error: 'vacancy and resume are required', code: 'BAD_INPUT' };
  }

  const o = opts || {};
  const tone = validateTone(o.tone);

  // 1. Check AI availability
  const available = await isAiAvailable();
  if (!available) {
    aiLetterLog.warn('AI not available -- NO_API_KEY');
    return { ok: false, code: 'NO_API_KEY', error: 'AI API key not configured' };
  }

  // 2. Extract scorecard from vacancy
  const scorecard = extractScorecard(vacancy);
  scorecard.position = vacancy.title || '';
  scorecard.company = vacancy.company || '';
  aiLetterLog.info('Scorecard: ' + scorecard.mission + ' | ' + scorecard.outcomes.length + ' outcomes | ' + scorecard.competencies.length + ' competencies');

  // 3. Compute match score
  const matchResult = computeMatchScore(resume, vacancy);
  aiLetterLog.info('Match: ' + matchResult.total + '% | matching=' + (matchResult.details.matchingSkills || []).length);

  // 4. Map evidence
  const evidence = mapEvidence(scorecard, resume, matchResult);
  if (evidence.length === 0) {
    aiLetterLog.warn('No evidence found -- NO_EVIDENCE');
    return { ok: false, code: 'NO_EVIDENCE', error: 'No matching skills with experience evidence found' };
  }
  aiLetterLog.info('Evidence: ' + evidence.length + ' items (high=' + evidence.filter(e => e.confidence === 'high').length + ')');

  // 5. Build prompt
  const { messages } = buildPrompt(scorecard, evidence, tone);

  // 6. Call AI (low temperature for determinism)
  const result = await sendMessage({
    messages,
    temperature: 0.4,
    fetchImpl: o.fetchImpl,
  });

  if (!result.ok) {
    aiLetterLog.warn('AI call failed: ' + result.code + ' / ' + result.error);
    return { ok: false, code: 'AI_ERROR', error: result.error || 'AI call failed', aiCode: result.code };
  }

  // 7. Validate + clean
  const resumeSkills = Array.isArray(resume.skills) ? resume.skills : [];
  const validation = validateLetter(result.text, evidence, resumeSkills);

  // 8. Apply tone for greeting/closing consistency
  let finalText = applyTone(validation.text, tone);

  // Re-check length after tone swap (applyTone may add greeting)
  if (finalText.length > 5000) {
    finalText = finalText.substring(0, 4997) + '...';
  }

  aiLetterLog.info('Generated letter: ' + finalText.length + ' chars | warnings=' + validation.warnings.length);

  return {
    ok: true,
    text: finalText,
    method: 'ai',
    warnings: validation.warnings,
  };
}

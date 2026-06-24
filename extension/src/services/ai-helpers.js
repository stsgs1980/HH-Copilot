/**
 * SERVICES: AI HELPERS -- high-level wrappers around sendMessage
 * =================================================================
 * Extracted from ai-service.js for AHG Rule 12 (250-line hard cap).
 *
 * - generateCoverLetterAI(vacancy, resume, opts) -> delegates to cover-letter-ai.js orchestrator
 * - generateChatReply(history, opts)             -> N reply variants for employer chats
 *
 * v1.9.65.0
 */

import { sendMessage } from './ai-service.js';

/**
 * Generate a cover letter via AI based on vacancy + resume context.
 *
 * v1.9.50.0 (F-CR-02): Replaced primitive prompt with structured pipeline
 * (scorecard -> evidence -> prompt -> AI -> validate -> tone).
 * Delegates to ../lib/cover-letter-ai.js orchestrator.
 *
 * @param {Object} vacancy -- { title, company, description, keySkills }
 * @param {Object} resume -- { name, position, skills, experience }
 * @param {Object} [opts] -- { tone, fetchImpl }
 * @returns {Promise<{ ok: boolean, text?: string, method?: string, warnings?: string[], error?: string, code?: string }>}
 */
export async function generateCoverLetterAI(vacancy, resume, opts) {
  // Lazy import to avoid circular dep at module load
  const { generateAICoverLetter } = await import('../lib/cover-letter-ai.js');
  return generateAICoverLetter(vacancy, resume, opts);
}

/**
 * Generate N reply variants for a chat with an employer.
 *
 * @param {Array<{role:string,content:string}>} history - chat messages
 * @param {Object} [opts] - { tone, variants: 1|2|3 }
 * @returns {Promise<{ok:boolean,variants?:string[],error?:string,code?:string}>}
 */
export async function generateChatReply(history, opts) {
  if (!Array.isArray(history) || history.length === 0) {
    return { ok: false, error: 'history must be a non-empty array', code: 'BAD_INPUT' };
  }
  const tone = (opts && opts.tone) || 'formal';
  const variants = Math.min(Math.max((opts && opts.variants) || 3, 1), 3);

  const sys = 'You are an assistant helping a job seeker reply to an employer on hh.ru. ' +
    'Write in Russian. Tone: ' + tone + '. ' +
    'Generate ' + variants + ' distinct reply variants, separated by a line containing only "---VARIANT---". ' +
    'Each variant should be 1-3 short sentences. Do not include greetings unless the employer greeted first.';

  const messages = [{ role: 'assistant', content: sys }, ...history];

  const result = await sendMessage({
    messages,
    temperature: 0.8,
    fetchImpl: opts && opts.fetchImpl,
  });
  if (!result.ok) return result;

  const parts = result.text.split(/^---VARIANT---$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Use split parts; if AI ignored separator entirely, parts === [text]
  const list = parts.length > 0 ? parts.slice(0, variants) : [result.text];
  return { ok: true, variants: list };
}

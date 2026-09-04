/**
 * LIB: AI SEMANTIC COMPARISON
 * ============================
 * Computes semantic similarity between resume and vacancy using the
 * unified AI service (sendMessage). Provider/model come from aiConfig —
 * the same config as cover letters (fixes #8: no more hardcoded Groq).
 *
 * Recommended for flexible scoring: free models via OpenRouter or local Ollama.
 *
 * v1.10.0.0
 */

import { sendMessage } from "../services/ai-service.js";
import { createLogger } from "./anti-hallucination.js";

const semanticLog = createLogger("Semantic");

/**
 * Compute semantic similarity between resume and vacancy.
 * @param {Object} resume
 * @param {Object} vacancy
 * @returns {Promise<number>} 0-1 similarity score (0 on any failure)
 */
export async function computeSemanticSimilarity(resume, vacancy) {
  if (!resume || !vacancy) return 0;

  const prompt = `Compare this resume to this job vacancy. Return a single number 0-1 indicating how well they match.

Resume title: ${resume.title || "N/A"}
Resume skills: ${(resume.skills || []).join(", ")}
Resume experience: ${resume.experienceTotal || "N/A"}

Vacancy title: ${vacancy.title || "N/A"}
Vacancy skills: ${(vacancy.keySkills || []).join(", ")}
Vacancy requirements: ${vacancy.description?.text?.substring(0, 500) || "N/A"}

Return ONLY a number between 0 and 1, like 0.75`;

  const result = await sendMessage({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 10,
  });

  if (!result.ok) {
    semanticLog.warn("Semantic comparison failed: " + result.code + " " + (result.error || ""));
    return 0;
  }

  const score = parseFloat(result.text) || 0;
  const clamped = Math.max(0, Math.min(1, score));
  semanticLog.info("Semantic score: " + clamped);
  return clamped;
}

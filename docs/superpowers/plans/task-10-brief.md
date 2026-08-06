# Task 10: Create AI semantic comparison module

## Files
- Create: `extension/src/lib/ai-semantic.js`

## Interfaces
- Consumes: `resume`, `vacancy` objects
- Produces: `computeSemanticSimilarity()` function

## Steps

1. Create new module `extension/src/lib/ai-semantic.js`:
```javascript
/**
 * LIB: AI SEMANTIC COMPARISON
 * ============================
 * Computes semantic similarity between resume and vacancy using AI.
 * Uses Groq/OpenCode API for fast inference.
 *
 * v1.9.82.0
 */

import { createLogger } from './anti-hallucination.js';

const semanticLog = createLogger('Semantic');

/**
 * Compute semantic similarity between resume and vacancy.
 * @param {Object} resume
 * @param {Object} vacancy
 * @returns {Promise<number>} 0-1 similarity score
 */
export async function computeSemanticSimilarity(resume, vacancy) {
  if (!resume || !vacancy) return 0;

  const prompt = `Compare this resume to this job vacancy. Return a single number 0-1 indicating how well they match.

Resume title: ${resume.title || 'N/A'}
Resume skills: ${(resume.skills || []).join(', ')}
Resume experience: ${resume.experienceTotal || 'N/A'}

Vacancy title: ${vacancy.title || 'N/A'}
Vacancy skills: ${(vacancy.keySkills || []).join(', ')}
Vacancy requirements: ${vacancy.description?.text?.substring(0, 500) || 'N/A'}

Return ONLY a number between 0 and 1, like 0.75`;

  try {
    // Use Groq API (fast, free)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getApiKey()}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 10
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '0';
    const score = parseFloat(content) || 0;
    const clamped = Math.max(0, Math.min(1, score));

    semanticLog.info('Semantic score: ' + clamped);
    return clamped;
  } catch (err) {
    semanticLog.error('Semantic comparison failed: ' + err.message);
    return 0;
  }
}

async function getApiKey() {
  const data = await chrome.storage.local.get('aiApiKey');
  return data.aiApiKey || '';
}
```

2. Run lint: `cd extension && npm run lint` (Expected: PASS)
3. Commit with message: `feat: add AI semantic comparison module`

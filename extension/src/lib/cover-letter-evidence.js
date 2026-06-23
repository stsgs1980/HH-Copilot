/**
 * LIB: COVER LETTER EVIDENCE MAPPER (F-CR-02)
 * =============================================
 * mapEvidence(scorecard, resume, matchResult) -> Evidence[]
 *
 * Forensic evidence mapping per interview-designer methodology:
 * For each competency in scorecard, find concrete evidence in resume.
 *
 * Anti-hallucination: ONLY quotes from resume.experience[].description,
 * never paraphrases. Missing skills are SKIPPED silently (Kahneman de-bias:
 * do not invent or pad gaps).
 *
 * Pure function: no I/O.
 *
 * v1.9.50.0
 */

const MAX_EVIDENCE_SENTENCE_LEN = 280;

// Split text into sentences (Russian + English aware)
function splitSentences(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

// Case-insensitive substring check
function mentionsSkill(sentence, skill) {
  if (!sentence || !skill) return false;
  const s = sentence.toLowerCase();
  const k = String(skill).toLowerCase().trim();
  // Match as whole word boundary (works for Latin + Cyrillic via Unicode escapes)
  const re = new RegExp('(^|[^a-zа-яё0-9])' + escapeRegex(k) + '([^a-zа-яё0-9]|$)', 'i');
  return re.test(s);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Confidence: high if entry description contains a number/percent/year, else medium
function assessConfidence(entryDescription) {
  if (!entryDescription) return 'medium';
  if (/\d+\s*%|\d+\s*(раз|раза|ч|часов|часа|мин|мес|лет|года|год)\b|\d{4}\b|\$\s*\d+|\d+\s*(пользовател|клиент|страниц|записей|репозитор)/i.test(entryDescription)) {
    return 'high';
  }
  return 'medium';
}

/**
 * Map scorecard competencies to concrete evidence from resume.
 *
 * @param {Object} scorecard -- { competencies: string[] }
 * @param {Object} resume -- { experience: [{ company, position, period, description }] }
 * @param {Object} matchResult -- from computeMatchScore(); uses .details.matchingSkills,
 *                                .details.derivedMatchSkills, .details.missingSkills
 * @returns {Array<{ competency, evidenceText, source: {type, index, sentence}, confidence }>}
 */
export function mapEvidence(scorecard, resume, matchResult) {
  if (!scorecard || !resume || !matchResult) return [];
  if (!Array.isArray(scorecard.competencies)) return [];

  const details = matchResult.details || {};
  const matching = Array.isArray(details.matchingSkills) ? details.matchingSkills : [];
  const derived = Array.isArray(details.derivedMatchSkills) ? details.derivedMatchSkills : [];
  const synonyms = Array.isArray(details.synonymMatchSkills) ? details.synonymMatchSkills : [];
  const implied = Array.isArray(details.impliedMatchSkills) ? details.impliedMatchSkills : [];
  const missing = new Set(
    (Array.isArray(details.missingSkills) ? details.missingSkills : []).map(s => String(s).toLowerCase().trim())
  );

  const experience = Array.isArray(resume.experience) ? resume.experience : [];

  const evidence = [];

  for (const competency of scorecard.competencies) {
    const comp = String(competency).trim();
    if (!comp) continue;
    const compLower = comp.toLowerCase();

    // Skip missing skills (Kahneman de-bias: do not invent evidence for gaps)
    if (missing.has(compLower)) continue;

    // Determine confidence baseline from skill classification
    const isMatching = matching.some(s => String(s).toLowerCase().trim() === compLower);
    const isDerived = derived.some(s => String(s).toLowerCase().trim() === compLower);
    const isSynonym = synonyms.some(s => String(s).toLowerCase().trim() === compLower);
    const isImplied = implied.some(s => String(s).toLowerCase().trim() === compLower);

    if (!isMatching && !isDerived && !isSynonym && !isImplied) {
      // Competency not in match result at all -- skip (no evidence basis)
      continue;
    }

    // Search experience entries from most recent (last in array) backwards
    let found = null;
    for (let i = experience.length - 1; i >= 0; i--) {
      const exp = experience[i];
      if (!exp || !exp.description) continue;
      const sentences = splitSentences(exp.description);
      for (const sentence of sentences) {
        if (mentionsSkill(sentence, comp)) {
          found = {
            sentence,
            index: i,
            company: exp.company || '',
            position: exp.position || '',
            period: exp.period || '',
            entryDescription: exp.description,
          };
          break;
        }
      }
      if (found) break;
    }

    if (!found) continue; // No evidence -- skip silently

    // Confidence: high if matching skill + entry description has digit, medium if derived/synonym/implied or no digit
    let confidence;
    if (isMatching) {
      confidence = assessConfidence(found.entryDescription);
    } else {
      // derived/synonym/implied -> max medium
      confidence = 'medium';
    }

    const evidenceText = found.sentence.length > MAX_EVIDENCE_SENTENCE_LEN
      ? found.sentence.substring(0, MAX_EVIDENCE_SENTENCE_LEN) + '...'
      : found.sentence;

    evidence.push({
      competency: comp,
      evidenceText,
      source: {
        type: 'experience',
        index: found.index,
        sentence: found.sentence,
        company: found.company,
        position: found.position,
        period: found.period,
      },
      confidence,
    });
  }

  return evidence;
}

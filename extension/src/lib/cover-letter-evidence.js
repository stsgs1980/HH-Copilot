/**
 * LIB: COVER LETTER EVIDENCE MAPPER (F-CR-02)
 * =============================================
 * mapEvidence(scorecard, resume, matchResult) -> Evidence[]
 *
 * Forensic evidence mapping per interview-designer methodology:
 * For each competency in scorecard, find concrete evidence in resume.
 *
 * Anti-hallucination: ONLY quotes from resume.experience[].description
 * (primary) or declares skill from resume.skills (fallback). Never
 * paraphrases. Missing skills are SKIPPED silently (Kahneman de-bias:
 * do not invent or pad gaps).
 *
 * v1.9.50.0: original
 * v1.9.53.0: added skill-declaration fallback + position/company text
 *            search. Previously NO_EVIDENCE was returned whenever the
 *            skill was in resume.skills but not literally repeated in
 *            any experience.description sentence -- too strict for
 *            real hh.ru resumes where skill names like "Управление
 *            продажами" are declared in the skill list but experience
 *            descriptions use looser phrasing ("Управлял командой",
 *            "Рост продаж").
 * v1.9.55.0: added partial/stem matching (4-tier search) and a final
 *            experience-based fallback that returns the top-2 most
 *            recent experience items when no per-competency evidence
 *            is found. This guarantees mapEvidence() never returns []
 *            when resume.experience is non-empty, so the cover letter
 *            can always be generated (user explicitly requested the
 *            letter to never silently fail with NO_EVIDENCE).
 */

const MAX_EVIDENCE_SENTENCE_LEN = 280;
const MIN_STEM_LEN = 4; // words shorter than 4 chars are skipped during stem matching
const EXPERIENCE_FALLBACK_MAX = 2; // top-N most recent experience items used as final fallback

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

/**
 * PARTIAL/STEM MATCHING (v1.9.55.0)
 * =================================
 * Tries to match a skill against a sentence by word-stem prefix.
 * Used as a 4th-tier fallback when exact word-boundary match fails.
 *
 * Strategy:
 *   1. Tokenize skill into words (split on whitespace/dash).
 *   2. For each token of length >= MIN_STEM_LEN, take the first
 *      min(token.len, 6) characters as the stem.
 *   3. For each token, check if any word in the sentence starts
 *      with that stem (case-insensitive).
 *   4. Return true if ALL skill tokens have a matching stem in
 *      the sentence (AND semantics, so "B2B продажи" requires both
 *      "b2b*" and "продаж*" to be present).
 *
 * Examples:
 *   mentionsSkillStem("Управлял командой продаж", "Управление продажами")
 *     -> true  (управл* matches "управлял", продаж* matches "продаж")
 *   mentionsSkillStem("Рост выручки на 30%", "Управление продажами")
 *     -> false (управл* not found, продаж* not found)
 *
 * @param {string} sentence
 * @param {string} skill
 * @returns {boolean}
 */
function mentionsSkillStem(sentence, skill) {
  if (!sentence || !skill) return false;
  const s = sentence.toLowerCase();
  const skillWords = String(skill)
    .toLowerCase()
    .split(/[\s\-—–]+/)
    .map(w => w.trim())
    .filter(w => w.length >= MIN_STEM_LEN);
  if (skillWords.length === 0) return false;

  // For each skill word, derive a stem (first 4-6 chars) and check that
  // some word in the sentence starts with that stem.
  for (const sw of skillWords) {
    const stem = sw.substring(0, Math.min(sw.length, 6));
    // Word-boundary prefix match (Unicode-aware for Cyrillic + Latin)
    const re = new RegExp('(^|[^a-zа-яё0-9])' + escapeRegex(stem), 'i');
    if (!re.test(s)) return false;
  }
  return true;
}

// Confidence: high if entry description contains a number/percent/year, else medium
function assessConfidence(entryDescription) {
  if (!entryDescription) return 'medium';
  if (/\d+\s*%|\d+\s*(раз|раза|ч|часов|часа|мин|мес|лет|года|год)\b|\d{4}\b|\$\s*\d+|\d+\s*(пользовател|клиент|страниц|записей|репозитор)/i.test(entryDescription)) {
    return 'high';
  }
  return 'medium';
}

// Normalize a skill name the same way match-scorer-skills.js does
function normalizeSkill(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[-\u2013\u2014]/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

/**
 * Map scorecard competencies to concrete evidence from resume.
 *
 * @param {Object} scorecard -- { competencies: string[] }
 * @param {Object} resume -- { skills: string[], experience: [{ company, position, period, description }] }
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
    (Array.isArray(details.missingSkills) ? details.missingSkills : []).map(s => normalizeSkill(s))
  );

  const experience = Array.isArray(resume.experience) ? resume.experience : [];

  // Normalize resume.skills once for fallback lookups
  const resumeSkillsArr = Array.isArray(resume.skills) ? resume.skills : [];
  const resumeSkillsNorm = new Set(resumeSkillsArr.map(normalizeSkill));

  const evidence = [];

  for (const competency of scorecard.competencies) {
    const comp = String(competency).trim();
    if (!comp) continue;
    const compLower = comp.toLowerCase();
    const compNorm = normalizeSkill(comp);

    // Skip missing skills (Kahneman de-bias: do not invent evidence for gaps)
    if (missing.has(compNorm)) continue;

    // Determine confidence baseline from skill classification
    const isMatching = matching.some(s => normalizeSkill(s) === compNorm);
    const isDerived = derived.some(s => normalizeSkill(s) === compNorm);
    // Synonym entries come shaped like "B2B продажи ~ работа с возражениями" -- check both sides
    const isSynonym = synonyms.some(s => {
      const parts = String(s).split('~').map(p => normalizeSkill(p));
      return parts.includes(compNorm);
    });
    const isImplied = implied.some(s => normalizeSkill(s) === compNorm);

    if (!isMatching && !isDerived && !isSynonym && !isImplied) {
      // Competency not in match result at all -- skip (no evidence basis)
      continue;
    }

    // Search experience entries from most recent (last in array) backwards.
    // Search across description + position + company -- sometimes position title
    // itself contains the skill keyword (e.g. "Senior B2B Sales Manager" -> B2B).
    let found = null;
    for (let i = experience.length - 1; i >= 0; i--) {
      const exp = experience[i];
      if (!exp) continue;

      // Primary: scan description sentences
      if (exp.description) {
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
              fieldType: 'description',
            };
            break;
          }
        }
      }

      // Secondary: scan position title as a single "sentence"
      if (!found && exp.position && mentionsSkill(exp.position, comp)) {
        found = {
          sentence: exp.position,
          index: i,
          company: exp.company || '',
          position: exp.position || '',
          period: exp.period || '',
          entryDescription: exp.position,
          fieldType: 'position',
        };
      }

      // Tertiary: scan company name
      if (!found && exp.company && mentionsSkill(exp.company, comp)) {
        found = {
          sentence: exp.company,
          index: i,
          company: exp.company || '',
          position: exp.position || '',
          period: exp.period || '',
          entryDescription: exp.company,
          fieldType: 'company',
        };
      }

      // Quaternary (v1.9.55.0): partial/stem match on description sentences.
      // Catches word-form variations: "Управление продажами" (skill) vs
      // "Управлял командой продаж" (description). Marked as fieldType='stem'
      // so confidence is capped at 'low' below (weaker than exact match).
      if (!found && exp.description) {
        const sentences = splitSentences(exp.description);
        for (const sentence of sentences) {
          if (mentionsSkillStem(sentence, comp)) {
            found = {
              sentence,
              index: i,
              company: exp.company || '',
              position: exp.position || '',
              period: exp.period || '',
              entryDescription: exp.description,
              fieldType: 'stem',
            };
            break;
          }
        }
      }

      if (found) break;
    }

    // Fallback: skill declared in resume.skills but no narrative evidence.
    // Anti-hallucination safe: we state the verifiable fact that the skill
    // is in the resume's declared skill list, without inventing context.
    if (!found && resumeSkillsNorm.has(compNorm)) {
      evidence.push({
        competency: comp,
        evidenceText: 'Декларированный навык в резюме: ' + comp,
        source: {
          type: 'skill_declaration',
          index: -1,
          sentence: '',
          company: '',
          position: '',
          period: '',
        },
        confidence: 'declared',
      });
      continue;
    }

    if (!found) continue; // No evidence -- skip silently

    // Confidence: high if matching skill + entry description has digit,
    //              medium if derived/synonym/implied or no digit,
    //              low if matched via partial/stem (weaker evidence),
    //              (declared fallback handled above)
    let confidence;
    if (isMatching) {
      confidence = assessConfidence(found.entryDescription);
    } else {
      // derived/synonym/implied -> max medium
      confidence = 'medium';
    }
    // Position-only or company-only matches are weaker -- cap at medium
    if (found.fieldType !== 'description') {
      confidence = 'medium';
    }
    // Stem match is the weakest -- cap at 'low' so the LLM knows to be cautious
    if (found.fieldType === 'stem') {
      confidence = 'low';
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

  // FINAL FALLBACK (v1.9.55.0): if no per-competency evidence was found,
  // return the top-N most recent experience entries as low-confidence
  // evidence. This guarantees the cover letter can always be generated
  // (user explicitly requested no silent NO_EVIDENCE failure when the
  // resume has any experience at all).
  //
  // Anti-hallucination safe: we ONLY quote verbatim from resume.experience
  // (first sentence of description, or position title if description is
  // empty). competency is marked as '(опыт из резюме)' so the LLM knows
  // this is generic experience, not a specific skill match.
  if (evidence.length === 0 && experience.length > 0) {
    const startIdx = Math.max(0, experience.length - EXPERIENCE_FALLBACK_MAX);
    for (let i = experience.length - 1; i >= startIdx; i--) {
      const exp = experience[i];
      if (!exp) continue;
      const sentences = exp.description ? splitSentences(exp.description) : [];
      const sentence = sentences[0] || exp.position || exp.company || '';
      if (!sentence) continue;
      const evidenceText = sentence.length > MAX_EVIDENCE_SENTENCE_LEN
        ? sentence.substring(0, MAX_EVIDENCE_SENTENCE_LEN) + '...'
        : sentence;
      evidence.push({
        competency: '(опыт из резюме)',
        evidenceText,
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
  }

  return evidence;
}

/** Exported for tests. */
export const _internal = {
  mentionsSkillStem,
  MIN_STEM_LEN,
  EXPERIENCE_FALLBACK_MAX,
};

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
 * v1.9.56.0: stem-matching anti-hallucination hardening (Gap 1+2):
 *            short stems require exact word or word + inflection suffix
 *            (blocks "react" matching "Reactive"); short skill tokens
 *            require exact match (blocks "C++ разработка" without "C++").
 *            Split into skill-stem-match.js, cover-letter-evidence-search.js,
 *            and cover-letter-evidence-fallback.js (AHG Rule 12).
 */

const EXPERIENCE_FALLBACK_MAX = 2; // top-N most recent experience items used as final fallback

// Stem/partial matching logic lives in skill-stem-match.js (extracted in
// v1.9.56.0 to keep this file under AHG Rule 12). Re-exported here so the
// existing _internal export and tests keep working without import churn.
import {
  mentionsSkillStem,
  MIN_STEM_LEN,
} from './skill-stem-match.js';

// Sentence splitter + experience fallback extracted to a sibling module
// (v1.9.56.0) to keep this file under AHG Rule 12.
import {
  buildExperienceFallback,
  truncate,
} from './cover-letter-evidence-fallback.js';

// 4-tier evidence search extracted to a sibling module (v1.9.56.0).
import { findCompetencyEvidence } from './cover-letter-evidence-search.js';

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

    // 4-tier evidence search (description > position > company > stem).
    // See findCompetencyEvidence() in cover-letter-evidence-search.js.
    const found = findCompetencyEvidence(comp, experience);

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

    evidence.push({
      competency: comp,
      evidenceText: truncate(found.sentence),
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
  // evidence. See buildExperienceFallback() in cover-letter-evidence-fallback.js.
  if (evidence.length === 0) {
    evidence.push(...buildExperienceFallback(experience, EXPERIENCE_FALLBACK_MAX));
  }

  return evidence;
}

/** Exported for tests. */
export const _internal = {
  mentionsSkillStem,
  MIN_STEM_LEN,
  EXPERIENCE_FALLBACK_MAX,
};

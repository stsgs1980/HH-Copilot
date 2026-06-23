/**
 * LIB: COVER LETTER SCORECARD (F-CR-02)
 * =======================================
 * extractScorecard(vacancy) -> { mission, outcomes[], competencies[], source }
 *
 * Methodology: Scorecard definition per Geoff Smart's "Who" (Topgrading),
 * reverse-applied from interview-designer skill. Define what A-Player means
 * for this role BEFORE looking at resume.
 *
 * Pure function: no I/O, no chrome.storage, no fetch.
 *
 * v1.9.50.0
 */

const MAX_OUTCOMES = 5;
const MAX_COMPETENCIES = 10;

// Strip these leading phrases from requirement noun phrases
const REQ_PREFIXES = /^(опыт работы с|опыт работы в|опыт с|опыт в|знание|понимание|владение|работа с|работа в|навыки|умение)\s+/i;

// Sentence splitter: split on . ! ? followed by space or end
function splitSentences(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

// Heuristic: sentence is "concrete" if it contains a verb (Russian + English)
// and at least one noun-like word. Generic phrases ("команда", "развивайтесь") excluded.
function isConcreteSentence(s) {
  if (!s || s.length < 10) return false;
  // Exclude very generic phrases
  if (/^(команда|развивайтесь с нами|наша команда|будет плюсом|желательно)/i.test(s)) return false;
  // Has at least one verb-like word (Russian verbs end in -ть/-ет/-ит/-ает/-яет OR English -ing/-ed)
  const hasVerb = /\b(разработ|настрой|оптимиз|поддержк|автоматиз|внедрен|реализ|управляй|управлен|анализ|тест|deploy|build|test|implement|automate|monitor)\w*/i.test(s);
  // Has a noun-like word (length > 3)
  const hasNoun = /[а-яёa-z]{4,}/i.test(s);
  return hasVerb || hasNoun;
}

// Parse requirements section into noun phrases (split by comma/newline)
function parseRequirementsPhases(reqText) {
  if (!reqText) return [];
  return reqText
    .split(/[,\n;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2 && s.length < 80)
    .map(s => s.replace(REQ_PREFIXES, '').trim())
    .filter(s => s.length > 2)
    .map(s => s.replace(/\.$/, ''));
}

/**
 * Extract scorecard from vacancy.
 *
 * @param {Object} vacancy -- parsed vacancy object
 * @returns {{ mission: string, outcomes: string[], competencies: string[], source: Object }}
 */
export function extractScorecard(vacancy) {
  if (!vacancy) {
    return { mission: '', outcomes: [], competencies: [], source: {} };
  }

  const title = vacancy.title || 'роль';
  const sections = (vacancy.description && vacancy.description.sections) || {};
  const responsibilities = sections.responsibilities || '';
  const requirements = sections.requirements || '';
  const keySkills = Array.isArray(vacancy.keySkills) ? vacancy.keySkills.slice(0, 8) : [];

  // -- Mission --
  const respSentences = splitSentences(responsibilities);
  const firstResp = respSentences[0] || '';
  let mission;
  if (firstResp) {
    mission = title + ': ' + firstResp;
  } else {
    mission = title + ' в ' + (vacancy.company || 'компании');
  }

  // -- Outcomes (top 3-5 concrete sentences from responsibilities) --
  let outcomes = respSentences.filter(isConcreteSentence).slice(0, MAX_OUTCOMES);
  if (outcomes.length === 0) {
    outcomes = ['успешно выполнять обязанности роли ' + title];
  }

  // -- Competencies (union of keySkills + requirements noun phrases) --
  const reqPhrases = parseRequirementsPhases(requirements);
  const seen = new Set();
  const competencies = [];
  for (const sk of keySkills) {
    const s = String(sk).trim();
    if (s && !seen.has(s.toLowerCase())) {
      seen.add(s.toLowerCase());
      competencies.push(s);
    }
  }
  for (const r of reqPhrases) {
    if (competencies.length >= MAX_COMPETENCIES) break;
    if (!seen.has(r.toLowerCase())) {
      seen.add(r.toLowerCase());
      competencies.push(r);
    }
  }

  return {
    mission,
    outcomes,
    competencies,
    source: {
      mission: firstResp ? 'title+responsibilities[0]' : 'title+company',
      outcomes: 'responsibilities (' + outcomes.length + ' concrete sentences)',
      competencies: 'keySkills(' + keySkills.length + ')+requirements(' + reqPhrases.length + ')',
    },
  };
}

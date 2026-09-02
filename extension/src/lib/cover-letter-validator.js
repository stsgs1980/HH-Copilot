/**
 * LIB: COVER LETTER VALIDATOR (F-CR-02)
 * =======================================
 * validateLetter(text, evidence, resumeSkills) -> { ok, text, warnings }
 *
 * Checks:
 * 1. Length <= 5000 (hh.ru hard limit, truncate if exceeded)
 * 2. Unverified skill warnings (skill in text not in evidence + not in resume.skills)
 * 3. Unverified number warnings (digit in text not in evidence)
 * 4. Strip leading "Здравствуйте, меня зовут ..."
 * 5. Strip LLM filler first paragraph
 * 6. 11 AI pattern detections (humanizer) -- warn-only, except ** auto-stripped
 *
 * Pure function: no I/O.
 *
 * v1.9.50.0
 */

const MAX_LENGTH = 5000;

// AI pattern regexes (Russian-aware, per humanizer skill)
const AI_PATTERNS = [
  {
    name: "inflated_symbolism",
    re: /служит\s+\S*\s*(?:свидетельством|доказательством)|выступает\s+доказательством|подчёркивает важность|свидетельствует о/i,
  },
  { name: "ai_vocabulary", re: /кроме того|более того|вместе с тем|важно отметить|следует подчеркнуть/i },
  { name: "negative_parallelism", re: /не только[^.!?]{1,80}но и|это не просто[^.!?]{1,80}это/i },
  { name: "verbal_noun_filler", re: /обеспечивая|подчёркивая|отражая|демонстрируя|формируя/i },
  {
    name: "generic_conclusion",
    re: /буду рад принести ценность|уверен,?\s*что мой опыт|безусловно[^.!?]{1,40}подтвердится/i,
  },
  { name: "filler", re: /важно отметить,?\s*что|следует подчеркнуть,?\s*что/i },
  { name: "sycophantic", re: /большое спасибо за внимание|благодарю за уделённое время/i },
  { name: "inline_header_list", re: /^\s*[•\-*]\s*\*\*[^*]+\*\*:/m },
];

// LLM filler first paragraph detection
const LLM_FILLER_RE = /^(Я уверен,?\s*что мой опыт[^.!?]{0,100}[.!?]\s*)/i;
// "Здравствуйте, меня зовут ..." -- strip up to first sentence
const NAME_INTRO_RE = /^Здравствуйте,?\s*меня зовут[^.!?]+[.!?]\s*/i;

function detectAIPatterns(text) {
  const warnings = [];
  for (const { name, re } of AI_PATTERNS) {
    if (re.test(text)) {
      warnings.push("AI_PATTERN: " + name);
    }
  }
  // Rule of three (heuristic, may false-positive): 3+ comma-separated lowercase words
  // Skipping auto-detect -- too noisy. Rely on prompt instructions.
  // Em dash overuse: count > 3
  const emDashCount = (text.match(/—/g) || []).length;
  if (emDashCount > 3) {
    warnings.push("AI_PATTERN: em_dash_overuse (" + emDashCount + ")");
  }
  // Boldface: detect + auto-strip
  if (/\*\*[^*]+\*\*/.test(text)) {
    warnings.push("AI_PATTERN: boldface (auto-stripped)");
  }
  return warnings;
}

function stripBoldface(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

function stripLeadingFiller(text) {
  let t = text;
  // Strip "Здравствуйте, меня зовут ..."
  t = t.replace(NAME_INTRO_RE, "");
  // Strip LLM filler first paragraph
  t = t.replace(LLM_FILLER_RE, "");
  return t;
}

function findUnverifiedSkills(text, evidence, resumeSkills) {
  const warnings = [];
  if (!text) return warnings;
  const known = new Set();
  (evidence || []).forEach((e) => known.add(String(e.competency).toLowerCase().trim()));
  (resumeSkills || []).forEach((s) => {
    if (typeof s === "string") known.add(s.toLowerCase().trim());
    else if (s && s.name) known.add(s.name.toLowerCase().trim());
  });
  // Scan text for known tech skills (heuristic: capitalized Latin words 3+ chars OR known acronyms)
  // This is a simple heuristic -- real NER would be better but heavy.
  const techSkillRe = /\b([A-Z][a-zA-Z0-9.#-]{2,30})\b/g;
  const matches = text.matchAll(techSkillRe);
  const seen = new Set();
  for (const m of matches) {
    const skill = m[1];
    const low = skill.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    // Skip common Russian false-positives (capitalized English words that aren't skills)
    if (
      /^(React|TypeScript|JavaScript|Python|Java|Go|Rust|C\+\+|SQL|HTML|CSS|Node\.js|Docker|Kubernetes|AWS|GCP|Azure|Kafka|Redis|MongoDB|PostgreSQL|MySQL|GraphQL|REST|API|HTTP|HTTPS|CI|CD|Git|Linux|Windows|MacOS)$/.test(
        skill,
      )
    ) {
      if (!known.has(low)) {
        warnings.push("UNVERIFIED_SKILL: " + skill);
      }
    }
  }
  return warnings;
}

function findUnverifiedNumbers(text, evidence) {
  const warnings = [];
  if (!text) return warnings;
  // Collect numbers from evidence
  const evidenceNumbers = new Set();
  (evidence || []).forEach((e) => {
    const nums = String(e.evidenceText || "").match(/\d+/g);
    if (nums) nums.forEach((n) => evidenceNumbers.add(n));
  });
  // Find numbers in text
  const textNums = text.match(/\d+/g);
  if (!textNums) return warnings;
  // Filter out years (1900-2099) and small common numbers
  const suspect = textNums.filter((n) => {
    const i = parseInt(n, 10);
    if (i >= 1900 && i <= 2099) return false; // year
    if (i < 2) return false; // too small
    return !evidenceNumbers.has(n);
  });
  // Dedupe + cap to 5 warnings
  const unique = [...new Set(suspect)].slice(0, 5);
  unique.forEach((n) => warnings.push("UNVERIFIED_NUMBER: " + n));
  return warnings;
}

/**
 * Validate cover letter text against evidence + resume skills.
 *
 * @param {string} text -- LLM output
 * @param {Array} evidence -- [{ competency, evidenceText }]
 * @param {Array} resumeSkills -- string[] of skills in resume
 * @returns {{ ok: boolean, text: string, warnings: string[] }}
 */
export function validateLetter(text, evidence, resumeSkills) {
  let cleaned = text || "";
  const warnings = [];

  // 1. Detect AI patterns on ORIGINAL text (before stripping boldface)
  warnings.push(...detectAIPatterns(cleaned));

  // 2. Strip leading filler + boldface (transformations)
  cleaned = stripLeadingFiller(cleaned);
  cleaned = stripBoldface(cleaned);

  // 3. Length check (truncate)
  if (cleaned.length > MAX_LENGTH) {
    cleaned = cleaned.substring(0, MAX_LENGTH - 3) + "...";
    warnings.push("LENGTH: truncated to " + MAX_LENGTH + " chars");
  }

  // 4. Unverified skills/numbers (on cleaned text)
  warnings.push(...findUnverifiedSkills(cleaned, evidence, resumeSkills));
  warnings.push(...findUnverifiedNumbers(cleaned, evidence));

  // ok = no critical warnings (length truncation is not critical)
  const criticalPatterns = warnings.filter((w) => /UNVERIFIED_SKILL|UNVERIFIED_NUMBER/.test(w));
  const ok = criticalPatterns.length === 0 && cleaned.length > 0;

  return { ok, text: cleaned, warnings };
}

/**
 * LIB: COVER LETTER HUMANIZER (F-CR-02)
 * =====================================
 * AI-pattern detection + boldface stripping.
 * Separated from validator (limit 250 lines).
 */

export const AI_PATTERNS = [
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
  { name: "inline_header_list", re: /^\s*[•*-]\s*\*\*[^*]+\*\*:/m },
];

export function detectAIPatterns(text) {
  const warnings = [];
  for (const { name, re } of AI_PATTERNS) {
    if (re.test(text)) {
      warnings.push("AI_PATTERN: " + name);
    }
  }
  const emDashCount = (text.match(/—/g) || []).length;
  if (emDashCount > 3) {
    warnings.push("AI_PATTERN: em_dash_overuse (" + emDashCount + ")");
  }
  if (/\*\*[^*]+\*\*/.test(text)) {
    warnings.push("AI_PATTERN: boldface (auto-stripped)");
  }
  return warnings;
}

export function stripBoldface(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

/**
 * ESLint custom rule: no-unicode-graphics
 * Enforces AHG Rule 15 -- No Unicode graphics (UNICODE_POLICY compliance)
 *
 * Prohibited in [C] level (production code):
 *   - Em dash (U+2014), en dash (U+2013)
 *   - Box drawing (U+2500-U+257F)
 *   - Emoji and pictograms
 *   - Guillemets (U+00AB, U+00BB)
 *   - Right/left arrows (U+2190-U+2193)
 *   - Currency symbols: Euro sign (U+20AC)
 *   - Other decorative Unicode
 *
 * Allowed: ASCII a-z A-Z 0-9, Cyrillic, standard punctuation.
 * Allowed: Unicode escapes like \u2014 in source (source-level, not rendered).
 * Allowed: Middle dot (U+00B7) as separator in UI lists.
 */

const PROHIBITED_RANGES = [
  // Em dash, en dash
  { start: 0x2013, end: 0x2015, name: "en/em dash", replacement: "--" },
  // General punctuation: << >> guillemets
  { start: 0x00ab, end: 0x00ab, name: "left guillemet", replacement: "<<" },
  { start: 0x00bb, end: 0x00bb, name: "right guillemet", replacement: ">>" },
  // Box drawing
  { start: 0x2500, end: 0x2580, name: "box drawing", replacement: "-" },
  // Block elements
  { start: 0x2580, end: 0x25a0, name: "block elements", replacement: "#" },
  // Geometric shapes
  { start: 0x25a0, end: 0x2600, name: "geometric shapes", replacement: "*" },
  // Misc symbols + dingbats (check marks, crosses, etc.)
  { start: 0x2600, end: 0x27c0, name: "symbols/dingbats", replacement: "" },
  // Arrows
  { start: 0x2190, end: 0x21ff, name: "arrows", replacement: "->" },
  // Currency: Euro
  { start: 0x20ac, end: 0x20ac, name: "euro sign", replacement: "euro" },
  // Superscripts/subscripts (U+2070-U+209F)
  { start: 0x2070, end: 0x209f, name: "super/subscript", replacement: "" },
  // Emoji ranges
  { start: 0x1f300, end: 0x1fa00, name: "emoji/pictographs", replacement: "" },
  { start: 0x1fa00, end: 0x1fb00, name: "extended pictographs", replacement: "" },
  // Letterlike symbols (U+2100-U+214F)
  { start: 0x2100, end: 0x214f, name: "letterlike symbols", replacement: "" },
  // Number forms (U+2150-U+218F)
  { start: 0x2150, end: 0x218f, name: "number forms", replacement: "" },
];

// Explicitly allowed Unicode code points (even if in prohibited ranges)
const ALLOWED_CODEPOINTS = new Set([
  0x00b7, // Middle dot -- used as list separator in UI (e.g. "Company · Date")
]);

function isProhibited(codePoint) {
  if (ALLOWED_CODEPOINTS.has(codePoint)) return null;
  for (const range of PROHIBITED_RANGES) {
    if (codePoint >= range.start && codePoint <= range.end) {
      return range;
    }
  }
  return null;
}

/**
 * Check if a Literal node uses \uXXXX escape sequences in raw source.
 * If the prohibited char appears as \uXXXX in raw, it is a source-level
 * representation (not rendered Unicode) and should NOT be flagged.
 * Only flag LITERAL Unicode characters in the source code.
 */
function hasEscapeInRaw(node, codePoint) {
  const raw = node.raw || "";
  if (!raw) return false;
  const hexCode = codePoint.toString(16).toUpperCase().padStart(4, "0");
  // Check for \uXXXX or \u{XXXX} in raw source
  if (raw.includes("\\u" + hexCode)) return true;
  if (raw.includes("\\u{" + hexCode + "}")) return true;
  // Also check lowercase variant
  const hexLower = codePoint.toString(16).toLowerCase().padStart(4, "0");
  if (raw.includes("\\u" + hexLower)) return true;
  if (raw.includes("\\u{" + hexLower + "}")) return true;
  return false;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce AHG Rule 15: no Unicode graphics in production code",
      category: "AHG Rules",
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: "object",
        properties: {
          level: {
            enum: ["C", "W"],
            default: "C",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unicodeProhibited:
        'AHG Rule 15: Unicode "{{ char }}" (U+{{ code }}) -- {{ name }} is prohibited. Use "{{ replacement }}" instead.',
      unicodeProhibitedWarn:
        'AHG Rule 15 [W]: Unicode "{{ char }}" (U+{{ code }}) -- {{ name }} is discouraged. Use "{{ replacement }}" instead.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const level = options.level || "C";

    return {
      Literal(node) {
        if (typeof node.value !== "string") return;

        // Skip regex literals
        if (node.parent && node.parent.type === "Literal" && node.parent.regex) return;
        // Skip test files (warn level)
        const filename = context.filename || "";
        const isTest = filename.includes(".test.") || filename.includes(".spec.");
        const effectiveLevel = isTest ? "W" : level;

        const value = node.value;

        for (let i = 0; i < value.length; i++) {
          const cp = value.codePointAt(i);
          const range = isProhibited(cp);
          if (range) {
            // If this char is written as \uXXXX escape in source, skip it
            // (source-level representation, not a literal Unicode char)
            if (hasEscapeInRaw(node, cp)) {
              if (cp > 0xffff) i++;
              continue;
            }

            const char = String.fromCodePoint(cp);
            const hexCode = cp.toString(16).toUpperCase().padStart(4, "0");

            context.report({
              node,
              messageId: effectiveLevel === "C" ? "unicodeProhibited" : "unicodeProhibitedWarn",
              data: {
                char,
                code: hexCode,
                name: range.name,
                replacement: range.replacement,
              },
            });

            // Skip surrogate pair
            if (cp > 0xffff) i++;
            // Only report once per literal for same range
            break;
          }
        }
      },

      TemplateElement(node) {
        if (!node.value || !node.value.cooked) return;

        const filename = context.filename || "";
        const isTest = filename.includes(".test.") || filename.includes(".spec.");
        const effectiveLevel = isTest ? "W" : level;

        const value = node.value.cooked;

        for (let i = 0; i < value.length; i++) {
          const cp = value.codePointAt(i);
          const range = isProhibited(cp);
          if (range) {
            const char = String.fromCodePoint(cp);
            const hexCode = cp.toString(16).toUpperCase().padStart(4, "0");

            context.report({
              node,
              messageId: effectiveLevel === "C" ? "unicodeProhibited" : "unicodeProhibitedWarn",
              data: {
                char,
                code: hexCode,
                name: range.name,
                replacement: range.replacement,
              },
            });

            if (cp > 0xffff) i++;
            break;
          }
        }
      },
    };
  },
};

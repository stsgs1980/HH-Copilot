/**
 * ESLint custom rule: max-file-lines-hard
 * Enforces AHG Rule 12 -- Anti-monolith (BLOCKING tier)
 *
 * This rule ONLY reports errors (never warnings). It is meant to be paired
 * with `max-file-lines.js` (the WARN-tier sibling) so that:
 *   - Files 200-249  -> WARN  (informational, does NOT block lint:ci)
 *   - Files 250-399  -> ERROR (blocks, unless file has ANTI-MONOLITH exception)
 *   - Files 400+     -> ERROR (HARD CAP, no exceptions)
 *
 * AHG Rule 12 spec (AGENT_RULES.md):
 *   - 250 lines hard limit (150 recommended)
 *   - Valid exception: 250-300 lines AND well-organized (needs comment)
 *   - Invalid exception: exceeds 400 lines (no excuses)
 */

const ERROR_LIMIT = 250;
const HARD_CAP = 400;

const EXCEPTION_PATTERN = /ANTI-MONOLITH\s+exception/;

function hasException(sourceCode) {
  const lines = sourceCode.getLines();
  const checkCount = Math.min(lines.length, 5);
  for (let i = 0; i < checkCount; i++) {
    if (EXCEPTION_PATTERN.test(lines[i])) return true;
  }
  return false;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'AHG Rule 12 (blocking tier): no file over 250 lines (or 400 hard cap)',
      category: 'AHG Rules',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          errorLimit: { type: 'number', minimum: 50 },
          hardCap: { type: 'number', minimum: 50 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      overError:
        'AHG Rule 12 [C]: File has {{ count }} lines (limit {{ limit }}). Split this file immediately.',
      overHardCap:
        'AHG Rule 12 [C]: File has {{ count }} lines (HARD CAP {{ limit }}). No exceptions allowed. Decompose NOW.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const errorLimit = options.errorLimit || ERROR_LIMIT;
    const hardCap = options.hardCap || HARD_CAP;

    return {
      Program(node) {
        const sourceCode = context.sourceCode || context.getSourceCode();
        const lines = sourceCode.getLines();
        const lineCount = lines.length;
        const exempted = hasException(sourceCode);

        // Hard cap -- NO exceptions, not even documented ones
        if (lineCount > hardCap) {
          context.report({
            node,
            messageId: 'overHardCap',
            data: { count: lineCount, limit: hardCap },
          });
          return;
        }

        // Error limit -- exempted files get a pass (but not above hard cap)
        if (lineCount > errorLimit && !exempted) {
          context.report({
            node,
            messageId: 'overError',
            data: { count: lineCount, limit: errorLimit },
          });
        }
      },
    };
  },
};

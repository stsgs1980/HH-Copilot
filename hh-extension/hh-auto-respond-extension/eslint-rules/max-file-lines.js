/**
 * ESLint custom rule: max-file-lines
 * Enforces AHG Rule 12 -- Anti-monolith (no file over 250 lines)
 *
 * Thresholds:
 *   - Warning at 200 lines (recommended: 150)
 *   - Error at 250 lines (hard limit)
 *   - Hard cap at 400 lines (no exceptions)
 *
 * Files with ANTI-MONOLITH exception comment in first 5 lines are exempted
 * (but NOT above the hard cap of 400).
 */

const WARN_LIMIT = 200;
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
      description: 'Enforce AHG Rule 12: no file over 250 lines (anti-monolith)',
      category: 'AHG Rules',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          warnLimit: { type: 'number', minimum: 50 },
          errorLimit: { type: 'number', minimum: 50 },
          hardCap: { type: 'number', minimum: 50 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      overWarn:
        'AHG Rule 12 [W]: File has {{ count }} lines (recommended max {{ limit }}). Consider splitting.',
      overError:
        'AHG Rule 12 [C]: File has {{ count }} lines (limit {{ limit }}). Split this file immediately.',
      overHardCap:
        'AHG Rule 12 [C]: File has {{ count }} lines (HARD CAP {{ limit }}). No exceptions allowed. Decompose NOW.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const warnLimit = options.warnLimit || WARN_LIMIT;
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
          return;
        }

        // Warning limit -- always warn, even for exempted files
        if (lineCount > warnLimit) {
          context.report({
            node,
            messageId: 'overWarn',
            data: { count: lineCount, limit: warnLimit },
          });
        }
      },
    };
  },
};

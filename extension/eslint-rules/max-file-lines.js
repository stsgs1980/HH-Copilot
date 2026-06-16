/**
 * ESLint custom rule: max-file-lines (WARN tier)
 * Companion to `max-file-lines-hard.js` (ERROR tier).
 *
 * This rule ONLY reports warnings (200+ lines). It is informational and
 * does NOT block lint:ci. The blocking logic lives in max-file-lines-hard.js.
 *
 * AHG Rule 12 spec (AGENT_RULES.md):
 *   - 150 lines recommended
 *   - 250 lines hard limit (enforced by max-file-lines-hard.js)
 *   - 400 lines absolute max (enforced by max-file-lines-hard.js)
 *
 * This WARN tier fires at 200+ to give an early signal: "this file is
 * getting large, consider splitting before it hits the 250 hard limit".
 */

const WARN_LIMIT = 200;

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'AHG Rule 12 (warn tier): suggest splitting files over 200 lines',
      category: 'AHG Rules',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          warnLimit: { type: 'number', minimum: 50 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      overWarn:
        'AHG Rule 12 [W]: File has {{ count }} lines (recommended max {{ limit }}). Consider splitting.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const warnLimit = options.warnLimit || WARN_LIMIT;

    return {
      Program(node) {
        const sourceCode = context.sourceCode || context.getSourceCode();
        const lines = sourceCode.getLines();
        const lineCount = lines.length;

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

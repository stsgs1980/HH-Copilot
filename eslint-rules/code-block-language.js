const create = (context) => {
  const sourceCode = context.sourceCode || context.getSourceCode();
  const lines = sourceCode.getText().split("\n");
  const fenceRegex = /^(`{3,})(.*)$/;

  return {
    Program() {
      let insideCodeBlock = false;
      lines.forEach((line, index) => {
        const match = fenceRegex.exec(line.trimStart());
        if (!match) return;

        const afterFence = match[2] || "";

        if (!insideCodeBlock) {
          if (afterFence.trim() === "") {
            context.report({
              loc: { line: index + 1, column: 0 },
              messageId: "missingLanguage",
            });
          }
          insideCodeBlock = true;
        } else if (afterFence.trim() === "") {
          insideCodeBlock = false;
        }
      });
    },
  };
};

export default {
  meta: {
    type: "suggestion",
    docs: { description: "Require language specification in fenced code blocks" },
    messages: {
      missingLanguage: "Code block must specify a language. Use 'text' or 'bash' if unknown.",
    },
  },
  create,
};

import markdownPlugin from "@eslint/markdown";

const originalProcessor = markdownPlugin.processors.markdown;

const EXCLUDE_PARSING_ERRORS = (message) =>
  !(message?.ruleId === null && message?.message?.startsWith("Parsing error"));

const postprocess = (messages, filename) => {
  const originalMessages = originalProcessor.postprocess(messages, filename);
  return originalMessages.filter(EXCLUDE_PARSING_ERRORS);
};

export default {
  meta: { name: "markdown-snippets-processor", version: "1.0.0" },
  preprocess: originalProcessor.preprocess,
  postprocess,
  supportsAutofix: originalProcessor.supportsAutofix,
};

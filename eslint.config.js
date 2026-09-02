import markdown from "@eslint/markdown";
import tsParser from "@typescript-eslint/parser";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";
import markdownSnippetsProcessor from "./eslint-processors/markdown-snippets.js";
import codeBlockLanguage from "./eslint-rules/code-block-language.js";
import unicodePolicy from "./eslint-rules/unicode-policy.js";
import maxFileLinesHard from "./extension/eslint-rules/max-file-lines-hard.js";
import maxFileLines from "./extension/eslint-rules/max-file-lines.js";
import noUnicodeGraphicsExt from "./extension/eslint-rules/no-unicode-graphics.js";

const codeBlockLanguagePlugin = {
  meta: { name: "code-block-language", version: "1.0.0" },
  rules: { "require-language": codeBlockLanguage },
};

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "extension/dist/**",
      "extension/node_modules/**",
    ],
  },
  ...markdown.configs.recommended,
  {
    files: ["**/*.md"],
    processor: markdownSnippetsProcessor,
  },
  {
    files: ["**/*.md/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    linterOptions: { reportUnusedDisableDirectives: false },
    plugins: { "unicode-policy": unicodePolicy },
    rules: {
      "unicode-policy/emoji": "error",
      "unicode-policy/unicode-graphics": "error",
    },
  },
  {
    files: ["**/*.md"],
    plugins: {
      "unicode-policy": unicodePolicy,
      "code-block-language": codeBlockLanguagePlugin,
    },
    rules: {
      "unicode-policy/emoji-in-md": "error",
      "unicode-policy/unicode-graphics-in-md": "error",
      "code-block-language/require-language": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      jsdoc,
      "unicode-policy": unicodePolicy,
    },
    rules: {
      "unicode-policy/emoji": "error",
      "unicode-policy/unicode-graphics": "error",
      "no-irregular-whitespace": "error",
      "jsdoc/require-jsdoc": "warn",
      "jsdoc/require-param": "warn",
      "jsdoc/require-returns": "warn",
    },
  },
  {
    files: ["extension/src/**/*.js", "extension/background/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
        chrome: "readonly",
        __hhCopilotVersion: "readonly",
        process: "readonly",
      },
    },
    plugins: {
      "ahg-rules": {
        rules: {
          "no-unicode-graphics": noUnicodeGraphicsExt,
          "max-file-lines": maxFileLines,
          "max-file-lines-hard": maxFileLinesHard,
        },
      },
    },
    rules: {
      "ahg-rules/no-unicode-graphics": "error",
      "ahg-rules/max-file-lines": ["warn", { warnLimit: 200 }],
      "ahg-rules/max-file-lines-hard": ["error", { errorLimit: 250, hardCap: 400 }],
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
    },
  },
  {
    files: ["extension/tests/**/*.js"],
    plugins: {
      "ahg-rules": {
        rules: {
          "no-unicode-graphics": noUnicodeGraphicsExt,
          "max-file-lines": maxFileLines,
          "max-file-lines-hard": maxFileLinesHard,
        },
      },
    },
    rules: {
      "ahg-rules/no-unicode-graphics": "warn",
      "ahg-rules/max-file-lines": "off",
      "ahg-rules/max-file-lines-hard": "off",
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
    },
  },
];

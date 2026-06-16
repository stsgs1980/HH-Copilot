// eslint.config.mjs -- HH Copilot ESLint Configuration
// Rules: Chrome Extension best practices + AHG Rule 12 (anti-monolith) + Rule 15 (UNICODE_POLICY)
import js from '@eslint/js';
import globals from 'globals';
import noUnicodeGraphics from './eslint-rules/no-unicode-graphics.js';
import maxFileLines from './eslint-rules/max-file-lines.js';
import maxFileLinesHard from './eslint-rules/max-file-lines-hard.js';

export default [
  // -- Base: all JS files in the extension -----------------------------------
  {
    files: ['src/**/*.js', 'background/**/*.js', 'tests/**/*.js'],
    ignores: [
      'dist/**',
      'node_modules/**',
      'scripts/**',
      'docs/**',
      'icons/**',
      'popup/**',
    ],
    plugins: {
      js,
      'ahg-rules': {
        rules: {
          'no-unicode-graphics': noUnicodeGraphics,
          'max-file-lines': maxFileLines,
          'max-file-lines-hard': maxFileLinesHard,
        },
      },
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        // Chrome Extension APIs
        chrome: 'readonly',
        // Extension globals (injected by esbuild)
        __hhCopilotVersion: 'readonly',
      },
    },
    rules: {
      // -- ESLint recommended (error-level) ----------------------------------
      ...js.configs.recommended.rules,

      // -- Relax rules that don't fit Chrome Extension patterns --------------
      'no-undef': 'warn',            // Chrome APIs are global, not always detectable
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-prototype-builtins': 'off', // Common in DOM parsing code
      'no-inner-declarations': 'off', // Chrome extensions use function hoisting
      // no-useless-escape: warn only -- \- in regex char classes is
      // technically unnecessary but harmless and common in parsers
      'no-useless-escape': 'warn',

      // -- Code quality (warning-level, not blocking) ------------------------
      'eqeqeq': ['warn', 'smart'],
      'no-var': 'warn',
      'prefer-const': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
      'no-throw-literal': 'error',
      'no-return-await': 'warn',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'error',
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-negation': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-useless-assignment': 'warn',

      // -- AHG custom rules --------------------------------------------------
      'ahg-rules/no-unicode-graphics': 'error',
      // WARN tier: 200+ lines (informational, does NOT block lint:ci)
      'ahg-rules/max-file-lines': ['warn', { warnLimit: 200 }],
      // ERROR tier: 250+ without exception, 400+ always (BLOCKS lint:ci)
      'ahg-rules/max-file-lines-hard': ['error', {
        errorLimit: 250,
        hardCap: 400,
      }],
    },
  },

  // -- Test files: relaxed rules --------------------------------------------
  {
    files: ['tests/**/*.test.js'],
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'ahg-rules/no-unicode-graphics': 'warn',
      'ahg-rules/max-file-lines': 'off',
      'ahg-rules/max-file-lines-hard': 'off',
    },
  },

  // -- Page-world script: no imports, IIFE, debug console -------------------
  {
    files: ['src/page-world.js'],
    rules: {
      'no-console': 'off',
    },
  },

  // -- Content scripts: Chrome DOM access -----------------------------------
  {
    files: ['src/content/**/*.js'],
    rules: {
      'no-undef': 'off',   // content scripts inject into page context
    },
  },

  // -- esbuild.config.mjs ---------------------------------------------------
  {
    files: ['esbuild.config.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'ahg-rules/no-unicode-graphics': 'off',
      'ahg-rules/max-file-lines': 'off',
      'ahg-rules/max-file-lines-hard': 'off',
    },
  },
];

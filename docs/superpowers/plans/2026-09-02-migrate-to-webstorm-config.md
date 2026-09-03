# Migration to WebStorm Config Template

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align HH-Copilot project configuration with webstorm-config template standards.

**Architecture:** Add missing config files, update existing ones, extend lint-staged patterns, configure WebStorm IDE integration, and add anti-monolith pre-commit checks.

**Tech Stack:** ESLint, Prettier, Stylelint, markdownlint, Husky, lint-staged, commitlint, WebStorm IDE

## Global Constraints

- Preserve existing project-specific rules (AHG custom ESLint rules, Chrome Extension globals)
- Do not break existing extension/ directory structure
- Keep package.json "private": true
- All config changes must be backward-compatible with current workflow

---

## File Structure

### Files to Create

- `.stylelintrc.json` — CSS linting config
- `.idea/jsLinters/eslint.xml` — ESLint fix-on-save
- `.idea/prettier.xml` — Prettier auto-format
- `.idea/codeStyles/codeStyleConfig.xml` — Code style scheme
- `.idea/watcherTasks.xml` — File watcher tasks
- `eslint-processors/markdown-snippets.js` — Markdown ESLint processor
- `eslint-rules/code-block-language.js` — Code block language rule
- `eslint-rules/unicode-policy.js` — Unicode policy rules
- `.aiassistant/rules/AI Rules.md` — AI workflow rules
- `scripts/check-file-length.mjs` — Anti-monolith pre-commit check

### Files to Modify

- `package.json` — Add devDependencies, update lint-staged patterns
- `.prettierrc` — Add plugins
- `.prettierignore` — Add pnpm-lock.yaml, yarn.lock
- `.husky/pre-commit` — Add file length check
- `.idea/inspectionProfiles/Project_Default.xml` — Expand inspection profile
- `.gitignore` — Add .next, .nuxt entries (if missing)

---

## Task 1: Update package.json Dependencies and lint-staged

**Files:**

- Modify: `package.json`

**Interfaces:**

- Consumes: existing package.json structure
- Produces: updated devDependencies and lint-staged configuration

- [x] **Step 1: Read current package.json**

```bash
cat package.json
```

- [x] **Step 2: Add missing devDependencies**

Add these to devDependencies section:

```json
{
  "devDependencies": {
    "eslint": "^9.39.0",
    "eslint-plugin-jsdoc": "^64.2.0",
    "prettier-plugin-organize-imports": "^4.3.0",
    "prettier-plugin-tailwindcss": "^0.8.1",
    "stylelint": "^17.14.1",
    "stylelint-config-standard": "^40.0.0",
    "typescript": "^5.9.3"
  }
}
```

- [x] **Step 3: Update lint-staged patterns**

Replace current lint-staged with:

```json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx,json,html,md}": "prettier --write",
    "*.{js,ts,jsx,tsx}": "eslint --fix",
    "*.css": "stylelint --fix",
    "*.md": "markdownlint --fix --ignore node_modules"
  }
}
```

- [x] **Step 4: Add missing scripts**

Add to scripts section:

```json
{
  "scripts": {
    "lint:css": "stylelint \"**/*.css\" --allow-empty-input",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [x] **Step 5: Run npm install**

```bash
npm install
```

- [x] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: align package.json with webstorm-config template"
```

---

## Task 2: Update Prettier Configuration

**Files:**

- Modify: `.prettierrc`
- Modify: `.prettierignore`

**Interfaces:**

- Consumes: existing prettier config
- Produces: updated prettier config with plugins

- [x] **Step 1: Update .prettierrc**

Add plugins array to .prettierrc:

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 120,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"]
}
```

- [x] **Step 2: Update .prettierignore**

Add missing entries:

```text
node_modules/
dist/
build/
coverage/
out/
package-lock.json
pnpm-lock.yaml
yarn.lock
```

- [x] **Step 3: Commit**

```bash
git add .prettierrc .prettierignore
git commit -m "chore: add prettier plugins and update ignore patterns"
```

---

## Task 3: Add Stylelint Configuration

**Files:**

- Create: `.stylelintrc.json`

**Interfaces:**

- Consumes: webstorm-config template
- Produces: stylelint config for CSS linting

- [x] **Step 1: Create .stylelintrc.json**

```json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "at-rule-no-unknown": [
      true,
      {
        "ignoreAtRules": [
          "tailwind",
          "apply",
          "layer",
          "screen",
          "container",
          "variants",
          "responsive",
          "theme",
          "custom-variant",
          "custom-media",
          "utility",
          "source",
          "plugin",
          "config"
        ]
      }
    ],
    "import-notation": null,
    "declaration-block-no-redundant-longhand-properties": null
  }
}
```

- [x] **Step 2: Commit**

```bash
git add .stylelintrc.json
git commit -m "chore: add stylelint configuration"
```

---

## Task 4: Add WebStorm IDE Configuration Files

**Files:**

- Create: `.idea/jsLinters/eslint.xml`
- Create: `.idea/prettier.xml`
- Create: `.idea/codeStyles/codeStyleConfig.xml`
- Create: `.idea/watcherTasks.xml`

**Interfaces:**

- Consumes: webstorm-config template
- Produces: WebStorm IDE integration configs

- [x] **Step 1: Create .idea/jsLinters/eslint.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="EslintConfiguration">
    <option name="fix-on-save" value="true" />
  </component>
</project>
```

- [x] **Step 2: Create .idea/prettier.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="PrettierConfiguration">
    <option name="myConfigurationMode" value="AUTOMATIC" />
    <option name="myRunOnSave" value="true" />
    <option name="myRunOnReformat" value="true" />
    <option name="myFilesPattern" value="**/*.{js,ts,jsx,tsx,cjs,cts,mjs,json,vue,astro,md,html,css}" />
  </component>
</project>
```

- [x] **Step 3: Create .idea/codeStyles/codeStyleConfig.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ProjectCodeStyleConfiguration">
    <option name="PREFERRED_SCHEME" value="WebStorm Ecosystem" />
  </component>
</project>
```

- [x] **Step 4: Create .idea/watcherTasks.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ProjectTasksOptions">
    <enabled-global>
      <option value="Проверка длины файла" />
    </enabled-global>
  </component>
</project>
```

- [x] **Step 5: Commit**

```bash
git add .idea/
git commit -m "chore: add WebStorm IDE configuration files"
```

---

## Task 5: Expand WebStorm Inspection Profile

**Files:**

- Modify: `.idea/inspectionProfiles/Project_Default.xml`

**Interfaces:**

- Consumes: webstorm-config template inspection profile
- Produces: expanded inspection profile

- [x] **Step 1: Replace inspection profile content**

```xml
<component name="InspectionProjectProfileManager">
  <profile version="1.0">
    <option name="myName" value="Project Default" />
    <inspection_tool class="CyclomaticComplexityJS" enabled="true" level="WARNING" enabled_by_default="true">
      <option name="m_limit" value="15" />
    </inspection_tool>
    <inspection_tool class="ES6ShorthandObjectProperty" enabled="true" level="WARNING" enabled_by_default="true" />
    <inspection_tool class="Eslint" enabled="true" level="WARNING" enabled_by_default="true" />
    <inspection_tool class="FileLength" enabled="true" level="WARNING" enabled_by_default="true">
      <option name="limit" value="250" />
    </inspection_tool>
    <inspection_tool class="LongLine" enabled="true" level="WARNING" enabled_by_default="true">
      <option name="m_limit" value="120" />
    </inspection_tool>
    <inspection_tool class="MethodCount" enabled="true" level="WARNING" enabled_by_default="true">
      <option name="m_limit" value="25" />
      <option name="m_ignoreGettersAndSetters" value="true" />
    </inspection_tool>
    <inspection_tool class="MissingOverrideAnnotation" enabled="true" level="WARNING" enabled_by_default="true" />
    <inspection_tool class="NestedFunctionDepthJS" enabled="true" level="WARNING" enabled_by_default="true">
      <option name="m_limit" value="4" />
    </inspection_tool>
    <inspection_tool class="OverlyLongFunctionJS" enabled="true" level="WARNING" enabled_by_default="true">
      <option name="m_limit" value="50" />
    </inspection_tool>
    <inspection_tool class="ParametersPerFunction" enabled="true" level="WARNING" enabled_by_default="true">
      <option name="m_limit" value="5" />
    </inspection_tool>
    <inspection_tool class="StatementsPerFunctionJS" enabled="true" level="WARNING" enabled_by_default="true">
      <option name="m_limit" value="30" />
    </inspection_tool>
    <inspection_tool class="TrailingSpacesInProperty" enabled="true" level="WARNING" enabled_by_default="true" />
    <inspection_tool class="TypeScriptExplicitMemberType" enabled="false" level="WEAK WARNING" enabled_by_default="false" />
    <inspection_tool class="TypeScriptMissingAugmentationImport" enabled="true" level="WEAK WARNING" enabled_by_default="true" />
  </profile>
</component>
```

- [x] **Step 2: Commit**

```bash
git add .idea/inspectionProfiles/Project_Default.xml
git commit -m "chore: expand WebStorm inspection profile"
```

---

## Task 6: Add ESLint Processors and Rules

**Files:**

- Create: `eslint-processors/markdown-snippets.js`
- Create: `eslint-rules/code-block-language.js`
- Create: `eslint-rules/unicode-policy.js`

**Interfaces:**

- Consumes: webstorm-config template
- Produces: ESLint processors and rules for markdown and unicode policy

- [x] **Step 1: Create eslint-processors directory**

```bash
mkdir -p eslint-processors
```

- [x] **Step 2: Create eslint-processors/markdown-snippets.js**

```javascript
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
```

- [x] **Step 3: Create eslint-rules/code-block-language.js**

```javascript
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
```

- [x] **Step 4: Create eslint-rules/unicode-policy.js**

````javascript
const emojiPattern = new RegExp(
  "[\\u{1F600}-\\u{1F64F}" +
    "\\u{1F300}-\\u{1F5FF}" +
    "\\u{1F680}-\\u{1F6FF}" +
    "\\u{1F1E0}-\\u{1F1FF}" +
    "\\u{2600}-\\u{27BF}" +
    "\\u{FE00}-\\u{FEFF}" +
    "\\u{1F900}-\\u{1F9FF}" +
    "\\u{1FA00}-\\u{1FA6F}" +
    "\\u{1FA70}-\\u{1FAFF}" +
    "\\u{2702}-\\u{27B0}]",
  "u",
);

const unicodeGraphicsPattern = new RegExp(
  "[\\u{2500}-\\u{257F}" + "\\u{2580}-\\u{259F}" + "\\u{25A0}-\\u{25FF}" + "\\u{2800}-\\u{28FF}]",
  "u",
);

const createRule = (messages, pattern, replaceFn = (t) => t) => {
  const create = (context) => {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const text = replaceFn(sourceCode.getText());
    const lines = text.split("\n");
    return {
      Program() {
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            context.report({
              loc: { line: index + 1, column: 0 },
              messageId: Object.keys(messages)[0],
            });
          }
        });
      },
    };
  };
  return { meta: { type: "problem", messages }, create };
};

const emoji = createRule(
  {
    noEmoji: "Emoji are prohibited. Use text tags like [OK], [FAIL] instead.",
  },
  emojiPattern,
);

const unicodeGraphics = createRule(
  {
    noUnicodeGraphics: "Unicode box/line drawing characters are prohibited. Use ASCII.",
  },
  unicodeGraphicsPattern,
);

const emojiInMd = createRule({ emojiInMd: "Emoji are prohibited in Markdown documentation." }, emojiPattern, (t) =>
  t.replace(/```[\s\S]*?```/g, ""),
);

const unicodeGraphicsInMd = createRule(
  {
    unicodeGraphicsInMd: "Unicode box/line drawing characters are prohibited in Markdown.",
  },
  unicodeGraphicsPattern,
  (t) => t.replace(/```[\s\S]*?```/g, ""),
);

export default {
  rules: {
    emoji,
    "unicode-graphics": unicodeGraphics,
    "emoji-in-md": emojiInMd,
    "unicode-graphics-in-md": unicodeGraphicsInMd,
  },
};
````

- [x] **Step 5: Commit**

```bash
git add eslint-processors/ eslint-rules/code-block-language.js eslint-rules/unicode-policy.js
git commit -m "chore: add ESLint processors and rules from template"
```

---

## Task 7: Add Anti-Monolith Pre-commit Script

**Files:**

- Create: `scripts/check-file-length.mjs`
- Modify: `.husky/pre-commit`

**Interfaces:**

- Consumes: webstorm-config template
- Produces: anti-monolith pre-commit check

- [x] **Step 1: Create scripts directory**

```bash
mkdir -p scripts
```

- [x] **Step 2: Create scripts/check-file-length.mjs**

```javascript
#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const MAX_LINES = 250;

/**
 * Pre-commit check: staged TS/JS files must not exceed MAX_LINES.
 * @returns {void}
 */
function main() {
  const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
    encoding: "utf8",
  });

  const files = output
    .split("\n")
    .map((file) => file.trim())
    .filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));

  let failed = 0;

  for (const file of files) {
    if (!existsSync(file)) {
      continue;
    }

    const lines = readFileSync(file, "utf8").split("\n").length;

    if (lines > MAX_LINES) {
      console.error(`[FAIL] File '${file}' has ${lines} lines. Limit: ${MAX_LINES}.`);
      failed = 1;
    }
  }

  if (failed) {
    console.error("[Anti-Monolith] Commit rejected.");
    process.exit(1);
  }
}

main();
```

- [x] **Step 3: Update .husky/pre-commit**

Replace content with:

```bash
# Запуск форматирования и линтинга через lint-staged
npx lint-staged

# Запуск проверки на максимальный размер файла (anti-monolith)
node scripts/check-file-length.mjs
```

- [x] **Step 4: Commit**

```bash
git add scripts/check-file-length.mjs .husky/pre-commit
git commit -m "chore: add anti-monolith pre-commit check"
```

---

## Task 8: Add AI Rules and Update .gitignore

**Files:**

- Create: `.aiassistant/rules/AI Rules.md`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: webstorm-config template
- Produces: AI rules and updated gitignore

- [x] **Step 1: Create .aiassistant/rules directory**

```bash
mkdir -p .aiassistant/rules
```

- [x] **Step 2: Create .aiassistant/rules/AI Rules.md**

````markdown
---
apply: always
---

# AI Workflow Rules (WebStorm + Opencode.ai)

## 1. Language & Communication

- Always respond in Russian.
- Code, commands, and file names stay in English.
- Never use emoji or Unicode box/line drawing characters in responses or code.
  Use text tags like [OK], [FAIL], [TODO], [WARNING], [INFO] instead.

## 2. Rule Zero: Answer Before Act

Before any action, classify the user's request:

- Question: answer in text, do NOT create or modify files.
- Task: execute it.
- Unclear: ask for clarification.
- Confirmation ("yes", "go ahead", "continue"): execute the agreed plan.

## 3. Code Style & Formatting

- TypeScript strict mode. Explicit typing for all parameters and return values (no `any`).
- Semicolons are required.
- Strings use double quotes.
- Trailing commas required in objects and arrays.
- Indentation is 2 spaces.
- Max line length is 120 characters.
- Max file length is 250 lines. If exceeded, split into modules.
- JSDoc with @param and @returns required for every function, method, and React component.
- Markdown: follow `docs/markdown.md` — 120 chars per line, aligned tables, `npm run lint:md`.
- Markdown code blocks must specify a language (e.g., ```typescript, not empty).
- Markdown with JSX in fenced blocks must use `tsx, not`typescript (WebStorm injection).
- WebStorm IDE setup: `docs/webstorm.md` (codestyle import and on-save tools are manual).

## 4. Anti-Monolith (Auto-Activation)

This skill MUST activate automatically when ANY of these conditions are detected:

- File exceeds 250 lines (TS/JS) or component exceeds 200 lines.
- 3+ `useState` in one component (extract to custom hook).
- Function exceeds 50 lines.

When a threshold is crossed:

1. STOP writing the monolith.
2. Announce: `[ANTI-MONOLITH] Threshold exceeded: <reason>`
3. Apply decomposition: extract subcomponents, extract hooks, separate data fetching.
4. Continue the task with decomposed modules.

## 5. Clean Code & Architecture

- Never hardcode absolute paths in code (use env vars).
- Always read a file before editing it.

## 6. Git & Commits

- All commits MUST follow Conventional Commits format:
  type(scope): short description
- Allowed types: feat, fix, docs, style, refactor, test, chore, perf, ci, build.
- Do not commit directly to main without verification.
- Pre-commit hooks (Husky + lint-staged) must pass before commit.

## 7. Systematic Debugging & Work Cycle

- Work Cycle: Read, Plan, Execute, Record, Commit.
- When debugging: reproduce locally, identify root cause (do not patch symptoms),
  write a test that fails before the fix and passes after.
- Do not skip pre-commit checks.
````

- [x] **Step 3: Update .gitignore**

Add these entries if missing:

```text
# Frameworks
.next/
.nuxt/
```

- [x] **Step 4: Commit**

```bash
git add .aiassistant/ .gitignore
git commit -m "chore: add AI rules and update gitignore"
```

---

## Task 9: Install Dependencies and Verify

**Files:**

- None (verification only)

**Interfaces:**

- Consumes: all previous tasks
- Produces: verified working configuration

- [x] **Step 1: Install all dependencies**

```bash
npm install
```

- [x] **Step 2: Run ESLint verification**

```bash
npm run lint
```

Expected: No new errors (existing project-specific rules still work)

- [x] **Step 3: Run Prettier verification**

```bash
npx prettier --check .
```

Expected: All files formatted correctly

- [x] **Step 4: Run markdownlint verification**

```bash
npm run lint:md
```

Expected: No markdown linting errors

- [x] **Step 5: Test pre-commit hook**

```bash
git add .
git commit -m "test: verify pre-commit hooks work"
git reset HEAD~1
```

Expected: Pre-commit checks pass

- [x] **Step 6: Final commit (if test commit succeeded)**

```bash
git add .
git commit -m "chore: complete migration to webstorm-config template"
```

---

## Self-Review

**1. Spec coverage:** All differences identified in initial comparison have been addressed:

- [x] .stylelintrc.json
- [x] .idea/jsLinters/eslint.xml
- [x] .idea/prettier.xml
- [x] .idea/codeStyles/
- [x] .idea/watcherTasks.xml
- [x] eslint-processors/
- [x] eslint-rules/code-block-language.js
- [x] eslint-rules/unicode-policy.js
- [x] .aiassistant/rules/AI Rules.md
- [x] scripts/check-file-length.mjs
- [x] .husky/pre-commit update
- [x] package.json updates
- [x] .prettierrc plugins
- [x] .prettierignore updates
- [x] .idea/inspectionProfiles expansion
- [x] .gitignore updates

**2. Placeholder scan:** No placeholders found — all steps contain actual code.

**3. Type consistency:** File paths and configurations are consistent across tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-02-migrate-to-webstorm-config.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

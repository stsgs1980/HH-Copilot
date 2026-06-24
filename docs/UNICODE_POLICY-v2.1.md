# Standard: No-Unicode Policy v2.1

> ID: STD-DOC-003
> Version: 1.9.65.0
> Level: **[C] Critical** + **[W] Warning** + **[I] Info**
> Related: Markdown Standard (STD-DOC-002)

Standard for character, icon, and graphics usage. Design System / Engineering Governance level.

---

## 1. Purpose

This standard establishes rules for using Unicode graphic characters across all product layers: interface, content, code, system communications.

### Goals:

- ensure visual consistency
- maintain professional product level
- guarantee controllability through design system
- exclude uncontrolled visual artifacts

---

## 2. Responsibility Separation

| Document | Level | Scope |
|----------|-------|-------|
| **No-Unicode Policy v2.1** (this document) | [C] Critical, [W] Warning, [I] Info | UI, production code, AI-chat, prototypes |
| **MARKDOWN_STANDARD v2.1** | [W] Warning | README.md, project documentation |

---

## 3. Strictness Levels

The standard applies a **tiered approach** instead of absolute prohibition:

| Level | Notation | Context | Action |
|-------|----------|---------|--------|
| Critical | [C] | UI, production code | Blocks merge |
| Warning | [W] | Documentation, README, AI-chat | Warning in review (see MARKDOWN_STANDARD) |
| Info | [I] | Internal notes, prototypes | Recommendation |

### Level Application:

| Context | Level | Rationale |
|---------|-------|-----------|
| UI components | [C] Critical | Direct impact on user |
| API responses, errors | [C] Critical | Displayed in interface |
| Production code | [C] Critical | May reach UI |
| Project documentation | [W] Warning | See MARKDOWN_STANDARD |
| README files | [W] Warning | See MARKDOWN_STANDARD |
| Internal notes | [I] Info | Developers only |
| Prototypes / MVP | [I] Info | Temporary code |
| Logs, debug | [I] Info | Not visible to user |
| AI-communication (chat) | [W] Warning | Professional agent communication style |

**Note for AI-communication:** AI-agent responses in chat must not contain emoji and Unicode graphics. This ensures a consistent professional style alongside code and documentation. User messages are not regulated by this standard.

---

## 4. What is Prohibited

### 4.1. Prohibited Character Categories

| Category | Examples | Level |
|----------|----------|-------|
| Emoji | any pictograms: emotions, objects, UI-symbols | [C] |
| Unicode-icons | status symbols, actions, notifications | [C] |
| Decorative symbols | pseudographics, markers, highlights | [W] |

### 4.2. Scope by Layers

| Layer | Critical [C] | Info [I] |
|-------|--------------|----------|
| Interface (UI) | buttons, menus, tables, notifications | - |
| API | responses, errors, statuses | - |
| Content | texts in product | drafts |
| Code | UI-strings, messages | debug-code |
| Logging | - | console.log, trace |

---

## 5. Reasons for Restrictions

| Problem | Description |
|---------|-------------|
| Inconsistent render | Unicode displays differently on different OS, browsers, devices |
| Lack of control | Cannot centrally change style, manage themes |
| No scalability | No size control, no responsiveness |
| Professional standard violation | Reduces trust, breaks visual hierarchy |

---

## 6. Allowed Characters

### 6.1. Basic Set

| Category | Range | Examples |
|----------|-------|----------|
| ASCII letters | a-z, A-Z | text, TEXT |
| Cyrillic | a-ya, A-YA | tekst, TEKST |
| Digits | 0-9 | 123 |
| Punctuation | . , ; : ! ? - _ | standard |
| Whitespace | space, tab, newline | formatting |

### 6.2. Whitelist for Diagrams (code [I] only)

For technical diagrams in code, allowed:

| Symbol | Usage |
|--------|-------|
| -> | right arrow |
| <- | left arrow |
| => | implication |
| <= | reverse implication |
| \| | vertical line |
| + | line junction |
| - | horizontal line |
| v | down arrow |
| ^ | up arrow |
| > | pointer |
| < | reverse pointer |

### 6.3. Code Formatting in Comments and Documentation

When formatting code in comments and embedded documentation:

| Element | Format |
|---------|--------|
| Inline code | `` `code` `` |
| Code block | `` ```language `` |

**Rules:**

- Specify language for code blocks (syntax highlighting)
- Do not use HTML tags for code coloring
- Color is IDE/renderer responsibility

### 6.4. Example Allowed Diagram (level [I])

```text
+-------------------+
|    Component A    |
+---------+---------+
          |
          v
+-------------------+
|    Component B    |
+---------+---------+
          |
          +-----> Component C
```

---

## 7. Icon Standard

### 7.1. Basic Rule

Any visual symbol in UI = **SVG only**

### 7.2. SVG Requirements

- be part of Design System
- use design tokens
- support theming
- be optimized (SVGO)
- have unified stroke/fill style

### 7.3. Icon Libraries

| Library | Status | Usage |
|---------|--------|-------|
| Lucide | Primary | All project icons |
| Brand logos | Required | Technologies, integrations |

### 7.4. Brand Logos

When mentioning technologies, use official SVG:

| Technology | Requirement |
|------------|-------------|
| Next.js | Official SVG logo |
| TypeScript | Official SVG logo |
| Tailwind CSS | Official SVG logo |
| Prisma ORM | Official SVG logo |

---

## 8. AI Prompts

### 8.1. Correct Formulation

```text
Output must contain only:
- ASCII characters (a-z, A-Z, 0-9, standard punctuation)
- Cyrillic characters (a-ya, A-YA)
- Whitelisted diagram symbols (for [I] level): -> <- => <= \| + - v ^ > <
```

### 8.2. Document Cleaning Before Analysis

```javascript
// Remove emoji and Unicode graphics
text.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]|[\u{1F900}-\u{1F9FF}]|[\u{2702}-\u{27B0}]/gu, '')
```

### 8.3. Final Sanitization

```javascript
// For [C] level (code/UI) - ASCII + Cyrillic only (typography strictly prohibited)
text.replace(/[^\x20-\x7E\u0400-\u04FF]/g, '')

// For [I] level - with whitelist for diagrams
// Note: 'v' removed from explicit enumeration as it's in basic ASCII range \x20-\x7E
text.replace(/[^\x20-\x7E\u0400-\u04FF\-\>\<\=\|\+\^]/g, '')

// ATTENTION: Level [W] (documentation) is regulated by MARKDOWN_STANDARD v2.1.
// There typographic characters (em dash, en dash, degree, copyright) ARE ALLOWED in plain text, therefore this
// strict sanitization is NOT applied to .md files.
```

---

## 9. Fallback Strategy

### 9.1. When SVG Unavailable

| Situation | Solution |
|-----------|----------|
| SVG load error | Text alternative (hidden, aria-label) |
| Email clients | Text + styled span |
| Terminal / CLI | Text + ANSI colors |
| Plain text | Text only |

### 9.2. Fallback Implementation

```html
<!-- SVG with fallback via onerror -->
<span class="icon">
  <svg onerror="this.style.display='none';this.nextElementSibling.style.display='inline'"
       aria-hidden="true">
    <!-- icon content -->
  </svg>
  <span class="icon-fallback" style="display:none">Save</span>
</span>
```

```css
.icon-fallback {
  display: none;
}
/* Fallback shown via JS onerror on SVG element */
```

---

## 10. Control and Enforcement

### 10.1. Linting

File: `eslint-rules/no-unicode-policy.js`

```javascript
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce No-Unicode Policy' }
  },
  create(context) {
    const emojiPattern = /[\u{1F000}-\u{1FFFF}]/u;
    const severity = {
      '[C]': 'error',  // UI, production code
      '[I]': 'off'     // Internal, prototypes
    };

    return {
      Literal(node) {
        if (emojiPattern.test(node.value)) {
          context.report({
            node,
            message: 'Unicode graphics prohibited. Use SVG instead.'
          });
        }
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          if (emojiPattern.test(quasi.value.cooked)) {
            context.report({
              node,
              message: 'Unicode graphics prohibited in template literals. Use SVG instead.'
            });
            break;
          }
        }
      },
      JSXText(node) {
        if (emojiPattern.test(node.value)) {
          context.report({
            node,
            message: 'Unicode graphics prohibited in JSX. Use SVG instead.'
          });
        }
      }
    };
  }
};
```

### 10.2. Code Review

| Level | Action |
|-------|--------|
| [C] violation | PR rejected |
| [I] violation | Recommendation (optional) |

### 10.3. Design Review

- icon system compliance
- brand logo usage
- fallback presence

---

## 11. Exceptions

### 11.1. Unconditionally Allowed

| Category | Examples |
|----------|----------|
| Letters | a-z, A-Z, a-ya, A-YA |
| Digits | 0-9 |
| Punctuation | . , ; : ! ? - _ ( ) [ ] { } |
| Whitelist symbols [I] | -> <- => <= \| + - v ^ > < |

### 11.2. Exceptions by Agreement

| Situation | Requirement |
|-----------|-------------|
| External requirements | Email newsletters with emoji - coordinate with marketing |
| Localization | Languages with non-ASCII characters (Chinese, Arabic) |
| Accessibility | Unicode characters for screen readers |

### 11.3. Approval Process

1. Create issue with justification
2. Get approval from Tech Lead
3. Document exception in code
4. Add to whitelist if necessary

---

## 12. Application by Project Types

| Project Type | Application Level |
|--------------|-------------------|
| Enterprise | Full [C] everywhere |
| B2B SaaS | [C] in UI, [W] in documentation (MARKDOWN_STANDARD) |
| B2C product | [C] in UI, [W] in documentation (MARKDOWN_STANDARD) |
| MVP / Prototype | [I] everywhere |
| Internal tool | [I] in code, [W] in README (MARKDOWN_STANDARD) |
| Open Source | [C] in UI, [W] in documentation (MARKDOWN_STANDARD) |

---

## 13. Compliance Checklist

### Before merge (code [C]):

- [ ] No emoji in UI components
- [ ] No Unicode-icons in production code
- [ ] Icons implemented via SVG
- [ ] Brand logos are official SVG
- [ ] Fallback exists for critical icons
- [ ] AI prompts use correct formulation

### For documentation [W]:

- [ ] See MARKDOWN_STANDARD v2.1

### For AI-communication (chat) [W]:

- [ ] No emoji in AI-agent responses
- [ ] No Unicode-graphics in chat

---

## 14. Stack Signature Format

- Placement: bottom right corner (for root `README.md` and `CHANGELOG.md` only)
- Format: `Built with: <project technologies>` (specific stack defined by project, not standard)
- Example (for Next.js projects): `Built with: Next.js 16 + TypeScript + Tailwind CSS`
- Allowed: Latin, Cyrillic, digits, + and : characters
- Prohibited: emoji, Unicode graphics

**Note:** The standard defines the format (structure), not specific technologies. Default value for projects of this stack see in `README_TEMPLATE.md`.

---

## 15. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-Q4 | Initial version, absolute prohibition |
| 2.0 | 2025-01 | Tiered approach, whitelist, fallback strategy, MARKDOWN_STANDARD link, code formatting rules |
| 2.1 | 2025-01 | Sync with MARKDOWN_STANDARD v2.1 (allow typography in text for [W], fix regex for diagrams, clarify stack signature) |
| 2.1.1 | 2025-01 | Fixed invalid CSS `:loaded` to `onerror`, added TemplateLiteral and JSXText checks to ESLint rule, removed emoji from document body, removed double separator |
| 2.1.2 | 2025-01 | Added AI-communication (chat) as [W] level context; AI-agent responses must not contain emoji and Unicode graphics; user messages not regulated |
| 2.1.3 | 2025-01 | Stack signature parameterized: standard defines format `Built with: <technologies>`, specific stack is project responsibility; default value moved to README_TEMPLATE |

---

**Document complies with No-Unicode Policy v2.1**

---

## 16. Cross-References

| Standard | Relationship |
|----------|-------------|
| STD-DOC-002 | Markdown Standard: delegates character rules to this standard; keeps .md-specific formatting rules |

---

Built with: Next.js 16 + TypeScript + Tailwind CSS

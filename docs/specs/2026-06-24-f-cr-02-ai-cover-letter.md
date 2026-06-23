# F-CR-02: AI Cover Letter (Evidence-Based)

> **Status**: Draft
> **Author**: ZCode session 2026-06-24
> **Methodology**: Reverse of `interview-designer` skill (Geoff Smart + Lou Adler + Daniel Kahneman)
> **Replaces**: Primitive `generateCoverLetterAI()` in `services/ai-service.js` (lines 156-195)

---

## 1. Problem

Current `generateCoverLetterAI(vacancy, resume, opts)`:
- Sends vacancy.title + company + 800 chars of description + skills list + resume.position + skills + 400 chars of experience to LLM
- Asks for "cover letter highlighting matching skills and motivation"
- Result: generic letter that says "I have Python, SQL, Docker" — no evidence, no projection, no anti-hallucination
- No structural mapping between vacancy requirements and resume proof

This is the F-CR-02 stub. Need to replace with evidence-based pipeline.

## 2. Goals

Generate cover letter that for each key vacancy requirement:
1. Names the requirement
2. Cites concrete evidence from resume (specific job, achievement, measurable result)
3. Projects forward — what this enables in the first 90 days on the role

Anti-hallucination: LLM only sees structured facts, never free-text resume body. Post-generation validation strips invented facts.

## 3. Non-Goals

- Resume rewriting (separate skill, `jd-resume-tailor`)
- Multiple variants (future F-CR-02.1)
- Tone coaching beyond existing `cover-letter-tone.js` integration
- Cover letter storage changes (already in F3.2/F5.6)

## 4. Methodology — Reverse interview-designer

| interview-designer (interviewer side) | cover letter (candidate side) |
|---|---|
| **Scorecard**: define what A-Player means for this role | Extract scorecard from vacancy (mission, outcomes, competencies) |
| **Forensic Scan**: scan resume for Gaps + High Points against scorecard | Map each scorecard item → concrete evidence block from resume experience |
| **Future Simulation**: project candidate into future scenarios | Project past evidence → 90-day value proposition |
| **Red Flags / Green Signals** (Kahneman de-bias) | Skip gaps silently; never invent. Use only verified evidence. |

## 5. Architecture

### 5.1 Pipeline

```
vacancy + resume
     │
     ▼
┌─────────────────────────┐
│ 1. Scorecard builder    │  → extractScorecard(vacancy) → { mission, outcomes[], competencies[] }
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ 2. Evidence mapper      │  → mapEvidence(scorecard, resume, matchResult) → Evidence[]
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ 3. Prompt builder       │  → buildPrompt(scorecard, evidence, tone) → messages[]
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ 4. AI call              │  → sendMessage(messages, { temperature: 0.4 })
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ 5. Post-validator       │  → validateLetter(text, evidence) → { ok, text, hallucinations[] }
└─────────────────────────┘
     │
     ▼
final cover letter text
```

### 5.2 New files (under `extension/src/lib/`)

| File | Purpose | Est. lines |
|---|---|---|
| `cover-letter-scorecard.js` | `extractScorecard(vacancy)` — mission, 3-5 outcomes, competencies | ~80 |
| `cover-letter-evidence.js` | `mapEvidence(scorecard, resume, matchResult)` — list of `{ competency, evidenceText, source }` | ~120 |
| `cover-letter-prompt.js` | `buildPrompt(scorecard, evidence, tone)` — system + user message | ~90 |
| `cover-letter-validator.js` | `validateLetter(text, evidence)` — strip unverified claims | ~70 |
| `cover-letter-ai.js` | Orchestrator `generateAICoverLetter(vacancy, resume, opts)` | ~80 |

### 5.3 Modified files

| File | Change |
|---|---|
| `services/ai-service.js` | Replace `generateCoverLetterAI` body — delegate to `cover-letter-ai.js` orchestrator. Keep public signature for backward compat. |
| `ui/html/tabs/negotiations.js` | Add "Сгенерировать с AI" button next to cover letter textarea (id: `cover-letter-ai-btn`) |
| `ui/panel/cover-letter-events.js` | Bind AI button click → call background → fill textarea on success / show error on failure |
| `background/index.js` | Already routes `AI_GENERATE_COVER_LETTER` message — no change needed |

## 6. Module Specs

### 6.1 `cover-letter-scorecard.js`

```js
extractScorecard(vacancy) → {
  mission: string,            // 1 sentence: "Роль существует чтобы {mission}"
  outcomes: string[],         // 3-5 measurable 12-month outcomes (from responsibilities)
  competencies: string[],     // hard + soft skills (keySkills + requirements-derived)
  source: { mission, outcomes, competencies }   // debug: which fields fed each section
}
```

**Extraction logic:**
- `mission`: derived from `vacancy.title` + first sentence of `description.sections.responsibilities`
- `outcomes`: split `description.sections.responsibilities` by sentence; pick top 3-5 most concrete (containing verb + object). Strip generic phrases ("команда", "развивайтесь с нами").
- `competencies`: union of `vacancy.keySkills` (top 8 by relevance) + first 5 noun phrases from `description.sections.requirements`

**Failure modes:**
- No responsibilities section → mission from title, outcomes = ["успешно выполнять обязанности роли"]
- No requirements → competencies = vacancy.keySkills only
- No keySkills → competencies from requirements section only

### 6.2 `cover-letter-evidence.js`

```js
mapEvidence(scorecard, resume, matchResult) → [
  {
    competency: "Python",
    evidenceText: "В {company} (2021-2024) автоматизировал пайплайны обработки данных, сократив время рендеринга отчётов на 40%",
    source: { type: 'experience', index: 2, sentence: '...' },
    confidence: 'high' | 'medium' | 'low'
  },
  ...
]
```

**Mapping logic:**
1. For each competency in scorecard.competencies:
   - If in `matchResult.details.matchingSkills` → search `resume.experience[].description` for sentences mentioning this skill (case-insensitive, includes stemming for Russian). Pick most recent + most measurable.
   - If in `matchResult.details.derivedMatchSkills` → mark confidence `medium`, search experience similarly
   - If in `matchResult.details.missingSkills` → SKIP (don't fabricate)
2. Confidence `high` if sentence contains a number/percentage/timeframe, else `medium`.
3. If no evidence found for a competency → skip silently (don't include in prompt).

**Anti-hallucination rule:** NEVER generate evidence text. Only quote/condense from actual resume.experience descriptions. The LLM never sees raw resume text — only the curated evidence map.

### 6.3 `cover-letter-prompt.js`

```js
buildPrompt(scorecard, evidence, tone) → {
  messages: [
    { role: 'system', content: SYS_PROMPT },
    { role: 'user', content: structuredPrompt }
  ],
  estimatedTokens: number
}
```

**System prompt (Russian):**
```
Ты — эксперт по составлению сопроводительных писем для hh.ru.
Тон: {tone}.

ЖЁСТКИЕ ПРАВИЛА (anti-hallucination):
1. Используй ТОЛЬКО факты из блока "Доказательства" ниже.
2. Не выдумывай навыки, места работы, даты, цифры, достижения.
3. Если для компетенции нет доказательства — не упоминай её.
4. Не более 2500 символов.
5. Структура: приветствие → 2-3 ключевых аргумента (каждый = компетенция + доказательство + проекция) → закрытие.
6. Без "Здравствуйте, меня зовут..." — обращение по компании если известно, иначе "Здравствуйте".

ЗАПРЕЩЁННЫЕ AI-ПАТТЕРНЫ (по humanizer skill, русские аналоги):
- Inflated symbolism: "служит testamentом", "подчёркивает важность", "выступает доказательством", "свидетельствует о"
- AI vocabulary: "кроме того", "более того", "вместе с тем", "важно отметить", "следует подчеркнуть"
- Negative parallelism: "не только..., но и...", "это не просто..., это..."
- Деепричастия-наполнитель: "обеспечивая", "подчёркивая", "отражая", "демонстрируя"
- Rule of three (3 однородных): "эффективность, надёжность и масштабируемость"
- Em dash вместо запятых
- Generic positive conclusions: "буду рад принести ценность", "уверен, что мой опыт..."
- Filler: "важно отметить, что", "следует подчеркнуть"
- **Жирный шрифт** в письме
- Inline-header списки: "• **Опыт:** ..."
- Sycophantic: "большое спасибо за внимание к моему резюме!"

Пиши конкретно. Если есть цифра — пиши цифру. Если нет — лучше короткое предложение без понтов, чем длинное с водой.
```

**User prompt (structured, JSON-like):**
```
ВАКАНСИЯ:
  Позиция: {vacancy.title}
  Компания: {vacancy.company}
  Миссия роли: {scorecard.mission}
  Ожидаемые результаты за 12 мес:
    - {outcome 1}
    - {outcome 2}
    - ...

КОМПЕТЕНЦИИ + ДОКАЗАТЕЛЬСТВА (используй только эти):
  [{competency}]: {evidenceText}  [уверенность: {confidence}]
  [{competency}]: {evidenceText}  [уверенность: {confidence}]
  ...

ТОН: {tone}

Напиши сопроводительное письмо по структуре из системного промпта.
```

### 6.4 `cover-letter-validator.js`

```js
validateLetter(text, evidence) → {
  ok: boolean,
  text: string,           // cleaned text (may strip suspect sentences)
  warnings: string[]      // e.g. ["AI pattern: 'кроме того' detected", "Skill 'Docker' not in evidence"]
}
```

**Checks:**
1. Length ≤ 5000 (hh.ru hard limit). Truncate with ellipsis if exceeded.
2. For each skill mentioned in text that is NOT in `evidence[].competency` AND NOT in resume.skills → add warning. (Don't auto-strip — too risky; just warn.)
3. Detect invented numbers: sentences containing digits/percentages not present in any evidence → warn.
4. Strip leading "Здравствуйте, меня зовут ..." if present (we said not to).
5. If text contains obvious LLM filler ("Я уверен, что мой опыт...") at start → strip first paragraph.
6. **AI pattern detection** (new, from humanizer): regex scan for the 11 banned patterns. Each match → warning `AI_PATTERN: <pattern_name>`. Patterns:
   - `inflated_symbolism`: /служит.*свидетельством|выступает.*доказательством|подчёркивает важность|свидетельствует о/
   - `ai_vocabulary`: /кроме того|более того|вместе с тем|важно отметить|следует подчеркнуть/
   - `negative_parallelism`: /не только.*но и|это не просто.*это/
   - `verbal_noun_filler`: /обеспечивая|подчёркивая|отражая|демонстрируя|формируя/
   - `rule_of_three`: 3+ comma-separated adjectives/nouns in a row (heuristic, may have false positives — log warning only)
   - `em_dash_overuse`: count of `—` > 3 → warning
   - `generic_conclusion`: /буду рад принести ценность|уверен, что мой опыт|безусловно.*подтвердится/
   - `filler`: /важно отметить, что|следует подчеркнуть, что/
   - `boldface`: /\*\*[^*]+\*\*/ → warning + auto-strip `**`
   - `inline_header_list`: /^\s*[•\-*]\s*\*\*[^*]+\*\*:/m
   - `sycophantic`: /большое спасибо за внимание|благодарю за уделённое время/i

`ok: true` if length OK and no critical warnings. Letter still returned even if `ok: false` (with warnings appended to logs only, not to user-visible text). `**` markers are auto-stripped (safe transformation); all other AI patterns just warned.

### 6.5 `cover-letter-ai.js` (orchestrator)

```js
generateAICoverLetter(vacancy, resume, opts) → {
  ok: boolean,
  text?: string,
  method: 'ai',
  warnings?: string[],
  error?: string,
  code?: string  // NO_API_KEY | NO_EVIDENCE | AI_ERROR | VALIDATION_FAIL
}
```

**Flow:**
1. Check `await isAiAvailable()` — if not, return `{ ok: false, code: 'NO_API_KEY' }`.
2. `extractScorecard(vacancy)` → scorecard
3. `computeMatchScore(resume, vacancy)` → matchResult
4. `mapEvidence(scorecard, resume, matchResult)` → evidence[]
5. If `evidence.length === 0` → return `{ ok: false, code: 'NO_EVIDENCE' }` (no point asking LLM)
6. `buildPrompt(scorecard, evidence, tone)` → messages
7. `sendMessage({ messages, temperature: 0.4, fetchImpl })` → result
8. If `!result.ok` → return `{ ok: false, code: 'AI_ERROR', error: result.error }`
9. `validateLetter(result.text, evidence)` → { ok, text, warnings }
10. Apply tone via existing `applyTone(text, tone)` for greeting/closing consistency
11. Return `{ ok: true, text, method: 'ai', warnings }`

## 7. UI Integration

### 7.1 Button in negotiations tab HTML

Add below the tone `<select>`, before the `<textarea>`:

```html
<button id="cover-letter-ai-btn" type="button"
        style="font-size:11px;padding:4px 10px;background:#7c3aed;color:#fff;border:0;border-radius:6px;cursor:pointer;">
  Сгенерировать с AI
</button>
```

### 7.2 Click handler (cover-letter-events.js)

```js
export function bindCoverLetterAIBtn(opts) {
  const sr = refs.shadowRoot;
  if (!sr) return;
  const btn = sr.getElementById('cover-letter-ai-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const vacancy = panelState.activeVacancy || panelState.vacancies?.[0];
    const resume = panelState.activeResume;
    if (!vacancy || !resume) {
      toast('Нужно активное резюме + вакансия');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Генерация...';

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'AI_GENERATE_COVER_LETTER',
        vacancy, resume,
        opts: { tone: currentTone() }
      });

      if (result.ok) {
        sr.getElementById('cover-letter-text').value = result.text;
        // Trigger debounced save
        sr.getElementById('cover-letter-text').dispatchEvent(new Event('input'));
        toast('Письмо сгенерировано');
      } else {
        toast('AI: ' + (result.code || result.error || 'ошибка'));
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Сгенерировать с AI';
    }
  });
}
```

## 8. Test Plan

### 8.1 `cover-letter-scorecard.test.js`
- mission extracted from title + responsibilities first sentence
- outcomes: top 3-5 concrete sentences from responsibilities
- competencies: union of keySkills + requirements noun phrases
- empty responsibilities → fallback mission/outcomes
- empty keySkills → competencies from requirements only

### 8.2 `cover-letter-evidence.test.js`
- matching skill → finds evidence sentence in experience.description
- derived skill → confidence `medium`
- missing skill → SKIPPED (not in evidence array)
- experience entry without description → skipped
- multiple experience entries → picks most recent + most measurable
- number/percentage in evidence sentence → confidence `high`
- no evidence found for any competency → returns `[]`

### 8.3 `cover-letter-prompt.test.js`
- system prompt contains anti-hallucination rules
- user prompt includes all scorecard outcomes
- user prompt includes all evidence items
- tone forwarded to system prompt
- empty evidence → prompt still buildable (orchestrator prevents this anyway)

### 8.4 `cover-letter-validator.test.js`
- length > 5000 → truncated
- skill mentioned not in evidence → warning added
- digit in text not in evidence → warning added
- leading "Здравствуйте, меня зовут" → stripped
- LLM filler first paragraph → stripped
- clean letter → ok=true, no warnings
- AI pattern "кроме того" → warning `AI_PATTERN: ai_vocabulary`
- AI pattern "не только..., но и" → warning `AI_PATTERN: negative_parallelism`
- AI pattern `**жирный**` → warning + stripped from text
- AI pattern "обеспечивая" → warning `AI_PATTERN: verbal_noun_filler`
- AI pattern "буду рад принести ценность" → warning `AI_PATTERN: generic_conclusion`
- em dash count > 3 → warning `AI_PATTERN: em_dash_overuse`
- clean Russian letter (no AI patterns) → no AI pattern warnings

### 8.5 `cover-letter-ai.test.js` (orchestrator)
- no API key → returns NO_API_KEY
- no evidence → returns NO_EVIDENCE
- successful path with fetchImpl stub → ok=true, text from LLM
- AI returns 500 → returns AI_ERROR
- AI returns text with hallucinated skill → warnings populated, ok=true
- tone forwarded

## 9. Anti-Hallucination Guarantees

1. **LLM never sees free-text resume body** — only curated evidence list.
2. **Evidence is quote-only** — `mapEvidence` extracts sentences verbatim from `resume.experience[].description`, never paraphrases.
3. **Validator flags unverified claims** — sentences mentioning skills/numbers not in evidence → warning.
4. **Gaps are silent** — missing skills are NOT mentioned to LLM, not mentioned in prompt.
5. **Tone post-applied** — `applyTone()` from existing `cover-letter-tone.js` ensures greeting/closing consistency.
6. **AI writing patterns rejected** — system prompt + post-validator catch 11 humanizer patterns (inflated symbolism, AI vocabulary, negative parallelism, verbal noun filler, rule of three, em dash overuse, generic conclusions, filler, boldface, inline-header lists, sycophantic). Boldface auto-stripped; others warned in logs.

## 9.1 Source Skills

This spec is informed by two upstream skills:

| Skill | Used for |
|---|---|
| `interview-designer` | Methodology: Scorecard (Smart) → Forensic Scan (Smart) → Future Simulation (Adler) → De-bias (Kahneman). Reverse-applied to candidate side. |
| `humanizer` | 11 AI writing patterns banned in system prompt + post-validator warnings. Wikipedia's "Signs of AI writing" guide, via @blader's humanizer skill. |

## 10. Version & Rollout

- Version bump: 1.9.49.0 → **1.9.50.0**
- Update 5 files per Rule 9.2: manifest.json, package.json, src/lib/version.js, popup/index.html, README.md
- F-CR-02 in `cascade/state.json` functionInventory: `Stub` → `Works`
- Add `cover-letter-ai` to README "AI features" section
- Tests count: 364 → ~400+ (5 new test files, ~7 tests each ≈ 35)

## 11. Open Questions (resolve during plan phase)

1. **Should the AI button be disabled when no vacancy is open?** Probably yes — show greyed + tooltip "Откройте вакансию".
2. **What if AI takes >5 sec?** Existing 30s timeout in `sendMessage` is fine. UI shows "Генерация..." spinner.
3. **Should we cache the generated letter per (vacancyId, resumeId, tone)?** No for v1 — user can re-click. Cache is F-CR-02.2.
4. **Concurrent clicks?** Disable button during request (already in handler).
5. **Russian-only or also English vacancies?** Prompt is in Russian; if vacancy/resume is English, LLM will follow. v1 ships Russian-only prompt.

---

**End of spec. Reviewer: please confirm or request changes.**

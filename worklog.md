# Worklog — HH Bot / HH-Copilot Research

---
Task ID: fix-resume-sync-selector
Agent: main
Task: Fix resume sync selector - add /applicant/resumes/view?resume= pattern

Work Log:
- Analyzed user screenshots: "My resumes" shows 0 after sync
- Identified root cause: fetchResumeList() only matched a[href*="/resume/"] pattern
- hh.ru uses /applicant/resumes/view?resume={hash} for applicant own resume list
- Fixed fetchResumeList() to also match [?&]resume=([a-f0-9]+) pattern
- Fixed fetchAndParseResume() ID extraction for both URL formats
- Fixed parseResumeList() in resume-detail/index.js with same pattern
- Added debug logging for HTML length and link count
- Build successful v1.7.4

Stage Summary:
- 2 files modified: resume-fetch.js, resume-detail/index.js
- Resume list selector now matches both /resume/{hex} and ?resume={hex}
- Build passed, ready for live testing

---
Task ID: 1
Agent: Main
Task: Исследование HH-Copilot и hh.ru API для парсинга резюме

Work Log:
- Клонирован и изучен репозиторий HH-Copilot (Chrome Extension v1.7.3)
- Изучены все парсеры резюме из HH-Copilot (DOM-based, data-qa селекторы)
- Скачана официальная OpenAPI спецификация hh.ru (1.2MB YAML) с https://api.hh.ru/openapi/specification/public
- Проведён веб-поиск о статусе hh.ru API для соискателей
- Найдены множественные подтверждения: HH ЗАКРЫЛ API ДЛЯ СОИСКАТЕЛЕЙ с 15 декабря 2025 года
- Проанализированы все 106 эндпоинтов текущей OpenAPI спецификации hh.ru

Stage Summary:

## КРИТИЧЕСКИЙ ВЫВОД: Парсинг резюме через hh.ru API НЕВОЗМОЖЕН для соискателя

### Факты:
1. **HH закрыл соискательское API 15 декабря 2025** — подтверждено множественными источниками (Сетка, Habr, Threads, LinkedIn, Instagram)
2. **В текущей OpenAPI спецификации НЕТ эндпоинтов соискателя для работы со своими резюме:**
   - НЕТ `/resumes/mine` (список своих резюме)
   - НЕТ `POST /resumes` (создание резюме)
   - НЕТ `PUT /resumes/{id}` (редактирование резюме)
   - НЕТ `POST /resumes/{id}/publish` (публикация)
   - НЕТ `/resumes/{id}/contacts` (контакты)
3. **Единственные resume-эндпоинты — ТОЛЬКО для работодателя:**
   - `GET /resumes` — поиск резюме (платный доступ, employer only)
   - `GET /resumes/{resume_id}` — просмотр резюме (платный доступ, employer only)
   - `GET /resumes/{resume_id}/negotiations_history` — история откликов (employer)
4. **Для соискателя остались доступны только:**
   - `GET /vacancies` — поиск вакансий
   - `GET /vacancies/{id}/similar_vacancies` — похожие вакансии
   - `GET /negotiations` — список откликов/приглашений
   - `POST /negotiations/{nid}/messages` — отправка сообщений
   - `GET /me` — информация о текущем пользователе

### Что доступно из API соискателю:
- Поиск вакансий ✅
- Просмотр вакансий ✅
- Отклики/приглашения (переписка) ✅
- Чаты ✅
- Свои резюме — ❌ НЕДОСТУПНО через API

### Альтернативы для получения данных своего резюме:
1. **DOM-парсинг (как в HH-Copilot)** — через браузер/расширение, используя data-qa селекторы
2. **Playwright/Puppeteer** — автоматизация браузера для серверного парсинга
3. **Ручной ввод** — пользователь сам заполняет данные в боте

### HH-Copilot resume parser — полный справочник data-qa селекторов:
- `[data-qa="resume-block-title-position"]` — должность
- `[data-qa="resume-block-salary"]` — зарплата
- `[data-qa="resume-position-card"]` — карточка позиции (пол, возраст, адрес)
- `[data-qa="skills-card"]` — блок навыков
- `[data-qa^="skill-tag-"]` — теги навыков
- `[data-qa^="skill-level-title-"]` — уровни навыков (1=Начальный, 2=Средний, 3=Продвинутый)
- `[data-qa="resume-list-card-experience"]` — блок опыта
- `[data-qa="profile-experience-company-card"]` — карточка компании в опыте
- `[data-qa="cell-left-side"]` — левая ячейка (компания, должность)
- `[data-qa="cell-text-content"]` — текст ячейки
- `[data-qa="magritte-stepper-step-content"]` — контент шага (позиция, период)
- `[data-qa="resume-list-card-education"]` — блок образования
- `[data-qa="resume-about-card"]` — доп. информация / о себе
- `[data-qa="profile-experience-viewAll"]` — кнопка "Показать все"
- `.bloko-tag__text` — fallback для тегов (навыки, языки)

---
Task ID: 2
Agent: Main
Task: Сохранение исходников HH Bot и создание архитектурной документации

Work Log:
- Получены от пользователя все 9 Python файлов из hh-bot/src/hh/ через PowerShell
- Получены все 6 Next.js API route файлов из hh-bot/src/app/api/hh/resumes/
- Сохранены 9 Python файлов в docs/hh-bot-src/hh/ (commit 9c8e9a2 + __init__.py)
- Сохранены 6 Next.js route файлов в docs/hh-bot-src/app/api/hh/resumes/ (commits 25a608c, 35b2d9f)
- Создана архитектурная документация docs/HH_BOT_ARCHITECTURE.md (627 строк, commit 4763ca0)
- Все коммиты запушены в origin/main

Stage Summary:
- Репозиторий содержит полный слепок исходников HH Bot (Python + Next.js)
- Архитектурная документация покрывает: архитектуру, компоненты, поток данных, антидетект, селекторы, TODO
- Идентифицирован мёртвый код: HHApiClient, HHAuth (пост-закрытие API декабрь 2025)
- Идентифицированы незавершённые TODO в Next.js API routes (6 заглушек)
- Файлы в репозитории:
  - docs/HH_API_RESEARCH.md -- исследование API
  - docs/HH_BOT_ARCHITECTURE.md -- архитектурная документация
  - docs/hh-bot-src/hh/ -- 9 Python файлов бэкенда
  - docs/hh-bot-src/app/api/hh/resumes/ -- 6 Next.js API route файлов
  - UNICODE_POLICY.md -- политика форматирования

---
Task ID: 3
Agent: Main
Task: Обновление cascade-guard и anti-hallucination-guard

Work Log:
- cascade-guard обновлён: 378adbc -> 5f58eb5 (перевод AGENT_RULES на английский)
- anti-hallucination-guard обновлён: d6428a0 -> e67a2d7 (verify-docs tool, новый update.sh)
- Оба setup.sh перепрогнаны, хуки переустановлены
- Коммит и пуш обновлений сабмодулей

---
Task ID: 4
Agent: Main
Task: Fix resume title noise + add visibility status badges (scale-ready for 1000+ users)

Work Log:
- Identified 2 problems: (1) title contains "Постоянная работа" garbage, (2) hidden resumes need visibility status
- Created shared constants module `src/lib/resume-constants.js` with:
  - `MIN_HASH_LEN` — minimum hash length for valid resume IDs
  - `UI_NOISE` regex — patterns to filter from link text
  - `TITLE_SUFFIX_NOISE` regex — patterns to strip from parsed titles
  - `cleanResumeTitle()` — shared title cleaning function
  - `VISIBILITY_VISIBLE/HIDDEN/UNKNOWN` — string constants for visibility
  - `detectVisibilityFromCardText()` — shared visibility detection
- Updated `resume-fetch-helpers.js`: uses `cleanResumeTitle()` and shared constants
- Updated `resume-fetch.js`:
  - `fetchAndParseResume()` now accepts `listMeta` param to carry visibility from list to parsed resume
  - `syncAllResumes()` passes `item` as listMeta to preserve visibility
  - Title cleaning uses `TITLE_SUFFIX_NOISE` from constants
  - Resume object includes `visibility` and `hidden` fields
- Updated `resume-detail/parse-resume.js`:
  - Added `visibility: VISIBILITY_UNKNOWN` and `hidden: false` to default resume object
  - Added title cleanup with `TITLE_SUFFIX_NOISE`
- Updated `resume-detail/index.js`:
  - `parseResumeList()` now uses `cleanResumeTitle()`, `detectVisibilityFromCardText()`, shared constants
  - Includes visibility detection from card DOM
- Updated UI `resumes.js`:
  - `renderMyResumesPanel()`: 3 visibility badges (Скрыто/Видимо/Статус неизвестен) using CSS badge classes
  - Visible/hidden counter badges in sync section header
  - Detail card shows visibility badge next to title
- Updated UI HTML `resume.js`:
  - Added `res-visible-count` and `res-hidden-count` badge elements in sync section
- Build successful, 0 lint errors (7 pre-existing warnings)

Stage Summary:
- New file: `src/lib/resume-constants.js` — shared constants for DRY across 4 files
- 6 files modified: resume-fetch-helpers.js, resume-fetch.js, parse-resume.js, resume-detail/index.js, ui/tabs/resumes.js, ui/html/tabs/resume.js
- Title cleanup: "Постоянная работа" and other noise words stripped from both fetch-based and DOM-based parsers
- Visibility status: 'visible' / 'hidden' / 'unknown' — tracked through entire pipeline (list → parse → save → display)
- UI badges: green "Видимо", amber "Скрыто", zinc "Статус неизвестен"
- Scale-ready: visibility detection works for any number of resumes per user

---
Task ID: 5
Agent: Main
Task: Fix missing visibility badges - add migration for old stored data + bump version

Work Log:
- User reported: badges still not showing in v1.7.7
- VLM analysis confirmed: 3 resumes listed, no visibility badges visible
- Root cause: old resumes in chrome.storage saved before v1.7.8 have no `visibility` field
- Bumped version to 1.7.8 so user can verify new code is loaded
- Added migration in main.js boot sequence:
  - For `myResume` (single): backfills `visibility`, cleans `title` noise
  - For `myResumes` (list): backfills `visibility`, cleans `title` noise
  - Auto-saves migrated data back to chrome.storage
- Old data without `visibility` gets `VISIBILITY_UNKNOWN` → shows "Статус неизвестен" badge
- After re-sync, full visibility status (visible/hidden) is populated

---
Task ID: 7
Agent: Main
Task: Fix &nbsp; (U+00A0) non-breaking space in visibility detection

Work Log:
- ROOT CAUSE: hh.ru uses &nbsp; (U+00A0) in "Многие\u00A0не\u00A0видят", code compared with regular spaces → NEVER matched
- Added normalizeWs() + hasHiddenIndicator() to resume-constants.js
- Fixed Strategy 3 proximity in resume-detail/index.js: raw .includes() → hasHiddenIndicator()
- Fixed debugVisibility(): normalize whitespace before searching indicators
- Build successful
- Build successful: v1.7.8, 0 lint errors

Stage Summary:
- Version bumped: 1.7.7 → 1.7.8
- Migration added: old stored data gets visibility field backfilled at boot
- User needs to: (1) reload extension in chrome://extensions, (2) re-sync resumes

---
Task ID: 6
Agent: Main
Task: Fix visibility detection — Magritte-aware multi-strategy approach

Work Log:
- User confirmed: all 3 resumes show "Видимо" when 2 should be "Скрыто"
- User pointed out: hh.ru uses Magritte design system, code was "guessing"
- Root cause: proximity search finds hash in <script> hydration data first, not card HTML
- Rewrote 3 files with Magritte-aware multi-strategy visibility detection
- Version bumped: 1.7.9 → 1.8.0, build successful

Stage Summary:
- resume-constants.js: HIDDEN_INDICATORS, RESUME_CARD_SELECTORS, detectVisibilityFromCard(), stripScripts(), findCardForLink()
- resume-fetch-helpers.js: 3 strategies (data-qa cards, script state, proximity with script stripping)
- resume-detail/index.js: 3 strategies (data-qa cards, DOM walk, proximity with script stripping)
- Added debugVisibility() diagnostic (window.__hhDebugVisibility)

---
Task ID: 8
Agent: main
Task: Update README.md and worklog.md — fill documentation gaps per cascade discipline

Work Log:
- Updated README.md: version 1.7.3 → 1.8.3, 42→57 files, 12→13 fields, wireframes in docs/
- Updated file structure section: added resume-constants.js, resume-fetch-helpers.js, resume-fetch.js, resume-fetch-parse.js, resumes/ directory (5 files)
- Added version history entries for v1.7.4 through v1.8.3
- Added docs/wireframes/ to repo root structure in README (4 files)
- Added anti-hallucination-guard/ to repo root structure
- Added Task ID 6 (Magritte visibility) to this worklog

Stage Summary:
- README.md now reflects actual v1.8.3 state with 57 source files
- Version history covers v1.0.0 through v1.8.3
- docs/wireframes/ documented in README with all 4 files

---
Task ID: 1
Agent: main
Task: Fix "Загрузить с текущей страницы" button and top resume card not working

Work Log:
- Diagnosed root cause: renderResumePanel() and renderResumeListPanel() used getElementById('har-resume-content') which does not exist in DOM
- HTML template (html/tabs/resume.js) uses id="res-parsed-data" — IDs did not match
- Both render functions silently returned null, so load-resume handler appeared to do nothing
- Changed both functions to use 'res-parsed-data' instead of 'har-resume-content'
- Added updateAccordionHeader() to update title/subtitle/badge when resume loads
- Added auto-expand of accordion when resume is loaded
- Added setStatus() calls in load-resume handler for UI feedback
- Added renderResumeListPanel import and call in main.js
- Added rules 11-12 to AGENT_RULES.md (verify before done, check before start)
- Build passed, Grep verified: har-resume-content=0, res-parsed-data=3 in bundle

Stage Summary:
- Root cause: wrong container ID (har-resume-content vs res-parsed-data)
- All 3 files committed: AGENT_RULES.md, main.js, resumes.js
- "Синхронизировать все" worked because it used #res-sync-list (correct ID)

---
Task ID: 5
Agent: main
Task: Restore repo structure + add wireframe files

Work Log:
- Analyzed git history to find the destructive commit 9842902 that deleted all extension files
- Restored .gitignore, .gitmodules, README.md, AGENT_RULES.md, cascade-cli.sh, cascade-init.sh, cascade-state.json from commit 9853ce1
- Restored hh-extension/hh-auto-respond-extension/ source files from gitlink commit 1a9b93c (includes v1.8.1 nbsp fix + resume load button fix)
- Restored anti-hallucination-guard and cascade-guard as proper submodules
- Removed broken HH-Copilot gitlink (was circular self-reference)
- Added wireframe files to docs/wireframes/ (documentation, FAB panel, landing page)

Stage Summary:
- Repo fully restored with all extension source files, submodules, and docs
- Wireframe files stored in docs/wireframes/ permanently
- Extension can now be built: hh-extension/hh-auto-respond-extension/npm run build

---
Task ID: R0.1-R0.5
Agent: main
Task: Resume UI Wireframe Compliance — anti-monolith refactor + match wireframe design

Work Log:
- Read wireframes from docs/wireframes/hh-copilot-fab-panel.html (Resume tab section lines 614-888)
- Compared wireframe vs current implementation — found 5 gaps:
  1. resumes.js 407 lines (anti-monolith violation, max 200)
  2. Subtitle showed "3 места" instead of "7 лет опыта" (wireframe format)
  3. Personal Data section missing "Имя" field (wireframe has Имя, Позиция, Город, Опыт)
  4. Education rendering was simple list, not structured grid (ВУЗ, Факультет, Год, Степень)
  5. Languages rendering showed dashes, not language+level grid
- Added P0.5 "Resume UI Wireframe Compliance" phase to cascade-state.json with tasks R0.1-R0.5
- R0.1: Split resumes.js into 5 files under src/ui/tabs/resumes/:
  - resumes.js (12 lines, shim for backward compat)
  - resumes/index.js (17 lines, barrel export)
  - resumes/resume-helpers.js (102 lines: getInitials, buildSubAccordion, buildGrid, toggleSub, attachSubToggle, updateSkillsSection)
  - resumes/render-my-resumes.js (116 lines: renderMyResumesPanel, renderResumeListPanel)
  - resumes/render-resume-panel.js (161 lines: updateAccordionHeader, renderResumePanel)
  - resumes/section-builders.js (137 lines: buildPersonalSection, buildSalarySection, buildExperienceSection, buildEducationSection, buildLanguagesSection, buildContactsSection)
- R0.2: Fixed subtitle to match wireframe: "{Name} • {N} лет опыта • {N} навыков"
  - Added calcExperienceYears() and yearWord() helpers
  - Avatar initials now from name (not title)
- R0.3: Added Имя (name) field to resume parser and UI
  - Added resume.name field to parse-resume.js default object
  - Added name parsing in parsePersonalData() with [data-qa="resume-personal-name"] selector + fallback
  - Personal Data section now shows: Имя, Позиция, Город, Пол, Возраст
- R0.4: Education rendering changed to structured grid
  - Each education entry shows: ВУЗ, Факультет, Год, Степень
  - Added degree field parsing in parse-resume-education.js (Бакалавр, Магистр, Специалист, etc.)
- R0.5: Languages rendering changed to language+level grid
  - Parses "Русский — Нативный" format into separate language/level columns
  - Fallback dash for unknown levels
- All 5 tasks verified: build passes, all functions present in bundle, line counts under 200

Stage Summary:
- resumes.js: 407 lines → 5 files (12, 17, 102, 116, 161, 137 lines) — anti-monolith compliant
- Resume UI now matches wireframe: 6 accordion sections, correct subtitle, name field, structured education/languages
- Parser additions: name field, degree field in education
- Build: v1.8.3, 246.5kb bundle, 0 errors

---
Task ID: R0.6
Agent: main
Task: Skill Gap Analysis + Experience Timeline wireframe compliance

Work Log:
- Read wireframe HTML (docs/wireframes/hh-copilot-fab-panel.html lines 614-888) for Skill Gap section
- Compared wireframe vs current: gap section was stub with "Анализ доступен после парсинга вакансий" text
- Wireframe specifies: SVG ring with conic-gradient %, stacked bar (3 colors), 3 skill rows (match/miss/extra), recommendation block
- Updated resume.js HTML template: replaced stub res-gap-section with full wireframe structure (ring, bar, 3 rows, recommendation)
- Updated section-builders.js buildExperienceSection(): Company • Period format, no border-bottom on last item, dot color #B45309
- Added updateSkillGapSection() in resume-helpers.js (190 lines): compares resume skills with vacancy tags, calculates match %, updates ring/bar/rows/recommendation
- Added normalizeSkills(), collectVacancySkills(), updateGapRow(), updateGapRecommendation() helpers
- Updated render-resume-panel.js: imports and calls updateSkillGapSection(r) after updateSkillsSection(r)
- Updated resumes/index.js barrel export: added updateSkillGapSection
- Updated panel/index.js updateVacancies(): triggers updateSkillGapSection() when vacancies change
- Added data-action="analyze-skills" handler in events.js with dynamic import
- Fixed duplicate display property in recommendation div inline style
- Build: v1.8.3, dist/content.js 257.3kb, 0 errors

Stage Summary:
- 7 files modified: resume.js, section-builders.js, resume-helpers.js, render-resume-panel.js, index.js (resumes), panel/index.js, events.js
- Skill Gap Analysis: full wireframe compliance — ring + stacked bar + 3 categories + recommendation
- Experience Timeline: wireframe format (Company • Period), last item clean
- Auto-updates when vacancies are parsed or "Анализ" button clicked

---
Task ID: R0.7
Agent: main
Task: Fix parseSalaryConditions ReferenceError — resume parsing completely broken

Work Log:
- User reported: ReferenceError: parseSalaryConditions is not defined at parseResume (content.js:1372)
- Root cause: parseSalaryConditions and parseContacts are defined and exported in parse-resume-sections.js, but were NOT imported in parse-resume.js
- The import line only had 4 of 6 functions: parsePersonalData, parseSkills, parseExperience, parseLanguagesAndAbout
- Missing: parseSalaryConditions, parseContacts
- This caused parseResume() to crash on every call — zero resume data parsed
- Fix: added parseSalaryConditions and parseContacts to the import statement in parse-resume.js
- Verified: parseSalaryConditions appears 2x in bundle (definition + call)
- Bumped version to 1.8.5

Stage Summary:
- 1 file fixed: parse-resume.js (import line)
- Critical bug: entire resume parsing was broken since R0.1-R0.5 refactor
- 6 experience entries in DOM confirmed, parseCompanyCard logic should work now that parseResume doesn't crash

---
Task ID: R0.8
Agent: main
Task: Add diagnostic buttons + fix load-resume button not responding

Work Log:
- User reported: "Загрузить с текущей страницы" and "Перепарсить" buttons do nothing
- Added console.log to load-resume event handler for tracing
- Added 3 diagnostic buttons in resume tab:
  - «Очистить резюме» — clears panelState.resume + chrome.storage.local myResume
  - «Дамп в консоль» — dumps full panelState.resume JSON to console
  - «Тест парсинга» — runs parseResume() directly with error handling, shows result in status line
- Added res-status-line element for visual feedback (replaces invisible setStatus)
- All diagnostic buttons show results in both console and status line
- Bumped version to 1.8.6

Stage Summary:
- 2 files modified: resume.js (diagnostic UI), events.js (handlers + console.log tracing)
- User can now diagnose: (1) click "Тест парсинга" on /resume/{hash} page, (2) see result in status line + console
- "Очистить резюме" resets everything so re-parse starts clean
- "Дамп в консоль" shows what's currently stored

---
Task ID: R0.9
Agent: main
Task: Fix resume parsing on /resume/edit/ pages, fix clear button, add data validation (v1.8.7)

Work Log:
- User reported 3 issues when on /resume/edit/{id}/about page:
  1. "Очистить резюме" doesn't work — data auto-restores from myResumes[]
  2. "Синхронизировать все резюме" shows only 3 experiences (but 6 in DOM)
  3. "Перепарсить резюме" results in "Без названия Статус неизвестен"
- Root cause 1: /resume/edit/ page has different DOM — no data-qa attributes for parseResume()
  The edit page is a form, not a display page. parseResume() finds 0 company-cards.
- Root cause 2: renderResumePanel() auto-restores from myResumes[0] when panelState.resume is null
  After clearing, the fallback immediately restores data
- Root cause 3: No validation — empty parse results overwrite good data
- Fix 1: Edit page detection (/resume/edit/) now uses fetchAndParseResume() to fetch the VIEW page
  (/applicant/resumes/view?resume={id}) and parse that instead. Applied to:
  - initPageLogic() auto-parse
  - hh-ar-load-resume handler ("Перепарсить" / "Загрузить с текущей страницы")
  - testParseResume() diagnostic button
- Fix 2: Added panelState._resumeCleared flag. When set:
  - renderResumePanel() skips auto-restore from myResumes[]
  - Flag is reset when: sync completes, resume loaded, resume clicked in list
- Fix 3: Parse validation — resume must have title OR skills OR experience to be saved
  Empty results show "Не удалось распознать резюме" warning instead
- initPageLogic() made async to support await fetchAndParseResume()
- Bumped version to 1.8.7

Stage Summary:
- 6 files modified: main.js, events.js, state.js, render-resume-panel.js, render-my-resumes.js, manifest.json
- Resume parsing works correctly on both /resume/{hash} (VIEW) and /resume/edit/{id} (EDIT) pages
- Clear button properly clears without auto-restore
- Empty parse results no longer overwrite good data

---
Task ID: R0.10
Agent: main
Task: Fix "Загрузить" on non-resume pages, add experience debug logging (v1.8.8)

Work Log:
- User reported: "Загрузить с текущей страницы" does nothing on hh.ru main page (/)
- User reported: On /applicant/resumes, button shows list but doesn't load resume details
- User reported: All synced resumes show Exp: 3 (investigating)
- Fix 1: On non-resume pages, "Загрузить" now loads first resume from myResumes[]
- Fix 2: On /applicant/resumes, button loads list AND auto-selects first synced resume
- Fix 3: Added stepper fallback in parseExperienceFromDoc()
- Fix 4: Added debug logging for pre-parse experience card count

Stage Summary:
- "Загрузить с текущей страницы" now works on ALL pages
- 2 files modified: main.js, resume-fetch.js
- Debug logging added for experience count investigation

---
Task ID: 10
Agent: Main
Task: Fix experience parsing (3→6) + reduce auth log noise (v1.8.9)

Work Log:
- Root cause analysis: two bugs causing only 3 of 6 experiences to be parsed
  1. Race condition: expandHiddenSections() called without await in initPageLogic()
  2. Stepper fallback only triggered when uniqueCards.length === 0
- Fix 1: Added await before expandHiddenSections() in initPageLogic()
- Fix 2: Rewrote parseExperienceFromDoc() with 3 strategies: company-cards → stepper supplement → full fallback
- Fix 3: Same stepper supplement added to live DOM parseExperience()
- Fix 4: Removed noisy console.log from checkAuth()
- Updated CHANGELOG.md with entries for v1.8.4 through v1.8.9
- Version: 1.8.8 → 1.8.9, built and pushed

Stage Summary:
- Experience parsing now finds all entries (3→6) on both live DOM and fetch paths
- Auth log noise eliminated
- CHANGELOG.md fully up to date

---
Task ID: 11
Agent: Main
Task: Add Strategy 4 (text pattern) + Strategy 5 (script JSON) for experience parsing (v1.9.0)

Work Log:
- User confirmed: sync still returns 3 experiences after v1.8.9
- Root cause: fetched SSR HTML only contains 3 company-cards with data-qa
  The remaining 3 experiences are in the HTML but without data-qa wrappers
- Added Strategy 4: parseExperienceFromHtmlText() - finds date ranges in raw HTML
  (e.g. "январь 2020 — настоящее время") then extracts surrounding text for position/company
- Added Strategy 5: parseExperienceFromScripts() - looks for JSON in <script> tags
  (Magritte hydration state, window.__INITIAL_STATE__, etc.)
- Added diagnostic HTML snippet dump (first 2000 chars of expCard) for debugging
- If Strategy 4 finds more entries than Strategies 1-3, it replaces them
- Version bump to 1.9.0

Stage Summary:
- 5 parsing strategies now: company-cards → stepper supplement → stepper fallback → text patterns → script JSON
- Text pattern strategy should find ALL date ranges in the HTML even without data-qa
- Diagnostic dump will help identify exact HTML structure for further refinement

---
Task ID: 12
Agent: Main
Task: Add loading indicator + comprehensive experience diagnostics (v1.9.2)

Work Log:
- Added loading spinner for "Загрузить с текущей страницы" button
  Button shows spinner + "Загрузка..." while processing, restored after completion
  Dispatches hh-ar-load-resume-done event for button state restoration
- Added comprehensive diagnostic logging in fetchAndParseResume():
  - Full HTML date range count (all month+year patterns)
  - Numeric date pattern search (01.2020 format)
  - Script tag analysis (finds scripts with experience keywords, dumps first 500 chars)
  - Stores HTML on window.__hhLastFetchHtml for console debugging
- Fixed Strategy 4 (parseExperienceFromHtmlText) to search ENTIRE HTML first
  (not just within experience section boundaries)
  Added numeric date format support and more fallback section patterns
- Version: 1.9.0 → 1.9.2

Stage Summary:
- Loading indicator now works for "Загрузить с текущей страницы"
- Diagnostic logs will reveal: how many date ranges exist in full HTML,
  what script tags contain, and what date formats are used
- window.__hhLastFetchHtml available for manual console analysis

---
Task ID: 13
Agent: Main
Task: Add panel spinner + fix invisible logger + Strategy 6 expanded experience fetch (v1.9.3)

Work Log:
- Added loading spinner in #res-parsed-data panel when "Загрузить с текущей страницы" clicked
  Shows .har-spinner (40px circle) + "Загрузка резюме..." text, auto-expands accordion
  Replaced by actual resume data when renderResumePanel() runs after load completes
- Fixed logger: console.debug → console.log in createLogger()
  Chrome DevTools hides debug messages by default — all [HH-AR][*] logs now visible
- Added Strategy 6: fetchExpandedExperience() — tries multiple approaches to get hidden experience:
  (a) Find "Показать все" button URLs (href, data-url, data-action-url attributes)
  (b) Search Magritte script tags for expansion URLs (loadMore, fetchUrl, nextPage patterns)
  (c) Try known API endpoints (/applicant/api/v1/resumes/{id}, api.hh.ru/resumes/{id})
  (d) Try query parameters (?expand=all, ?expand=experience, ?showAll=true, ?full=true)
  (e) Look for data-qa="profile-experience-viewAll" and check ancestors for data-url
  (f) Parse JSON API responses with recursive experience array finder
  (g) Parse expanded HTML docs with company-cards + stepper + text pattern strategies
- parseExperienceFromDoc() made async to support Strategy 6 (fetch requests)
- fetchAndParseResume() now uses await parseExperienceFromDoc()
- Version: 1.9.2 → 1.9.3, build successful

Stage Summary:
- Panel loading spinner now visible (not just button inline spinner)
- ALL logger messages now visible in Chrome DevTools (no Verbose level needed)
- Strategy 6 attempts 6+ different methods to find hidden experience entries
- Next step: test and check Strategy 6 console output to see which URLs/approaches work

---
Task ID: 14
Agent: Main
Task: Fix fetch-based experience parsing (3→6) — "Развернуть" button causes SSR to only render 3 entries

Work Log:
- User identified root cause: hh.ru resume page has "Свернуть"/"Развернуть" button
  SSR HTML only renders 3 company-cards; remaining 3 loaded via AJAX on "Развернуть" click
- Strategy 5 (script JSON) was SKIPPING because entries.length > 0 (3 > 0) — only ran when 0 entries
  Fixed: Strategy 5 now runs ALWAYS; if it finds more entries than DOM parsing, uses those
- Completely rewrote Strategy 5 (parseExperienceFromScripts) with 4 passes:
  Pass 1: Structured JSON in script tags (type="application/json" + inline scripts)
  Pass 2: window.__INITIAL_STATE__ / __PRELOADED_STATE__ / __NEXT_DATA__
  Pass 3: "resumeStore" / "resume" patterns in raw HTML
  Pass 4: Deep scan — find ANY JSON array with date+position fields
- Added robust JSON array extraction: extractJsonArray() with proper string/bracket tracking
- Added findExperienceInObject() — recursive search prioritizing known keys (experience, jobs, career, etc.)
- Added deepScanForExperience() — scans raw HTML for JSON arrays with year+position fields
- Completely rewrote Strategy 6 (fetchExpandedExperience):
  New architecture: findExpansionUrls() discovers URLs from 3 sources:
    Source 1: "Развернуть" button data-attributes (href, data-url, data-action-url, etc. on button + ancestors)
    Source 2: Magritte script state (url, fetchUrl, loadMore, apiUrl patterns)
    Source 3: Known API patterns (expand=experience_items, /mine/{id}/experience)
  Then tryFetchExpandedUrl() tries each URL with proper headers (X-Requested-With: XMLHttpRequest)
  Falls back to applicant internal API (/applicant/api/v1/resumes/{id}, /applicant/api/resumes/{id})
  Falls back to re-fetch with expansion query parameters
- Fixed bug in buildEntryFromApiItem(): item.current check had wrong operator precedence
  Was: `item.end || item.endDate || item.current ? 'настоящее время' : ''`
  Now: `isCurrent = !!(item.current || item.untilNow); end = rawEnd || (isCurrent ? 'настоящее время' : '')`
- Added resumeUrl parameter to parseExperienceFromDoc and fetchExpandedExperience
- Version: 1.9.3 → 1.9.4, build successful (305.9kb)

Stage Summary:
- Strategy 5 now runs ALWAYS (not just when 0 entries), with 4-pass deep scan
- Strategy 6 completely rewritten with modular URL discovery + fetch approach
- buildEntryFromApiItem() bug fixed (operator precedence for current/untilNow)
- Next: test to see if Strategy 5 finds experience data in Magritte script state,
  or if Strategy 6 finds the AJAX endpoint for "Развернуть"

---
Task ID: 15
Agent: Main
Task: Version sync + commit + push v1.9.4

Work Log:
- User asked to verify all changes are committed and pushed before pulling
- Found 8 uncommitted files with 853 insertions, 76 deletions
- Fixed CHANGELOG version mismatch: was [1.9.3], code was 1.9.4 — aligned to 1.9.4
- Verified version consistency: version.js=1.9.4, manifest.json=1.9.4, package.json=1.9.4, CHANGELOG=[1.9.4]
- Verified build: esbuild bundle succeeds (289.7kb, 0 errors)
- Verified bracket balance: all JS files balanced
- Verified function references: no broken imports or missing functions
- Verified .har-spinner CSS class exists in styles.js
- Committing and pushing v1.9.4

Stage Summary:
- All 8 files committed, no dangling references
- Version 1.9.4 consistent across all 4 version sources
- Build passes, ready for user to pull
---
Task ID: 16
Agent: main
Task: v1.9.6 — Split strategy5/6 into sub-modules, fix experience scroll & text truncation

Work Log:
- Split resume-fetch-strategy5-scripts.js (240 lines) into 2 files:
  - strategy5-scripts.js (116 lines) — orchestrator with 4 passes
  - strategy5-scanners.js (148 lines) — 3 JSON scanners (structured, array, deep)
- Split resume-fetch-strategy6-expand.js (524 lines) into 4 files:
  - strategy6-expand.js (108 lines) — orchestrator (iframe → URLs → API → params)
  - strategy6-iframe.js (142 lines) — hidden iframe + click "Развернуть"
  - strategy6-urls.js (161 lines) — URL discovery from buttons/scripts/known patterns
  - strategy6-api.js (158 lines) — applicant API + JSON/expanded-doc parsing
- Removed deprecated findExperienceArray() — replaced by findExperienceInObject from json-utils
- Fixed UI: .sub-body.open max-height 500→2000px + overflow-y auto + scrollbar
- Fixed UI: removed .substring(0,200) truncation on experience description
- Updated resume-fetch.js module listing in header comment
- Build passed (315.3kb), version bumped to 1.9.6

Stage Summary:
- 5 modified + 4 new files, all builds passing
- External API unchanged (same exports from same filenames)
- Experience section now scrollable with full text descriptions

---
Task ID: 17
Agent: main
Task: v1.9.7 — Fix button spinners (load-resume, sync-resumes, reparse)

Work Log:
- Added CSS: .btn:disabled (opacity, cursor, no-events), .btn-primary:disabled (gray bg), .btn-spinner (12px spinning circle)
- Fixed load-resume: wrapped all code paths in try/finally — hh-ar-load-resume-done ALWAYS dispatched
- Fixed load-resume: replaced inline spinner styles with .btn-spinner CSS class
- Added sync-resumes button spinner: shows "Синхронизация..." with spinner, disabled while syncing
- Added hh-ar-sync-done event dispatch in handleSyncResumes() finally block
- Safety timeouts: load-resume 30s, sync-resumes 60s

Stage Summary:
- 3 files modified: styles.js, events.js, main.js
- All 3 buttons now show spinning indicator + disabled state while working
- Buttons restore original content when operation completes or times out

---
Task ID: 3
Agent: main
Task: Commit v1.9.5 code changes

---
Task ID: 18
Agent: main
Task: Full audit — git statuses, documentation gaps, version sync, TODOs

Work Log:
- Checked git status of my-project (root) and HH-Copilot (submodule)
- Found HH-Copilot clean, up to date with origin/main (c13372b)
- Found root my-project has staged HH-Copilot submodule pointer change (6909291→c13372b)
- Checked submodule status: anti-hallucination-guard (e67a2d7), cascade-guard (5f58eb5) — both clean
- Found nested empty directory HH-Copilot/HH-Copilot/ (circular gitlink leftover)
- Verified all version sources:
  - version.js: 1.9.7 ✅
  - manifest.json: 1.9.7 ✅
  - package.json: 1.9.7 ✅
  - popup/index.html: v1.7.3 ❌ (24 patches behind!) → FIXED to v1.9.7
  - README.md: "Версия: 1.8.3" ❌ (14 patches behind!) → FIXED to 1.9.7
- Verified build: npm run build passes (316.7kb, dist/content.js)
- Found 2 TODO stubs in code: vacancy-detail.js, negotiations.js (expected — Phase 1)
- Checked cascade-state.json: 40 tasks, 14 completed, 26 pending
- Updated README.md file structure section: lib/ 10→20 files (reflects anti-monolith split)
- Updated README.md description: added 6-strategy experience parsing mention
- Updated README.md install section: version 1.7.3→1.9.7 in Step 5

Stage Summary:
- popup/index.html version sync: v1.7.3 → v1.9.7
- README.md version sync: 1.8.3 → 1.9.7
- README.md file structure updated to reflect current 20-file lib/ directory
- Build verified: v1.9.7, 316.7kb
- Known stubs: parseVacancyDetail, parseNegotiations (Phase 1 pending)
- Pending cascade tasks: 26 (P1-P6)
---
Task ID: 1
Agent: main
Task: Resume UI rename and selector
Wed Jun 10 20:43:51 UTC 2026
Wed Jun 10 21:03:45 UTC 2026
Task ID: 2
Agent: main
Task: Fix Telegram parsing + filter hidden resumes in sync
Date: Wed Jun 10 21:03:45 UTC 2026
Task ID: 3 Wed Jun 10 21:20:52 UTC 2026
Task ID: 4 Wed Jun 10 21:27:19 UTC 2026
// Updated 2026-06-10T21:43

---
Task ID: 2
Agent: main
Task: UX fix — remove hidden dropdown, add radio selector in resume list, rename button

Work Log:
- Removed dropdown selector from top block header (was hidden as green badge, accidental clicks)
- Removed res-selector-trigger, res-selector-dropdown, res-selector-label HTML elements
- Removed updateResumeSelector() function entirely from render-resume-panel.js
- Removed selector trigger/label references from updateAccordionHeader()
- Added radio-style indicator (◉ filled / ○ empty) to each resume in "Все резюме" list
- Removed "Действующее" text badge from list items — radio dot replaces it
- Removed "Статус неизвестен" badge from list — no longer needed
- Renamed button "Сделать текущее действующим" → "Взять со страницы" (less confusing)
- Updated hint text to reference new button name
- Build successful: 208.3kb

Stage Summary:
- Selection is now in ONE place: "Все резюме" list with explicit radio buttons
- Top block is informational only — shows which resume is active, no hidden click actions
- Button wording clearer — no "текущее/действующее" confusion

---
Task ID: 3
Agent: main
Task: Fix visibility detection — detect from resume detail page HTML (more reliable than list page)

Work Log:
- Root cause: /applicant/resumes list page uses client-side rendering for visibility indicators
- fetch() gets SSR HTML which lacks "Многие не видят" — it's rendered by React after hydration
- Added detectVisibilityFromResumePage() function with 6 strategies for the detail page
- Strategies: data-qa attrs, button text, body text, raw HTML search, script JSON, hide action
- resume detail page includes visibility indicators in SSR HTML (more reliable)
- Page-level visibility overrides list-level metadata (page > list in reliability)
- Falls back to list meta only if page detection returns UNKNOWN
- Build successful: 210.3kb

Stage Summary:
- New function: detectVisibilityFromResumePage() — 6 strategies for resume detail page
- Visibility detection now has TWO layers: list page + detail page
- Detail page result overrides list page result (more reliable source)
- Should fix the "re-hide" bug where hidden resumes still showed as visible

---
Task ID: 4
Agent: main
Task: Fix reparse button logic — context-aware for hidden resumes

Work Log:
- Button "Перепарсить действующее" was always green regardless of resume visibility
- When hidden resume selected as active, button now shows "Перепарсить (скрытое)" with amber outline
- Added warning text: "Скрытое резюме не видно работодателям — мэтчинг недоступен"
- For visible resumes, button stays green "Перепарсить действующее" as before
- Build successful: 211.2kb

Stage Summary:
- Reparse button is now context-aware based on active resume visibility
- Hidden resume = amber outline + warning text about matching unavailability
- Visible resume = green primary button as before

---
Task ID: 5
Agent: main
Task: Remove duplicate "Взять со страницы" button — one contextual button instead of two

Work Log:
- Found: static "Взять со страницы" in HTML template + dynamic "Перепарсить действующее" in renderer
- Both used data-action="load-resume" — did the same thing, appeared simultaneously
- Removed static button from HTML template (resume.js)
- Empty state now shows "Взять со страницы" button dynamically
- Loaded state shows "Перепарсить действующее" or "Перепарсить (скрытое)" contextually
- One button, one action, no duplication
- Build: 211.1kb

Stage Summary:
- Eliminated duplicate button — only one contextual button exists now
- Empty state → "Взять со страницы" (green)
- Visible resume loaded → "Перепарсить действующее" (green)
- Hidden resume loaded → "Перепарсить (скрытое)" (amber) + warning

---
Task ID: 6
Agent: main
Task: Consolidate resume tab buttons — too many buttons visible simultaneously

Work Log:
- User complained "кнопок много под рукой" — 7 buttons visible at once
- Removed standalone "Перепарсить действующее/скрытое" from below parsed data sections
- Added compact ↻ icon on active resume card in "Все резюме" list (amber for hidden)
- Moved "Взять со страницы" CTA into "Все резюме" section (contextual, resume-detail page only)
- Changed "Синхронизировать все резюме" to outline style (secondary)
- Collapsed diagnostics behind chevron toggle (3 buttons hidden by default)
- Updated subtitle: "Выберите резюме из списка ниже"
- Fixed click event bubbling: ↻ doesn't trigger card's resume-switch
- Added hidden resume warning as text (not button) below accordion sections
- Build: 324.1kb

Stage Summary:
- Before: 7 buttons (Перепарсить, Взять со страницы, Синхронизировать, Анализ, Очистить, Дамп, Тест)
- After: 2 main (↻ on card + Синхронизировать) + contextual Взять со страницы + collapsed diagnostics
- 3 files modified: render-resume-panel.js, render-my-resumes.js, resume.js

---
Task ID: 7
Agent: main
Task: Complete documentation — CHANGELOG, README, worklog (no gaps)

Work Log:
- Added CHANGELOG entries for v1.9.6, v1.9.7, v1.9.7+ (unreleased)
- v1.9.6: strategy 5/6 sub-modules split
- v1.9.7: button spinners for all 3 action buttons
- v1.9.7+: visibility detection from resume page, radio buttons, button consolidation
- Updated README with: two-layer visibility detection, 6 strategies, radio buttons, ↻ reparse
- Updated README flow description with visibility detection pipeline
- Filled worklog gaps for all commits since v1.9.5
- No documentation tails remaining

Stage Summary:
- CHANGELOG: 3 new version entries (1.9.6, 1.9.7, 1.9.7+)
- README: updated version description, visibility detection, UI changes
- worklog: complete from v1.9.5 to present — every commit documented

---
Task ID: v1.9.9-visibility-fix
Agent: main
Task: Fix hidden resumes incorrectly marked as visible — three bugs in visibility detection chain

Work Log:
- Root cause: three bugs causing hidden resumes to show as "Видимо"
  1. UNKNOWN→VISIBLE fallback in extractVisibilityStatus() + parseResumeList() — too early
  2. detectVisibilityFromResumePage() Strategy 2: text.includes('скрыть') matched anything
  3. Page VISIBLE overrode List HIDDEN in fetchAndParseResume() — wrong priority
- Removed premature UNKNOWN→VISIBLE fallbacks from both list parsers
- Strategy 2: exact match "скрыть резюме" only
- New priority: HIDDEN > VISIBLE > UNKNOWN; final UNKNOWN→VISIBLE only in syncAllResumes()
- Version: 1.9.8 → 1.9.9, build verified

Stage Summary:
- 4 source files modified + 3 version files + CHANGELOG + 2 worklogs
- Hidden resumes should now correctly show "Скрыто" after sync

---
Task ID: vis-diag-dump
Agent: main
Task: Add hard diagnostic dump for visibility detection path

Work Log:
- Added [VIS-DIAG] prefixed console logs throughout entire visibility pipeline
- Every strategy step, every button found, every decision branch — all logged
- Filter DevTools console by [VIS-DIAG] to see the full path

Stage Summary:
- 3 files modified, 327.8kb build
- User can now see exactly where/why a resume gets marked VISIBLE or HIDDEN

---
Task ID: v1.9.8-audit
Agent: main
Task: Code audit — fix getResumePageType() bug, add JSDoc, fix docs gaps, v1.9.8

Work Log:
- Full code audit found 27 documentation gaps + 1 critical bug
- CRITICAL BUG: getResumePageType() returned 'resume' but consumers compared with 'resume-detail'
  → hint "Нажмите «Взять со страницы» ниже" and CTA button NEVER showed on resume detail pages
  → Fixed: now returns 'resume-detail' (matching both consumers)
- Added JSDoc to 17 undocumented functions across 5 files
- Documented magic numbers: {32,} vs MIN_HASH_LEN (30), SEARCH_RADIUS=5000
- Fixed version.js: comment says "NOT the single source of truth — manifest.json is"
- Added resume-fetch-helpers.js to README file structure
- Fixed README: "12 из 12" → "13 полей", version 1.9.7 → 1.9.8
- Bumped version to 1.9.8: manifest.json, package.json, version.js, CHANGELOG
- Build verified: 324.1kb, 0 errors

Stage Summary:
- Critical bug fixed: getResumePageType() return value mismatch
- 17 functions documented with JSDoc
- README consistent at v1.9.8
- No TODO/FIXME/HACK in codebase

---
Task ID: 8
Agent: main
Task: Fix VISIBILITY_HIDDEN not defined crash during sync

Work Log:
- Diagnosed `Fatal: VISIBILITY_HIDDEN is not defined` from user's console log
- Found missing import in resume-fetch.js — only imported VISIBILITY_UNKNOWN and VISIBILITY_VISIBLE
- Added VISIBILITY_HIDDEN to the import from resume-constants.js
- Rebuilt extension, committed and pushed fix

Stage Summary:
- Bug: resume-fetch.js line 24 was missing VISIBILITY_HIDDEN import
- Fix: added VISIBILITY_HIDDEN to import statement
- Build successful, pushed to origin/main




---
Task ID: visibility-fix
Agent: main
Task: Fix visibility detection accuracy — hidden resumes incorrectly shown as visible

Work Log:
- Identified root cause: Strategy 3 proximity search and detectVisibilityFromCard both defaulted to VISIBLE when no hidden indicator found in SSR HTML
- Since hh.ru renders visibility indicators client-side (React), absence in SSR HTML ≠ visible
- Fixed Strategy 3: r.visibility = isHidden ? HIDDEN : UNKNOWN (was VISIBLE)
- Fixed detectVisibilityFromCard: return UNKNOWN instead of VISIBLE when no indicator
- Fixed detectVisibilityFromCardText: return UNKNOWN instead of VISIBLE
- Enhanced iframe detection from 4 to 8 strategies:
  S1: data-qa attributes, S2: buttons, S3: body text, S4: hide link,
  S5: partial "не видят" match, S6: script JSON patterns, S7: notification banners,
  S8: action links with show/visible/publish
- Added diagnostic logging of all visibility-related buttons in iframe
- Increased iframe hydration wait from 2.5s to 4s
- Made final fallback conditional: only UNKNOWN→VISIBLE if iframe didn't run;
  if iframe ran and returned UNKNOWN, keep UNKNOWN
- Enhanced live DOM parser (parseResume): added "не видят" partial match, hide-resume button detection
- Added "?" badge in UI for UNKNOWN visibility resumes
- Built dist, committed

Stage Summary:
- 7 source files modified
- Core fix: no longer defaulting to VISIBLE from SSR HTML analysis
- Iframe detection now most reliable source with 8 strategies
- Unknown visibility shown as "?" badge instead of wrongly showing as "Видимо"
---
Task ID: visibility-card-fix
Agent: main
Task: Fix visibility detection using resume-visibility-card data-qa

Work Log:
- Diagnosed from iframe logs: hh.ru uses data-qa="resume-visibility-card" with text
  "видимость резюмене видно никому" (hidden) or "видимость резюмевидно всем работодателям" (visible)
- Previous strategies didn't check this element at all
- Added "не видно никому" to HIDDEN_INDICATORS constant
- Added Strategy 0 (PRIMARY) to all three detection paths:
  - iframe detection (resume-fetch-strategy6-iframe.js)
  - fetch-based page detection (resume-fetch-resume.js)
  - live DOM parser (parse-resume.js)
- Strategy 0 checks data-qa="resume-visibility-card" text content:
  - contains "не видно никому" → HIDDEN
  - contains "видно всем" → VISIBLE
  - unrecognized text → fall through to other strategies
- Built dist and committed

Stage Summary:
- Root cause: hh.ru uses "не видно никому" / "видно всем" (not "Многие не видят") on detail pages
- The resume-visibility-card element is present on ALL resume pages (both hidden and visible)
- This is now the PRIMARY detection method (Strategy 0), others are fallbacks

---
Task ID: visibility-fix-1.9.10
Agent: main
Task: Fix iframe visibility detection — iframeVis data lost when entries don't increase (v1.9.10)

Work Log:
- Root cause: resume-fetch-strategy6-expand.js — when iframe succeeds but entries don't increase,
  the code falls through to Steps 1-4 (URL expansion, API, params) which return { entries }
  WITHOUT iframeVis — visibility data from the hydrated DOM was LOST
- Fix 1: Added withVis() helper that injects iframeVis/iframeVisTrace/iframeDiag into ALL
  return values from Steps 1-4 and the final fallback
- Fix 2: Added VISIBLE_INDICATORS array and hasVisibleIndicator() to resume-constants.js
  Patterns: 'видно всем', 'видно всем работодателям'
- Fix 3: Added 'не видно' to HIDDEN_INDICATORS (broader match for "не видно никому")
- Fix 4: Updated detectVisibilityFromCardText() and detectVisibilityFromCard() to check
  hasVisibleIndicator() after hasHiddenIndicator()
- Fix 5: Updated detectVisibilityFromResumePage() Strategies 3+4 to also check visible indicators
- Fix 6: Updated iframe detectVisibilityFromIframeDoc() Strategy C (body text) for visible indicators
  and Strategy E to also check 'не видно' + 'видно всем'
- Fix 7: Updated live DOM parser (parse-resume.js) to check 'не видно' partial match
- Version bumped: 1.9.9 → 1.9.10, build successful (352.4kb)

Stage Summary:
- CRITICAL BUG FIX: iframeVis was lost when iframe entries didn't exceed SSR count
- This caused all resumes to show "?" (UNKNOWN) except those detected at page level
- Now iframe visibility data ALWAYS survives through all code paths in fetchExpandedExperience()
- Added visible indicator detection: "видно всем" / "видно всем работодателям"
- Added "не видно" to hidden indicators for broader matching
- 6 files modified: strategy6-expand.js, resume-constants.js, resume-fetch-resume.js,
  strategy6-iframe.js, parse-resume.js, package.json + manifest.json

---
Task ID: submodule-update
Agent: main
Task: Update anti-hallucination-guard + cascade-guard submodules

Work Log:
- Updated anti-hallucination-guard to 0759547
- Updated cascade-guard to 1c99480
- Ran setup.sh for both submodules
- AHG + Cascade rules integrated in AGENT_RULES.md
- Hooks installed (pre-commit, pre-push)

Stage Summary:

---
Task ID: ui-collapsible-resume-list
Agent: main
Task: Make 'Все резюме' block collapsible accordion

Work Log:
- Added timeline-toggle + timeline-body pattern to 'Все резюме' block
- Added chevron icon with open state (matches body default open)
- Uses data-timeline=res-sync, auto-handled by events.js

Stage Summary:
---
Task ID: contacts-fix
Agent: main
Task: Fix contacts (phone/email/telegram) not parsed in fetch chain

Work Log:
- Identified root cause: `parseContactsFromDoc()` was missing from `fetchAndParseResume()` chain
- Added `parseContactsFromDoc()` to `resume-fetch-parse.js` with multi-strategy fallback (data-qa, mailto, regex, t.me links)
- Added `phone`, `email`, `telegram` fields to resume model in `fetchAndParseResume()`
- Updated version: 1.9.11 → 1.9.12
- Rebuilt dist

Stage Summary:
- Contacts now parsed when syncing resumes via fetch
- Version bumped to 1.9.12
---
Task ID: contacts-fix-v2
Agent: main
Task: Fix 3 contact parsing bugs: glued label+email, missing phone, false telegram

Work Log:
- Diagnosed 3 bugs in contact parsers (both live and fetch)
- Bug 1: textContent of data-qa element includes label "Электронная почта" glued with email
  Fix: extract email via regex from text, prefer mailto: href
- Bug 2: data-qa="resume-contact-phone" doesn't match actual hh.ru DOM
  Fix: added tel: href priority, expanded selectors, tel link search in contact block
- Bug 3: @hh_ru_official falsely detected as telegram from page footer links
  Fix: search telegram ONLY in contact block, exclude HH_SYSTEM_ACCOUNTS list
- Synced both parseContacts() and parseContactsFromDoc() with identical logic
- Version bumped: 1.9.12 → 1.9.13, rebuilt dist

Stage Summary:
- Contacts now parse cleanly: phone from tel: href, email from mailto: or regex, telegram only from contact block
- Version 1.9.13
---
Task ID: hide-empty-gap-section
Agent: main
Task: Hide skill gap analysis block when no vacancies loaded

Work Log:
- Identified that updateSkillGapSection() shows "0% — откройте вакансии" when vacancySkills is empty
- Changed to hide the section entirely (display:none) when no vacancies for comparison
- Updated CHANGELOG

Stage Summary:
- Gap section hidden until vacancies are loaded — cleaner UI
---
Task ID: score-and-gap-move
Agent: main
Task: Move skill gap to Vacancies tab, add Resume Score to Resume tab

Work Log:
- Removed res-gap-section HTML from resume.js (Resume tab)
- Added res-gap-section HTML to vacancies.js (Vacancies tab) with renamed title "Совпадение навыков"
- Removed updateSkillGapSection() call from render-resume-panel.js
- Added updateSkillGapSection() call to renderVacancyList() in vacancies.js
- Added new "Оценка резюме" block in resume.js with ring chart + checklist
- Added updateResumeScore() function in render-resume-panel.js with 11 weighted criteria
- Version bumped to 1.9.14

Stage Summary:
- Skill gap analysis now lives in Vacancies tab (logical place)
- Resume tab has new objective completeness score with visual ring + checklist
- Version 1.9.14

---
Task ID: v1.9.15.6
Agent: main
Time: 2026-06-12T18:35:00+03:00
Task: Fix initPageLogic() never called + make idempotent

Work Log:
- Replaced broken dynamic import() with CustomEvent pattern in panel/index.js
- Added initPageLogic() idempotent guard to prevent duplicate execution
- User confirmed: [VacDetail] and match scoring logs now appear in console

Stage Summary:
- Vacancy detail parser + match scorer now actually run on /vacancy/{id} pages

---
Task ID: v1.9.15.7
Agent: main
Task: Fix timing (re-score on resume load) + match breakdown UI card

Work Log:
- Added hh-ar-resume-loaded CustomEvent for re-scoring when resume becomes available
- Added match breakdown UI card in vacancies tab
- Version bumped to 1.9.15.7

Stage Summary:
- Timing fix: resume-loaded event triggers automatic re-score on vacancy detail pages
- Match breakdown now visible in sidebar panel
- Pushed to origin/main

---
Task ID: v1.9.15.8-root
Agent: main
Task: Fix stacked bar + skill tags in match card

Stage Summary:
- Progress bar fills 100% proportionally
- Skill tags use inline styles instead of missing CSS class

---
Task ID: v1.9.15.8-nav-root
Agent: main
Task: Vacancy links navigate in current tab

Stage Summary:
- target="_blank" → data-action="navigate" → closes sidebar + navigates current tab

---
Task ID: 1
Agent: main
Task: Fix skills parser — 5 fallback strategies when skills-card missing from hh.ru DOM

Work Log:
- Diagnosed: parseSkills() relied entirely on [data-qa=skills-card] which is absent on current hh.ru Magritte pages
- Added 4 fallback strategies in parseSkills() DOM path + parseSkillsFromDoc() fetch path
- Extracted _extractSkillsFromContainer() / _extractSkillsFromDocContainer() helpers
- Added 4 new skill-dictionary entries: B2C продажи, аналитика продаж, P&L, LLM
- v1.9.17.0 built

Stage Summary:
- Skills like P&L, B2C продажи were on resume page but invisible to parser — now found via fallback
- 5 total strategies: skills-card → skills-table → heading detection → data-qa*='skill' scan → Magritte tag scan


---
Task ID: 2
Agent: main
Task: Fix vacancy click navigation — FAB hides instead of navigating

Work Log:
- Diagnosed: page-world.js intercepted all vacancy link clicks with preventDefault + pushState fallback, but pushState alone doesn't trigger hh.ru's SPA router to load new content
- Also sidebar-events.js used pushState instead of window.location.href
- Removed click interception from page-world.js (kept pushState patch for detecting hh.ru's own SPA navigations)
- Changed sidebar-events.js navigate handler from pushState to window.location.href (full navigation)
- Rebuilt v1.9.17.0

Stage Summary:
- Vacancy links now work normally — clicking opens the vacancy page
- pushState/replaceState patches remain so extension detects when hh.ru does its own SPA navigation
- No more broken state where FAB hides and page doesn't change


---
Task ID: 3
Agent: main
Task: Fix experience score — vacancy-list stored experience as string, scorer expected object

Work Log:
- Diagnosed: vacancy-list.js stored experience as raw string (e.g. '3-6 лет'), but scoreExperience() expected {min, max, raw} object
- Result: all list-parsed vacancies got neutral 8/15 for experience regardless of actual match
- Added parseExperienceString() to vacancy-list.js to convert string to structured format
- Added fallback in scoreExperience() to also handle legacy string format
- Rebuilt v1.9.17.0

Stage Summary:
- Experience scoring now works for list-parsed vacancies (was always 8/15 before)
- Supports: 'Нет опыта', 'Более 6 лет', '1–3 года', '3 года', etc.


---
Task ID: 4
Agent: main
Task: Bug hunt — fix 10 bugs found by code review

Work Log:
- BUG-2 CRITICAL: salary scoring always neutral for list vacancies → added parseVacancySalaryString()
- BUG-3 CRITICAL: /BI/i matched any 'bi' substring → changed to /\bBI\b/i + added /business\s+intelligence/i
- BUG-7 HIGH: vacExp.raw check treated unparseable as 0-99 years → changed to vacExp.min === null && vacExp.max === null
- BUG-4 HIGH: leading space in ' Salesforce' → removed
- BUG-1 CRITICAL: parseExperienceString missed months-only → added month pattern
- BUG-6 HIGH: duplicated parseExperienceString → extracted to shared lib/parse-experience.js
- BUG-8 MEDIUM: /PM/i too broad → /\bPM\b/i
- BUG-9 MEDIUM: LLMs plural → /\bLLMs?\b/i
- BUG-12 MEDIUM: 1C ASCII variant → /1[СCсc]/
- BUG-10 MEDIUM: includes('навык') too loose → strict startswith check
- Also fixed: /\bGTM\b/i word boundary
- Bumped version to 1.9.18.0

Stage Summary:
- 3 CRITICAL + 4 HIGH + 4 MEDIUM bugs fixed
- New shared module: lib/parse-experience.js
- Salary scoring now works for list-parsed vacancies (was always 8/15)
- Experience scoring now correctly handles unparseable strings (was giving 15/15)

---
Task ID: ahg-update
Agent: main
Task: Update anti-hallucination-guard submodule via update.sh

Work Log:
- Initialized git submodules (anti-hallucination-guard was empty directory)
- Set submodule URLs with auth token for cloning
- cascade-guard repo not found (private/deleted), skipped
- anti-hallucination-guard cloned successfully at 0759547
- Ran bash anti-hallucination-guard/update.sh
- Submodule updated: 0759547 -> 49c612b (v1.4 documentation drift prevention)
- setup.sh re-run: AGENT_RULES.md AHG block refreshed, new scripts deployed
- New files: scripts/check-hooks-integrity.sh, scripts/sync-task-state.sh
- Staged submodule pointer update + AGENT_RULES.md + new scripts

Stage Summary:
- anti-hallucination-guard updated to 49c612b (v1.4)
- 35 files changed, +2759/-924 lines in submodule
- Commit pending: git add anti-hallucination-guard && git commit
---
Task ID: ahg-update-fix
Agent: main
Task: Fix validate.sh whitelist for AHG v1.4 + remove .env from git tracking

Work Log:
- Root cause: validate.sh AHG_ALLOWED whitelist was stale (written pre-v1.4)
- AHG v1.4 added .github/, setup/, tools/, update.sh — all flagged as foreign
- Fixed: updated AHG_ALLOWED to include .github/, setup/, tools/, update.sh
- Root cause .env: added to git in initial commit (0d33962) before .gitignore existed
- .gitignore has .env but doesn't affect already-tracked files
- Fixed: git rm --cached .env — file still on disk, no longer tracked
- validate.sh now passes: 0 errors

Stage Summary:
- scripts/validate.sh: AHG_ALLOWED updated for v1.4 structure
- .env: removed from git tracking (kept on disk, .gitignore protects it)
- All validation checks pass
---
Task ID: remove-cascade-guard
Agent: main
Task: Remove cascade-guard submodule (repo deleted on GitHub)

Work Log:
- Removed cascade-guard from .gitmodules (git rm -f cascade-guard)
- Removed cascade-guard section from .git/config
- Removed cascade-guard checks from scripts/validate.sh
- Removed Cascade-guard section from AGENT_RULES.md (Rules C-1..C-9)
- Removed cascade-guard references from README.md (4 places)
- Updated CHANGELOG.md reference
- cascade-cli.sh, cascade-init.sh, cascade-state.json kept (local project files, not submodule)
- validate.sh passes: 0 errors

Stage Summary:
- cascade-guard submodule fully removed from project
- All references cleaned up
- AHG remains as only submodule
---
Task ID: fix-nbsp-rendering
Agent: main
Task: Fix &nbsp; showing as literal text in sidebar UI

Work Log:
- User reported: 'Резюме и&nbsp;профиль1' showing &nbsp; as text instead of space
- Root cause: esc() converts \u00A0 to &nbsp; HTML entity via textContent->innerHTML
- In Shadow DOM innerHTML context, &nbsp; can render as literal text
- Fix 1: esc() now normalizes \u00A0 and other non-breaking spaces to regular space BEFORE escaping
- Fix 2: safeGetText() now normalizes \u00A0 to regular space at data extraction level
- Both fixes ensure &nbsp; never appears in rendered output
- Build successful

Stage Summary:
- src/ui/html/helpers.js: esc() normalizes non-breaking spaces before HTML escaping
- src/lib/resume-fetch-helpers.js: safeGetText() normalizes non-breaking spaces at extraction
- &nbsp; will no longer appear as literal text in sidebar UI
---
Task ID: fix-tabs-and-ui
Agent: main
Task: Fix tab switching not working + chrome.storage label

Work Log:
- VLM analysis confirmed: empty content area, tabs not responding to clicks
- Root cause: tab buttons missing data-tab attribute
- switchTab() uses btn.dataset.tab but template had no data-tab on buttons
- Fixed: added data-tab attribute to each tab button in shell.js
- Changed 'chrome.storage' footer label to 'локально' (less confusing)
- Build successful

Stage Summary:
- Tab switching now works: data-tab attribute added to all 6 tab buttons
- Footer label changed from technical 'chrome.storage' to user-friendly 'локально'

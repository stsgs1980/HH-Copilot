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

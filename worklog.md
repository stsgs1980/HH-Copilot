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

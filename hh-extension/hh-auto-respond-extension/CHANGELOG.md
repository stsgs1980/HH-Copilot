# HH Copilot — Changelog

Все значимые изменения в расширении фиксируются в этом файле.
Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).

---

## [1.9.0] — 2026-06-11

### Добавлено
- **Strategy 4: текстовый парсинг опыта из HTML** — если data-qa парсинг нашёл мало записей,
  ищем ВСЕ диапазоны дат (типа «январь 2020 — настоящее время») в секции опыта и
  извлекаем окружающий текст (должность, компания, описание)
- **Strategy 5: парсинг опыта из Magritte JSON** — поиск данных опыта в `<script>` тегах
  (hydration state, `window.__INITIAL_STATE__`, `resumeStore`)
- **Диагностический дамп HTML** — первые 2000 символов секции опыта выводятся в консоль
  для анализа структуры при отладке

### Исправлено
- Опыт работы: 5 стратегий парсинга вместо 3 (company-cards → stepper supplement →
  stepper fallback → text patterns → script JSON)

### Изменено
- Версия: 1.8.9 → 1.9.0

---

## [1.8.9] — 2026-06-11

### Исправлено
- **Опыт работы: 3 → 6 записей** — два корневых бага:
  - Race condition в `initPageLogic()`: `expandHiddenSections()` вызывалась без `await`, поэтому `parseResume()` запускался до раскрытия скрытых секций (3 видимых карточки вместо 6)
  - Stepper fallback в `parseExperienceFromDoc()` срабатывал только при `uniqueCards.length === 0` — если 3 company-card уже найдены, оставшиеся stepper-items игнорировались
- **Stepper supplement в live DOM парсере** — `parseExperience()` теперь тоже дополняет записи из stepper-items, не покрытых company-card обёртками
- **Шумные логи `checkAuth`** — убраны 3 `console.log()` из `checkAuth()`, спамившие каждые 5 секунд

### Изменено
- `parseExperienceFromDoc()` — 3 стратегии: company-cards → stepper supplement → full stepper fallback
- `parseExperience()` (live DOM) — аналогичные 3 стратегии + поиск company info из родительских элементов
- Версия: 1.8.8 → 1.8.9

---

## [1.8.8] — 2026-06-11

### Исправлено
- **«Загрузить с текущей страницы» на не-резюме страницах** — на главной (`/`) и `/applicant/resumes` кнопка теперь загружает первое резюме из `myResumes[]` или предлагает синхронизацию
- **Stepper fallback** — добавлен в `parseExperienceFromDoc()` при нулевом количестве company-card
- **Debug логирование** — предварительный подсчёт company-cards, stepper-items и «Показать все» кнопок в fetched HTML

---

## [1.8.7] — 2026-06-11

### Исправлено
- **Парсинг на странице редактирования** — `/resume/edit/{id}/about` не содержит `data-qa` атрибутов, теперь используется `fetchAndParseResume()` для загрузки view-страницы
- **Кнопка «Очистить резюме»** — добавлен флаг `_resumeCleared` для предотвращения авто-восстановления из `myResumes[0]`
- **Валидация парсинга** — пустой результат (нет title, skills, experience) не перезаписывает хорошие данные
- **`initPageLogic()` стала async** — для поддержки `await fetchAndParseResume()`

---

## [1.8.5] — 2026-06-10

### Исправлено
- **`parseSalaryConditions` ReferenceError** — функция не была импортирована в `parse-resume.js`, вызов падал с ReferenceError
- Добавлен импорт `parseSalaryConditions` из `parse-resume-sections.js`

---

## [1.8.4] — 2026-06-10

### Исправлено
- **Skill Gap UI wireframe compliance** — приведение в соответствие с дизайн-макетом

---

## [1.7.3] — 2026-06-10

### Исправлено
- **Pre-push hook**: исправлен баг разрешения пути (`.git/hooks/..` вместо `.git/hooks/../..` — guard был молча отключён)
- **validate.sh whitelist**: добавлены `check-agent.sh` и `audit.sh` в разрешённый список
- **cascade-guard/setup.sh**: добавлены права на исполнение (`chmod +x`)
- **Git tracking**: удалены 1052 файла skills/ (системные, не часть проекта) из git индекса
- **Git tracking**: удалены content.js.bak и content.js.map (build-артефакты) из git индекса
- **.gitignore**: добавлены глобальные правила `*.bak`, `*.map`, `upload/`

### Добавлено
- **cascade-guard submodule** — git submodule (https://github.com/stsgs1980/Cascade-guard.git)
  - cascade-cli.sh — CLI навигации по задачам (next-task, start-task, complete-task, status, validate)
  - cascade-init.sh — интерактивный генератор cascade-state.json
  - cascade-state.json — 35 задач, 7 фаз (P0-P6), единый источник истины статусов
  - AGENT_RULES.md — правила C-1..C-9 (зависимости, приоритеты, верификация)
- **Git hooks**: pre-commit (блокирует без свежего worklog) + pre-push (запускает validate.sh)
- **worklog.md**: полный журнал работы с Task ID 1-22

### Изменено
- **.gitmodules**: добавлен cascade-guard submodule
- **AGENT_RULES.md**: объединены AHG правила (1-6) + Cascade правила (C-1..C-9)
- Репозиторий синхронизирован с origin/main (GitHub)

---

## [1.7.2] — 2026-06-10

### Добавлено
- **6-tab UI wireframe** — полная переработка панели под wireframe
  - Обзор, Резюме, Вакансии, Переговоры, Настройки, Статистика
  - Green accent theme (#059669/#10B981), glass-morphism, CSS animations
  - KPI ring, score ring, toggle switch, progress bar

### Исправлено
- **FAB CSS isolation** — все стили через `style.setProperty(prop, value, 'important')`
  - hh.ru CSS больше не переопределяет цвет FAB

---

## [1.7.1] — 2026-06-10

### Добавлено
- **Username display** — в header и auth badge при авторизации
- **FAB tooltip** — для каждого состояния авторизации

### Исправлено
- **authIndicator badge** — click handler был мёртв, теперь работает
- **renderSidebarContent null state** — исправлен regex для spinner HTML

---

## [1.7.0] — 2026-06-10

### Добавлено
- **Anti-monolith split** — все JS файлы разбиты до <250 строк
  - parse.js (408) → 4 файла
  - panel/index.js (277) → panel/ + events.js
  - Итого 42 JS файла, все <250 строк
- **TASK-CASCADE.md v4.0.0** — Phase 0 отмечена completed, добавлена Phase 0.5
- **Popup redirect** — minimal HTML redirect на FAB при клике на иконку

### Изменено
- Проект переименован: HH-Auto-Respond → HH-Copilot

---

## [1.6.0] — 2026-06-10  (Phase 0 complete)

### Переписано
- **Phase 0: esbuild modular refactoring (F0.1-F0.9)** -- монолитный content.js (1637 строк)
  декомпозирован в 16 ES модулей с единым сборочным шагом
  - `src/lib/selectors.js` -- HH_SELECTORS (47+ групп), findElement, findAllElements
  - `src/lib/anti-hallucination.js` -- safeGetText, safeGetAttr, safeClick, safeInput,
    waitForElement, validateVacancyData, extractVacancyId, createLogger
  - `src/lib/storage.js` -- DEFAULT_SETTINGS, DEFAULT_STATS, chrome.storage.local CRUD
  - `src/lib/timing.js` -- gaussianRandom, randomDelay, simulateReading, simulateTyping
  - `src/lib/rate-limiter.js` -- rateLimiter (check, recordAction, adaptiveSlowdown, resetBurst)
  - `src/parsers/vacancy-list.js` -- parseVacanciesFromPage
  - `src/parsers/resume-detail.js` -- parseResume (12 полей), diagnoseResumeDOM
  - `src/parsers/vacancy-detail.js` -- заглушка parseVacancyDetail (Phase 1)
  - `src/parsers/negotiations.js` -- заглушка parseNegotiations (Phase 1)
  - `src/ui/fab.js`, `src/ui/panel.js` -- FAB + Shadow DOM sidebar
  - `src/ui/tabs/vacancies.js`, `src/ui/tabs/resumes.js` -- рабочие вкладки
  - `src/ui/styles.js`, `src/ui/html.js`, `src/ui/state.js`, `src/ui/auth.js` -- UI инфраструктура
  - `src/content/main.js` -- boot sequence (auth gate, detectPageType, SPA observer)
  - `src/engine/auto-respond.js` -- заглушки applyToVacancy/continueApply/applyToAll
  - `src/services/index.js` -- сервисный барьерный файл

### Добавлено
- **esbuild** как сборочный инструмент (IIFE bundle, sourcemaps)
  - `esbuild.config.mjs` -- конфигурация сборки
  - `package.json` -- скрипты build/watch
- **content.js.bak** -- резервная копия оригинального монолита

### Изменено
- content.js теперь собирается из src/ модулей через `npm run build`
- manifest.json: `type: "module"` для service worker

---

## [1.5.4] -- 2026-06-10

### Добавлено
- Anti-hallucination-guard submodule + pre-commit/pre-push hooks
- consumer-project detection в pre-push (skip module validation)

---

## [1.5.3] -- 2026-06-10

### Переписано
- Полная переработка документации с кросс-проверкой кода:
  ARCHITECTURE.md, README.md, UNICODE_POLICY.md, TASK-CASCADE.md v3.0

### Исправлено
- Sidebar ширина 750px -> 720px
- Storage key resume -> myResume
- Clone URL исправлен

---

## [1.5.0] -- 2026-06-10

### Удалено
- Массовая чистка мёртвого кода: 311 файлов, -41361 строк
  - hh-bot/, Next.js app/, mini-services/, skills/, download/, upload/
  - Оставлено только расширение в hh-extension/hh-auto-respond-extension/

---

## [1.4.0] -- 2026-06-10

### Добавлено
- Auto-expand скрытых секций резюме перед парсингом
- Sidebar ширина 360px -> 720px

### Исправлено
- Дублирование duration в периоде опыта
- Удалена текстовая trunkation
- Мёртвый код (content/, lib/ -- never imported)

---

## [1.3.0] -- 2026-06-09

### Исправлено
- **Критический баг: 8 из 11 полей резюме не парсились** на Magritte-страницах
  - Причина: селекторы использовали CSS-классы, хэшируемые Magritte при каждом деплое
  - Результат: gender, age, address, specialization, skills, experience, education, languages — все ✗
  - Только title, salary и skill-level-3 находились

### Переписано
- **`parseResume()` — полностью новая стратегия парсинга (Magritte-safe)**:
  - **Автообнаружение секций** по тексту h2/h3 заголовков ("Опыт работы", "Образование" и т.д.)
  - Не зависит от конкретных `data-qa` или CSS-классов — работает при любой версии Magritte
  - Gender/age/address — парсинг из текстового содержимого рядом с h1
  - Experience — поиск по ссылкам `/employer/`, тегам b/strong, паттернам дат
  - Education — поиск по ссылкам и тегам b/strong внутри секции
  - Skills — комбинированный поиск: `data-qa="skills-table"` + заголовок "Навыки"
  - Languages — bloko-tag внутри секции с заголовком "Языки"
- **`HH_SELECTORS`** — полная чистка от Magritte-хэшированных CSS-классов:
  - Убраны: `.resume-block__title-text`, `.resume-block__salary`, `h1.bloko-header-section-1`,
    `h2.bloko-header-1`, `.applicant-resumes__resume`, `.resume-block-item`,
    `.vacancy-serp-item__compensation`, `.vacancy-description`, `.vacancy-response-popup`,
    `textarea.bloko-textarea`, `button.bloko-button_primary`, `.bloko-tag__section`
  - Убраны из `parseResume()`: `.bloko-text_strong`, `.bloko-text`, `[class*="strong"]`,
    `[class*="description"]`, `[class*="experience"]` — все Magritte-хэшированные
  - Заменены на: `b, strong, p` + `data-qa` атрибуты (стабильные)
  - Внутренние селекторы опыта/образования: `b/strong` вместо `.bloko-text_strong`

---

## [1.2.0] — 2026-06-09

### Исправлено
- **Критический баг**: кнопка "Загрузить с текущей страницы" вызывала `parseResume()`
  на странице `/applicant/resumes` (список резюме), что всегда давало ошибку
  "Could not parse resume from current page", т.к. `parseResume()` ожидает URL `/resume/{hash}`
- **Причина**: обработчик `hh-ar-load-resume` не проверял тип текущей страницы

### Добавлено
- **Контекстно-зависимая логика кнопки "Загрузить"**:
  - На `/resume/{hash}` — парсит конкретное резюме (как раньше)
  - На `/applicant/resumes` — парсит и показывает список резюме
  - На других страницах — предупреждает что нужно перейти на правильную страницу
- **`getResumePageType()`** — определяет тип страницы по URL
- **`renderResumeListPanel()`** — рендерит список резюме в sidebar
  - Кликабельные ссылки на каждое резюме (открывает в новой вкладке)
  - Бейдж "loaded" для уже загруженного резюме
  - Подсказка для пользователя
- **Авто-сохранение списка резюме** в `panelState.resumeList` при заходе на `/applicant/resumes`
- **CSS для списка резюме**: `.har-resume-list-*` стили
- **Кнопка "Open on hh.ru"** в карточке загруженного резюме

### Изменено
- `panelState` расширен: добавлены `resume`, `resumeList`, `activeTab`
- `renderResumePanel()` теперь проверяет наличие списка и тип страницы
  перед показом заглушки

---

## [1.1.0] — 2026-06-09

### Добавлено
- **Парсер резюме** — полная поддержка Magritte/Bloko DOM структуры
  - 30+ CSS селекторов на основе `data-qa` (стабильные, не зависят от деплоя)
  - Парсинг: позиция, зарплата, город, пол, возраст, специализации
  - Навыки с определением уровней (Продвинутый / Средний / Начальный)
  - Опыт работы: компания, должность, период, описание
  - Образование: название, год окончания
  - Языки: название и уровень владения
  - Дополнительная информация (гражданство, готовность к переезду и т.д.)
- **Вкладка "Моё резюме"** в sidebar
  - Отображение всех распарсенных данных
  - Теги навыков с цветовым оформлением
  - Список опыта работы с должностями и периодами
  - Кнопка "Загрузить с текущей страницы"
  - Кнопка "Перейти к списку резюме" (открывает /applicant/resumes)
- **Авто-парсинг** при открытии страницы резюме (`/resume/{hash}`)
- **Сохранение резюме** в `chrome.storage.local` между сессиями
- **Debug-панель** — раскрывающийся блок с результатами по каждому селектору
  - ✓ найденные поля (зелёные)
  - ✗ отсутствующие поля (красные)
- **Табовая система** в sidebar (Вакансии / Моё резюме)

### Изменено
- `initPageLogic()` расширен: обработка `/resume/{hash}` и `/applicant/resumes`

### Технические детали
- Магриттовские CSS-классы с хешами (напр. `magritte-card___bhGKz_8-5-13`) НЕ используются
  из-за нестабильности. Только `data-qa` атрибуты и Bloko BEM классы.
- Навыки извлекаются только из блока `[data-qa="skills-table"]`,
  чтобы не захватить языки и теги из других секций.

---

## [1.0.0] — 2026-06-09

### Добавлено
- **Chrome Extension (Manifest V3)** — базовая архитектура
  - `manifest.json` — MV3 конфигурация
  - `content.js` — единый бандл (MV3 не поддерживает ES modules в content scripts)
  - `background/index.js` — Service Worker
  - `popup/` — 4-табовый popup (Stats, Settings, Templates, Logs)
  - `icons/` — PNG иконки 16/48/128px
- **FAB (Floating Action Button)** — 56px, bottom-right
  - 3 состояния: серый (проверка) → красный (не авторизован) → синий (авторизован)
  - Анимация при наведении (scale 1.08)
- **Sidebar** — 360px, right-side, Shadow DOM изоляция
  - Шапка с названием и версией
  - Блок авторизации с кнопкой входа
  - Статистика: отклики / осталось / ошибки
  - Прогресс-бар дневного лимита
  - Кнопки: "Откликнуться на все", "Пауза", "Обновить"
  - Список вакансий с кнопками отклика
- **Определение авторизации** — `checkAuth()`
  - 13 CSS селекторов (data-qa + class-based)
  - Fallback по cookies (hhruuid, _HH-RU, hhtoken)
  - Поллинг каждые 2 секунды
- **Парсер вакансий** — `parseVacanciesFromPage()`
  - Селекторы для карточек: title, company, salary, location, experience, tags
  - Фильтрация: уже откликнутые, чёрный список компаний
  - Валидация данных (title, company, url, id)
- **Anti-Hallucination** — безопасные DOM операции
  - `safeGetText()` — проверка видимости перед извлечением текста
  - `safeClick()` — проверка disabled, visibility
  - `safeInput()` — корректная установка значения через property setter
  - `validateVacancyData()` — 4-уровневая проверка
  - `waitForElement()` — MutationObserver с таймаутом
- **Rate Limiter** — token bucket + adaptive slowdown
  - 200/день, 30/час, 30с интервал, burst max 5
  - Адаптивный фактор при 429/slow/captcha
- **Storage** — `chrome.storage.local` wrapper
  - Настройки по умолчанию
  - Статистика с ежедневным сбросом
  - Список откликнутых вакансий
  - Чёрный список компаний
- **SPA Observer** — MutationObserver для страницы поиска
  - Авто-обновление списка вакансий при навигации без перезагрузки

### Известные проблемы
- `offsetParent !== null` проверка в v1.0.0 ломала авторизацию
  (исправлено в hotfix, включённом в 1.1.0)

---

## [1.0.0-hotfix] — 2026-06-09 (не релизная)

### Исправлено
- **Критический баг**: `offsetParent === null` для `position:fixed` элементов
  - hh.ru header — фиксированный, поэтому `offsetParent` всегда `null`
  - Результат: авторизация НИКОГДА не определялась (FAB всегда красная)
  - Решение: заменено на `getComputedStyle().display/visibility` проверку
  - Затронуты: `checkAuth()`, `findElement()`, `waitForElement()`, `safeClick()`
- **Расширен набор селекторов авторизации**: 3 → 13 + cookie fallback

---

[1.1.0]: https://github.com/stsgs1980/HH-Copilot/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/stsgs1980/HH-Copilot/releases/tag/v1.0.0

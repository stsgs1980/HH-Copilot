# HH Copilot -- Chrome Extension

**Версия:** 1.9.28.0
**Тип:** Расширение для Chrome (Manifest V3)
**Целевая платформа:** hh.ru (Magritte дизайн-система)
**Лицензия:** Приватный проект. Все права защищены.


## 1. HH Copilot -- краткое описание

HH Copilot -- это браузерное расширение для автоматизации поиска работы на портале hh.ru. Проект решает задачу рутинного отклика на вакансии: парсит карточки вакансий со страницы поиска, извлекает данные резюме пользователя, показывает результаты во встроенной боковой панели и позволяет откликаться на подходящие позиции в один клик или в полностью автоматическом режиме.

Расширение работает исключительно в браузере пользователя. Не требуется серверная инфраструктура, база данных, Telegram-бот или какие-либо внешние API. Все данные хранятся локально в chrome.storage.local. Пользователь использует свою текущую сессию hh.ru, поэтому не нужна дополнительная авторизация через OAuth, OTP или 2FA. Расширение читает DOM-дерево страницы и взаимодействует с элементами так же, как это делал бы живой пользователь, что делает его неотличимым от ручных действий.

Проект изначально разрабатывался как часть большой системы автоматизации (Next.js + FastAPI + Playwright + Celery + Telegram), однако закрытие Applicant API hh.ru в декабре 2025 года сделало серверный подход неработоспособным. Playwright детектировался anti-bot системой по TLS-отпечатку, navigator.webdriver и поведенческой биометрии. Расширение решает все эти проблемы: оно работает в настоящем браузере, использует настоящие cookies, настоящие клики и настоящую навигацию. Никаких скрытых маркеров, никаких headless-сессий, никаких подмен user-agent.

Целевая аудитория -- соискатели, которые рассылают десятки откликов в день и хотят ускорить этот процесс без потери качества. Расширение не заменяет человека полностью, а автоматизирует механическую часть: поиск, фильтрацию, заполнение полей, отправку отклика. Решение о том, на какие вакансии откликаться, принимает пользователь (ручной режим) или алгоритм скоринга (полуавтоматический и автоматический режимы).

Текущая версия (1.9.28.0) -- модульная архитектура на базе esbuild. Content script собран из 134 JS-модулей в каталоге src/. Парсинг резюме (13+ полей: имя, должность, зарплата, пол, возраст, город, навыки с уровнями, опыт, образование, языки, контакты, условия занятости, доп. информация), парсинг вакансий со страницы поиска + главной страницы hh.ru (рекомендованные + «Вакансия дня») + детальный парсер вакансий, FAB-кнопка с зелёной пульсацией, Shadow DOM sidebar (720px, 6 вкладок), авторизация, SPA-навигация с pushState патчем, двухуровневое определение видимости резюме (список + детальная страница, 6 стратегий), радио-кнопки для выбора действующего резюме, консолидированный UI (↻ для перепарсинга, контекстная CTA «Взять со страницы»), многостратегийный парсинг опыта (6 стратегий), пятикомпонентный движок скоринга (навыки 40%, зарплата 15%, опыт 15%, должность 15%, локация 15%) с производными навыками из опыта работы, синонимами навыков и синонимами должностей, анализ качества резюме (ATS-совместимость, красные флаги, рекомендации по улучшению), guided tour для новых пользователей, автоматический отклик (orchestrator + queue + actions) -- всё это работает. AI-сопроводительные письма и парсер переговоров -- заглушки, планируются в следующих фазах.


## 2. Возможности

### Что умеет расширение сейчас

**Модульная сборка (esbuild).** Исходный код находится в каталоге src/ и состоит из 134 ES-модулей, организованных по слоям: lib/ (библиотеки, 58 файлов), parsers/ (парсеры, 21 файл), engine/ (бизнес-логика, 4 файла), services/ (сервисы, 1 файл), ui/ (интерфейс, 44 файла), content/ (5 файлов). Сборщик esbuild объединяет модули в единый IIFE-бандл content.js (Manifest V3 не поддерживает ES modules в content_scripts). Дополнительно инжектируется page-world.js в MAIN world для SPA-навигации. Команды: `npm run build` (сборка), `npm run watch` (разработка с авто-пересборкой).

**Парсинг вакансий со страницы поиска.** Расширение находит все карточки вакансий на странице hh.ru/search/vacancy и извлекает из каждой: название позиции, название компании, зарплату, локацию, требуемый опыт, теги навыков, URL и идентификатор. Данные проходят валидацию (проверка названия, компании, URL, id), фильтруются по чёрному списку компаний и списку уже откликнутых вакансий.

**Парсинг вакансий с главной страницы hh.ru.** При открытии корневой страницы hh.ru (/) расширение парсит два блока вакансий: (1) рекомендованные вакансии — те же селекторы vacancy-serp__vacancy что и на странице поиска, с поддержкой ~= word-match для space-separated data-qa атрибутов и fallback по href для ссылок без data-qa; (2) «Вакансия дня» — вакансии с data-qa="vacancy_of_the_day_title", где ID вакансии извлекается тремя стратегиями: из click-URL параметра vacancyId= (content.hh.ru), из vacancyId= в query params (fallback), из id атрибута родительского элемента (спонсированные adsrv.hh.ru вакансии). Все VotD получают канонический URL https://hh.ru/vacancy/{id}. Результаты обоих блоков объединяются: рекомендованные + VotD.

**Парсинг резюме (13 полей).** При открытии страницы конкретного резюме (/resume/{hash}) расширение извлекает: имя, должность, желаемую зарплату, пол, возраст, город, навыки с уровнями владения (Продвинутый/Средний/Начальный), опыт работы (компания, позиция, период, описание), образование (название, факультет, год окончания, степень), языки с уровнями, контакты, дополнительную информацию. Для каждого поля есть fallback-стратегия: сначала data-qa селекторы, затем BEM-классы Bloko, затем текстовый анализ содержимого. Встроенный диагностический инструмент diagnoseResumeDOM() выводит полный дамп DOM в консоль для подбора селекторов. Парсинг резюме декомпозирован на 14 файлов в src/parsers/resume-detail/. Общие константы (очистка заголовков, определение видимости, нормализация пробелов) вынесены в src/lib/resume-constants.js.

**Список резюме и синхронизация.** На странице /applicant/resumes расширение находит все резюме пользователя и показывает их в sidebar. Кнопка «Синхронизировать все» загружает все резюме разом. Каждое резюме отображает статус видимости: «Видимо» (зелёный бейдж), «Скрыто» (жёлтый бейдж). Определение видимости использует двухуровневый подход: (1) со страницы списка резюме (менее надёжный, client-side рендеринг не содержит индикаторов), (2) со страницы детального просмотра резюме (более надёжный, SSR содержит data-qa атрибуты и кнопки). Шесть стратегий определения видимости со страницы резюме: data-qa атрибуты, текст кнопок, body text, raw HTML с &nbsp; нормализацией, script JSON, data-qa наличие. Данные со страницы резюме переопределяют данные списка. Выбор действующего резюме — радио-кнопки в списке «Все резюме» (клик по карточке). Кнопка ↻ на активной карточке для перепарсинга. Миграция старых данных в chrome.storage автоматически добавляет поле visibility при загрузке.

**Встроенная панель (FAB + Sidebar).** Плавающая кнопка (FAB) в правом нижнем углу экрана имеет три состояния: серая (проверка авторизации), красная (не авторизован), зелёная с пульсацией (авторизован). Все CSS-свойства FAB устанавливаются через `style.setProperty(prop, value, 'important')` для защиты от стилей hh.ru. При клике открывается боковая панель шириной 720px с 6 вкладками: Обзор, Резюме, Вакансии, Переговоры, Настройки, Статистика. Панель изолирована через Shadow DOM (mode: closed), поэтому стили hh.ru не влияют на её отображение, а стили панели -- на hh.ru.

**Проверка авторизации.** Пассивная авторизация через checkAuth() с поллингом DOM каждые 2 секунды + fallback по cookies (hhruuid, _HH-RU, hhtoken). Основной селектор -- `[data-qa="mainmenu_applicant"]`. При авторизации извлекается и отображается username пользователя. Auth gate блокирует функциональность панели для неавторизованных пользователей.

**SPA-навигация.** hh.ru -- Single Page Application на React. При переходе на следующую страницу поиска URL меняется, но страница не перезагружается. MutationObserver с debounce в 1 секунду отслеживает изменения в DOM и автоматически перепарсирует вакансии.

**Client-side фильтрация вакансий.** Фильтрация в реальном времени: текстовый поиск по названию/компании, фильтр по статусу (new/applied/blacklisted), фильтр по диапазону match score.

**Blacklist management.** Добавление/удаление компаний в чёрный список через UI панели. Вакансии из чёрного списка скрываются. Действия логируются через toast-уведомления.

**CustomEvent bridge.** Коммуникация между UI и бизнес-логикой через события: hh-ar-apply, hh-ar-apply-all, hh-ar-refresh, hh-ar-toggle-status, hh-ar-load-resume. Это позволяет связывать panel events с engine actions без прямой зависимости UI от engine.

**Popup-дашборд.** Четыре вкладки: статистика (отклики сегодня, приглашения, ошибки, всего), настройки (режим работы, лимиты, интервалы, отображение), шаблоны сопроводительного письма (с переменными {name}, {position}, {company}, {skills}), логи (последние 50 записей). Popup -- минимальный redirect на FAB.

**Anti-hallucination.** Трёхуровневая система верификации: DOM Verification (проверка существования и видимости элемента), Data Validation (проверка типов и форматов данных), Action Verification (проверка предусловий и результатов действий). Все функции возвращают конкретные типы (string, null, boolean, number), никогда undefined. Модуль src/lib/anti-hallucination.js.

**Rate Limiter.** Token bucket с адаптивным замедлением: 200 откликов/день, 30/час, минимум 30 секунд между действиями, максимум 5 подряд с паузой 2 минуты. При получении 429/капчи/замедленного ответа адаптивный фактор увеличивается (x2 при 429, x1.5 при slow, x1.3 при captcha). Модуль src/lib/rate-limiter.js.

**Version sync.** Версия синхронизирована между manifest.json, package.json, popup/index.html и src/ui/html/shell.js. Единый источник истины -- manifest.json (esbuild читает его и инжектит process.env.VERSION). Модуль src/lib/version.js содержит константу для справки, но не импортируется никаким модулем.

### Что НЕ работает (заглушки, планируются в следующих фазах)

**AI-сопроводительные письма.** Сервисный модуль -- заглушка (src/services/index.js, 3 строки). Промпты подготовлены в docs/reference-prompts.py. Планируется в Phase 4.

**Автоответы в переговорах.** Отсутствует. Планируется в Phase 4.

**Тёмная тема.** Отсутствует. Планируется в Phase 6.

**KPI dashboard.** Wireframe вкладок существует, но данные демо. Планируется в Phase 5.

**Apply modal с 5-шаговым прогрессом.** Отсутствует. Планируется в Phase 3.


## 3. Установка и запуск

### Сборка из исходников

Расширение собирается с помощью esbuild. Исходные модули находятся в src/, сборщик генерирует единый IIFE-бандл content.js в корне расширения.

```
git clone https://github.com/stsgs1980/HH-Copilot.git
cd HH-Copilot
git submodule update --init   # инициализация подмодуля (anti-hallucination-guard)
cd hh-extension/hh-auto-respond-extension
npm install          # установка esbuild + ws (devDependencies)
npm run build        # сборка content.js из src/content/main.js
```

Для разработки с авто-пересборкой и hot-reload (расширение перезагружается автоматически):

```
npm install ws       # один раз — WebSocket сервер для hot-reload
npm run watch        # авто-пересборка + hot-reload на ws://localhost:35729
```

Собранные файлы расширения (в каталоге dist/): content.js (бандл), page-world.js (MAIN world скрипт), manifest.json, background/index.js (service worker), popup/index.html (popup, redirect на FAB), icons/.

### Загрузка в Chrome

Шаг 1. Откройте Chrome и перейдите по адресу chrome://extensions.

Шаг 2. В правом верхнем углу переключите тумблер "Режим разработчика" (Developer mode) в положение ВКЛ.

Шаг 3. Нажмите кнопку "Загрузить распакованное расширение" (Load unpacked).

Шаг 4. В открывшемся диалоге выберите папку hh-auto-respond-extension/dist (ту, что содержит собранный manifest.json).

Шаг 5. Расширение появится в списке с названием "HH Copilot". Убедитесь, что тумблер включён.

### Проверка работоспособности

После загрузки расширения откройте https://hh.ru и авторизуйтесь (если ещё не авторизованы). На правом краю экрана появится плавающая круглая кнопка (FAB). Через 1-2 секунды она должна изменить цвет с серого на зелёный (с пульсацией), что означает успешное определение авторизации. Если кнопка стала красной -- авторизация не обнаружена, проверьте что вы вошли на сайт.

Перейдите на страницу поиска вакансий: https://hh.ru/search/vacancy?text=Python. Нажмите FAB. Откроется боковая панель шириной 720px с 6 вкладками. На вкладке "Вакансии" отобразится список найденных вакансий. Каждая карточка содержит название позиции, компанию, зарплату, локацию и кнопки управления.

Для проверки парсинга резюме перейдите на страницу одного из своих резюме (https://hh.ru/resume/{hash}). Откройте DevTools (F12), перейдите на вкладку Console. В фильтре введите HH-AR. Вы увидите логи парсинга с подробной информацией о найденных и отсутствующих полях. В sidebar откройте вкладку "Резюме" -- там отображаются все распарсенные данные.

### Отладка

Content script логирует все действия с префиксом [HH-AR]. Основные модули: Parser, Resume, Panel, Auth. Для диагностики DOM можно вызвать функцию diagnoseResumeDOM() из консоли (также доступна через window.__hhDiagnose). Эта функция выводит полный дамп всех data-qa атрибутов на странице, что полезно при обновлении вёрстки hh.ru.

Service Worker можно проверить на странице chrome://extensions -- найдите расширение, нажмите "Service Worker" под его названием. Storage можно просмотреть, нажав "Storage" на карточке расширения.


## 4. Структура проекта

### Корень репозитория

```
/
  hh-extension/hh-auto-respond-extension/   -- код расширения
  docs/wireframes/                            -- UI-прототипы (FAB panel + landing)
    hh-copilot-documentation.md               -- документация wireframe (399 строк)
    hh-copilot-fab-panel.html                 -- интерактивный wireframe FAB-панели
    hh-copilot-landing.html                   -- landing-страница прототип
    resume-tab-reference.png                  -- референс вкладки «Резюме»

  anti-hallucination-guard/                    -- git submodule (anti-hallucination guard)
  cascade-state.json                           -- 40 задач, 8 фаз (P0-P6 + P0.5)
  AGENT_RULES.md                               -- правила AHG + Cascade
  cascade-cli.sh                               -- CLI навигации по задачам
  cascade-init.sh                              -- интерактивный генератор состояния
  scripts/
    validate.sh                                -- проверка чистоты репозитория
    check-agent.sh                             -- мониторинг агента
    audit.sh                                   -- построчная оценка
  tools/verify-docs/                           -- инструмент верификации документации
  .git/hooks/
    pre-commit                                 -- блокирует коммит без свежего worklog
    pre-push                                   -- запускает validate.sh перед push
  worklog.md                                   -- журнал работы (обязателен для коммитов)
  README.md                                    -- этот файл
```

### Код расширения (hh-extension/hh-auto-respond-extension/)

```
manifest.json                  -- Manifest V3 конфигурация (v1.9.28.0, источник истины для версии)
package.json                   -- esbuild, скрипты build/watch
esbuild.config.mjs              -- сборочная конфигурация (IIFE, bundle, output → dist/)
dist/                          -- каталог сборки (загружать в Chrome как unpacked extension)
  content.js                   -- собираемый бандл (генерируется npm run build из src/content/main.js)
  page-world.js                -- скрипт MAIN world (копируется из src/page-world.js)
  manifest.json                -- копия корневого manifest.json (esbuild)
  background/index.js          -- service worker (копия)
  popup/index.html              -- popup (копия, версия инжектируется esbuild)
  icons/icon{16,48,128}.png    -- иконки расширения (копия)
background/index.js            -- service worker (исходник)
popup/index.html                -- popup (исходник, минимальный redirect на FAB)
icons/icon{16,48,128}.png      -- иконки расширения (исходник)

src/                           -- исходные модули (134 JS файла)
  content/ (5 файлов):
    index.js                   -- barrel re-export
    main.js                    -- boot sequence: init, auth gate, detectPageType, SPA observer, migration
    main-page-handlers.js      -- initPageLogic, vacancy/resume page handlers, CustomEvent dispatch
    main-resume-loader.js      -- загрузка резюме: parseResume, fetchAndParseResume
    main-sync.js               -- синхронизация: storage listeners, state sync
  lib/ (58 файлов):
    -- базовые модули --
    index.js, selectors.js, anti-hallucination.js, timing.js, rate-limiter.js, version.js
    storage.js, storage-queue.js, storage-settings.js, storage-vacancies.js
    -- скоринг --
    match-scorer.js             -- calculateMatchScore() (навыки 40%, зарплата 15%, опыт 15%, должность 15%, локация 15%)
    match-scorer-skills.js      -- scoreSkills() (explicit + derived, синонимы)
    match-scorer-salary.js      -- scoreSalary()
    match-scorer-experience.js  -- scoreExperience()
    match-scorer-title.js       -- scoreTitle() (синонимы должностей, группы)
    -- навыки --
    skill-dictionary.js         -- SKILL_PATTERNS (50+ Russian skill keyword patterns)
    skill-synonyms.js           -- SKILL_SYNONYMS (группы синонимов)
    derive-skills.js            -- deriveSkillsFromExperience()
    vacancy-skills-collector.js -- collectAllVacancySkills()
    parse-experience.js         -- parseExperienceString()
    -- качество --
    quality-flags.js            -- buildRecommendations()
    quality-ats.js              -- ATS-совместимость
    quality-experience.js       -- анализ опыта
    quality-patterns.js         -- красные флаги
    quality-date-helpers.js     -- утилиты дат
    resume-quality-analyzer.js  -- analyzeResumeQuality()
    -- guided tour --
    tour-engine.js, tour-steps.js, tour-tooltip.js
    -- константы резюме --
    resume-constants.js, resume-constants-core.js, resume-constants-title.js, resume-constants-visibility.js
    -- fetch резюме (25 файлов) --
    resume-fetch.js, resume-fetch-list.js, resume-fetch-resume.js,
    resume-fetch-*.js (experience, strategy4-6, json-utils, education-languages, helpers,
    parse, parse-edu, vis-fallback, iframe-vis*, list-vis*, resume-diag, resume-exp-orch, resume-page-vis)
  parsers/ (21 файл):
    index.js, vacancy-list.js
    vacancy-detail.js           -- parseVacancyDetail (реализован)
    vacancy-detail-skills.js    -- parseVacancySkills (5 fallback-стратегий)
    vacancy-diagnostic.js       -- diagnoseVacancyDOM()
    negotiations.js             -- заглушка (Phase 1)
    resume-detail.js            -- barrel в resume-detail/
    resume-detail/ (14 файлов):
      index.js, parse-resume.js, parse-company-card.js, parse-resume-sections.js,
      parse-resume-education.js, parse-resume-personal.js, parse-resume-contacts.js,
      parse-resume-conditions.js, diagnose.js, diagnose-blocks.js, diagnose-elements.js,
      diagnose-structure.js, resume-detail-debug-vis.js, resume-detail-list-parser.js
  engine/ (4 файла):
    index.js, apply-orchestrator.js, apply-actions.js, apply-queue.js
  services/ (1 файл):
    index.js                    -- заглушка (Phase 4 -- AI-сопроводительные)
  ui/ (44 файла):
    -- корневые --
    index.js, fab.js, styles.js, state.js, panel.js, html.js, auth.js
    -- стили --
    sidebar-css.js, sidebar-css-core.js, sidebar-css-components.js
    -- авторизация --
    auth-check.js, auth-detection.js, auth-user.js
    -- panel --
    panel/index.js, panel/render.js, panel/helpers.js, panel/events.js,
    panel/sidebar-events.js, panel/panel-diagnostics.js
    -- html --
    html/index.js, html/shell.js, html/helpers.js, html/icons.js
    html/tabs/overview.js, html/tabs/resume.js, html/tabs/vacancies.js,
    html/tabs/negotiations.js, html/tabs/settings.js, html/tabs/stats.js
    -- tabs --
    tabs/index.js, tabs/overview.js, tabs/resumes.js, tabs/vacancies.js,
    tabs/negotiations.js, tabs/settings.js, tabs/stats.js
    tabs/resumes/ (7 файлов):
      index.js, render-my-resumes.js, render-resume-panel.js,
      resume-helpers.js, resume-helpers-gap.js, resume-accordion-header.js, section-builders.js

docs/
  ARCHITECTURE.md               -- архитектурная документация
  PLANTUML-REFERENCE.md         -- справочник PlantUML (обязателен перед редактированием .puml)
  UNICODE_POLICY.md             -- политика Unicode (enforcement для content.js)
  TASK-CASCADE.md               -- каскад задач (8 фаз, 40 задач)
  reference-prompts.py          -- промпт-шаблоны для AI (reference, не подключается)
CHANGELOG.md                    -- история версий (в корне расширения, Keep a Changelog)
worklog.md                      -- журнал работы расширения (в корне расширения)
```

### Guard-системы

Проект использует два git-подмодуля для обеспечения качества кода:



**anti-hallucination-guard/** (https://github.com/stsgs1980/Anti-hallucination-guard.git, commit 0759547) -- guard-система против галлюцинаций в коде. Правила AHG 1-6 интегрированы в AGENT_RULES.md в корне репозитория.

**Git hooks** (устанавливаются вручную через `tools/verify-docs/templates/install-hooks.ts`):
- `.git/hooks/pre-commit` -- блокирует коммит без свежей записи в worklog.md
- `.git/hooks/pre-push` -- запускает validate.sh перед отправкой на удалённый репозиторий

После клонирования репозитория выполните установку хуков:
```
npx ts-node tools/verify-docs/templates/install-hooks.ts
```


## 5. Парсинг резюме

### Принцип работы

hh.ru использует Magritte -- собственную CSS-in-JS дизайн-систему, которая хэширует имена классов при каждом деплое. Класс вида magritte-card_bhGKz_8-5-13 изменится на magritte-card_xYzAb_9-6-14 после следующего релиза. По этой причине CSS-селекторы по классам для Magritte-компонентов не работают -- они нестабильны и ломаются при каждом обновлении сайта.

Единственный стабильный API для обращения к DOM-элементов hh.ru -- это атрибуты data-qa. Они созданы разработчиками hh.ru для внутреннего тестирования и не меняются между деплоями. Стратегия парсинга резюме строится исключительно на data-qa атрибутах, а там где они отсутствуют -- на текстовом анализе содержимого и BEM-классах библиотеки Bloko (бесхэшовые).

### Извлекаемые поля (13)

Поле "Должность" извлекается из data-qa="resume-block-title-position". Fallback -- тег h1 на странице. Это самое надёжное поле, присутствует на всех резюме.

Поле "Зарплата" берётся из data-qa="resume-block-salary". Fallback -- любой элемент с data-qa, содержащим "salary". Может быть пустым, если соискатель не указал желаемый доход.

Поля "Пол", "Возраст", "Город" извлекаются из текстового содержимого блока data-qa="resume-position-card". Magritte не предоставляет отдельных data-qa для этих полей, поэтому используется паттерн-матчинг: пол ищется по словам "мужчина"/"женщина", возраст -- по паттерну "N лет/года", город -- по текстовым фрагментам с кириллицей, не совпадающим с зарплатой или должностью.

Поле "Навыки" берётся из контейнера data-qa="skills-card". Теги навыков имеют data-qa="skill-tag-*", уровни владения -- data-qa="skill-level-title-N" (где N -- 1, 2 или 3, соответствующие "Начальный", "Средний", "Продвинутый"). Fallback -- классы .bloko-tag__text внутри skills-card.

Поле "Опыт работы" извлекается из data-qa="resume-list-card-experience". Каждая запись -- это data-qa="profile-experience-company-card". Внутри карточки структура cell-based: компания и длительность в cell-left-side (два элемента cell-text-content), позиция и период в magritte-stepper-step-content, описание -- остаточный текст после вычитания позиции и периода.

Поле "Образование" извлекается из data-qa="resume-list-card-education". Используются три fallback-стратегии: cell-left-side (как в опыте), прямые дочерние элементы eduCard, полный текстовый скан с поиском паттернов "Название -- год". UI-текст фильтруется (слова "Образование", "Редактировать" и т.д.).

Поле "Языки" ищется в bloko-tag внутри data-qa="resume-about-card" и data-qa="resume-position-card". Отдельного data-qa для языков на текущей версии Magritte нет.

Поле "Дополнительная информация" берётся из data-qa="resume-about-card" -- текстовый контент всего блока.

### Диагностика

Для подбора селекторов при изменении DOM hh.ru предназначена функция diagnoseResumeDOM(). Она доступна из консоли (window.__hhDiagnose) или через кнопку в sidebar. Функция собирает все data-qa атрибуты на странице, группирует их по префиксу, проверяет все resume-селекторы из HH_SELECTORS, выводит дампы секций опыта и образования, показывает заголовки h1-h3 и все секции страницы.


## 6. Архитектура

### Общая схема

Расширение построено по классической архитектуре Chrome Extension Manifest V3 и состоит из трёх исполняемых контекстов: Content Script, Service Worker и Popup. Каждый контекст выполняет свою роль и взаимодействует с другими через chrome.storage.local и chrome.runtime.sendMessage.

**Content Script (content.js)** -- основной модуль расширения, загружаемый на все страницы hh.ru. Содержимое собирается esbuild из 134 исходных модулей в каталоге src/ в единый IIFE-бандл. Дополнительно инжектируется page-world.js в MAIN world для SPA-навигации. Модули организованы по слоям: content (boot sequence, page handlers), библиотечный (src/lib/ -- 58 файлов: селекторы, антигаллюцинация, хранилище, тайминг, rate limiter, match-scorer, skill-dictionary, derive-skills, quality analysis, tour, resume-fetch), парсеры (src/parsers/ -- 21 файл: вакансии, резюме, переговоры, диагностика), движок (src/engine/ -- apply-orchestrator, apply-actions, apply-queue), сервисы (src/services/, заглушка), UI (src/ui/ -- 44 файла: FAB, panel, tabs, styles, state, auth, sidebar-css).

**Service Worker (background/index.js)** -- фоновый сценарий, работающий в контексте расширения (не на странице hh.ru). Отвечает за инициализацию хранилища при первой установке, создание ежедневного будильника (chrome.alarms) для сброса лимитов в полночь, маршрутизацию сообщений между popup и content scripts, обновление бейджа (цифры на иконке расширения).

**Popup (popup/index.html)** -- минимальный пользовательский интерфейс при клике на иконку расширения. Выполняет redirect на FAB-кнопку, основной интерфейс доступен через боковую панель.

### Потоки данных

**Поток парсинга вакансий:**

Страница hh.ru/search/vacancy или главная страница hh.ru (/) загружается в браузере. Manifest V3 инжектит content.js в момент document_idle. Точка входа src/content/main.js определяет тип страницы (search, vacancy, resume, resume-list, main) и запускает соответствующую логику. Для страницы поиска вызывается parseVacanciesFromPage() из src/parsers/vacancy-list.js. Для главной страницы вызывается handleMainPage(), которая парсит рекомендованные вакансии (parseVacanciesFromPage) и «Вакансию дня» (parseVacanciesOfTheDay), объединяя результаты. Функция через findAllElements() находит все карточки вакансий, для каждой карточки извлекает данные через findElement() и safeGetText(). Результаты валидируются через validateVacancyData(), фильтруются по списку откликнутых и чёрного списка, затем передаются в renderSidebarContent() для отображения. MutationObserver с debounce автоматически перепарсирует при изменении DOM.

**Поток парсинга резюме:**

На странице /resume/{hash} вызывается parseResume() из src/parsers/resume-detail/. Модуль последовательно извлекает данные из DOM, используя data-qa селекторы. Для каждого поля есть основная стратегия и один или несколько fallback-вариантов (5 файлов: parse-resume.js, parse-company-card.js, parse-resume-sections.js, parse-resume-education.js). Результат сохраняется в chrome.storage.local (ключ resume) и отображается во вкладке "Резюме" sidebar. Видимость резюме определяется двухуровнево: сначала из данных страницы списка (extractVisibilityStatus), затем при загрузке детальной страницы — detectVisibilityFromResumePage() с 6 стратегиями, переопределяя список если точнее.

**Поток авторизации:**

checkAuth() из src/ui/auth.js вызывается при загрузке страницы и каждые 2 секунды. Перебирает DOM-селекторы и проверяет cookies. Результат обновляет состояние panelState.isLoggedIn, что меняет цвет FAB и содержимое sidebar.

**Поток сообщений:**

Popup отправляет сообщения через chrome.runtime.sendMessage (типы: get-stats, get-settings, apply-vacancy, log, settings-updated). Service Worker маршрутизирует сообщения: get-stats и get-settings читают данные из хранилища и отвечают popup, apply-vacancy пересылается в content script активной вкладки hh.ru, log записывает в хранилище.

**CustomEvent bridge:**

Коммуникация между UI-модулями и бизнес-логикой осуществляется через CustomEvent bridge (src/ui/panel/events.js). События: hh-ar-apply, hh-ar-apply-all, hh-ar-refresh, hh-ar-toggle-status, hh-ar-load-resume. Это позволяет связывать panel events с engine actions без прямой зависимости UI от engine.


## 7. Технологии

### Manifest V3

Расширение построено на Manifest V3 -- текущей версии платформы Chrome Extensions. Manifest V3 заменил V2 в 2023-2024 годах и внёс ряд существенных ограничений: content_scripts не поддерживают ES modules (import/export недоступны), фоновые страницы заменены на Service Workers (без доступа к DOM), удалены API вроде chrome.webRequest для блокировки запросов, данные хранятся исключительно через chrome.storage.local/session. Все решения в проекте принимались с учётом этих ограничений. Отсутствие модульной системы в content_scripts привело к использованию esbuild для сборки IIFE-бандла. Service Worker не имеет доступа к DOM и работает только через chrome API.

### esbuild

Сборщик esbuild выбран как самый быстрый и минимальный по конфигурации вариант. Конфигурация в esbuild.config.mjs: точка входа src/content/main.js, выходной файл dist/content.js, формат IIFE, bundle=true, minify=false (для отладки), sourcemap=false. Вторая точка входа: src/page-world.js → dist/page-world.js (bundle=false). Статические файлы (manifest.json, background/, popup/, icons/) копируются в dist/. Команды: `npm run build` (сборка в dist/), `npm run watch` (наблюдение за изменениями + hot-reload). Загрузка в Chrome — выбрать папку dist/ как unpacked extension.

**Hot-Module Replacement (HMR)** — автоматическая перезагрузка расширения при разработке. При запуске `npm run watch` esbuild запускает WebSocket-сервер на порту 35729. Когда исходный файл изменяется, esbuild пересобирает бандл и отправляет сигнал "reload" через WebSocket. Расширение получает сигнал и вызывает `chrome.runtime.reload()` — расширение перезагружается без ручных кликов.

Требования: `npm install ws` (devDependency, уже добавлена в package.json). Если пакет `ws` не установлен, hot-reload молча отключается — обычный `npm run watch` работает как раньше.

Схема работы:
```
Сохраняешь файл → esbuild пересобирает → WebSocket "reload" → chrome.runtime.reload() → расширение обновлено
```

Активируется ТОЛЬКО в dev-режиме (отсутствует `update_url` в manifest.json — признак распакованного расширения). В продакшн-сборке HMR-код не выполняется.

### Shadow DOM

Панель расширения (sidebar) создаётся внутри Shadow DOM с параметром mode: "closed". Это означает полную изоляцию: CSS-стили hh.ru (библиотеки Bloko и Magritte) не проникают внутрь панели, а стили панели не влияют на страницу. JavaScript панели изолирован от глобального контекста страницы -- нет конфликтов переменных, нет переопределения прототипов. Shadow DOM -- это встроенный механизм браузера, не требующий полифилов или библиотек. Он работает во всех современных браузерах на базе Chromium, включая Chrome, Edge, Brave, Opera.

### chrome.storage.local

Все данные расширения хранятся в chrome.storage.local -- ключевом хранилище, доступном из всех контекстов расширения (content scripts, service worker, popup). Хранилище асинхронное, объём ограничен 10 МБ на расширение (достаточно для тысяч вакансий). Схема хранения: settings (объект с настройками пользователя), stats (статистика откликов), appliedVacancies (массив id откликнутых вакансий), skippedVacancies (пропущенные), blacklistedCompanies (чёрный список компаний), logs (массив до 500 записей), resume (объект с распарсенным резюме), resumeList (список резюме), dailyResetDate (дата последнего сброса), installedAt (дата установки). Данные не отправляются на внешние серверы.

### data-qa селекторы

Стратегия обращения к DOM hh.ru строится исключительно на атрибутах data-qa. Каждый селектор в HH_SELECTORS -- это массив строк, перебираемых по порядку приоритета. Первый элемент -- наиболее стабильный data-qa, последующие -- fallback-варианты (BEM-классы Bloko, partial class match). Функция findElement() перебирает массив, проверяет существование, принадлежность к документу, видимость (display и visibility через getComputedStyle) и возвращает первый подходящий элемент. Magritte-хэшированные классы (вида magritte-card_bhGKz) категорически не используются -- они нестабильны.

### React-safe input

hh.ru построен на React 18 с Magritte UI. React использует synthetic events, поэтому прямое присвоение element.value = text не обновляет внутреннее состояние React, и данные не отправляются при сабмите. Расширение использует native value setter (Object.getOwnPropertyDescriptor для HTMLTextAreaElement.prototype.value) с последующей диспетчеризацией synthetic событий (input и change, bubbles: true). Это гарантирует, что React "увидит" новое значение и корректно его обработает.


## 8. Версионирование

### Правила

Версия расширения указывается в manifest.json в поле "version" и следует формату SemVer (MAJOR.MINOR.PATCH). Каждый коммит в основную ветку с функциональными изменениями обязан сопровождаться бампом версии. Версия синхронизируется автоматически между manifest.json, package.json, popup/index.html и src/ui/html/shell.js через модуль src/lib/version.js. Единый источник истины -- manifest.json.

**PATCH (третий разряд).** Исправление багов, обновление селекторов без изменения логики, мелкие правки стилей popup, обновление текста документации. Пример: 1.7.2 переходит в 1.7.3.

**MINOR (второй разряд).** Новый функционал, не ломающий существующее поведение: добавление нового парсера, новые поля в резюме, новые настройки в popup, новые вкладки в sidebar. Пример: 1.7.3 переходит в 1.8.0.

**MAJOR (первый разряд).** Изменения, ломающие обратную совместимость: новое архитектурное решение, миграция схемы хранилища, удаление существующего API. Пример: 1.7.3 переходит в 2.0.0.

### Формат коммитов

Каждый коммит должен начинаться с типа изменения: feat:, fix:, refactor:, docs:, chore:. После типа -- краткое описание на русском или английском. Примеры: "feat: парсинг навыков с уровнями", "fix: offsetParent для fixed элементов", "docs: обновление ARCHITECTURE.md".

### История изменений

Полная история версий ведётся в файле CHANGELOG.md в корне папки расширения. Формат -- Keep a Changelog. Каждый релиз содержит секции "Добавлено", "Изменено", "Исправлено", "Удалено". Текущая версия -- 1.8.3.

### Версионная хронология

- **v1.0.0**: Initial popup-only extension (монолитный content.js, 1637 строк)
- **v1.1.0**: Парсер резюме, табовая система sidebar
- **v1.2.0**: Исправлен баг загрузки резюме, контекстно-зависимая логика
- **v1.3.0**: Переписан парсинг резюме под Magritte (критический баг: 8/11 полей не парсились)
- **v1.4.0**: Auto-expand скрытых секций, sidebar 720px
- **v1.5.0**: Массовая чистка мёртвого кода (311 файлов, -41361 строк), оставлено только расширение
- **v1.5.1-v1.5.4**: Anti-hallucination-guard submodule, документация
- **v1.6.0**: Phase 0 -- esbuild modular refactoring (монолит 42 модуля)
- **v1.7.0-v1.7.2**: Auth UX, FAB CSS изоляция, version sync, dist/ build, apply engine stub
- **v1.7.3**: File structure cleanup, git hooks, version sync
- **v1.7.4**: Fix resume sync selector (/applicant/resumes/view?resume= pattern)
- **v1.7.5-v1.7.7**: Resume visibility badges (Видимо/Скрыто/Статус неизвестен), title noise cleanup
- **v1.7.8**: Migration for old stored data (visibility backfill), nbsp normalization fix
- **v1.7.9**: Magritte-aware multi-strategy visibility detection
- **v1.8.0**: &nbsp; (U+00A0) normalization in visibility detection
- **v1.8.1**: Fix "Загрузить с текущей страницы" button (container ID mismatch har-resume-content→res-parsed-data)
- **v1.8.2**: Repo restoration after destructive agent, wireframe files added to docs/wireframes/
- **v1.8.3**: Resume UI wireframe compliance — anti-monolith refactor (resumes.js → 5 файлов), subtitle fix, имя field, structured education/languages


## 9. Разработка

### Как добавить новый функционал

**Добавление нового модуля.** Все модули находятся в src/ каталоге. Библиотечные модули -- в src/lib/, парсеры -- в src/parsers/, бизнес-логика -- в src/engine/, сервисы -- в src/services/, UI -- в src/ui/. Новый модуль создаётся как ES module с named exports и подключается через barrel-файл (index.js) соответствующего каталога. После сборки (`npm run build`) модуль включается в content.js.

**Добавление нового селектора.** Откройте объект HH_SELECTORS в src/lib/selectors.js. Найдите соответствующую группу (Vacancy Search, Vacancy Page, Resume Page, Auth) или создайте новую. Добавьте селектор в массив: первым элементом -- data-qa (самый стабильный), затем fallback-варианты. Протестируйте через diagnoseResumeDOM() (window.__hhDiagnose) -- она проверит все resume-селекторы и покажет, какие найдены, а какие нет.

**Добавление нового ключа в хранилище.** Добавьте ключ в DEFAULT_SETTINGS или DEFAULT_STATS в src/lib/storage.js, а также в инициализацию в background/index.js (секция chrome.runtime.onInstalled.addListener). Обязательно предусмотрите значение по умолчанию.

### Правила кода

Правило 1. Ничего не возвращай как undefined. Все функции возвращают string, null, boolean, number или object. Пустая строка '' -- допустимое значение, undefined -- нет. Это предотвращает cascading ошибки при цепочках вызовов.

Правило 2. Никогда не предполагай, что DOM-элемент существует. Любой вызов querySelector может вернуть null. Используй findElement() или safeQuery() вместо прямого querySelector.

Правило 3. Никогда не обращайся к textContent/value без обёртки. safeGetText() проверяет существование, тип, видимость и пустоту. safeGetAttr() проверяет существование и возвращает fallback. safeInput() проверяет disabled/readonly и использует React-safe setter.

Правило 4. Никогда не кликай по невидимым элементам. safeClick() проверяет offsetParent, getComputedStyle, disabled. Если элемент невидим -- функция возвращает false без выполнения клика.

Правило 5. Всегда валидируй данные перед использованием. validateVacancyData() проверяет тип, длину, формат. ExtractVacancyId() использует regex с fallback на пустую строку.

Правило 6. Не используй Magritte-хэшированные CSS-классы. Только data-qa атрибуты и Bloko BEM-классы. Хэши меняются при каждом деплое hh.ru.

Правило 7. Все стили панели должны быть внутри Shadow DOM. Никаких инлайн-стилей на элементах вне shadowRoot. Никаких вставок в document.head.

Правило 8. Логируй всё, что может быть полезно для отладки. Префикс [HH-AR][ModuleName]. Уровни: debug (info), warn, error.

Правило 9. Каждый модуль не должен превышать 250 строк. При превышении -- декомпозиция (anti-monolith rule).

Правило 10. Каждый коммит должен сопровождаться записью в worklog.md. pre-commit hook блокирует коммиты без свежего worklog.


## 10. Roadmap

### Фаза 0 (завершена): Модульный рефакторинг

Монолитный content.js (1637 строк) декомпозирован в 49 ES-модулей. Настроен esbuild (IIFE, bundle, sourcemap). Создана модульная структура: lib/, parsers/, engine/, services/, ui/ с barrel-файлами. Все файлы не превышают 250 строк. Все задачи фазы 0 завершены.

Дополнительная работа (Phase 0.5): FAB CSS изоляция с !important, Auth UX (пассивная авторизация, username), 6-вкладочная wireframe панель, client-side фильтрация вакансий, blacklist management UI, version sync, CustomEvent bridge.

### Фаза 1: Расширение парсинга

Детальный парсер вакансии (parseVacancyDetail), парсер переговоров (parseNegotiations), salary parser, experience parser. Все задачи -- pending (cascade-state.json).

### Фаза 2: Matching Engine

Пятикомпонентный скоринг (Jaccard + alias matching), skill gap analysis, интеграция в парсер вакансий. Все задачи -- pending.

### Фаза 3: Auto-Apply

5-шаговый modal (pre-flight, навигация, поиск кнопки, обработка alert-ов, заполнение и отправка), обработка CAPTCHA/429, полуавтоматический и полностью автоматический режимы, typing simulation. Все задачи -- pending.

### Фаза 4: AI Integration

Генерация сопроводительных писем через LLM API, AI-ответы в переговорах, управление API ключом. Все задачи -- pending.

### Фаза 5: Аналитика и UX

KPI dashboard, conversion funnel, расширенная статистика, адаптивное замедление с визуализацией. Все задачи -- pending.

### Фаза 6: Полировка

Тёмная тема, skill gap analysis UI, Chrome Web Store публикация. Все задачи -- pending.

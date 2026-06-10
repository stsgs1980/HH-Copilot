# HH Copilot -- Каскад задач (Task Cascade)

**Версия документа:** 4.0.0
**Дата:** 2026-06-10
**Статус:** Master planning document
**Текущая версия расширения:** 1.7.2

---

## Changelog v3.0.0 -> v4.0.0

- Обновлена версия расширения с 1.5.2 до 1.7.2
- Phase 0 полностью завершена (F0.1-F0.9), все задачи отмечены как COMPLETED
- Добавлен Phase 0.5 (дополнительная работа, не входившая в оригинальный каскад)
- Раздел 1.2 переписан: описана текущая модульная структура (42 JS файла, все < 250 строк)
- Раздел 1.3 переписан: убраны записи о 6-ти вкладках wireframe, FAB CSS изоляции, auth UX, модульной структуре, vacancy filtering, blacklist UI (всё реализовано)
- Раздел 2.1 обновлён: целевая структура = текущая структура

---

## 1. Введение

### 1.1 Что такое HH Copilot

HH Copilot -- это расширение для браузера Chrome, предназначенное для автоматизации поиска работы на платформе hh.ru. Расширение инжектируется в страницы hh.ru и предоставляет пользователю боковую панель с инструментами для парсинга вакансий, анализа совпадения с резюме, массовой подачи откликов и отслеживания переговоров с работодателями. Основное преимущество расширения перед серверными решениями заключается в том, что оно работает внутри реального браузера пользователя, что полностью исключает детекцию anti-bot систем hh.ru, не требует OAuth авторизации и не отправляет данные на сторонние серверы. Все данные хранятся локально в chrome.storage.local.

Расширение построено на архитектуре Manifest V3 и использует content scripts для взаимодействия с DOM страниц hh.ru, service worker для фоновой обработки (alarm-based сброс лимитов, маршрутизация сообщений, обновление badge) и popup для настроек. Пользовательский интерфейс реализован через Shadow DOM панель, которая изолирована от стилей hh.ru и не ломает верстку сайта. Расширение содержит парсер резюме (12 полей: заголовок, зарплата, адрес, навыки с уровнями, опыт работы, образование, дополнительная информация), парсер списка резюме, базовый парсер карточек вакансий со страницы поиска и 6- вкладочную боковую панель по wireframe.

### 1.2 Текущее состояние

На текущий момент расширение находится в версии 1.7.2. Монолитный content.js (1637 строк, v1.5.2) полностью декомпозирован в модульную структуру из 42 JS файлов в каталоге src/, все файлы не превышают 250 строк. Сборка осуществляется через esbuild (IIFE формат, точка входа src/content/main.js). Версия синхронизирована между manifest.json, package.json, popup/index.html и html.js footer.

**Текущая модульная структура (42 JS файла):**

```
src/
  content/main.js (163 строки) -- boot sequence: init, auth gate, detectPageType, SPA observer
  lib/
    index.js (11 строк) -- barrel re-export
    selectors.js (126 строк) -- HH_SELECTORS, findElement, findAllElements
    anti-hallucination.js (115 строк) -- safeGetText, safeGetAttr, validateVacancyData,
      extractVacancyId, waitForElement, safeClick, safeInput, createLogger
    storage.js (90 строк) -- chrome.storage.local, DEFAULT_SETTINGS, DEFAULT_STATS
    timing.js (31 строк) -- gaussianRandom, randomDelay, simulateReading, simulateTyping
    rate-limiter.js (38 строк) -- rateLimiter с check/recordAction/adaptiveSlowdown/resetBurst
  parsers/
    index.js (8 строк) -- barrel re-export
    vacancy-list.js (65 строк) -- parseVacanciesFromPage
    vacancy-detail.js (11 строк) -- заглушка parseVacancyDetail (Phase 1)
    negotiations.js (11 строк) -- заглушка parseNegotiations (Phase 1)
    resume-detail.js (1 строка) -- barrel re-export в resume-detail/
    resume-detail/
      index.js (79 строк) -- barrel, parseResume entry point
      parse-resume.js (79 строк) -- основная логика парсинга резюме
      parse-company-card.js (59 строк) -- парсинг компании-владельца резюме
      parse-resume-sections.js (179 строк) -- парсинг секций: навыки, опыт, доп. инфо
      parse-resume-education.js (111 строк) -- парсинг образования
      diagnose.js (173 строк) -- diagnoseResumeDOM, дамп data-qa
  ui/
    index.js (12 строк) -- barrel re-export
    fab.js (98 строк) -- FAB кнопка с CSS !important изоляцией
    styles.js (240 строк) -- CSS шаблонные литералы для Shadow DOM панели
    state.js (57 строк) -- состояние панели (activeTab, isOpen, etc.)
    auth.js (72 строк) -- пассивная авторизация: checkAuth(), pollAuth(), authIndicator
    panel.js (6 строк) -- barrel re-export в panel/
    panel/
      index.js (127 строк) -- создание Shadow DOM, переключение видимости
      render.js (71 строк) -- рендеринг содержимого вкладок
      helpers.js (64 строк) -- утилиты рендеринга (escapeHtml, etc.)
      events.js (161 строк) -- обработчики событий панели, CustomEvent bridge
    html/
      index.js (5 строк) -- barrel re-export
      shell.js (113 строк) -- HTML shell панели с 6 вкладками
      helpers.js (40 строк) -- HTML утилиты
      icons.js (26 строк) -- SVG иконки
      tabs/
        overview.js (170 строк) -- HTML вкладки "Обзор"
        resume.js (45 строк) -- HTML вкладки "Резюме"
        vacancies.js (67 строк) -- HTML вкладки "Вакансии"
        negotiations.js (65 строк) -- HTML вкладки "Переговоры"
        settings.js (90 строк) -- HTML вкладки "Настройки"
        stats.js (67 строк) -- HTML вкладки "Статистика"
    tabs/
      overview.js (83 строк) -- рендерер вкладки "Обзор"
      resumes.js (107 строк) -- рендерер вкладки "Резюме"
      vacancies.js (74 строк) -- рендерер вкладки "Вакансии" с фильтрацией
      negotiations.js (81 строк) -- рендерер вкладки "Переговоры"
      settings.js (59 строк) -- рендерер вкладки "Настройки"
      stats.js (106 строк) -- рендерер вкладки "Статистика"
  engine/
    index.js (5 строк) -- barrel re-export (заглушка)
    auto-respond.js (50 строк) -- заглушка applyToVacancy/applyToAll (Phase 3)
  services/
    index.js (3 строк) -- barrel re-export (заглушка)
```

**Функционально работают:**
- Сборка через esbuild: `npm run build` собирает content.js из 42 модулей, `npm run watch` для разработки
- FAB кнопка (fixed bottom-right) с CSS !important изоляцией от hh.ru стилей, 3 состояния (серый/синий/красный)
- Боковая панель 720px с Shadow DOM изоляцией (mode: closed), 6 вкладок по wireframe: Обзор, Резюме, Вакансии, Переговоры, Настройки, Статистика
- Пассивная авторизация: checkAuth() с поллингом DOM + cookie fallback, authIndicator кликабельный, отображение username
- Парсинг резюме (12 полей) с трёхуровневыми fallback стратегиями, resume-detail декомпозирован на 5 файлов < 250 строк
- Парсинг вакансий со страницы поиска (parseVacanciesFromPage)
- Client-side фильтрация вакансий (поиск, статус, диапазон скоринга)
- Blacklist add/remove с toast логированием
- MutationObserver для SPA навигации (debounce 1 сек)
- Персистентное хранилище chrome.storage.local (7 ключей)
- CustomEvent bridge: hh-ar-apply, hh-ar-apply-all, hh-ar-refresh, hh-ar-toggle-status, hh-ar-load-resume
- Version sync: v1.7.2 во всех файлах (manifest.json, package.json, popup, html.js)
- Service worker (background/index.js): ежедневный сброс через chrome.alarms, маршрутизация сообщений, badge
- Popup (index.html + popup.js): 4 вкладки (статистика, настройки, шаблоны, логи)

### 1.3 Чего НЕ работает (требует реализации)

Перечень функциональных блоков, которые находятся в стадии заглушки или отсутствуют полностью:

- Детальный парсер страницы вакансии (parseVacancyDetail) -- заглушка (11 строк, пустая функция, будет реализована в Phase 1)
- Парсер навыков из описания вакансии -- отсутствует (Phase 1)
- Парсер переговоров (parseNegotiations) -- заглушка (11 строк, пустая функция, будет реализована в Phase 1)
- Система оценки совпадения (matching engine) -- отсутствует (engine/index.js -- заглушка 5 строк, Phase 2)
- Анализ пробелов в навыках (skill gap analysis) -- отсутствует (Phase 2)
- Полный процесс отклика (auto-apply) -- заглушка в engine/auto-respond.js (50 строк, applyToVacancy/applyToAll не реализуют 5-шаговый процесс, Phase 3)
- Массовая подача откликов (applyToAll) -- заглушка с фильтрацией по minScore (Phase 3)
- Генерация сопроводительных писем через AI -- отсутствует (services/index.js -- заглушка 3 строк, промпты в docs/reference-prompts.py, Phase 4)
- Автоматические ответы в чатах -- отсутствуют (Phase 4)
- Salary parser и experience parser -- отдельные модули не созданы (Phase 1)
- KPI dashboard с воронкой конверсии -- 6- вкладочная wireframe панель существует, но вкладки Overview и Stats содержат демо-данные, реальные KPI и funnel не подключены (Phase 5)
- Адаптивное замедление с визуализацией -- rateLimiter.adaptiveSlowdown существует без UI (Phase 5)
- Тёмная тема -- отсутствует (Phase 6)
- Detailed match breakdown на карточках вакансий -- отсутствует (Phase 6)
- Apply modal с 5-шаговым прогрессом -- отсутствует (Phase 6)
- React-native value setter для simulateTyping -- не реализован (Phase 3)

### 1.4 Цель документа

Настоящий документ представляет собой мастер-план реализации всех функциональных блоков HH Copilot. Документ определяет последовательность задач, сгруппированных по фазам разработки, с указанием приоритетов, зависимостей, критериев приёмки и анти-галлюцинационных проверок для каждой задачи. Каскад задач покрывает весь спектр работ от завершения парсинга и matching engine до подготовки расширения к публикации в Chrome Web Store. Каждая задача содержит исчерпывающее описание того, что необходимо сделать, какие селекторы и API использовать, как проверить корректность реализации и какие риски галлюцинации существуют для конкретного блока.

---

## 2. Архитектура

### 2.1 Текущая модульная структура

Архитектура полностью модульная. Сборочный шаг на базе esbuild собирает модули из src/ в единый IIFE-бандл content.js (Manifest V3 не поддерживает ES modules в content_scripts). Корневой каталог расширения содержит manifest.json, package.json с конфигурацией esbuild (esbuild.config.mjs), и каталог src/ с исходными модулями. Фактическая структура:

```
Корень расширения/
  manifest.json, package.json, esbuild.config.mjs
  content.js -- собираемый бандл (генерируется npm run build)
  background/index.js -- service worker
  popup/index.html, popup/popup.js -- popup интерфейс
  src/ -- исходные модули (42 JS файла)
    content/main.js -- точка входа (boot sequence)
    lib/ -- библиотеки (selectors, anti-hallucination, storage, timing, rate-limiter)
    parsers/ -- парсеры (vacancy-list, vacancy-detail, negotiations, resume-detail/)
    ui/ -- интерфейс (fab, styles, state, auth, panel/, html/, tabs/)
    engine/ -- бизнес-логика (auto-respond -- заглушка)
    services/ -- сервисы (заглушка)
```

Сборочный скрипт esbuild.config.mjs берёт точку входа src/content/main.js и собирает content.js в корень расширения. Все модули используют ES import/export внутри src/, esbuild резолвит зависимости и собирает IIFE-бандл.

### 2.2 Потоки данных

Основной поток данных в расширении начинается с DOM страниц hh.ru. Content script парсит DOM с использованием селекторов из lib/selectors.js, применяет анти-галлюцинационные обёртки из lib/anti-hallucination.js и формирует структурированные объекты (вакансии, резюме, переговоры). Эти объекты проходят валидацию и попадают в модуль engine/matching.js, где рассчитывается скоринг совпадения. Результаты отображаются в ui/panel.js через соответствующие вкладки. При подаче отклика данные о вакансии и шаблон сопроводительного письма передаются в engine/cover-letter.js, который может использовать AI генерацию через services/ai-service.js. Результаты всех действий логируются и сохраняются в chrome.storage.local через lib/storage.js.

Service worker (background/index.js) работает независимо от content script и выполняет фоновые задачи: ежедневный сброс статистики через chrome.alarms, маршрутизацию сообщений между popup и content scripts, обновление badge на иконке расширения. Popup общается с content script через chrome.runtime.sendMessage, передавая запросы на получение статистики, обновление настроек и чтение логов. Content script хранит текущее состояние (список вакансий, резюме, настройки, статистику) в памяти и синхронизирует его с chrome.storage.local. При SPA навигации внутри hh.ru MutationObserver обнаруживает изменения DOM и перезапускает парсинг соответствующей страницы.

Коммуникация между модулями UI осуществляется через CustomEvent bridge (hh-ar-apply, hh-ar-apply-all, hh-ar-refresh, hh-ar-toggle-status, hh-ar-load-resume), что позволяет связывать panel events с engine actions без прямой зависимости.

### 2.3 Компоненты расширения и их взаимосвязи

Расширение состоит из четырёх основных компонент: content script, service worker, popup и chrome.storage.local. Content script является основным рабочим компонентом, который инжектируется на все страницы hh.ru и выполняет парсинг, оценку совпадения и автоматическую подачу откликов. Service worker обеспечивает фоновую обработку и межкомпонентную коммуникацию. Popup предоставляет интерфейс для настройки расширения и просмотра статистики. Хранилище chrome.storage.local является единым источником персистентных данных.

Внутри content script модули организованы по слоям: библиотечный слой (selectors, anti-hallucination, storage, timing, rate-limiter) используется всеми остальными модулями; слой парсеров (vacancy-list, vacancy-detail, resume-list, resume-detail, negotiations) отвечает за извлечение данных из DOM; слой движка (auto-respond, -- matching, skill-gap, cover-letter ещё не реализованы) реализует бизнес-логику; слой UI (panel, html, tabs, fab, styles, state, auth) отвечает за отображение данных и взаимодействие с пользователем; сервисный слой (services/) обеспечивает интеграцию с внешними AI сервисами (заглушка). Каждый слой зависит только от нижележащих слоёв, что обеспечивает тестируемость и предсказуемость поведения.

---

## 3. Каскад задач

### Phase 0: Рефакторинг -- декомпозиция content.js (1636 строк) -- COMPLETED

Файл content.js превышал допустимый размер в 250 строк согласно правилу anti-monolith. Был разбит на 42 модуля и настроен сборочный шаг на esbuild. Manifest V3 content_scripts не поддерживают ES modules (import/export), поэтому используется bundler. esbuild выбран как самый быстрый и минимальный по конфигурации вариант. **Все задачи Phase 0 завершены.**

---

**F0.1 | Настройка сборочного окружения (esbuild) -- COMPLETED**

Приоритет: P0
Зависимости: нет
Сложность: S
Статус: COMPLETED

Описание: Создать package.json в корне расширения с зависимостями: esbuild (devDependency). Создать esbuild.config.mjs с конфигурацией: точка входа src/content/main.js, выходной файл content.js (в корень), формат IIFE, bundle=true, minify=false (для отладки), sourcemap=true. Добавить скрипты в package.json: "build" для сборки, "watch" для режима наблюдения. Обновить manifest.json чтобы ссылался на собираемый content.js. Текущий монолитный content.js переименовать в content.js.bak для резервного копирования. Создать каталог src/ с подкаталогами lib/, parsers/, engine/, ui/, services/, content/, background/. Создать src/content/main.js как точку входа, которая импортирует и инициализирует все модули. Создать src/lib/index.js, src/parsers/index.js, src/engine/index.js, src/ui/index.js как барьерные файлы (re-export).

Реализация: package.json содержит esbuild как devDependency, esbuild.config.mjs настроен (IIFE, bundle, sourcemap), `npm run build` и `npm run watch` работают. manifest.json ссылается на собираемый content.js.

---

**F0.2 | Выделение модуля lib/selectors.js -- COMPLETED**

Приоритет: P0
Зависимости: F0.1
Сложность: S
Статус: COMPLETED

Описание: Извлечь объект HH_SELECTORS и вспомогательные функции getSelectors, findElement, findAllElements из content.js в отдельный модуль src/lib/selectors.js. Экспортировать HH_SELECTORS как const, функции findElement, findAllElements, getSelectors как named exports.

Реализация: src/lib/selectors.js -- 126 строк. HH_SELECTORS с группами селекторов для resume. findElement и findAllElements с fallback-цепочками. Новые селекторы для vacancy и negotiations будут добавлены в Phase 1 (F1.2, F1.4).

---

**F0.3 | Выделение модуля lib/anti-hallucination.js -- COMPLETED**

Приоритет: P0
Зависимости: F0.1
Сложность: S
Статус: COMPLETED

Описание: Извлечь функции safeGetText, safeGetAttr, validateVacancyData, extractVacancyId, waitForElement, safeClick, safeInput, createLogger из content.js в src/lib/anti-hallucination.js. Все функции возвращают конкретные типы (string, null, boolean, object), никогда undefined.

Реализация: src/lib/anti-hallucination.js -- 115 строк. Все 8 функций извлечены и экспортируются. safeQuerySelector, safeQuerySelectorAll, validateResumeData, validateNegotiationData будут добавлены по мере необходимости в соответствующих фазах.

---

**F0.4 | Выделение модуля lib/storage.js -- COMPLETED**

Приоритет: P0
Зависимости: F0.1
Сложность: S
Статус: COMPLETED

Описание: Извлечь константы DEFAULT_SETTINGS, DEFAULT_STATS и функции работы с chrome.storage.local в src/lib/storage.js.

Реализация: src/lib/storage.js -- 90 строк. DEFAULT_SETTINGS, DEFAULT_STATS, функции getAllSettings, getStats, incrementApplied, isAlreadyApplied, markAsApplied, checkDailyReset. Расширенные функции (vacancyCache, resumeData, blacklist, eventLog) будут добавлены в Phase 3-5.

---

**F0.5 | Выделение модуля lib/timing.js -- COMPLETED**

Приоритет: P0
Зависимости: F0.1
Сложность: S
Статус: COMPLETED

Описание: Извлечь функции gaussianRandom, randomDelay, simulateReading, simulateTyping из content.js в src/lib/timing.js.

Реализация: src/lib/timing.js -- 31 строк. gaussianRandom, randomDelay, simulateReading, simulateTyping. simulateLongPause, simulateScrolling, simulateMouseMovement будут добавлены в Phase 3.

---

**F0.6 | Выделение модуля lib/rate-limiter.js -- COMPLETED**

Приоритет: P0
Зависимости: F0.1, F0.4
Сложность: S
Статус: COMPLETED

Описание: Извлечь объект rateLimiter из content.js в src/lib/rate-limiter.js. Rate limiter с адаптивным замедлением.

Реализация: src/lib/rate-limiter.js -- 38 строк. Объект rateLimiter с check, recordAction, adaptiveSlowdown, resetBurst. Cooldown таймеры, getProgress(), exportState() будут добавлены в Phase 3.

---

**F0.7 | Выделение модулей парсеров -- COMPLETED**

Приоритет: P0
Зависимости: F0.1, F0.2, F0.3
Сложность: M
Статус: COMPLETED

Описание: Разбить секцию парсинга на отдельные модули.

Реализация:
- src/parsers/vacancy-list.js -- 65 строк, parseVacanciesFromPage()
- src/parsers/vacancy-detail.js -- 11 строк, заглушка parseVacancyDetail() (Phase 1)
- src/parsers/negotiations.js -- 11 строк, заглушка parseNegotiations() (Phase 1)
- src/parsers/resume-detail.js -- 1 строка, barrel re-export
- src/parsers/resume-detail/index.js -- 79 строк, barrel, parseResume entry point
- src/parsers/resume-detail/parse-resume.js -- 79 строк, основная логика
- src/parsers/resume-detail/parse-company-card.js -- 59 строк
- src/parsers/resume-detail/parse-resume-sections.js -- 179 строк
- src/parsers/resume-detail/parse-resume-education.js -- 111 строк
- src/parsers/resume-detail/diagnose.js -- 173 строк, diagnoseResumeDOM

---

**F0.8 | Выделение модуля UI (panel + tabs) -- COMPLETED**

Приоритет: P0
Зависимости: F0.1, F0.2, F0.3, F0.4, F0.7
Сложность: L
Статус: COMPLETED

Описание: Разбить секцию UI (~400 строк) на модули с 6 вкладками по wireframe.

Реализация: Полностью модульная UI-система:
- src/ui/fab.js (98 строк) -- FAB кнопка с !important CSS изоляцией
- src/ui/styles.js (240 строк) -- CSS шаблонные литералы для Shadow DOM
- src/ui/state.js (57 строк) -- состояние панели (activeTab, isOpen)
- src/ui/auth.js (72 строк) -- пассивная авторизация (checkAuth, pollAuth, authIndicator, username)
- src/ui/panel/index.js (127 строк) -- Shadow DOM контейнер, переключение видимости
- src/ui/panel/render.js (71 строк) -- рендеринг содержимого вкладок
- src/ui/panel/helpers.js (64 строк) -- утилиты рендеринга (escapeHtml)
- src/ui/panel/events.js (161 строк) -- обработчики событий, CustomEvent bridge
- src/ui/html/shell.js (113 строк) -- HTML shell панели с 6 вкладками
- src/ui/html/helpers.js (40 строк) -- HTML утилиты
- src/ui/html/icons.js (26 строк) -- SVG иконки
- src/ui/html/tabs/ (6 файлов) -- HTML генераторы для каждой вкладки
- src/ui/tabs/ (6 файлов) -- рендереры для каждой вкладки (overview, resumes, vacancies, negotiations, settings, stats)

---

**F0.9 | Выделение модуля main.js (boot sequence) -- COMPLETED**

Приоритет: P0
Зависимости: F0.1 - F0.8
Сложность: M
Статус: COMPLETED

Описание: Создать src/content/main.js как точку входа, которая импортирует все модули и выполняет инициализацию.

Реализация: src/content/main.js -- 163 строки. Boot sequence: (1) Инициализация логгера, (2) Auth gate через checkAuth(), (3) detectPageType() по URL паттернам, (4) Запуск соответствующего парсера, (5) Создание FAB и панели, (6) SPA MutationObserver (debounce 1 сек).

---

### Phase 0.5: Дополнительная реализованная работа (не входила в оригинальный каскад)

В процессе рефакторинга Phase 0 была выполнена дополнительная работа, которая не планировалась в оригинальном каскаде задач.

---

**F0.5.1 | FAB CSS изоляция с !important -- COMPLETED**

Реализация: src/ui/fab.js использует `style.setProperty(prop, value, 'important')` для всех CSS свойств FAB кнопки. Это предотвращает переопределение стилей hh.ru (которые могут иметь высокие специфичности через Magritte CSS). FAB корректно отображается на всех страницах hh.ru, включая страницы с агрессивными глобальными стилями.

---

**F0.5.2 | Auth UX -- пассивная авторизация -- COMPLETED**

Реализация: src/ui/auth.js (72 строки). Пассивная авторизация через checkAuth() -- поллинг DOM элементов (секция профиля пользователя) каждые 2 секунды с cookie fallback. authIndicator -- кликабельный элемент в панели, отображающий статус авторизации. При авторизации извлекается и отображается username пользователя. Auth gate корректно блокирует функциональность панели для неавторизованных пользователей.

---

**F0.5.3 | 6- вкладочная wireframe панель -- COMPLETED**

Реализация: Панель содержит 6 вкладок по wireframe: Overview (Обзор), Resume (Резюме), Vacancies (Вакансии), Negotiations (Переговоры), Settings (Настройки), Stats (Статистика). Каждая вкладка имеет HTML генератор (ui/html/tabs/) и рендерер (ui/tabs/). Вкладки переключаются через tab bar в shell.js. Все вкладки содержат демо-данные для визуализации layout. Реальные данные подключены для Vacancies (парсинг) и Resumes (парсинг).

---

**F0.5.4 | Client-side фильтрация вакансий -- COMPLETED**

Реализация: src/ui/tabs/vacancies.js (74 строки) и src/ui/panel/events.js (161 строки) реализуют клиентскую фильтрацию списка вакансий. Фильтры: текстовый поиск по названию/компании, фильтр по статусу (new/applied/blacklisted), фильтр по диапазону match score. Фильтрация происходит в реальном времени при изменении фильтров.

---

**F0.5.5 | Blacklist management UI -- COMPLETED**

Реализация: Возможность добавления/удаления компаний в чёрный список через UI панели. Вакансии из чёрного списка скрываются из списка. Действия логируются через toast-уведомления. Данные сохраняются в chrome.storage.local (ключ blacklistedCompanies).

---

**F0.5.6 | Version sync механизм -- COMPLETED**

Реализация: Версия v1.7.2 синхронизирована между manifest.json, package.json, popup/index.html (footer) и src/ui/html/shell.js (footer панели). Единый источник истины -- manifest.json, остальные файлы обновляются при изменении версии.

---

**F0.5.7 | CustomEvent bridge система -- COMPLETED**

Реализация: src/ui/panel/events.js определяет CustomEvent bridge для коммуникации между UI и бизнес-логикой. События: hh-ar-apply (откликнуться на вакансию), hh-ar-apply-all (массовый отклик), hh-ar-refresh (обновить данные), hh-ar-toggle-status (переключить статус вакансии), hh-ar-load-resume (загрузить данные резюме). Это позволяет связывать panel events с engine actions без прямой зависимости UI от engine.

---

### Phase 1: Core Parsing Enhancement -- парсинг вакансий, деталей, переговоров

---

**F1.1 | Парсер деталей вакансии (parseVacancyDetail)**

Приоритет: P0
Зависимости: F0.2, F0.3
Сложность: M

Описание: Реализовать функцию parseVacancyDetail() в src/parsers/vacancy-detail.js для извлечения полных данных со страницы вакансии (/vacancy/{id}). Функция должна извлекать: заголовок (data-qa="vacancy-title"), название компании (data-qa="vacancy-company-name"), зарплата (data-qa="vacancy-compensation"), локация (data-qa="vacancy-address"), опыт работы (data-qa="vacancy-experience"), тип занятости (data-qa="vacancy-employment-mode"), график работы (data-qa="vacancy-schedule"), описание вакансии (data-qa="vacancy-description"), навыки из описания (data-qa="skills-element" или .bloko-tag__text внутри description), ключевые навыки (data-qa="vacancy-sidebar-skills"), условия работы, информация о компании. Необходимы fallback-цепочки для каждого поля. Парсинг зарплаты должен извлекать числовые значения и валюту для дальнейшего использования в matching engine. Парсинг опыта должен извлекать минимальный и максимальный опыт в годах (например "3-6 лет" -> {min: 3, max: 6}).

Критерии приёмки: На странице реальной вакансии hh.ru parseVacancyDetail() извлекает все поля. Заголовок >= 3 символа. Зарплата парсится в числовой формат (parseInt). Опыт парсится в объект {min, max}. Навыки извлекаются как массив строк. Описание содержит полный текст вакансии.

Анти-галлюцинация: Проверить что parseInt("Не указана") не возвращает NaN (должен быть fallback 0). Проверить что парсинг опыта "1-3 года" и "3-6 лет" работает корректно для разных словоформ. Убедиться что навыки не содержат дубликатов. Проверить что функция не крашит на вакансиях без зарплаты, без опыта, без навыков.

---

**F1.2 | Добавление селекторов для страницы вакансии**

Приоритет: P0
Зависимости: F0.2
Сложность: S

Описание: Провести диагностику DOM страницы вакансии (/vacancy/{id}) аналогично diagnoseResumeDOM. Добавить в HH_SELECTORS группы селекторов: vacancyDescriptionContent, vacancyKeySkills, vacancyEmploymentType, vacancyScheduleType, vacancyConditions, vacancyAboutCompany, vacancySimilarVacancies. Для каждого поля создать fallback-цепочку из 2-3 селекторов. Создать диагностическую функцию diagnoseVacancyDOM() по аналогии с diagnoseResumeDOM() для сбора data-qa атрибутов и проверки корректности селекторов.

Критерии приёмки: Каждая группа селекторов содержит массив с 2+ элементами. diagnoseVacancyDOM() выводит дамп data-qa в консоль. Все селекторы протестированы на реальной странице hh.ru (DevTools Console).

Анти-галлюцинация: Запустить diagnoseVacancyDOM() на 5 разных страницах вакансий и убедиться что селекторы стабильны. Проверить что нет селекторов с хэшированными Magritte классами (не работают). Все селекторы используют data-qa или стабильные Bloko BEM классы.

---

**F1.3 | Парсер переговоров (parseNegotiations)**

Приоритет: P1
Зависимости: F0.2, F0.3
Сложность: L

Описание: Реализовать функцию parseNegotiations() в src/parsers/negotiations.js для страницы /applicant/negotiations. Функция должна извлекать список чатов с работодателями. Для каждого чата: название компании, позиция, последнее сообщение, дата последнего сообщения, статус (invitation/interview/dialog/waiting/rejection), количество непрочитанных сообщений, URL чата. Селекторы для парсинга: контейнеры чатов (data-qa="negotiations-item" или fallback), непрочитанный badge (data-qa="unread-badge" или .bloko-badge), статус (по текстовому содержимому или data-qa). Список чатов может быть пагинирован, поэтому необходимо парсить текущую страницу и предоставлять информацию для навигации к следующей.

Критерии приёмки: На странице переговоров hh.ru parseNegotiations() извлекает список чатов. Каждый чат содержит company, position, lastMessage, date, status, unread count. Status является одним из предопределённых значений. Непрочитанные чаты корректно определяются.

Анти-галлюцинация: Проверить что парсер работает на пустом списке переговоров (без чатов). Проверить что status распознаётся корректно для разных состояний (приглашение на собеседование, ожидание ответа, отказ). Убедиться что unread count является числом, а не строкой.

---

**F1.4 | Добавление селекторов для переговоров**

Приоритет: P1
Зависимости: F0.2
Сложность: M

Описание: Провести диагностику DOM страницы переговоров (/applicant/negotiations). Добавить в HH_SELECTORS группы: negotiationsChatItem, negotiationsChatCompany, negotiationsChatPosition, negotiationsChatLastMessage, negotiationsChatDate, negotiationsChatUnreadBadge, negotiationsChatStatus, negotiationsChatLink. Проверить стабильность селекторов на разных аккаунтах (если возможно) и при разном количестве чатов. Создать диагностическую функцию diagnoseNegotiationsDOM().

Критерии приёмки: Селекторы находят элементы на реальной странице переговоров. diagnoseNegotiationsDOM() выводит структурированный дамп. Fallback-цепочки работают при отсутствии основных data-qa атрибутов.

Анти-галлюцинация: Проверить что селекторы не зависят от конкретных CSS-классов Magritte (хэшируемые). Убедиться что data-qa атрибуты стабильны между сессиями. Проверить что парсер корректно обрабатывает длинные списки чатов (50+).

---

**F1.5 | Улучшение парсинга зарплаты**

Приоритет: P1
Зависимости: F0.3, F1.1
Сложность: S

Описание: Создать модуль src/lib/salary-parser.js с функцией parseSalaryString(str) для преобразования строки зарплаты в числовой формат. Функция должна обрабатывать форматы: "от 200 000 руб." -> {from: 200000, to: null, currency: 'RUR'}, "до 300 000 руб." -> {from: null, to: 300000, currency: 'RUR'}, "200 000 - 300 000 руб." -> {from: 200000, to: 300000, currency: 'RUR'}, "Не указана" -> {from: null, to: null, currency: null}, "от $5000" -> {from: 5000, to: null, currency: 'USD'}. Использовать regex для извлечения чисел (с пробелами-разделителями) и валют. Функция getSalaryMidpoint(salary) возвращает среднее значение для использования в matching engine. Функция isSalaryAcceptable(vacancySalary, resumeSalary, tolerance) проверяет совпадение с допустимым отклонением (default 30%).

Критерии приёмки: parseSalaryString("от 250 000 руб.") возвращает {from: 250000, to: null, currency: 'RUR'}. parseSalaryString("200 000 - 300 000 руб.") возвращает {from: 200000, to: 300000, currency: 'RUR'}. getSalaryMidpoint({from: 200000, to: 300000}) возвращает 250000. isSalaryAcceptable с tolerance=0.3 корректно сравнивает зарплаты.

Анти-галлюцинация: Проверить что parseInt работает с пробелами-разделителями ("250 000" -> 250000). Убедиться что null зарплата не вызывает ошибок в вычислениях (все функции возвращают null или 0 вместо NaN). Проверить что валюты USD, EUR, RUR распознаются корректно.

---

**F1.6 | Улучшение парсинга опыта**

Приоритет: P1
Зависимости: F0.3, F1.1
Сложность: S

Описание: Создать функцию parseExperienceString(str) в src/lib/experience-parser.js для преобразования строки опыта в числовой диапазон. Функция должна обрабатывать: "3-6 лет" -> {min: 3, max: 6}, "от 3 лет" -> {min: 3, max: null}, "1 год" -> {min: 1, max: 1}, "без опыта" -> {min: 0, max: 0}. Использовать regex для извлечения чисел. Функция getExperienceYears(resume) вычисляет общий опыт из массива записей опыта в резюме (сумма периодов в годах). Функция isExperienceMatch(vacancyExp, resumeYears, penalty) проверяет совпадение с штрафом за overqualification (default penalty: -0.5 при превышении более чем в 2 раза).

Критерии приёмки: parseExperienceString("3-6 лет") возвращает {min: 3, max: 6}. parseExperienceString("без опыта") возвращает {min: 0, max: 0}. isExperienceMatch({min: 3, max: 6}, 5) возвращает true. isExperienceMatch({min: 1, max: 3}, 10) возвращает reduced score.

Анти-галлюцинация: Проверить все словоформы ("год", "года", "лет"). Убедиться что parseExperienceString(null) возвращает {min: 0, max: 0}. Проверить что вычисление опыта из резюме корректно обрабатывает отсутствующие периоды (duration undefined).

---

### Phase 2: Matching Engine -- скоринг, skill gap, Jaccard similarity

---

**F2.1 | Matching Engine -- взвешенный скоринг**

Приоритет: P0
Зависимости: F1.1, F1.5, F1.6
Сложность: L

Описание: Реализовать src/engine/matching.js с функцией calculateMatchScore(vacancy, resume) возвращающей объект {total: number, breakdown: {skills: number, salary: number, experience: number, position: number, location: number}}. Веса: навыки 30%, зарплата 25%, опыт 20%, позиция 15%, локация 10%. Навыки: Jaccard similarity с alias matching (k8s=kubernetes, pg=postgresql, js=javascript, tf=terraform, aws=amazon web services, node=node.js). Создать словарь алиасов в виде Map. Зарплата: overlap-based сравнение с 30% tolerance. Опыт: range matching с штрафом за overqualification. Позиция: word overlap с keyword boosting (developer, senior, lead, frontend, backend). Локация: точное совпадение или substring matching для крупных городов. Функция scoreClass(score) возвращает CSS класс для цветового кодирования: 'score-high' (>=70), 'score-medium' (40-69), 'score-low' (<40).

Критерии приёмки: calculateMatchScore возвращает объект с total в [0, 100]. breakdown.skills вычисляется через Jaccard. breakdown.salary учитывает tolerance. breakdown.experience учитывает overqualification penalty. Идеальное совпадение (все навыки совпадают, зарплата совпадает, опыт совпадает) даёт total >= 90.

Анти-галлюцинация: Проверить что Jaccard similarity для пустых множеств возвращает 0 (не NaN). Убедиться что salary comparison с null значениями не крашит. Проверить что aлиасы не создают ложных совпадений (например "go" не должен мэтчить "golang" без явного алиаса). Проверить что total всегда округлён до целого числа.

---

**F2.2 | Skill Gap Analysis**

Приоритет: P1
Зависимости: F2.1
Сложность: M

Описание: Реализовать функцию findSkillGaps(resume, vacancies) в src/engine/skill-gap.js. Функция анализирует все вакансии (в кэше или переданные явно), фильтрует те где match score >= 70%, извлекает уникальные навыки из этих вакансий, сравнивает с навыками резюме и возвращает топ-5 недостающих навыков с процентом востребованности. Результат: [{skill: "Kubernetes", demand: 85, presentInResume: false}, {skill: "Docker Compose", demand: 72, presentInResume: false}, ...]. demand = процент вакансий с высоким скором, где этот навык указан. Для корректной работы необходимо нормализовать навыки (lowercase, trim) и использовать словарь алиасов из F2.1.

Критерии приёмки: При наличии 20 вакансий с match >= 70% функция возвращает массив до 5 элементов. Каждый элемент содержит skill (string), demand (0-100), presentInResume (boolean). Результат отсортирован по demand по убыванию. При отсутствии вакансий возвращает [].

Анти-галлюцинация: Проверить что функция работает с пустым массивом вакансий. Убедиться что demand корректно вычисляется как percentage, не как count. Проверить что навыки из резюме не попадают в результат (presentInResume=true фильтруется). Убедиться что нормализация навыков не объединяет разные навыки (React != React Native без явного правила).

---

**F2.3 | Интеграция matching engine в парсер вакансий**

Приоритет: P0
Зависимости: F2.1, F0.7
Сложность: M

Описание: Интегрировать calculateMatchScore в parseVacanciesFromPage. После парсинга каждой вакансии из списка, если в хранилище есть данные резюме (getResumeData()), рассчитать match score и сохранить в vacancy.matchScore. Также рассчитать breakdown для отображения в UI. Обновить структуру объекта vacancy: добавить matchScore (number), matchBreakdown (object с 5 метриками). В UI вкладки "Вакансии" отображать match score рядом с каждой вакансией. Цветовое кодирование: зеленый (>= 70), жёлтый (40-69), красный (< 40).

Критерии приёмки: На странице поиска вакансий каждая карточка в панели показывает match score. Score соответствует calculated value (проверить вручную). Цвет корректно отражает уровень совпадения. При отсутствии данных резюме match score = null и отображается "--".

Анти-галлюцинация: Проверить что расчёт скоринга для 20 вакансий не блокирует UI (асинхронный расчёт или batch). Убедиться что null/undefined в данных резюме не вызывают краш matching engine. Проверить что при обновлении данных резюме пересчёт происходит корректно.

---

**F2.4 | Расширение словаря алиасов навыков**

Приоритет: P2
Зависимости: F2.1
Сложность: M

Описание: Расширить словарь алиасов для Jaccard similarity. Текущие алиасы: k8s=kubernetes, pg=postgresql, js=javascript. Добавить: tf=terraform, aws=amazon web services, node=node.js, reactjs=react, golang=go, python3=python, ts=typescript, css3=css, html5=html, mongo=mongodb, mysql2=mysql, rdbms=sql, ci/cd=devops, agile=scrum, kanban=scrum, oop=object oriented. Алиасы должны быть двусторонними (обратное отображение). Создать отдельный файл src/engine/skill-aliases.js с Map. Добавить возможность пользовательских алиасов через настройки.

Критерии приёмки: Словарь содержит 30+ пар алиасов. calculateMatchScore с алиасами даёт более высокий score чем без них для вакансий с аббревиатурами. Пользовательские алиасы сохраняются в chrome.storage и применяются при расчёте.

Анти-галлюцинация: Проверить что алиасы не создают циклов (a=b, b=a - корректно, но a=b, b=c, c=a - проверить). Убедиться что короткие алиасы (2 символа) не создают ложных совпадений. Проверить что регистр не влияет на мэтчинг (lowercase нормализация).

---

### Phase 3: Auto-Apply -- ручной, полуавтоматический, полностью автоматический режимы

---

**F3.1 | Ручной отклик -- 5-шаговый modal**

Приоритет: P0
Зависимости: F1.1, F0.3, F0.5, F0.6
Сложность: L

Описание: Реализовать полный процесс отклика на вакансию в src/engine/auto-respond.js. Процесс состоит из 5 шагов, отображаемых в modal окне внутри Shadow DOM панели. Шаг 1 -- Pre-flight check: проверка rate limiter (дневной, часовой лимит, минимальный интервал, burst), проверка что вакансия не откликнута ранее, проверка наличия кнопки отклика. Шаг 2 -- Навигация: сохранение pendingApply в chrome.storage ({vacancyId, vacancyUrl, timestamp}), window.location.href = vacancyUrl. Шаг 3 -- Ожидание и поиск: waitForElement для кнопки отклика на странице вакансии (selectors: replyButton), проверка текста кнопки (не "уже откликнулись"). Шаг 4 -- Обработка alert-ов: проверка presence of relocationWarning, testTaskRequired, indirectEmployerAlert. Для каждого alert -- соответствующий обработчик (подтвердить релокацию, предупредить о тестовом задании). Шаг 5 -- Заполнение и отправка: клик по кнопке отклика, waitForElement popup, заполнение сопроводительного письма (если template задан), клик submit, верификация (popup исчез или кнопка изменила текст). Каждый шаг логируется и отображает прогресс в modal.

Критерии приёмки: Нажатие кнопки "Откликнуться" в панели открывает modal. Modal показывает 5 шагов с текущим прогрессом. Pre-flight check блокирует при превышении лимитов. Навигация корректно переходит на страницу вакансии. Кнопка отклика находится и кликается. Alert-ы обрабатываются. Сопроводительное письмо заполняется. Отклик отправляется (верификация по изменению кнопки).

Анти-галлюцинация: Проверить что pendingApply имеет timestamp и игнорируется если старше 2 минут (stale state). Убедиться что waitForElement с timeout не зависает навсегда. Проверить что safeClick не кликает по невидимым кнопкам. Убедиться что simulateTyping использует React-safe native setter. Проверить что при ошибке на любом шаге процесс корректно прерывается и логируется.

---

**F3.2 | Обработка CAPTCHA и 429 ошибок**

Приоритет: P0
Зависимости: F3.1, F0.6
Сложность: M

Описание: Реализовать обнаружение и обработку CAPTCHA и HTTP 429 (rate limit) в процессе отклика. CAPTCHA detection: проверить наличие элементов [data-qa="captcha"], img[src*="captcha"], .g-recaptcha на странице после клика по кнопке отклика. При обнаружении CAPTCHA: остановить процесс, логировать с уровнем error, показать уведомление пользователю в modal ("Обнаружена CAPTCHA, решите вручную"), увеличить adaptiveFactor в rate limiter. 429 detection: мониторинг network requests (через performance API или response headers), при обнаружении 429: остановить, логировать, показать уведомление, увеличить adaptiveFactor, установить cooldown таймер. После CAPTCHA/429 пользователь должен продолжить вручную или дождаться cooldown.

Критерии приёмки: CAPTCHA обнаруживается и останавливает процесс. Modal показывает сообщение для пользователя. Rate limiter adaptiveFactor увеличивается. После ручного решения CAPTCHA пользователь может продолжить. 429 ошибка обнаруживается и обрабатывается аналогично.

Анти-галлюцинация: Убедиться что CAPTCHA detection не даёт ложных срабатываний на обычных страницах. Проверить что adaptiveFactor не растёт бесконечно (max 5.0). Убедиться что cooldown таймер корректно работает и не блокирует навсегда. Проверить что после остановки процесса нет "висящих" промисов.

---

**F3.3 | Полуавтоматический режим (semi-auto)**

Приоритет: P1
Зависимости: F3.1
Сложность: M

Описание: Реализовать semi-auto режим, в котором расширение автоматически проходит pre-flight check, навигацию, поиск кнопки и ожидание popup, но останавливается перед заполнением и отправкой, показывая confirm dialog пользователю. Confirm dialog отображает: название вакансии, компанию, match score, заполненное сопроводительное письмо (для предпросмотра), кнопки "Отправить" и "Отмена". Пользователь может отредактировать письмо перед отправкой. Если пользователь нажимает "Отправить", процесс продолжается с шага 5 (заполнение и отправка). Режим задаётся в настройках (settings.mode = 'semi-auto').

Критерии приёмки: В semi-auto режиме процесс отклика останавливается перед отправкой. Confirm dialog показывает корректные данные. Пользователь может отредактировать письмо. Нажатие "Отправить" продолжает процесс. Нажатие "Отмена" отменяет процесс без отправки.

Анти-галлюцинация: Проверить что confirm dialog корректно отображается внутри Shadow DOM. Убедиться что письмо не отправляется без явного подтверждения. Проверить что при закрытии modal confirm dialog тоже закрывается. Убедиться что редактирование письма использует React-safe input.

---

**F3.4 | Полностью автоматический режим (auto)**

Приоритет: P2
Зависимости: F3.1, F3.2, F3.3
Сложность: L

Описание: Реализовать fully auto режим, в котором расширение автоматически откликается на все вакансии с match score >= minMatchScore. Функция applyToAll() берёт список вакансий из кэша, фильтрует по условиям: status='new', hasReply=true, matchScore >= minMatchScore, сортирует по matchScore (высокий первый). Для каждой вакансии: rate limiter check -> apply -> wait interval -> next. Batch timing: каждые 5 откликов -- длинная пауза simulateLongPause (25-40 сек). Прерывание при: дневной лимит, часовой лимит, CAPTCHA, ошибка 429, 3 ошибки подряд. В UI отображается прогресс: "Отклик 5/20" с progress bar. Очередь вакансий хранится в chrome.storage для персистентности между сессиями. Auto mode активируется кнопкой "Авто-отклик" на вкладке вакансий или через настройки (settings.mode = 'auto').

Критерии приёмки: Кнопка "Авто-отклик" запускает массовую подачу. Каждая вакансия проходит полный 5-шаговый процесс. Rate limiter корректно ограничивает скорость. Batch паузы работают каждые 5 откликов. Процесс останавливается при достижении лимитов или CAPTCHA. Progress bar корректно отражает прогресс. Очередь персистентна (сохраняется в storage).

Анти-галлюцинация: Проверить что applyToAll не создаёт бесконечный цикл при ошибке одной вакансии (try/catch + continue). Убедиться что batch пауза реально работает (проверить timing через логи). Проверить что очередь корректно восстанавливается после перезагрузки страницы. Убедиться что simultaneous applies не создаются (mutex/lock). Проверить что process можно остановить кнопкой "Стоп".

---

**F3.5 | Typing simulation для cover letter**

Приоритет: P1
Зависимости: F0.5, F3.1
Сложность: S

Описание: Улучшить simulateTyping в lib/timing.js. Текущая реализация использует el.value = el.value + char, что не является React-safe. Заменить на React-native value setter (Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set). Добавить настройки: скорость набора (30-120ms на символ, настраивается), вариация скорости (случайное ускорение/замедление для естественности), паузы между словами (200-400ms), паузы между предложениями (500-800ms), случайные опечатки и исправления (optional, настраивается). Добавить toggle "Имитация набора" в настройки. Когда toggle выключен -- вставлять текст мгновенно через native setter без посимвольного набора.

Критерии приёмки: simulateTyping заполняет textarea символ за символом. React state обновляется корректно (текст отправляется при submit). Скорость настраивается через настройки. При выключенном toggle текст вставляется мгновенно.

Анти-галлюцинация: Проверить что native setter работает в React 18 (проверить на странице вакансии hh.ru). Убедиться что dispatchEvent('input') вызывает React re-render. Проверить что textarea не теряет фокус в процессе набора. Убедиться что быстрая вставка (toggle off) не вызывает ValidationError от hh.ru.

---

**F3.6 | Черный список компаний -- расширенное UI**

Приоритет: P2
Зависимости: F0.4, F3.4
Сложность: M

Описание: Расширить UI для управления чёрным списком компаний. Вкладка "Настройки" (settings tab) добавить секцию "Чёрный список" с: списком компаний в чёрном списке (с кнопкой "Удалить" для каждой), полем ввода для добавления новой компании, кнопкой "Импортировать из вакансий" (добавляет компании из текущего списка вакансий). Во вкладке "Вакансии" добавить кнопку "В чёрный список" на каждой карточке вакансии. Вакансии из чёрного списка скрываются из списка (если включён toggle hideBlacklist). Данные хранятся в chrome.storage.local под ключом blacklistedCompanies как массив строк.

Примечание: базовый blacklist add/remove с toast логированием уже реализован (F0.5.5). Данная задача расширяет его полноценным UI в настройках и импортом из вакансий.

Критерии приёмки: Кнопка "В чёрный список" на карточке вакансии добавляет компанию. Секция в настройках показывает список компаний. Кнопка "Удалить" убирает компанию из списка. Toggle hideBlacklist скрывает вакансии чёрного списка. Состояние персистентно (сохраняется между сессиями).

Анти-галлюцинация: Проверить что дубликаты не добавляются (проверка includes перед push). Убедиться что удаление компании корректно обновляет UI вакансий. Проверить что пустой чёрный список не вызывает ошибок при рендеринге. Убедиться что company name сравнение case-insensitive.

---

### Phase 4: AI Integration -- сопроводительные письма, ответы в чатах

---

**F4.1 | Интеграция z-ai-web-dev-sdk для генерации cover letter**

Приоритет: P1
Зависимости: F3.1
Сложность: L

Описание: Реализовать модуль src/services/ai-service.js для генерации сопроводительных писем с использованием z-ai-web-dev-sdk (chat completions API). Функция generateCoverLetter(vacancy, resume, tone, template) формирует промпт на основе данных вакансии и резюме, отправляет запрос к AI API и возвращает текст письма. Промпт должен включать: системный промпт с инструкцией написать сопроводительное письмо на русском языке, данные вакансии (title, company, skills, description), данные резюме (title, skills, experience summary), тон письма (formal/confident/friendly), шаблон с переменными {position}, {company}, {skills}, {experience}. Переменные шаблона заменяются на реальные данные. Если template пустой -- AI генерирует письмо с нуля. Если template задан -- AI адаптирует его под конкретную вакансию. Настройки: API key сохраняется в chrome.storage.local, toggle "AI генерация" в настройках.

Критерии приёмки: generateCoverLetter возвращает строку с текстом письма. Письмо на русском языке. Письмо содержит упоминание компании и позиции. Тон соответствует настройке. При отсутствии API key функция возвращает fallback (template с заменой переменных). При ошибке API функция не крашит (возвращает fallback).

Анти-галлюцинация: Проверить что AI API вызов не блокирует UI (асинхронный). Убедиться что при таймауте API (30 сек) функция возвращает fallback. Проверить что промпт не содержит персональных данных которые не должны уходить на сервер. Убедиться что fallback письмо корректно подставляет переменные {position}, {company}.

---

**F4.2 | AI ответы в переговорах**

Приоритет: P2
Зависимости: F1.3, F4.1
Сложность: L

Описание: Реализовать функцию generateChatReply(message, context, resume) в src/services/ai-service.js для генерации ответов в чатах переговоров. Функция принимает: последнее сообщение от работодателя, контекст (история переписки, позиция, компания), данные резюме. Промпт формируется с учётом контекста и инструкцией ответить профессионально на русском языке. Ответы должны быть краткими (до 200 символов для стандартных вопросов, до 500 для развёрнутых). В UI чата (вкладка "Переговоры") добавить кнопку "AI ответ" рядом с полем ввода сообщения. При нажатии: генерировать ответ, показать в textarea для предпросмотра, пользователь может отредактировать перед отправкой. Типовые сценарии: приглашение на собеседование (подтверждение), вопрос о зарплатных ожиданиях, вопрос о доступности, запрос портфолио.

Критерии приёмки: Кнопка "AI ответ" генерирует текст ответа. Ответ соответствует контексту (не абстрактный). Ответ на русском языке. Пользователь может отредактировать перед отправкой. При отсутствии API key кнопка неактивна.

Анти-галлюцинация: Проверить что AI не генерирует ответы с ложными данными (зарплата, опыт, навыки которых нет в резюме). Убедиться что prompt не содержит полную историю переписки если она длинная (ограничение токенов). Проверить что кнопка "AI ответ" не спамит API при быстрых нажатиях (debounce).

---

**F4.3 | Управление API ключом и квотами**

Приоритет: P1
Зависимости: F4.1
Сложность: S

Описание: Реализовать управление API ключом в настройках. Добавить в popup/settings: поле ввода API key (type=password), кнопка "Проверить" (тестовый запрос к API), отображение количества оставшихся запросов (если API предоставляет лимиты), кнопка "Сбросить ключ". API key хранится в chrome.storage.local, зашифрованный через chrome.storage (не plain text). Добавить лимит на количество AI запросов в день (default 50) для предотвращения перерасхода. Счётчик AI запросов сохраняется в stats.aiRequestsToday. При превышении лимита -- fallback на template-based письмо.

Критерии приёмки: API key сохраняется и считывается корректно. Кнопка "Проверить" отправляет тестовый запрос и показывает результат. Лимит AI запросов в день работает корректно. При превышении лимита используется fallback.

Анти-галлюцинация: Убедиться что API key не отображается в логах (маскировка: "***"). Проверить что неверный API key обрабатывается корректно (ошибка, не краш). Убедиться что лимит запросов сбрасывается при смене дня.

---

### Phase 5: Analytics and UX -- KPI, воронка, лимиты, адаптивное замедление

---

**F5.1 | Вкладка "Обзор" (Overview) -- KPI dashboard**

Приоритет: P1
Зависимости: F0.4, F0.8
Сложность: L

Описание: Реализовать вкладку "Обзор" в src/ui/tabs/overview.js. Содержимое: (1) Статус авторизации -- индикатор (зелёный "Авторизован" или красный "Не авторизован") с детекцией через findElement('logged_in_indicator'). (2) KPI карточки 2x2: "Откликов сегодня" (stats.appliedToday), "Приглашений" (stats.interviewInvites), "Ошибок" (stats.errorsToday), "Всего" (stats.totalApplied). (3) Прогресс-бар дневного лимита: {appliedToday}/{dailyLimit} с процентным заполнением и countdown до следующего доступного отклика (nextAvailableAt - Date.now()). (4) Прогресс-бар часового лимита: аналогично дневному. (5) Adaptive slowdown индикатор: текущий adaptiveFactor с визуализацией (норма = зелёный, замедление = жёлтый, сильное замедление = красный). (6) Auto-apply статус: текущий режим (manual/semi-auto/auto), кнопка start/pause, фильтр (новые вакансии + score >= minMatchScore), размер очереди. (7) Recent activity log -- последние 10 событий из chrome.storage logs.

Примечание: wireframe для вкладки "Обзор" уже существует (ui/html/tabs/overview.js -- 170 строк HTML, ui/tabs/overview.js -- 83 строк рендерер). Данная задача подключает реальные данные вместо демо.

Критерии приёмки: Вкладка "Обзор" отображает все 7 блоков. KPI карточки показывают актуальные данные. Progress bars корректно заполняются. Countdown обновляется каждую секунду. Auto-apply статус показывает корректный режим. Activity log обновляется при новых событиях.

Анти-галлюцинация: Проверить что все числовые значения валидны (Number.isFinite). Убедиться что countdown не показывает отрицательные значения. Проверить что progress bar не превышает 100%. Убедиться что activity log не показывает undefined или null записей.

---

**F5.2 | Вкладка "Статистика" -- stats 2x2 + funnel + event log**

Приоритет: P1
Зависимости: F0.4, F0.8
Сложность: L

Описание: Реализовать вкладку "Статистика" (ранее "Логи") в src/ui/tabs/stats.js. Содержимое: (1) Stats 2x2: те же KPI карточки что и в Overview для быстрого доступа. (2) Progress bar дневного лимита. (3) Conversion funnel (воронка конверсии): Просмотры -> Отклики -> Приглашения -> Собеседования -> Офферы. Каждый этап показывает count и конверсию от предыдущего этапа (percentage). Данные для funnel: viewsToday (подсчитывается из кэша вакансий), appliedToday, interviewInvites, interviewsScheduled (новое поле в stats), offersReceived (новое поле). (4) Event log: список событий с цветовой кодировкой по уровню (Info = серый, Warn = жёлтый, Error = красный), timestamp, module, action. Фильтр по уровню. Пагинация (по 50 записей с кнопкой "Загрузить ещё"). Кнопка "Экспорт логов" (JSON формат).

Примечание: wireframe для вкладки "Статистика" уже существует (ui/html/tabs/stats.js -- 67 строк HTML, ui/tabs/stats.js -- 106 строк рендерер). Данная задача подключает реальные данные вместо демо.

Критерии приёмки: Вкладка "Статистика" отображает все 4 блока. Funnel показывает корректные данные. Конверсии рассчитываются корректно (percentage 0-100). Event log фильтруется по уровню. Пагинация работает. Экспорт логов скачивает JSON файл.

Анти-галлюцинация: Проверить что funnel не показывает NaN процентов (при делении на 0). Убедиться что event log корректно сортирован по timestamp (новые сверху). Проверить что экспорт JSON валиден (JSON.parse не бросает исключение). Убедиться что очень длинные лог-сообщения не ломают layout.

---

**F5.3 | Расширенная статистика -- трекинг просмотров, приглашений, собеседований**

Приоритет: P2
Зависимости: F0.4, F5.2
Сложность: M

Описание: Расширить систему статистики. Добавить трекинг: viewsToday -- количество уникальных вакансий просмотренных сегодня (подсчитывается при parseVacanciesFromPage), interviewInvites -- количество приглашений на собеседование (подсчитывается при parseNegotiations по статусу invitation), interviewsScheduled -- количество запланированных собеседований (из переговоров), offersReceived -- количество офферов (из переговоров). Добавить dailyStats -- массив ежедневных записей для построения трендов: [{date: '2026-06-09', applied: 15, views: 80, invites: 3}, ...]. Сохранять последние 30 дней. Добавить conversion rates: responseRate = appliedToday / viewsToday, inviteRate = interviewInvites / appliedToday. Отображать rates в KPI карточках.

Критерии приёмки: dailyStats содержит записи за последние 30 дней. viewsToday корректно подсчитывается. interviewInvites обновляется при парсинге переговоров. Conversion rates рассчитываются и отображаются.

Анти-галлюцинация: Проверить что dailyStats не растёт бесконечно (limit 30 дней, удаление старых). Убедиться что conversion rates не делят на ноль (viewsToday = 0 -> responseRate = 0). Проверить что парсинг переговоров корректно определяет приглашения.

---

**F5.4 | Адаптивное замедление с визуализацией**

Приоритет: P2
Зависимости: F0.6, F5.1
Сложность: M

Описание: Расширить rate limiter визуализацией в UI. Добавить в Overview вкладку блок "Адаптивное замедление": текущий adaptiveFactor (число), визуальный индикатор (полоска от 1.0 до 5.0), история изменений adaptiveFactor (последние 10 записей с timestamp и причиной). Причины замедления: 429 (красный), CAPTCHA (красный), slow response (жёлтый), manual (серый, при ручном изменении). Добавить кнопку "Сбросить замедление" для ручного сброса adaptiveFactor до 1.0. В auto-apply процессе показывать текущий интервал между откликами (с учётом adaptiveFactor).

Критерии приёмки: Блок "Адаптивное замедление" отображает текущий factor. Визуальный индикатор корректно отражает уровень (1.0 = зелёный, 2.0 = жёлтый, 3.0+ = красный). История изменений показывает последние 10 записей. Кнопка сброса работает.

Анти-галлюцинация: Убедиться что adaptiveFactor сбрасывается при смене дня (automatic daily reset). Проверить что визуальный индикатор корректно ограничен диапазоном [1.0, 5.0]. Убедиться что история не растёт бесконечно (limit 10).

---

### Phase 6: Polish -- темы, лендинг, Chrome Web Store

---

**F6.1 | Тёмная тема**

Приоритет: P2
Зависимости: F0.8
Сложность: M

Описание: Реализовать тёмную тему для Shadow DOM панели и popup. Использовать CSS custom properties (переменные) для всех цветов. Определить два набора переменных: light-theme и dark-theme. Переключение через toggle в настройках (settings.darkTheme). Сохранять выбор в chrome.storage.local. Светлая тема (по умолчанию): фон #ffffff, текст #1a1a1a, акцент #2964FF, рамки #e2e8f0. Тёмная тема: фон #1e1e2e, текст #e0e0e0, акцент #5b8aff, рамки #3a3a4e. Переменные: --bg-primary, --bg-secondary, --bg-card, --text-primary, --text-secondary, --accent, --accent-hover, --border, --success, --warning, --danger, --badge-bg. Обновить все компоненты UI для использования переменных вместо хардкода цветов.

Критерии приёмки: Toggle переключает тему. Все цвета корректно меняются (фон, текст, рамки, кнопки, progress bars, карточки). Тема сохраняется между сессиями. Popup также поддерживает тёмную тему. Отсутствуют хардкодные цвета (используются только CSS переменные).

Анти-галлюцинация: Проверить все 14 CSS переменных в обеих темах (нет undefined, нет невалидных цветов). Убедиться что текст читаем на фоне в обеих темах (контрастность). Проверить что переключение темы не ломает layout.

---

**F6.2 | Вкладка "Резюме" -- Skill Gap Analysis UI**

Приоритет: P1
Зависимости: F2.2, F0.8
Сложность: M

Описание: Расширить вкладку "Резюме" блоком Skill Gap Analysis. Блок показывает: заголовок "Пробелы в навыках", топ-5 недостающих навыков с горизонтальной полоской востребованности (процент), кнопка "Обновить" для пересчёта (запускает findSkillGaps с текущими данными). Каждый навык в списке показывает: название навыка, процент востребованности (bar), количество вакансий где встречается. Блок отображается только если в кэше есть вакансии с match >= 70% и данные резюме загружены. При отсутствии данных -- сообщение "Загрузите резюме и просмотрите вакансии для анализа пробелов".

Критерии приёмки: Блок "Пробелы в навыках" отображает до 5 навыков. Полоски востребованности корректно отражают проценты. Кнопка "Обновить" пересчитывает результат. При отсутствии данных показывается сообщение-заглушка.

Анти-галлюцинация: Проверить что demand percentage не превышает 100. Убедиться что навыки резюме не попадают в список (фильтрация). Проверить что полоски корректно масштабируются (ширина = demand%).

---

**F6.3 | Вкладка "Вакансии" -- фильтры и сортировка**

Приоритет: P1
Зависимости: F2.3, F0.8
Сложность: M

Описание: Расширить вкладку "Вакансии" элементами фильтрации и сортировки. Добавить: (1) Текстовый поиск -- фильтрация по названию вакансии или компании (input с debounce 300ms). (2) Фильтр по статусу -- выпадающий список (Все/Новые/Откликнутые/Чёрный список). (3) Фильтр по match score -- range slider (от X% до Y%) с отображением текущего диапазона. (4) Сортировка -- по match score (убывание/возрастание), по дате (новые/старые), по зарплате (высокая/низкая). (5) Карточки вакансий с detailed match breakdown: Skills (30%), Salary (25%), Experience (20%), Position (15%), Location (10%) -- каждая метрика с цветной полоской. (6) Кнопка "Откликнуться" на каждой карточке (открывает 5-шаговый modal из F3.1). (7) Кнопка "В чёрный список" на каждой карточке.

Примечание: базовая client-side фильтрация вакансий (поиск, статус, score range) уже реализована (F0.5.4). Blacklist add/remove тоже реализован (F0.5.5). Данная задача добавляет сортировку, detailed match breakdown, кнопку отклика и range slider.

Критерии приёмки: Текстовый поиск фильтрует вакансии в реальном времени. Фильтр по статусу корректно скрывает/показывает вакансии. Range slider фильтрует по match score. Сортировка работает для всех режимов. Match breakdown отображает 5 метрик на каждой карточке.

Анти-галлюцинация: Проверить что debounce не фильтрует слишком быстро (300ms). Убедиться что фильтры комбинируются корректно (пересечение). Проверить что range slider не пропускает значения вне [0, 100]. Убедиться что breakdown полоски корректно ограничены [0, 100]%.

---

**F6.4 | Вкладка "Вакансии" -- Apply modal и Shimmer эффект**

Приоритет: P1
Зависимости: F3.1, F6.3
Сложность: M

Описание: Реализовать modal для отклика и shimmer эффект. Apply modal: (1) Шаг 1 -- Pre-flight: отображение check-результатов (rate limit ok, vacancy not applied, reply button exists), зелёные галочки для passed, красные крестики для failed. (2) Шаг 2 -- Навигация: countdown 3-2-1 перед переходом. (3) Шаг 3 -- Ожидание: spinner с сообщением "Поиск кнопки отклика...". (4) Шаг 4 -- Alert-ы: отображение обнаруженных предупреждений с кнопками обработки. (5) Шаг 5 -- Отправка: прогресс-бар заполнения письма, кнопка submit. Shimmer эффект: вакансии с match score >= 80% получают визуальное выделение (subtle gradient border + shimmer animation CSS). Shimmer используется как рекомендация "высокий приоритет".

Критерии приёмки: Modal отображает 5 шагов с корректной информацией. Countdown перед навигацией работает. Spinner отображается при ожидании. Alert-ы показываются с кнопками. Shimmer эффект корректно анимируется (CSS keyframes, performance-friendly).

Анти-галлюцинация: Проверить что shimmer не вызывает performance issues (использовать transform вместо position). Убедиться что modal закрывается при нажатии вне области (backdrop click). Проверить что countdown не блокирует закрытие modal.

---

**F6.5 | Вкладка "Переговоры" -- список чатов и навигация**

Приоритет: P1
Зависимости: F1.3, F0.8
Сложность: M

Описание: Реализовать вкладку "Переговоры" в src/ui/tabs/negotiations.js. Содержимое: (1) Список чатов с работодателями. Каждый чат показывает: название компании, позиция, последнее сообщение (обрезанное), дата, статус badge (приглашение/собеседование/диалог/ожидание/отказ), количество непрочитанных (badge с числом). (2) Фильтр по статусу. (3) Сортировка по дате (новые сверху) и по непрочитанным. (4) Клик по чату -- открывает страницу переговоров в новой вкладке (window.open с URL чата). (5) Кнопка "Обновить" для повторного парсинга. При отсутствии чатов -- сообщение "Нет активных переговоров".

Примечание: wireframe для вкладки "Переговоры" уже существует (ui/html/tabs/negotiations.js -- 65 строк HTML, ui/tabs/negotiations.js -- 81 строк рендерер). Данная задача подключает реальные данные вместо демо и добавляет кликабельность/навигацию.

Критерии приёмки: Вкладка "Переговоры" отображает список чатов. Каждый чат показывает все поля. Badge непрочитанных корректно отображается. Фильтр по статусу работает. Клик по чату открывает соответствующую страницу.

Анти-галлюцинация: Проверить что длинные сообщения обрезаются корректно (CSS text-overflow). Убедиться что badge не показывает undefined при 0 непрочитанных. Проверить что status badge использует корректные цвета для каждого типа.

---

**F6.6 | Вкладка "Настройки" -- полная реализация**

Приоритет: P1
Зависимости: F0.4, F0.8
Сложность: M

Описание: Реализовать вкладку "Настройки" в src/ui/tabs/settings.js с полным управлением настройками расширения. Секции: (1) Основные настройки: минимальный match score (range slider 0-100), режим отклика (manual/semi-auto/auto -- radio buttons), дневной лимит откликов (number input), часовой лимит (number input), минимальный интервал между откликами (number input, секунды). (2) Поведение: toggle "Имитация набора текста", toggle "Скрывать вакансии из чёрного списка", toggle "Автопрокрутка пагинации". (3) AI настройки: API key (password input), кнопка "Проверить", лимит AI запросов в день (number input), тон письма (select: formal/confident/friendly). (4) Шаблон сопроводительного письма: textarea с поддержкой переменных {position}, {company}, {skills}, {experience}. (5) Чёрный список: список компаний, поле ввода для добавления, кнопки "Удалить" и "Импортировать из вакансий". Все настройки сохраняются в chrome.storage.local при изменении.

Примечание: wireframe для вкладки "Настройки" уже существует (ui/html/tabs/settings.js -- 90 строк HTML, ui/tabs/settings.js -- 59 строк рендерер). Данная задача подключает реальные данные и логику сохранения.

Критерии приёмки: Все настройки отображаются и редактируются. Изменения сохраняются в chrome.storage.local при потере фокуса (onblur/onchange). Чёрный список корректно добавляет/удаляет компании. API key поле маскируется (type=password). Toggle переключения мгновенно отражаются.

Анти-галлюцинация: Проверить что number input не принимает отрицательные значения или NaN. Убедиться что сохранение настроек не вызывает ошибок при переполнении storage. Проверить что шаблон письма корректно сохраняет спецсимволы ({position} и т.д.).

---

**F6.7 | Подготовка к публикации в Chrome Web Store**

Приоритет: P2
Зависимости: Все предыдущие фазы
Сложность: M

Описание: Подготовить расширение для публикации. (1) Оптимизировать размер бандла: включить minify для production build (добавить "build:prod" в package.json). (2) Создать иконки: 16x16, 48x48, 128x128 для manifest. (3) Написать описание расширения для Chrome Web Store (на русском и английском). (4) Создать скриншоты: 1280x800, минимум 3 скриншота (панель на странице вакансий, вкладка "Обзор" с KPI, вкладка "Вакансии" с фильтрами). (5) Удалить все console.log из production build (или заменить на условный логгер с уровнями). (6) Убедиться что расширение не использует запрещённые API. (7) Проверить что все permissions в manifest.json минимально необходимы. (8) Создать privacy policy (если используется API key -- указать что хранится локально). (9) Протестировать на Chrome, Edge, Brave. (10) Упаковать как .zip для загрузки.

Критерии приёмки: Production build (< 1MB минифицированный). Иконки корректного размера и формата. Описание содержит все ключевые фичи. Скриншоты отражают реальный функционал. Расширение работает на Chrome 120+, Edge 120+, Brave 1.60+.

Анти-галлюцинация: Убедиться что minified бандл не содержит утечек API key или персональных данных. Проверить что все external references (CDN, внешние шрифты) заменены на bundled ресурсы или удалены. Убедиться что расширение не использует eval() или Function() (запрещено Chrome Web Store для Manifest V3).

---

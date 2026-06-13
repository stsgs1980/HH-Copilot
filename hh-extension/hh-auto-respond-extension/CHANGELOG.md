# HH Copilot — Changelog

Все значимые изменения в расширении фиксируются в этом файле.
Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).

---

## [1.9.28.0] — 2026-06-12

### Исправлено
- **Sponsored VotD (adsrv.hh.ru)** — 3 из 14 «Вакансий дня» пропускались из-за tracking URL (`adsrv.hh.ru/click?meta=ENCRYPTED`) без `vacancyId`. ID вакансии теперь извлекается из числового `id` атрибута родительского элемента (например, `id="131408939"`). Трёхуровневая стратегия извлечения: (1) параметр `vacancyId` в click-URL, (2) ближайшая ссылка с `vacancyId=`, (3) `id` атрибут ancestor-элемента `/^\d{6,12}$/`.
- Все VotD элементы теперь получают канонический URL `https://hh.ru/vacancy/{id}` вместо tracking URL.
- Добавлены тесты: извлечение ID из parent `id`, канонический URL для VotD, парсинг adsrv.hh.ru URL.

---

## [1.9.27.0] — 2026-06-12

### Исправлено
- **VotD парсинг (0/14)** — «Вакансия дня» на главной hh.ru возвращала 0 элементов. Причина: ссылки VotD — tracking URL (`content.hh.ru/api/v1/vacancy_of_the_day/click?vacancyId=XXX`), а не стандартные `/vacancy/XXX`. `extractVacancyId()` теперь распознаёт `?vacancyId=NNN` в query-параметрах. `parseVacanciesOfTheDay()` использует `titleEl.closest('a')` для поиска click-URL.
- Добавлены 5 тестов `extractVacancyId` для VotD URL-паттернов.
- Добавлены 6 тестов парсинга VotD с реалистичной DOM-структурой.
- Тестовый набор: 67 тестов проходят.

---

## [1.9.26.0] — 2026-06-12

### Добавлено
- **Парсинг вакансий на главной странице** — при открытии `hh.ru/` расширение парсит два блока: (1) рекомендованные вакансии с `~=` word-match для `data-qa` атрибутов и `href` fallback; (2) блок «Вакансия дня» через `data-qa="vacancy_of_the_day_title"` с тремя стратегиями извлечения ID вакансии.
- Добавлен маршрут `mainPage` в `detectPageType()` для URL-паттерна `/` на `hh.ru`.
- `parseVacanciesOfTheDay()` — новая функция-парсер для блоков VotD.

---

## [1.9.25.0] — 2026-06-12

### Добавлено
- **Hot Module Replacement (HMR)** — расширение автоматически перезагружается при изменении файлов в процессе разработки. WebSocket-сервер (`ws://localhost:35729`) запускается через `npm run watch`. Content script слушает reload-сообщения и вызывает `chrome.runtime.reload()`. Устраняет ручную перезагрузку расширения при разработке.

---

## [1.9.24.0] — 2026-06-12

### Исправлено
- **35 проблем WCAG/типографики** во всём sidebar UI:
  - **Контраст**: вторичный текст `#71717a` → `#52525b`, placeholder `#6b7280`, disabled button `#6b7280`, tour skip `#71717a` → `#52525b`.
  - **Невалидные CSS-свойства**: удалены `role:status`, `role:alert`, `aria-live:assertive`, `tabindex:0` из CSS-деклараций.
  - **Focus indicators**: `:focus-visible` стили для tab buttons, toggles, vacancy items, tour buttons.
  - **Типографика**: `font-variant-numeric: tabular-nums` на score rings, `-webkit-font-smoothing: antialiased`.
  - **ARIA атрибуты**: `role="status"` + `<span class="sr-only">` на spinner, `role="switch"` на toggle, `aria-expanded`/`aria-controls` на timeline toggles, `role="radiogroup"` на stats period, `role="article"` + `aria-label` на vacancy items, `aria-label` на blacklist delete, `aria-valuenow` на range inputs, `lang="ru"` + `role="dialog"` на sidebar, `aria-hidden` на decorative dots.
  - **Клавиатурная навигация**: WAI-ARIA tabs с Arrow/Home/End клавишами, Escape закрывает sidebar, focus trap (Tab циклит внутри sidebar), управление фокусом при открытии/закрытии, Enter/Space активирует ссылки вакансий.
- Исправлен баг переключения вкладок — отсутствующий `data-tab` атрибут на кнопках вкладок.
- Исправлен рендеринг `&nbsp;` как буквального текста в UI sidebar.

---

## [1.9.23.0] — 2026-06-11

### Изменено
- **Anti-monolith рефакторинг**: split `match-scorer.js` на 4 сфокусированных модуля — `match-scorer-skills.js` (skill overlap 0-40), `match-scorer-title.js` (title similarity 0-30), `match-scorer-salary.js` (salary fit 0-15), `match-scorer-experience.js` (experience match 0-15). Главный `match-scorer.js` теперь тонкий оркестратор.
- Удалён `cascade-guard` submodule (репозиторий удалён на GitHub).

---

## [1.9.22.0] — 2026-06-11

### Добавлено
- **Синонимное сопоставление навыков** — связанные навыки частично учитываются в скоринге. Если вакансия требует «P&L», а в резюме «управление продажами», группа синонимов даёт partial match bonus. Группы синонимов: продажи, IT, маркетинг, HR, лидерство.

---

## [1.9.21.0] — 2026-06-11

### Исправлено
- **Рекомендации «Что улучшить»** — заменён шумный «10 навыков не в описаниях опыта» на действенный «навыков вакансии нет в резюме», показывающий только реальные пробелы. Создан общий utility `vacancy-skills-collector.js`.

---

## [1.9.20.0] — 2026-06-11

### Исправлено
- Пропуск навыков, уже входящих в `derivedSkills`, при формировании рекомендаций — нет дублирующих предупреждений для навыков, которые у пользователя уже есть.

---

## [1.9.19.0] — 2026-06-11

### Добавлено
- **Вывод навыков вакансии из должности** — карточки вакансий на странице поиска редко содержат `keySkills`, поэтому `deriveVacancySkills()` извлекает навыки из названия вакансии через `SKILL_PATTERNS` и эвристики.
- Добавлены кросс-ссылки sales/commercial: «коммерческ» ↔ «продаж» ↔ «менеджер по развитию».
- Добавлены недостающие навыки в skill-dictionary: стратегия продаж, LTV, ROI, построение воронки продаж, unit-экономика.
- **Исправление скоринга опыта** — штраф за «overqualified» удалён. Превышение максимального опыта НЕ является штрафом на российском рынке труда. 10+ лет при требовании «3-6 лет» теперь даёт 12/15 (было 8/15).

---

## [1.9.18.0] — 2026-06-11

### Исправлено
- **10 багов из code review**: парсинг типа занятости, парсинг формата работы, обработка multi-value форматов, логика карьерного роста, ложнопозитивные размытые фразы, границы кириллических regex, конкретные непокрытые навыки в рекомендациях, tooltip для непокрытых навыков, улучшения тура.

---

## [1.9.17.0] — 2026-06-11

### Исправлено
- **Парсер навыков** — 5 fallback-стратегий при отсутствии `skills-card` data-qa в DOM hh.ru (Magritte redesign): skills-table, heading detection, `data-qa*="skill"` scan, Magritte tag scan.
- **Скоринг опыта** — парсинг строки опыта вакансии («3-6 лет») в структурированный формат `{min:3, max:6}`.
- **Навигация по вакансиям** — удалена сломанная SPA-интерцепция кликов, блокировавшая навигацию.

---

## [1.9.16.0] — 2026-06-11

### Добавлено
- **SPA-навигация** — `pushState`/`replaceState` патч в `page-world.js` (MAIN world). Интерцепция кликов по ссылкам вакансий/резюме через `pushState` вместо полной перезагрузки страницы. `MutationObserver` с 1-секундным debounce автоматически перепарсивает вакансии.

---

## [1.9.15.9] — 2026-06-11

### Добавлено
- **Производные навыки из опыта** — `skill-dictionary.js` (50+ паттернов русских ключевых слов навыков) + `derive-skills.js` автоматически извлекает навыки из описаний опыта работы. Интегрировано в оба пути парсинга резюме (DOM и fetch). `scoreSkills()` теперь использует `derivedSkills` с весом 70%.

---

## [1.9.15.6] — 2026-06-11

### Исправлено
- **initPageLogic() не вызывалась** — заменён сломанный `dynamic import()` на паттерн `CustomEvent 'hh-ar-init-page-logic'`. Добавлена страховка: auto-call через 3с на страницах вакансий. `initPageLogic()` сделана идемпотентной для предотвращения дублирования.

---

## [1.9.15.5] — 2026-06-11

### Добавлено
- **Парсер детальной вакансии** — `parseVacancyDetail()` извлекает все поля со страниц `/vacancy/{id}`: title, company, salary, experience, description, key skills, employment type, work format.
- **Скоринг совпадений** — `calculateMatchScore(vacancy, resume)` возвращает `{total: 0-100, breakdown: {skills, salary, experience, position, location}}`.
- **Хранилище вакансий** — `storage-vacancies.js` сохраняет данные вакансий между сессиями.

---

## [1.9.14] — 2026-06-11

### Добавлено
- **Блок «Оценка резюме»** во вкладке Резюме — объективная оценка полноты заполнения:
  - Кольцевая диаграмма с % (цвет: зелёный ≥70%, амбарный ≥40%, красный <40%)
  - Чеклист из 11 критериев с весами: позиция, имя, зарплата, город, контакты, навыки (3+), опыт (1+), образование, языки, о себе, занятость/формат
  - Подсказка в зависимости от процента

### Изменено
- **Блок «Совпадение навыков» перенесён из вкладки Резюме во вкладку Вакансии** — анализ навыков vs вакансий логичнее привязать к вакансиям, а не к резюме
- Переименован: «Анализ навыков» → «Совпадение навыков» (более точное название)

---

## [1.9.13] — 2026-06-11

### Исправлено
- **Контакты: слитный текст «Электронная почтаfoo@bar.com»** — `textContent` элемента `[data-qa="resume-contact-email"]` содержит лейбл + email. Теперь email извлекается через regex из текста или через `mailto:` href (чистый email без лейбла)
- **Контакты: телефон не парсился** — `[data-qa="resume-contact-phone"]` не совпадал с реальной структурой hh.ru. Добавлены: приоритет `tel:` href, расширенные data-qa селекторы (`[data-qa*="contact-phone"]`), поиск `a[href^="tel:"]` в блоке контактов, regex по тексту блока
- **Контакты: ложный телеграм @hh_ru_official** — regex `@(\w{4,})` захватывал ссылку hh.ru из футера. Исправлено: telegram ищется только в блоке контактов, исключены системные аккаунты hh.ru (hh_ru_official, hhru, hh_ru и др.)
- Оба парсера синхронизированы: `parseContacts()` (живая страница) и `parseContactsFromDoc()` (fetch) используют идентичную логику

### Изменено
- **Блок «Анализ навыков» скрыт, пока нет вакансий** — раньше показывал бесполезный «0%» с текстом «откройте вакансии для сравнения». Теперь блок полностью скрыт, пока не загружены вакансии для сравнения

---

## [1.9.12] — 2026-06-11

### Исправлено
- **Контакты «Данные не найдены»** — телефон, email и telegram не парсились при загрузке через fetch (синхронизация всех резюме). `parseContactsFromDoc()` не вызывался в `fetchAndParseResume()`, хотя вызывался в `parseResume()` для живой страницы
- Добавлен `parseContactsFromDoc()` в `resume-fetch-parse.js` — парсинг контактов из fetched HTML с fallback-стратегиями:
  - `data-qa` селекторы (primary)
  - `mailto:` ссылки
  - Regex-паттерны для телефона и email
  - Поиск `t.me/` ссылок по всему документу
- Добавлены поля `phone`, `email`, `telegram` в модель резюме в `fetchAndParseResume()`

---

## [1.9.11] — 2026-06-11

### Добавлено
- **Блок «Все резюме» — сворачиваемый аккордеон** — блок теперь можно свернуть/развернуть кликом по заголовку (data-timeline toggle + шеврон)
- Счётчики видимых/скрытых резюме (badge) в заголовке аккордеона

### Изменено
- Порядок блоков: «Все резюме» теперь сверху, «Действующее резюме» — ниже
- Anti-monolith рефакторинг: split iframe-vis strategies, centralize panelState mutations
- Версия: 1.9.10 → 1.9.11

---

## [1.9.10] — 2026-06-11

### Изменено
- Anti-monolith рефакторинг: все файлы ≤200 строк, panelState centralised
- Split 6 monolith файлов, centralize chrome.storage
- Split main.js (454→139), events.js (301→209), centralize storage
- Обновлены submodules: anti-hallucination-guard (cascade-guard удалён)

---

## [1.9.9] — 2026-06-11

### Исправлено
- **Скрытые резюме отмечались видимыми** — три бага в цепочке определения видимости:
  1. **Преждевременный fallback UNKNOWN→VISIBLE** в `extractVisibilityStatus()` и `parseResumeList()` — список резюме сразу помечал UNKNOWN как VISIBLE, не дожидаясь проверки детальной страницы. Убран: UNKNOWN остаётся UNKNOWN до проверки страницы резюме
  2. **Strategy 2 в `detectVisibilityFromResumePage()`** — `text.includes('скрыть')` совпадало с любым элементом («скрыть контакты», «скрыть раздел» и т.д.), возвращая VISIBLE. Исправлено: только точное совпадение «скрыть резюме»
  3. **Страница резюме перекрывала список** — если страница возвращала VISIBLE (ложноположительно), это перезаписывало правильный HIDDEN из списка. Новая приоритетная логика: HIDDEN побеждает VISIBLE (и из списка, и со страницы); VISIBLE побеждает UNKNOWN; финальный fallback UNKNOWN→VISIBLE только в `syncAllResumes()` после всех проверок
- Финальный fallback UNKNOWN→VISIBLE перенесён из `extractVisibilityStatus()` / `parseResumeList()` в `syncAllResumes()` — срабатывает только после того, как и список, и детальная страница проверены

---

## [1.9.8] — 2026-06-11

### Добавлено
- **Определение видимости с страницы резюме** — `detectVisibilityFromResumePage()` в `resume-fetch-resume.js`:
  6 стратегий определения скрытого/видимого статуса из HTML детальной страницы резюме:
  1. `data-qa` атрибуты (`resume-make-visible`, `resume-action-hide`)
  2. Текст кнопок («Сделать видимым» = скрыто, «Скрыть резюме» = видно)
  3. Текст body с индикаторами скрытости
  4. Поиск по raw HTML с нормализацией `&nbsp;`
  5. Script/hydration JSON (`"hidden": true`)
  6. Наличие `data-qa="resume-action-hide"` = видимое
- Данные со страницы резюме **переопределяют** данные со списка (более надёжные)
- **Радио-кнопки в списке «Все резюме»** — выбор действующего резюме кликом по карточке (◉ активное, ○ неактивное)
- **Кнопка ↻ (перепарсить)** на карточке активного резюме — контекстная: амбарная для скрытого, стандартная для видимого
- **«Взять со страницы» CTA** в блоке «Все резюме» — показывается только на странице резюме, когда нет активного

### Изменено
- **Консолидация кнопок** — с 7 видимых кнопок до 2 основных:
  - Убрана «Перепарсить действующее/скрытое» — заменена на ↻ на карточке
  - «Взять со страницы» перенесён из пустого состояния в «Все резюме»
  - «Синхронизировать все» стала outline (вторичная)
  - Диагностика свёрнута за шеврон (3 кнопки скрыты)
- **Раскрывающийся селектор удалён** — заменён на радио-кнопки (устранены случайные клики)
- **Переименование кнопки** — «Сделать текущее действующим» → «Взять со страницы» (устранена путаница «текущее» vs «действующее»)
- **Переименование блока** — «Парсинг резюме» → «Действующее резюме»
- Предупреждение о скрытом резюме — теперь текст вместо кнопки

### Исправлено
- **`getResumePageType()` возвращала `'resume'` вместо `'resume-detail'`** — из-за этого подсказка «Нажмите „Взять со страницы" ниже» и CTA-кнопка НИКОГДА не показывались на странице резюме. Оба потребителя (`render-resume-panel.js`, `render-my-resumes.js`) сравнивали с `'resume-detail'`
- **detectVisibilityFromLinkText()** — больше не возвращает VISIBLE преждевременно; возвращает UNKNOWN, позволяя другим стратегиям (card, proximity, script) отработать
- **Финальный fallback UNKNOWN→VISIBLE** — добавлен после ВСЕХ стратегий в `resume-fetch-helpers.js` и `resume-detail/index.js`
- **Скрытые резюме не пере-скрывались** после повторного скрытия на hh.ru — исправлено определением со страницы резюме

---

## [1.9.7] — 2026-06-11

### Добавлено
- **Спиннеры загрузки для кнопок** — все 3 кнопки (load-resume, sync-resumes, analyze-skills) показывают loading-состояние с `btn-spinner` и восстановлением после завершения
- **Событие `hh-ar-load-resume-done`** — рассылается после завершения загрузки резюме для восстановления кнопки
- **Событие `hh-ar-sync-done`** — рассылается после завершения синхронизации для восстановления кнопки

### Изменено
- Версия: 1.9.6 → 1.9.7
- Popup version sync: v1.7.3 → v1.9.7
- README version sync: v1.8.3 → v1.9.7

---

## [1.9.6] — 2026-06-11

### Добавлено
- **Strategy 5/6 sub-modules** — декомпозиция strategy5-scanners.js и strategy6 подмодулей из монолитных файлов
- `resume-fetch-strategy5-scanners.js` — сканеры для strategy 5 (DOM scanners для поиска JSON в script-тегах)
- `resume-fetch-strategy6-urls.js` — API/URL fallback-подходы для strategy 6
- `resume-fetch-strategy6-iframe.js` — скрытый iframe (PRIMARY метод strategy 6)
- `resume-fetch-strategy6-expand.js` — оркестратор expand для strategy 6
- `resume-fetch-strategy6-api.js` — API-based fallback для strategy 6

### Исправлено
- **Experience scroll & text truncation** — исправлено обрезание текста и прокрутка в секции опыта
- Версия: 1.9.5 → 1.9.6

---

### Исправлено
- **Strategy 6: скрытый iframe вместо AJAX** — диагностика показала, что кнопка «Развернуть»
  НЕ использует AJAX. React/Magritte загружает все данные опыта при client-side hydration,
  а кнопка просто переключает видимость компонентов. Поскольку полные данные отсутствуют
  в SSR HTML и `<script>` тегах, единственный надёжный способ получить все записи — загрузить
  страницу в скрытый iframe, дождаться React hydration, нажать «Развернуть» и распарсить DOM.
  - Новый метод `fetchExpandedExperienceViaIframe()` — PRIMARY подход в Strategy 6
  - Новый метод `parseExperienceFromIframeDoc()` — парсинг DOM из iframe
  - Существующие подходы (API endpoints, query params) оставлены как fallback

### Изменено
- **Anti-monolith рефакторинг resume-fetch.js** — файл 1481 строк разбит на 8 модулей:
  - `resume-fetch.js` (~45 строк) — тонкий оркестратор (импорты + реэкспорты + syncAllResumes)
  - `resume-fetch-list.js` (~65 строк) — fetchResumeList()
  - `resume-fetch-resume.js` (~150 строк) — fetchAndParseResume() + парсеры хедера/скиллов + опыт-оркестратор
  - `resume-fetch-experience.js` (~95 строк) — стратегии 1-3 (DOM-based опыт)
  - `resume-fetch-strategy4-text.js` (~145 строк) — стратегия 4 (текстовый поиск) + stripHtmlTags
  - `resume-fetch-strategy5-scripts.js` (~190 строк) — стратегия 5 (script JSON)
  - `resume-fetch-strategy6-expand.js` (~370 строк) — стратегия 6 (iframe, API, URL)
  - `resume-fetch-json-utils.js` (~130 строк) — JSON-утилиты (extractJsonArray, buildEntryFromApiItem, findExperienceInObject)
  - `resume-fetch-education-languages.js` (~50 строк) — образование + языки + о себе
- Публичный API не изменён: `fetchResumeList`, `fetchAndParseResume`, `syncAllResumes` реэкспортятся из resume-fetch.js
- Версия: 1.9.4 → 1.9.5

---

## [1.9.4] — 2026-06-11

### Добавлено
- **Спиннер загрузки в панели** — при нажатии «Загрузить с текущей страницы» в `#res-parsed-data`
  показывается `.har-spinner` + текст «Загрузка резюме...» вместо пустого состояния
- **Strategy 6: расширенный парсинг опыта через AJAX/API** — новая стратегия для получения
  скрытых записей опыта (3→6), которые hh.ru подгружает лениво через «Показать все»:
  - (a) Поиск URL кнопок «Показать все» (href, data-url, data-action-url)
  - (b) Поиск Magritte expansion URLs в `<script>` тегах
  - (c) Пробуем известные API-эндпоинты (`/applicant/api/v1/resumes/{id}`, `api.hh.ru/resumes/{id}`)
  - (d) Пробуем параметры расширения (`?expand=all`, `?expand=experience`, `?showAll=true`)
  - (e) Парсинг JSON API ответов (hh.ru API формат: position, company, start/end dates)
  - (f) Парсинг expanded HTML документов (company-cards + stepper + text patterns)
- **JSON API парсер** — `parseExperienceFromJson()` с рекурсивным поиском массива опыта
  в произвольной структуре JSON + `buildEntryFromApiItem()` для конвертации hh.ru API полей

### Исправлено
- **Логгер невидимый в Chrome DevTools** — `console.debug` скрыт по умолчанию, заменён на
  `console.log` — теперь все `[HH-AR][ResumeFetch]` сообщения видны без включения Verbose

### Изменено
- `parseExperienceFromDoc()` стала `async` для поддержки Strategy 6 (fetch-запросы)
- `fetchAndParseResume()` теперь `await parseExperienceFromDoc()`
- Версия: 1.9.2 → 1.9.4

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

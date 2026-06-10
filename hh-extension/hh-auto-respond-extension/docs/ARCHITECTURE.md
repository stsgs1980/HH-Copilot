# HH Copilot -- Архитектура расширения

**Версия:** 1.5.2
**Тип:** Chrome Extension (Manifest V3)
**Целевая платформа:** hh.ru (Magritte дизайн-система)


## 1. Компонентная диаграмма

```
+-------------------------------------------------------------+
|                     BROWSER (hh.ru)                          |
|                                                              |
|  +-------------------------------------------------------+  |
|  |              Content Scripts (document_idle)           |  |
|  |                                                       |  |
|  |  +------------+  +------------+  +------------------+  |  |
|  |  |  PARSER    |  |   PANEL    |  |      AUTH         |  |  |
|  |  |            |  |            |  |                   |  |  |
|  |  | parseVac-  |  | ShadowDOM  |  |  checkAuth()     |  |  |
|  |  | ancies()   |  |  Sidebar   |  |  13 selectors     |  |  |
|  |  | parseRes-  |  |  FAB btn   |  |  cookie fallback |  |  |
|  |  | ume()      |  |  2 tabs    |  |                   |  |  |
|  |  +------+-----+  +-----+------+  +--------+---------+  |  |
|  |         |               |                  |            |  |
|  |  +------v---------------v------------------v--------+ |  |
|  |  |              Shared Libraries                   | |  |
|  |  |  SELECTORS     ANTI-HALLUCINATION   STORAGE      | |  |
|  |  |  findElement    safeGetText          chrome.stor  | |  |
|  |  |  findAllEl      safeClick            age.local    | |  |
|  |  |  waitForElem    safeInput            defaults     | |  |
|  |  |                 validate             daily reset  | |  |
|  |  |                 waitForEl            appliedList   | |  |
|  |  |  TIMING         RATE LIMITER        DOM observer | |  |
|  |  |  gaussian       token bucket         SPA nav      | |  |
|  |  |  simulateTyp    adaptive slow        panelState   | |  |
|  |  +---------------------------------------------------+ |  |
|  +-------------------------------+-----------------------+  |
|                                  |                          |
|  +-------------------------------v-----------------------+  |
|  |        Service Worker (background/index.js)          |  |
|  |  onInstalled: init storage, create daily alarm       |  |
|  |  onAlarm:    reset daily counters at midnight         |  |
|  |  onMessage:  route get-stats, get-settings,          |  |
|  |              apply-vacancy, log, settings-updated      |  |
|  |  updateBadge: appliedToday number on icon             |  |
|  +-------------------------------+-----------------------+  |
|                                  |                          |
|  +-------------------------------v-----------------------+  |
|  |              Popup (popup/index.html)                 |  |
|  |  Tab 1: Statistics   -- applied/interviews/errors     |  |
|  |  Tab 2: Settings     -- mode/limits/intervals        |  |
|  |  Tab 3: Templates    -- cover letter with vars        |  |
|  |  Tab 4: Logs         -- last 50 entries               |  |
|  +-------------------------------+-----------------------+  |
|                                  |                          |
|  +-------------------------------v-----------------------+  |
|  |       chrome.storage.local (Persistent)               |  |
|  |  settings, stats, appliedVacancies, resume,           |  |
|  |  blacklistedCompanies, logs, dailyResetDate          |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

Три контекста исполнения: Content Script (работает на страницах hh.ru), Service Worker (фоновый процесс расширения), Popup (UI при клике на иконку). Связь между ними: chrome.storage.local для данных и chrome.runtime.sendMessage для команд.


## 2. Потоки данных

### 2.1 Поток парсинга вакансий

```
[Страница hh.ru загружена]
        |
        v
manifest.json: content_scripts inject content.js (document_idle)
        |
        v
initPageLogic() -- определение типа страницы по URL
        |
        +-- /search/vacancy*  --> parseVacanciesFromPage()
        +-- /vacancy/{id}     --> initVacancyPage() (заглушка)
        +-- /resume/{hash}    --> parseResume()
        +-- /applicant/resumes --> parseResumeList()
        +-- *                 --> checkAuth() + createFab()
        |
        v  (для /search/vacancy)
parseVacanciesFromPage()
        |
        +-- findAllElements('vacancyCard') --> NodeList карточек
        |
        +-- Для каждой карточки:
        |       |
        |       +-- findElement('vacancyTitleLink', card) --> titleEl
        |       |       +-- safeGetText(titleEl) --> title
        |       |       +-- safeGetAttr(titleEl, 'href') --> url
        |       |       +-- extractVacancyId(url) --> id
        |       |
        |       +-- findElement('vacancyCompany', card) --> company
        |       +-- findElement('vacancySalary', card) --> salary
        |       +-- findElement('vacancyLocation', card) --> location
        |       +-- findElement('vacancyExperience', card) --> experience
        |       +-- card.querySelectorAll('.bloko-tag__text') --> skills[]
        |       +-- findElement('replyButton', card) --> hasReply
        |       |
        |       +-- validateVacancyData(vacancy) --> {valid, errors}
        |       +-- Проверка: уже откликнуты? Чёрный список?
        |       +-- Добавление в vacancies[]
        |
        v
panelState.vacancies = vacancies
        |
        v
renderSidebarContent() --> отрисовка карточек в Shadow DOM sidebar
```

### 2.2 Поток парсинга резюме

```
[Пользователь открывает /resume/{hash}]
        |
        v
initPageLogic() --> detectPageType() = 'resume'
        |
        v
parseResume()
        |
        +-- URL regex --> resume.id (hex hash)
        |
        +-- data-qa="resume-block-title-position" --> title
        |       +-- fallback: h1
        |
        +-- data-qa="resume-block-salary" --> salary
        |
        +-- data-qa="resume-position-card" text scan:
        |       +-- regex: пол (мужчина/женщина)
        |       +-- regex: возраст (N лет/года)
        |       +-- regex: город (кириллический текст)
        |
        +-- data-qa="skills-card":
        |       +-- [data-qa^="skill-level-title-N"] --> skillLevels
        |       +-- [data-qa^="skill-tag-*"] --> skills[]
        |       +-- fallback: .bloko-tag__text
        |
        +-- [data-qa="profile-experience-company-card"]:
        |       +-- cell-left-side > cell-text-content --> company, duration
        |       +-- magritte-stepper-step-content:
        |               +-- cell-text-content --> position, period
        |               +-- residual text --> description
        |
        +-- data-qa="resume-list-card-education":
        |       +-- способ 1: cell-left-side + cell-text-content
        |       +-- способ 2: прямые дочерние элементы
        |       +-- способ 3: полный текстовый скан
        |
        +-- bloko-tag в resume-about-card --> languages
        +-- data-qa="resume-about-card" text --> additionalInfo
        |
        v
resume._debug = { found: [], missing: [] }
        |
        v
chrome.storage.local.set({ resume })
panelState.resume = resume
renderResumePanel() --> вкладка "Моё резюме" в sidebar
```

### 2.3 Поток авторизации

```
[content.js загружен на hh.ru]
        |
        v
createFab() --> серый FAB (проверка)
checkAuth():
        |
        +-- Перебор 13 селекторов:
        |       [data-qa="mainmenu_applicant"]
        |       [data-qa="mainmenu_user_name"]
        |       a[data-qa="mainmenu_myResumes"]
        |       [data-qa="mainmenu"] sup
        |       .supernova-nav__item--applicant
        |       a[href*="/applicant/"]
        |       ... и ещё 7
        |       |
        |       +-- Для каждого: querySelector + getComputedStyle
        |       +-- Если найден видимый элемент --> return true
        |
        +-- Cookie fallback:
        |       document.cookie содержит hhruuid / _HH-RU / hhtoken
        |       --> return true
        |
        +-- Ничего не найдено --> return false
        |
        v
panelState.isLoggedIn = true/false
updateFabIcon() --> синий (true) / красный (false)
renderSidebarContent()

[Поллинг каждые 2 секунды]
        |
        v
updateAuthState() --> checkAuth() --> updateFabIcon()
```


## 3. Стратегия селекторов

### 3.1 Почему data-qa

hh.ru использует Magritte -- CSS-in-JS дизайн-систему, которая генерирует хэшированные имена классов при каждой сборке. Пример:

```
magritte-card___bhGKz_8-5-13   (деплой 1)
magritte-card___xYzAb_9-6-14   (деплой 2)
```

Селектор по такому классу перестанет работать после любого обновления сайта. Атрибуты data-qa, напротив, созданы для тестирования и остаются стабильными между деплоями. Они являются единственным надёжным API для обращения к DOM hh.ru.

### 3.2 Fallback-цепочки

Каждый селектор в объекте HH_SELECTORS -- это массив строк. Функция findElement() перебирает массив и возвращает первый видимый элемент:

```javascript
vacancyCard: [
    '[data-qa="vacancy-serp__vacancy"]',     // приоритет 1: data-qa
    '[class*="vacancy-serp-item"]'            // приоритет 2: partial class
]
```

findElement() для каждого селектора:
1. Пытается выполнить querySelector -- при ошибке (невалидный селектор) переходит к следующему
2. Проверяет что элемент существует (не null)
3. Проверяет что элемент принадлежит документу (document.body.contains)
4. Проверяет что элемент видим через getComputedStyle (display !== 'none', visibility !== 'hidden')
5. Возвращает элемент или null (никогда не undefined)

### 3.3 Категории селекторов

**Vacancy Search (страница поиска):** vacancyCard, vacancyTitleLink, vacancyTitleText, vacancyCompany, vacancySalary, vacancyLocation, vacancyExperience, vacancyTags, replyButton, nextPage.

**Vacancy Page (страница вакансии):** vacancyTitleOnPage, vacancyCompanyOnPage, vacancyDescription, vacancySkills, responsePopup, addCoverLetter, coverLetterInput, submitButton, alertMagritte, relocationConfirm, testTaskWarning, alreadyApplied, indirectEmployerAlert.

**Resume Page (страница резюме):** resumeTitle, resumeSalary, resumeSkillsTable, resumeSkillTag, resumeSkillLevel3, resumeSkillLevel2, resumeSkillLevel1, resumePersonalName, resumeListItem, resumeListTitle, resumeListLink.

**Auth (авторизация):** loginEmailInput, loginPasswordInput, loginCaptchaImage, logged_in_indicator.

### 3.4 Запрещённые селекторы

Категорически запрещено использовать CSS-классы Magritte с хэшами (содержащие ___, например magritte-card___bhGKz). Также запрещено полагаться на h2/h3 заголовки для секций резюме -- Magritte не использует семантические заголовки для разделов.


## 4. Shadow DOM изоляция

### 4.1 Зачем

hh.ru подключает множество CSS-библиотек (Bloko, Magritte). Если вставить HTML панели напрямую в document.body, стили hh.ru могут сломать вёрстку панели, а стили панели -- сломать страницу. Например, класс .bloko-button будет переопределён, и кнопки на странице перестанут работать корректно.

### 4.2 Как работает

```javascript
panelEl = document.createElement('div');
const shadowRoot = panelEl.attachShadow({ mode: 'closed' });
// Все стили и DOM панели существуют внутри shadowRoot
// Внешний document.body видит только panelEl (пустой div)
```

mode: 'closed' означает, что внешний JavaScript не может получить доступ к shadowRoot через panelEl.shadowRoot -- доступ только изнутри. Это защищает от случайного вмешательства.

### 4.3 Что изолировано

CSS hh.ru не проникает в панель. CSS панели не влияет на hh.ru. Глобальный JavaScript hh.ru не имеет доступа к переменным и функциям внутри Shadow DOM. События, генерируемые внутри Shadow DOM, по умолчанию не всплывают наружу (composed: false для внутренних событий).

### 4.4 Исключения

Content script расширения создаёт Shadow DOM, но сам работает в контексте страницы. Переменные content.js (findElement, safeGetText и т.д.) являются глобальными для страницы, но это допустимо, так как имена функций имеют префикс и не конфликтуют с hh.ru. Функция diagnoseResumeDOM() экспортируется в window.__hhDiagnose для удобства отладки из консоли.


## 5. Схема chrome.storage.local

### 5.1 Структура

Все данные расширения хранятся в chrome.storage.local. Хранилище асинхронное, объём ограничен 10 МБ. Данные не удаляются при закрытии браузера.

```
Ключ                 Тип          Значение по умолчанию      Назначение
--------------------------------------------------------------------------
settings             object       (см. DEFAULT_SETTINGS)     Настройки пользо-
                                                       вателя
stats                object       (см. DEFAULT_STATS)       Статистика откликов
appliedVacancies     array []     []                        ID откликнутых
skippedVacancies     array []     []                        ID пропущенных
blacklistedCompanies array []     []                        Чёрный список
logs                 array []     []                        Лог (до 500 записей)
resume               object       null                       Распарсенное резюме
resumeList           array []     []                        Список резюме
dailyResetDate       string       null                       Дата сброса (YYYY-MM-DD)
installedAt          string       null                       Дата установки (ISO)
```

### 5.2 DEFAULT_SETTINGS

```javascript
{
    mode: 'manual',           // manual / semi-auto / auto
    dailyLimit: 200,          // макс. откликов в день
    minMatchScore: 60,        // мин. score для авто-отклика
    letterTone: 'formal',     // formal / confident / friendly
    searchInterval: 300,      // интервал поиска (сек)
    autoScroll: true,         // авто-скролл страницы
    showMatchScore: true,     // показывать match score
    confirmBeforeApply: true, // подтверждение перед откликом
    coverLetterTemplate: ''   // шаблон сопроводительного
}
```

### 5.3 DEFAULT_STATS

```javascript
{
    totalApplied: 0,
    appliedToday: 0,
    interviewInvites: 0,
    responsesReceived: 0,
    skipsToday: 0,
    errorsToday: 0,
    lastActivity: null       // ISO timestamp
}
```

### 5.4 Операции

getAllSettings() -- читает settings из хранилища, мержит с DEFAULT_SETTINGS, возвращает объект. При ошибке чтения возвращает копию DEFAULT_SETTINGS.

getStats() -- проверяет ежедневный сброс (checkDailyReset), читает stats, мержит с DEFAULT_STATS. Счётчики appliedToday, skipsToday, errorsToday сбрасываются при смене даты.

incrementApplied() -- увеличивает appliedToday и totalApplied, проверяет дневной лимит. Возвращает {allowed: true/false, remaining: N}.

isAlreadyApplied(id) / markAsApplied(id) -- проверка и запись в массив appliedVacancies.

checkDailyReset() -- сравнивает dailyResetDate с текущей датой. При несовпадении сбрасывает дневные счётчики и обновляет дату.

### 5.5 Инициализация

При установке расширения (reason === 'install') Service Worker записывает все ключи с дефолтными значениями в chrome.storage.local. При обновлении (reason === 'update') существующие данные сохраняются -- Service Worker только создаёт/пересоздаёт будильник dailyReset.


## 6. Передача сообщений

### 6.1 Направления

```
Popup  --sendMessage-->  Service Worker  --sendMessage-->  Content Script
Content Script  --sendMessage-->  Service Worker  (для логов)
```

Content Script не может отправить сообщение напрямую в Popup (Popup может быть закрыт). Popup отправляет сообщение в Service Worker, а Service Worker пересылает его в Content Script активной вкладки hh.ru через chrome.tabs.sendMessage.

### 6.2 Типы сообщений

**get-stats.** Popup запрашивает статистику. Service Worker читает chrome.storage.local.get('stats') и отправляет данные обратно через sendResponse.

**get-settings.** Popup запрашивает настройки. Service Worker читает chrome.storage.local.get('settings') и отправляет обратно.

**apply-vacancy.** Popup запрашивает отклик на вакансию. Service Worker пересылает сообщение в Content Script активной вкладки hh.ru (chrome.tabs.query с фильтром url: 'https://hh.ru/*'). Content Script выполняет логику отклика.

**log.** Content Script или Popup отправляют запись лога. Service Worker добавляет её в массив logs в chrome.storage.local (максимум 500 записей, старые удаляются).

**settings-updated.** Popup отправляет обновлённые настройки. Service Worker пересылает в Content Script. Content Script обновляет локальное состояние и перезапускает рендер панели.

### 6.3 Асинхронные ответы

Для get-stats и get-settings Service Worker возвращает true из обработчика onMessage (что означает асинхронный ответ). Затем вызов sendResponse(data) отправляет данные обратно в Popup. Это необходимо, потому что chrome.storage.local.get -- асинхронная операция.

### 6.4 Badge updates

Service Worker экспортирует функцию updateBadge(), которая читает appliedToday из хранилища и устанавливает текст бейджа (число на иконке расширения) через chrome.action.setBadgeText. Функция вызывается при инициализации и может вызываться после каждого отклика (хотя сейчас Content Script обновляет бейдж напрямую через chrome.runtime.sendMessage).


## 7. Антигаллюцинационная верификация

### 7.1 Определение

"Галлюцинация" в контексте расширения -- это ситуация, когда код делает неверные предположения о DOM-структуре и действует на основе данных, которых нет или которые искажены. Примеры: обращение к textContent несуществующего элемента (TypeError, краш расширения), парсинг salary = "Не указана" как числа (NaN propagation), клик по скрытому элементу (действие не регистрируется).

### 7.2 Уровень 1: DOM Verification

Принцип: никогда не обращаться к DOM без проверки существования и видимости.

safeGetText(el, fallback) выполняет 5 проверок:
1. el !== null
2. el instanceof Element
3. el.offsetParent !== null ИЛИ el не находится в body (для fixed/transform)
4. el не скрыт через display:none или visibility:hidden (getComputedStyle)
5. textContent не пустой и не whitespace-only

safeGetAttr(el, attr, fallback) проверяет:
1. el !== null
2. el instanceof Element
3. getAttribute возвращает не null (возвращает fallback если null)

safeClick(el, label) проверяет:
1. el !== null
2. el instanceof Element
3. el.disabled === false
4. document.body.contains(el) === true
5. getComputedStyle: display !== 'none', visibility !== 'hidden'

### 7.3 Уровень 2: Data Validation

Принцип: никогда не использовать данные без валидации типа, формата и содержания.

validateVacancyData(v) проверяет:
- title: существует, тип string, длина >= 3
- company: существует, тип string
- url: существует, начинается с "https://hh.ru/"
- id: существует, тип string, не пустой

extractVacancyId(url) проверяет:
- url существует, тип string
- regex /\/vacancy\/(\d+)/ совпал
- при несовпадении возвращает '' (пустую строку, не null/undefined)

waitForElement(selectors, timeout) проверяет:
- Мгновенная проверка (0ms) перед запуском observer
- MutationObserver с timeout (default 10s)
- При timeout возвращает null (не hang)
- Visibility check для каждого найденного элемента

### 7.4 Уровень 3: Action Verification

Принцип: никогда не выполнять действие без проверки предусловий И результата.

safeInput(el, text, label) проверяет:
1. el !== null
2. el instanceof HTMLElement
3. el.disabled === false, el.readOnly === false
4. text существует, тип string, длина > 0
5. React native value setter + dispatchEvent(input, change)

simulateTyping(el, text) проверяет:
1. el и text существуют
2. Посимвольная вставка с событием input после каждого символа
3. Случайная задержка 30-120ms между символами (имитация живого набора)

### 7.5 Правила для разработчиков

Правило 1. Ничего не возвращай как undefined. Конкретные типы: string, null, boolean, number, object. Пустая строка '' -- ок, undefined -- нет.

Правило 2. Не предполагай что DOM-элемент существует. Используй findElement() или проверяй вручную.

Правило 3. Не цепляй .textContent/.value напрямую. safeGetText() и safeGetAttr() обязательны.

Правило 4. Не кликай по невидимым элементам. safeClick() проверяет всё.

Правило 5. Не вводи текст в disabled/readonly поля. safeInput() проверяет.

Правило 6. Валидируй данные перед использованием. validateVacancyData() перед добавлением в результат.

Правило 7. Проверяй URL перед навигацией. extractVacancyId() вернёт '' при некорректном URL.

Правило 8. Логируй все ошибки, не игнорируй. Logger -- единственный источник правды для отладки.

Правило 9. Не доверяй данным из chrome.storage слепо. Проверяй тип и структуру при чтении.

Правило 10. Предусматривай fallback. Fallback-цепочки селекторов, fallback-значения, fallback-действия.


## 8. SPA навигация

### 8.1 Проблема

hh.ru -- Single Page Application на React. При переходе на следующую страницу поиска (клик по "Следующая") URL меняется с /search/vacancy?page=1 на /search/vacancy?page=2, но страница не перезагружается. Content script загружается один раз при document_idle и не перезагружается при SPA-навигации.

### 8.2 Решение

MutationObserver отслеживает изменения в DOM дерева:

```javascript
const observer = new MutationObserver((mutations) => {
    // Фильтруем: интересуют только изменения в карточках вакансий
    let relevantChange = false;
    for (const m of mutations) {
        if (m.target.closest('[data-qa="vacancy-serp__vacancy"]')) {
            relevantChange = true;
            break;
        }
    }
    if (!relevantChange) return;

    // Debounce 1 секунда (ждём пока DOM полностью обновится)
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const vacancies = parseVacanciesFromPage();
        updateVacancies(vacancies);
    }, 1000);
});
observer.observe(document.body, { childList: true, subtree: true });
```

### 8.3 Debounce

Без debounce каждое изменение DOM (включая промежуточные состояния рендера React) вызывало бы перепарсинг. Задержка в 1 секунду гарантирует, что парсинг начинается только после завершения рендера новой страницы.

### 8.4 Cross-page navigation

При нажатии "Откликнуться" в панели на странице поиска нужно перейти на /vacancy/{id}. Это вызывает полную перезагрузку страницы и повторную загрузку content.js. Для сохранения состояния между страницами используется chrome.storage.local: pendingApply сохраняется с timestamp, при загрузке страницы вакансии проверяется pendingApply и продолжается процесс отклика. Если pendingApply старше 2 минут -- игнорируется (защита от stale state).

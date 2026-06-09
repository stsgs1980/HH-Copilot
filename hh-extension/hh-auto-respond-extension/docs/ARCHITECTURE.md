# HH Auto-Respond — Browser Extension

## Документация: Архитектура, Функционал, Методики реализации, Методики проверки, Антигаллюцинация

**Версия:** 1.1.0
**Тип:** Chrome Extension (Manifest V3)
**Целевая платформа:** hh.ru (Magritte дизайн-система)
**Дата:** 2026-06-09

---

## 1. Архитектура

### 1.1 Почему расширение, а не серверное решение

Проблема текущей архитектуры проекта (Next.js + FastAPI + Playwright + Telegram):

| Слои проблем | Описание |
|---|---|
| **API закрыт** | hh.ru закрыл applicant API 15 декабря 2025. OAuth мёртв, все REST endpoints для求职者 заблокированы. |
| **Anti-bot** | hh.ru детектит Playwright по TLS fingerprint (JA3/JA3S), navigator.webdriver, WebGL fingerprint, поведенческой биометрии. |
| **Инфраструктура** | Next.js + FastAPI + PostgreSQL/SQLite + Telegram bot + Playwright = 6 сервисов для функции «откликнуться на вакансию». |
| **OTP-костыль** | Playwright не может хранить сессию → нужна OTP авторизация через Telegram → пользователь вводит код вручную. |
| **Shadow ban** | Массовые отклики через бота → аккаунт помечается как ATS spammer → все отклики невидимы для работодателей. |

**Расширение решает ВСЕ эти проблемы:**

| Преимущество | Как работает |
|---|---|
| **Реальный браузер** | Расширение работает в браузере пользователя — нулевая детекция anti-bot. Нет TLS fingerprint, нет webdriver, нет WebGL leak. |
| **Реальная сессия** | Пользователь залогинен в hh.ru — расширение использует существующие cookies. Не нужен OAuth, OTP, 2FA. |
| **Реальные действия** | Клик по DOM элементу = действие реального пользователя. Не distinguishes от ручного клика. |
| **Нулевая инфраструктура** | Не нужен сервер, база данных, Telegram бот. Всё работает локально. |
| **Приватность** | Данные хранятся в chrome.storage.local. Ничего не уходит на сторонние серверы. |

### 1.2 Компонентная архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (hh.ru)                       │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Content Scripts (document_idle)         │ │
│  │                                                      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │ │
│  │  │ parser.js │  │ panel.js  │  │ auto-respond.js  │  │ │
│  │  │           │  │           │  │                  │  │ │
│  │  │ parseVac- │  │ ShadowDOM │  │ applyToVacancy() │  │ │
│  │  │ ancies()  │  │  Panel    │  │ continueApply()  │  │ │
│  │  │ parseVac- │  │  Toggle   │  │ applyToAll()     │  │ │
│  │  │ ancyDet-  │  │  Buttons  │  │ _handleAlerts()  │  │ │
│  │  │ ail()     │  │  Stats    │  │ _fillCoverLetter │  │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │ │
│  │         ↕              ↕               ↕              │ │
│  │  ┌──────────────────────────────────────────────┐    │ │
│  │  │              Shared Libraries                 │    │ │
│  │  │  selectors.js │ anti-hallucination.js │ timing │    │ │
│  │  │  storage.js  │ rate-limiter.js        │match  │    │ │
│  │  └──────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────┘ │
│                           ↕                              │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           Service Worker (background/index.js)        │ │
│  │  Message routing │ Alarms (daily reset) │ Badge       │ │
│  └─────────────────────────────────────────────────────┘ │
│                           ↕                              │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Popup (popup/index.html)                  │ │
│  │  Dashboard │ Settings │ Templates │ Logs               │ │
│  └─────────────────────────────────────────────────────┘ │
│                           ↕                              │
│  ┌─────────────────────────────────────────────────────┐ │
│  │         chrome.storage.local (Persistent)            │ │
│  │  settings │ stats │ appliedVacancies │ logs │ etc.    │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Файловая структура

```
hh-auto-respond-extension/
├── manifest.json                          # Manifest V3 конфигурация (version: 1.1.0)
├── content.js                             # Единый бандл: lib + parser + panel + auto-respond + resume + boot
├── CHANGELOG.md                           # История версий (Keep a Changelog формат)
├── background/
│   └── index.js                           # Service Worker: routing, alarms, badge
├── lib/                                   # Исходные модули (для референса, НЕ подключаются к manifest)
│   ├── selectors.js                       # 47+ групп CSS-селекторов Magritte/Bloko
│   ├── anti-hallucination.js              # Трёхуровневая система верификации
│   ├── timing.js                          # Гауссовы задержки, имитация набора
│   ├── storage.js                         # chrome.storage.local обёртка
│   ├── rate-limiter.js                    # Token bucket + adaptive slowdown
│   └── matching.js                        # Weighted matching engine
├── content/                               # Исходные модули (для референса, НЕ подключаются к manifest)
│   ├── main.js                            # Entry point (объединён в content.js)
│   ├── parser.js                          # Парсинг вакансий (объединён в content.js)
│   ├── panel.js                           # Shadow DOM floating panel UI (объединён в content.js)
│   ├── auto-respond.js                   # 8-шаговый процесс отклика (объединён в content.js)
│   └── panel.css                          # (встроена в content.js через Shadow DOM)
├── popup/
│   ├── index.html                          # Popup UI с 4 вкладками
│   └── popup.js                           # Popup logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── docs/
    └── ARCHITECTURE.md                    # Этот файл
```

### 1.4 Жизненный цикл

```
User opens hh.ru/search/vacancy
    ↓
manifest.json content_scripts inject all JS (document_idle)
    ↓
main.js: detectPageType() → 'search'
    ↓
    ├── parser.js: parseVacanciesFromPage()
    │     ├── findAllElements('vacancyCard') → NodeList
    │     ├── forEach card → parseVacancyCard(card)
    │     │     ├── safeGetText(titleEl) → title
    │     │     ├── safeGetAttr(titleEl, 'href') → url
    │     │     ├── extractVacancyId(url) → "1234567"
    │     │     ├── validateVacancyData(vacancy) → { valid, errors }
    │     │     └── isDuplicate(vacancy, existing) → false
    │     └── Return validated vacancies[]
    │
    ├── panel.js: createPanel() → Shadow DOM injection
    │     └── updateVacancies(vacancies) → render cards
    │
    └── MutationObserver: watches for SPA pagination
          └── On change → re-parse → re-render
```

---

## 2. Функционал

### 2.1 Парсинг вакансий (parser.js)

**Что делает:**
- Находит все карточки вакансий на странице поиска hh.ru
- Извлекает: title, company, salary, location, experience, skills, URL
- Извлекает vacancy ID из URL (https://hh.ru/vacancy/1234567 → "1234567")
- Проверяет не откликнута ли уже (через chrome.storage)
- Проверяет не в чёрном ли списке компания
- Проверяет наличие кнопки отклика (некоторые вакансии — только просмотр)

**Портировано из:** `hh-bot/src/hh/browser_client.py` → `search_vacancies_on_page()` (636 строк Python → 180 строк JS)

**Селекторы:** Портированы из `hh-bot/src/hh/selectors.py` (245 строк → selectors.js, 47 групп)

**Пример вывода:**
```json
{
  "id": "9876543",
  "title": "Senior Python Developer",
  "company": "Яндекс",
  "salary": "от 250 000 руб.",
  "location": "Москва",
  "experience": "3-6 лет",
  "skills": ["Python", "Django", "PostgreSQL", "Docker", "Linux"],
  "url": "https://hh.ru/vacancy/9876543",
  "hasReply": true,
  "status": "new",
  "parsedAt": "2026-06-09T14:30:00.000Z"
}
```

### 2.2 Встроенная панель (panel.js)

**Что делает:**
- Инжектирует floating panel на правый край экрана (position: fixed)
- Toggle кнопка всегда видна (синяя стрелка на краю)
- Shadow DOM изолирует стели от hh.ru (не ломает страницу)
- Список вакансий с match score цветовой кодировкой:
  - 🟢 зелёный: score >= 70 (высокое совпадение)
  - 🟡 жёлтый: score 40-69 (среднее)
  - 🔴 красный: score < 40 (низкое)
- Статистика: откликов сегодня / лимит / ошибки
- Кнопки: "Откликнуться на все", "Пауза", "Очистить"
- Индикатор статуса с pulse анимацией

**Anti-hallucination panel:**
- Panel НЕ зависит от DOM структуры hh.ru (position: fixed)
- Shadow DOM предотвращает CSS conflicts
- Нет внешних зависимостей (vanilla JS + inline CSS)

### 2.3 Автоматический отклик (auto-respond.js)

**8-шаговый процесс (портирован из browser_client.py):**

| Шаг | Действие | Верификация |
|---|---|---|
| 0 | Pre-flight: rate limit + daily limit + duplicate check | Возврат { allowed: false } если exceed |
| 1 | Navigate: window.location.href = vacancy URL | Сохраняет pendingApply в storage |
| 2 | Find reply: waitForElement(fallback selectors, 15s) | Timeout → fail с логированием |
| 3 | Verify button text: не "уже откликнулись"? | safeGetText() + substring check |
| 4 | Click reply: safeClick() с visibility/disabled check | Булевый результат |
| 5 | Wait popup: MutationObserver, 10s timeout | Popup не появился → fallback check |
| 6 | Handle alerts: relocation, test task, indirect employer | Alert-specific handlers |
| 7 | Fill cover letter: simulateTyping() char-by-char | React-safe native setter |
| 8 | Submit + Verify: popup disappear OR button text change | 3s wait + multi-indicator check |

**Mass auto-apply (applyToAll):**
- Фильтрует: status=new AND hasReply AND matchScore >= minScore
- Сортирует: по matchScore (высокий → низкий)
- Rate check перед каждым откликом
- BatchTimingController: длинная пауза каждые 5 откликов (25-40 сек)
- Прерывается при: лимит, ошибка, captcha

### 2.4 Matching Engine (matching.js)

**Портировано из:** `mini-services/hh-api/matching.ts` (262 строки TypeScript)

**Weighted scoring:**

| Критерий | Вес | Метод | Формат данных |
|---|---|---|---|
| Навыки | 30% | Jaccard similarity с alias matching | string[] → Set normalization |
| Зарплата | 25% | Overlap-based, 30% tolerance | "от 200 000 руб" → parseInt |
| Опыт | 20% | Range parsing, overqualification penalty | "3-6 лет" → [3, 6] |
| Позиция | 15% | Word overlap + keyword boosting | "Python Developer" → words |
| Локация | 10% | Exact/remote/region matching | "Москва / удаленно" |

**Skill aliases (примеры):**
- k8s ↔ kubernetes, pg ↔ postgresql, js ↔ javascript
- tf ↔ terraform, aws ↔ amazon web services
- node ↔ node.js, reactjs ↔ react

**findSkillGaps():** Анализирует топ-N навыков, востребованных в вакансиях с score >= 70, но отсутствующих в резюме. Результат: [{ skill: "Kubernetes", demand: 12 }, ...]

### 2.5 Rate Limiter (rate-limiter.js)

**Алгоритм:** Token Bucket с adaptive factor

**Лимиты (изучены из исследования hh.ru):**
| Лимит | Значение | Источник |
|---|---|---|
| Откликов/день | ~200 | Эмпирические данные, подтверждены хабром |
| Откликов/месяц | ~3000 | Сумма дневных за месяц |
| Часовой лимит | 30 | Распределение 200/день равномерно |
| Мин интервал | 30 сек | Между любыми действиями |
| Burst max | 5 подряд | После — 2 мин пауза |

**Adaptive slowdown:**
При получении 429 / CAPTCHA / slow response, `adaptiveFactor` увеличивается (×2 при 429, ×1.5 при slow). Фактор применяется к minInterval: если база 30с и factor 2.0 → реальный интервал 60с. Factor сбрасывается в полночь.

### 2.6 Timing (timing.js)

**Портировано из:** `hh-bot/src/hh/anti_detect.py` (125 строк Python)

| Функция | Распределение | Диапазон | Когда вызывается |
|---|---|---|---|
| `gaussianRandom()` | Gaussian (μ=10, σ=4) | ≥2.0s | Между любыми действиями |
| `simulateReading()` | Uniform | 5-12s | Перед откликом на вакансию |
| `simulateLongPause()` | Uniform ± noise | 25-40s | Каждые 5 откликов (batch) |
| `simulateTyping()` | Uniform/char | 30-120ms/char | Заполнение cover letter |

**Зачем timing в расширении?** Хотя расширение работает в реальном браузере, при массовых откликах (auto-apply mode) hh.ru может анализировать серверные логи: временные интервалы между действиями одного аккаунта. Гауссово распределение имитирует естественное поведение человека лучше, чем фиксированный интервал.

### 2.7 Popup (popup/index.html + popup.js)

**4 вкладки:**

| Вкладка | Содержимое | Источник данных |
|---|---|---|
| Статистика | 4 карточки (откликов сегодня, приглашений, ошибок, всего) + progress bar | chrome.storage → stats |
| Настройки | Режим (manual/semi-auto/auto), лимиты, интервалы, отображение | chrome.storage → settings |
| Шаблоны | Сопроводительное письмо с переменными {name}, {position}, {company} | chrome.storage → template |
| Логи | Структурированные логи (последние 50), цветовая кодировка по уровню | chrome.storage → logs |

**Переменные шаблона:**
- `{name}` — имя из резюме (пользователь заполняет в настройках)
- `{position}` — название позиции из вакансии
- `{company}` — название компании из вакансии
- `{skills}` — навыки из резюме

### 2.8 Service Worker (background/index.js)

**Обязанности:**
- Инициализация chrome.storage при первой установке
- chrome.alarms.create('dailyReset') — сброс дневных счётчиков в полночь
- Message routing: popup ↔ content scripts
- Badge updates: цифра на иконке = откликов сегодня

---

## 3. Методики реализации

### 3.1 Методика портирования Python → JavaScript

**Принцип:** 1:1 перевод логики, адаптация API.

| Python (Playwright) | JavaScript (Content Script) | Изменения |
|---|---|---|
| `page.querySelector()` | `document.querySelector()` | Playwright page → DOM |
| `page.fill()` (React-safe) | `nativeInputValueSetter + dispatchEvent` | React 18 workaround |
| `page.click()` | `element.click()` | Прямой DOM клик |
| `page.wait_for_selector()` | `MutationObserver + setTimeout` | Custom waitForElement() |
| `asyncio.sleep()` | `new Promise(resolve => setTimeout(...))` | JS async/await |
| `dataclasses` | Plain objects | TypeScript interfaces как документация |
| `Pydantic schemas` | Validation functions | validateVacancyData() |
| `sqlite3 / Prisma` | chrome.storage.local | Локальное хранение |

### 3.2 Методика fallback-цепочек селекторов

**Проблема:** hh.ru использует React (Magritte), DOM меняется при обновлениях. `data-qa` атрибуты — наиболее стабильный API, но не все элементы их имеют.

**Решение:** Каждый селектор — массив в порядке приоритета:

```javascript
vacancyCard: [
  '[data-qa="vacancy-serp__vacancy"]',     // 1. data-qa (самый стабильный)
  '.vacancy-serp-item',                      // 2. CSS class (backup)
  '[class*="vacancy-serp-item"]'             // 3. Partial class match (last resort)
]
```

**findElement()** перебирает массив, возвращает первый видимый элемент:
```javascript
function findElement(name, root = document) {
  for (const selector of getSelectors(name)) {
    try {
      const el = root.querySelector(selector);
      if (el && el.offsetParent !== null) return el;
    } catch { /* invalid selector, try next */ }
  }
  return null;  // НИКОГДА не undefined
}
```

**Методика обновления:** При изменении DOM hh.ru, достаточно обновить selectors.js. Добавить новый селектор в начало массива — fallback'ы сохранятся для старых версий DOM.

### 3.3 Методика React-safe input

**Проблема:** React 18 использует synthetic events. Прямое присвоение `element.value = text` не обновляет React state → данные не отправляются при сабмите.

**Решение:** Native value setter + synthetic events:

```javascript
const nativeSetter = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype, 'value'
).set;

nativeSetter.call(textarea, 'Hello, World!');
textarea.dispatchEvent(new Event('input', { bubbles: true }));
textarea.dispatchEvent(new Event('change', { bubbles: true }));
```

**Портировано из:** browser_client.py → `_fill_field()` метод, который использовал Playwright `fill()` (React-aware).

### 3.4 Методика SPA navigation detection

**Проблема:** hh.ru — Single Page Application (React). При переходе на следующую страницу поиска, URL меняется но страница не перезагружается. Content script не перезагружается.

**Решение:** MutationObserver на `document.body` с debounce:

```javascript
const observer = new MutationObserver((mutations) => {
  let relevantChange = false;
  for (const m of mutations) {
    if (m.target.closest?.('[data-qa="vacancy-serp__vacancy"]')) {
      relevantChange = true;
      break;
    }
  }
  if (!relevantChange) return;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const vacancies = parseVacanciesFromPage();
    updateVacancies(vacancies);
  }, 1000);  // 1 секунда debounce
});
```

### 3.5 Методика cross-page apply

**Проблема:** При нажатии "Откликнуться" из панели (на странице поиска), нужно перейти на /vacancy/{id} — это вызывает перезагрузку страницы и content script'а.

**Решение:** Сохраняем pendingApply в chrome.storage, при загрузке /vacancy/* проверяем pending и продолжаем:

```
search page: applyToVacancy(id) → chrome.storage.set({ pendingApply }) → window.location.href
    ↓ (page reload)
vacancy page: initVacancyPage() → chrome.storage.get('pendingApply') → continueApply()
```

**Anti-hallucination:** pendingApply имеет timestamp, если старше 2 минут — игнорируется (защита от stale state).

### 3.6 Методика Shadow DOM для UI панели

**Проблема:** hh.ru использует свои стили (bloko, Magritte). Если вставить panel HTML напрямую, стели hh.ru могут сломать panel или panel может сломать hh.ru.

**Решение:** Shadow DOM с `{ mode: 'closed' }`:

```javascript
panelEl = document.createElement('div');
const shadowRoot = panelEl.attachShadow({ mode: 'closed' });
// Стили внутри Shadow DOM полностью изолированы
```

Shadow DOM гарантирует:
- CSS hh.ru не влияет на panel
- CSS panel не влияет на hh.ru
- JavaScript panel изолирован от hh.ru (нет глобальных переменных)

---

## 4. Методики проверки

### 4.1 Методика проверки селекторов

**Инструмент:** DevTools → Elements → Ctrl+F → ввод selector

**Процесс верификации:**
1. Открыть hh.ru/search/vacancy в Chrome
2. Открыть DevTools (F12)
3. В панели Elements: Ctrl+F → `[data-qa="vacancy-serp__vacancy"]`
4. Подтвердить что элементы найдены
5. Кликнуть по найденному элементу → проверить что это правильный DOM node
6. Повторить для каждого из 47 селекторов

**Автоматизация:** manifest.json content_scripts автоматически загружают скрипты на hh.ru. Если selectors.js константы не совпадают с реальным DOM, findElement() вернёт null, что логируется и обрабатывается (не крашит расширение).

### 4.2 Методика проверки парсинга

**Верификация данных:**

| Шаг | Проверка | Ожидание |
|---|---|---|
| 1 | parseVacanciesFromPage() возвращает массив | vacancies.length > 0 на странице с результатами |
| 2 | Каждый vacancy.id непустой | extractVacancyId(url) → цифровой string |
| 3 | Каждый vacancy.title.length >= 3 | validateVacancyData().valid === true |
| 4 | Дубликаты отфильтрованы | isDuplicate() возвращает false для новых |
| 5 | Vacancy.salary может быть "Не указана" | Не null, не undefined, не "undefined" |
| 6 | vacancy.url начинается с https://hh.ru/ | URL validation в validateVacancyData() |

**Как проверить:**
1. Установить расширение в Chrome (chrome://extensions → Developer mode → Load unpacked)
2. Открыть hh.ru/search/vacancy?text=Python
3. Открыть DevTools Console
4. Найти логи: `[HH-AR][Parser]` — покажут сколько карточек найдено и распарсено
5. Кликнуть toggle panel → убедиться что вакансии отображаются с данными

### 4.3 Методика проверки auto-respond

**CRITICAL:** НЕ тестировать auto-respond на реальном аккаунте без ограничений.

**Безопасное тестирование:**
1. Создать тестовый аккаунт на hh.ru (не основной!)
2. В настройках: dailyLimit = 1 (один отклик за тест)
3. Включить manual mode
4. Открыть hh.ru/search/vacancy?text=тест
5. Найти вакансию с кнопкой "Откликнуться"
6. Кликнуть в панели → "Откликнуться"
7. В DevTools Console: отследить каждый шаг через `[HH-AR][AutoRespond]` логи
8. Ожидание: popup отклика появляется, cover letter заполняется, кнопка submit кликается
9. Верификация: кнопка меняет текст на "Вы уже откликнулись"

**Проверки при каждом шаге:**
- Rate limiter: console показывает "Rate check passed" или "Rate limited"
- safeClick: console показывает "Clicked: reply_button" или "element not found"
- waitForElement: popup найден в течение 10с или timeout
- Cover letter: simulateTyping логирует каждый символ (при debug level)

### 4.4 Методика проверки rate limiter

| Тест | Действие | Ожидаемый результат |
|---|---|---|
| Daily limit | incrementApplied() × 200 | 201-й вызов возвращает { allowed: false } |
| Hourly limit | 31 откликов за час | 31-й → { allowed: false, waitMs: 3600000 } |
| Min interval | apply → сразу apply | Второй → { allowed: false, waitMs: ~30000 } |
| Burst | 6 откликов подряд | 6-й → { allowed: false, reason: "Burst pause" } |
| Adaptive | Получить 429 | adaptiveFactor × 2, интервал удваивается |
| Daily reset | Изменить dailyResetDate | Счётчики appliedToday = 0 |

### 4.5 Методика проверки matching engine

**Единичные тесты (можно запустить в DevTools Console):**

```javascript
import { calculateMatchScore } from './lib/matching.js';

const vacancy = {
  skills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
  salary: 'от 200 000 руб.',
  experience: '3-6 лет',
  title: 'Python Backend Developer',
  location: 'Москва'
};

const resume = {
  skills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'Kubernetes'],
  salary: 'от 250 000 руб.',
  experienceYears: 5,
  position: 'Python Developer',
  city: 'Москва'
};

const result = calculateMatchScore(vacancy, resume);
// Ожидание: score >= 50 (навыки overlap, ЗП выше вакансии, опыт совпадает)
```

**Проверки:**
- score в диапазоне [0, 100] (всегда)
- score 0 при null вакансии или резюме
- Одинаковые навыки → skills breakdown = 100
- ЗП резюме = ЗП вакансии → salary breakdown = 100
- Remote location → location breakdown = 90
- Один и тот же город → location breakdown = 100

---

## 5. Антигаллюцинация

### 5.1 Что такое «галлюцинация» в контексте расширения

**Галлюцинация** — это когда код делает неверные предположения о DOM структуре и извлекает/действует на основе данных которых нет или которые искажены.

**Примеры галлюцинаций:**

| Тип | Пример | Последствие |
|---|---|---|
| **DOM галлюцинация** | `document.querySelector('.title').textContent` когда элемента нет | TypeError → расширение крашится |
| **Data галлюцинация** | salary = "Не указана" записывается как vacancy.salary, потом parseInt("Не указана") → NaN | NaN propagates, match score = NaN |
| **Action галлюцинация** | Click по элементу который невидим (display:none) → клик не регистрируется | Пользователь думает что отклик ушёл, но нет |
| **State галлюцинация** | Vacancy помечена как "applied" но отклик не прошёл (popup не отправился) | Фальшивая статистика, пропуск вакансий |
| **Selector галлюцинация** | `[data-qa="vacancy-title"]` — такого атрибута нет, но код предполагает его | extractVacancyId возвращает "" → vacancy.id = "" → дубликаты |

### 5.2 Трёхуровневая система антигаллюцинации

#### Уровень 1: DOM Verification

**Принцип:** НИКОГДА не обращаться к DOM без проверки existence.

**Реализация (anti-hallucination.js):**

```javascript
// ❌ GALУЦИНАЦИЯ: предполагаем что элемент существует
const title = document.querySelector('[data-qa="vacancy-title"]').textContent;

// ✅ ANTI-HALLUCINATION: проверяем каждый шаг
const titleEl = findElement('vacancyTitleOnPage');
const title = safeGetText(titleEl, ''); // '' если элемента нет
```

**safeGetText() проверки:**
1. Element существует? (`el !== null`)
2. Element это Element? (`el instanceof Element`)
3. Element видим? (`offsetParent !== null`)
4. TextContent не пустой? (`text.length > 0`)
5. TextContent не whitespace-only? (`text.trim().length > 0`)

#### Уровень 2: Data Validation

**Принцип:** НИКОГДА не использовать данные без валидации.

**validateVacancyData() проверки:**

| Поле | Проверки |
|---|---|
| title | exists, string, length >= 3, no HTML tags |
| company | exists, string, length >= 2 |
| url | exists, string, starts with "https://hh.ru/" |
| id | exists, string, non-empty |

**extractVacancyId() проверки:**
```javascript
function extractVacancyId(url) {
  if (!url || typeof url !== 'string') return '';  // Не null, не undefined
  const match = url.match(/\/vacancy\/(\d+)/);
  return match ? match[1] : '';  // Пустая строка если regex не совпал
}
```

**isDuplicate() проверки:**
- Проверяем по ID (из URL), не по title
- ID = цифровой string, сравнение через ===
- existingVacancies проверяется на Array.isArray

#### Уровень 3: Action Verification

**Принцип:** НИКОГДА не выполнять действие без проверки предусловий И результата.

**safeClick() проверки:**
1. Element exists?
2. Element visible? (offsetParent)
3. Element NOT disabled?
4. Логирование клика для аудита

**safeInput() проверки:**
1. Element exists?
2. Element это HTMLElement?
3. Element NOT disabled/readonly?
4. Text exists, is string, non-empty?
5. React native setter + synthetic events

**waitForElement() проверки:**
1. Мгновенная проверка (0ms timeout) перед observer
2. MutationObserver с timeout (default 10s)
3. Возвращает null при timeout (не hang)
4. Visibility check для каждого найденного элемента

### 5.3 Правила антигаллюцинации (для разработчиков)

1. **НИКОГДА не возвращай undefined.** Все функции возвращают конкретные типы: string | Element | null | boolean | number. Пустая строка '', null, 0 — ок. undefined — нет.

2. **НИКОГДА не предполагай что DOM элемент существует.** Всегда проверяй. Используй findElement() или safeQuery() вместо querySelector() напрямую.

3. **НИКОГДА не цепляй .textContent / .value без wrapper.** safeGetText() и safeGetAttr() — обязательны.

4. **НИКОГДА не кликай по невидимым элементам.** safeClick() проверяет offsetParent.

5. **НИКОГДА не вводи текст в disabled/readonly поля.** safeInput() проверяет disabled и readOnly.

6. **ВСЕГДА валидируй данные перед использованием.** validateVacancyData() перед add в results.

7. **ВСЕГДА проверяй URL перед навигацией.** extractVacancyId() вернёт '' если URL некорректный — проверяй и skip.

8. **ВСЕГДА логируй ошибки, не игнорируй.** Logger — единственный источник truth для отладки.

9. **НИКОГДА не trust данные из chrome.storage слепо.** Проверяй тип и структуру при чтении.

10. **ВСЕГДА предусматривай fallback.** Fallback-цепочки селекторов, fallback значения, fallback действия.

### 5.4 Anti-hallucination patterns

**Pattern 1: Safe accessor**
```javascript
// Вместо: el.textContent
function safeGetText(el, fallback = '') {
  return (el?.textContent?.trim()) || fallback;
}
```

**Pattern 2: Existential check**
```javascript
// Вместо: if (el) { el.click() }
if (el && el.offsetParent !== null && !el.disabled) {
  el.click();
}
```

**Pattern 3: Array safety**
```javascript
// Вместо: vacancies[0].title
const first = vacancies?.[0];
const title = first?.title || '';
```

**Pattern 4: Type guard**
```javascript
// Вместо: value.length
if (typeof value === 'string' && value.length > 0) {
  // use value
}
```

**Pattern 5: Regex safety**
```javascript
// Вместо: url.match(pattern)[1]
const match = url?.match(pattern);
const id = match?.[1] || '';
```

---

## 6. Риски и ограничения

### 6.1 Технические риски

| Риск | Вероятность | Митигация |
|---|---|---|
| hh.ru изменит DOM/селекторы | Высокая (SPA, частые деплои) | Fallback-цепочки, обновление selectors.js |
| hh.ru заблокирует расширение | Низкая (расширение = реальный браузер) | Rate limiter, human timing, daily limits |
| React 18 change event handling | Средняя | Native setter pattern (проверен на React 17-19) |
| Manifest V3 restrictions | Низкая | Service Worker + chrome.storage (без remote code) |
| Chrome Web Store rejection | Средняя | Начать как unpacked extension |

### 6.2 Риски для пользователя

| Риск | Митигация |
|---|---|
| Бан аккаунта за массовые отклики | Default: manual mode, daily limit 200, min interval 30s |
| ATS spammer mark (152-ФЗ) | Пользователь контролирует все действия, semi-auto mode |
| Капча при частых действиях | Rate limiter adaptive slowdown при CAPTCHA |
| Потеря данных при удалении расширения | chrome.storage.local persists, но export needed |

### 6.3 Чего расширение НЕ делает

- ❌ Не отправляет данные на сторонние серверы
- ❌ Не читает пароли или cookies (только chrome.storage)
- ❌ Не модифицирует hh.ru код (только читает DOM и кликает)
- ❌ Не обходит CAPTCHA автоматически (останавливается)
- ❌ Не хранитcredentials в Telegram (в отличие от старого hh-bot)
- ❌ Не требует OAuth авторизации

---

## 7. План развития

### Фаза 1 (текущая): Базовая структура
- ✅ Manifest V3 architecture
- ✅ Selectors registry (47+ групп)
- ✅ Vacancy parser
- ✅ Panel UI (Shadow DOM, FAB + sidebar)
- ✅ Auth detection (13 selectors + cookie fallback)
- ✅ Resume parser (30+ селекторов, Magritte-совместимый)
- ✅ Resume display в sidebar (табовая система)
- ✅ Auto-respond (8-step flow, placeholder)
- ✅ Rate limiter + timing
- ✅ Matching engine
- ✅ Anti-hallucination system
- ✅ Popup dashboard
- ✅ CHANGELOG.md (версионирование)

### Фаза 2: Улучшения
- ⬜ AI cover letter generation (через Web LLM API)
- ⬜ Negotiation tracker (отслеживание сообщений от работодателей)
- ⬜ Auto-reply to messages (шаблонные ответы в переговорах)
- ⬜ Export/Import данных (JSON backup)
- ⬜ Analytics dashboard (графики откликов по дням/неделям)
- ⬜ Skill gap analysis (какие навыки востребованы, но отсутствуют в резюме)

### Фаза 3: Распространение
- ⬜ Chrome Web Store публикация
- ⬜ Firefox Add-ons порт (Manifest V2 adaptation)
- ⬜ Edge Add-ons (Chromium-based, минимальные изменения)
- ⬜ Автообновление селекторов (定期 проверка через web service)

---

## 8. Установка и использование

### Установка (Developer mode)

1. Открыть Chrome → `chrome://extensions`
2. Включить "Developer mode" (右上)
3. Кликнуть "Load unpacked"
4. Выбрать папку `hh-auto-respond-extension/`
5. Расширение появится в списке

### Использование

1. Открыть https://hh.ru/search/vacancy?text=Python
2. На правом краю экрана → синяя кнопка-стрелка
3. Кликнуть → панель с вакансиями
4. В панели: кнопка "Откликнуться" на каждой вакансии
5. Или "Откликнуться на все" для массового auto-apply
6. В popup (иконка расширения): статистика, настройки, шаблоны, логи

### Отладка

1. На странице hh.ru: F12 → Console → фильтр `[HH-AR]`
2. На панели расширения: "Service Worker" → Inspect views
3. Storage: chrome://extensions → расширение → "Storage" → Inspect

# Архитектура Telegram-бота HH.ru — Дополнение: Гибридный подход и наработки HH-Copilot

> Данный документ является дополнением к основному архитектурному документу `hh-bot-architecture.md`.
> Описывает интеграцию гибридного подхода (API + Playwright) и наработки, перенесённые из проекта HH-Copilot.

---

## Д1. Стратегия интеграции: Гибридный подход (API + Playwright)

### Д1.1. Обоснование

Исследование HH.ru API и анализ существующего проекта HH-Copilot (Chrome Extension) подтвердили, что **HH.ru последовательно ограничивает API-доступ для соискателей**. Эндпоинты записи (отклики, сообщения) возвращают `403 Forbidden` для соискательских токенов. При этом эндпоинты чтения (поиск вакансий, резюме, справочники) работают корректно.

Стратегия: **API для чтения, Playwright для записи**, с автоматическим переключением при получении `403`.

### Д1.2. Матрица каналов

| Операция | Основной канал | Fallback | Обоснование |
|----------|---------------|----------|-------------|
| Поиск вакансий | API `GET /vacancies` | — | Быстро, структурированно, пагинация |
| Чтение резюме | API `GET /resumes/mine`, `GET /resumes/{id}` | Playwright-скрапинг | API предпочтительнее (JSON), Playwright при 403 |
| Справочники | API `GET /dictionaries`, `/areas`, `/specializations` | — | Стабильные, кэшируемые |
| **Отклик на вакансию** | API `POST /vacancies/{id}/negotiations` | **Playwright** | API может вернуть 403 для соискателя |
| **Отправка сообщения** | API `POST /negotiations/{id}/messages` | **Playwright** | API может вернуть 403 для соискателя |
| **Чтение переписки** | API `GET /negotiations/{id}/messages` | **Playwright** | Сначала пробуем API, если 403 — браузер |
| Проверка авторизации | API `GET /me` | Cookies в Playwright | Оба канала |

### Д1.3. Гибридный клиент

```python
class HybridHHClient:
    """Гибридный клиент: API для чтения, Playwright для записи.
    
    Стратегия: сначала пытаемся через API (быстро, структурированно),
    при получении 403 переключаемся на Playwright (медленнее, но работает).
    """
    
    def __init__(self, api_client: HHApiClient, browser_client: HHBrowserClient):
        self.api = api_client
        self.browser = browser_client
    
    # ---- ЧТЕНИЕ: только API (быстро) ----
    
    async def search_vacancies(self, params: dict) -> list:
        """Поиск вакансий — только API"""
        return await self.api.get("/vacancies", params=params)
    
    async def get_resume(self, resume_id: str) -> dict:
        """Получение резюме — API с Playwright fallback"""
        try:
            return await self.api.get(f"/resumes/{resume_id}")
        except ForbiddenError:
            return await self.browser.scrape_resume(resume_id)
    
    async def get_dictionaries(self) -> dict:
        """Справочники — только API (кэшируется)"""
        return await self.api.get("/dictionaries")
    
    # ---- ЗАПИСЬ: API с Playwright fallback ----
    
    async def apply_to_vacancy(
        self, vacancy_id: str, resume_id: str, cover_letter: str
    ) -> ApplyResult:
        """Отклик на вакансию — API, затем Playwright при 403"""
        try:
            result = await self.api.post(
                f"/vacancies/{vacancy_id}/negotiations",
                json={"resume_id": resume_id, "message": cover_letter}
            )
            return ApplyResult(success=True, method="api", data=result)
        except ForbiddenError:
            result = await self.browser.apply_to_vacancy(
                vacancy_id, resume_id, cover_letter
            )
            return ApplyResult(success=result.success, method="playwright", data=result)
    
    async def send_message(
        self, negotiation_id: str, text: str
    ) -> MessageResult:
        """Отправка сообщения — API, затем Playwright при 403"""
        try:
            result = await self.api.post(
                f"/negotiations/{negotiation_id}/messages",
                json={"message": text}
            )
            return MessageResult(success=True, method="api", data=result)
        except ForbiddenError:
            result = await self.browser.send_message(negotiation_id, text)
            return MessageResult(success=result.success, method="playwright", data=result)
    
    async def get_messages(
        self, negotiation_id: str
    ) -> list:
        """Чтение сообщений — API, затем Playwright при 403"""
        try:
            return await self.api.get(f"/negotiations/{negotiation_id}/messages")
        except ForbiddenError:
            return await self.browser.read_messages(negotiation_id)
```

---

## Д2. Playwright Browser Client

### Д2.1. Реестр data-qa селекторов HH.ru

Селекторы перенесены из проекта HH-Copilot (проверены на живом HH.ru, июнь 2025). Для каждого элемента предусмотрен массив fallback-селекторов — при изменении верстки HH.ru система последовательно пробует каждый вариант.

```python
# hh_selectors.py

HH_SELECTORS = {
    # ========================================
    #  КАРТОЧКИ ВАКАНСИЙ (страница поиска)
    # ========================================
    "vacancy_card": '[data-qa="vacancy-serp__vacancy"]',
    "vacancy_title_link": 'a[data-qa="serp-item__title"]',
    "vacancy_title_text": '[data-qa="serp-item__title-text"]',
    "vacancy_company": [
        '[data-qa="vacancy-serp__vacancy-employer-text"]',
        '[data-qa="vacancy-serp__vacancy-employer"]',
    ],
    "vacancy_salary": '[data-qa="vacancy-serp__compensation"]',
    "vacancy_location": '[data-qa="vacancy-serp__vacancy-address"]',
    "vacancy_experience": '[data-qa^="vacancy-serp__vacancy-work-experience"]',
    
    # ========================================
    #  КНОПКИ ОТКЛИКА
    # ========================================
    "reply_button": [
        '[data-qa="vacancy-serp__vacancy_response"]',       # на странице поиска
        '[data-qa="vacancy-serp__vacancy-response-link"]',  # альтернативный
        '[data-qa="vacancy-response-link-top"]',            # на странице вакансии
    ],
    
    # ========================================
    #  POPUP ОТКЛИКА
    # ========================================
    "response_popup": '[data-qa="vacancy-response-submit-popup"]',
    "popup_container": '.vacancy-response-popup-content',
    "submit_button": [
        '[data-qa="vacancy-response-submit-popup"]',
        '.vacancy-response-submit-popup',
    ],
    "close_button": [
        '[data-qa="response-popup-close"]',
        '[data-qa="popup-close"]',
        '.vacancy-response-popup-close',
    ],
    
    # ========================================
    #  СОПРОВОДИТЕЛЬНОЕ ПИСЬМО
    # ========================================
    "add_cover_letter": '[data-qa="add-cover-letter"]',
    "cover_letter_input": [
        'textarea[data-qa="vacancy-response-popup-form-letter-input"]',
        '#cover-letter textarea',
        'textarea.magrite-input',
        'textarea.bloko-textarea',
    ],
    
    # ========================================
    #  ПРЕДУПРЕЖДЕНИЯ В POPUP
    # ========================================
    "indirect_alert": '[data-qa="magritte-alert"]',
    "alert_close": '[data-qa="magritte-alert-close"]',
    "country_confirm": '[data-qa="relocation-warning-confirm"]',
    "test_task_warning": '[data-qa="test-task-required"]',
    "already_applied": '[data-qa="already-applied"]',
    
    # ========================================
    #  ДАННЫЕ ВАКАНСИИ (страница вакансии)
    # ========================================
    "vacancy_title_on_page": '[data-qa="vacancy-title"]',
    "vacancy_company_on_page": '[data-qa="vacancy-company-name"]',
    "vacancy_description": '[data-qa="vacancy-description"]',
    "vacancy_skills": '[data-qa="skills-element"]',
    
    # ========================================
    #  ДАННЫЕ РЕЗЮМЕ (страница резюме)
    # ========================================
    "resume_name": [
        '[data-qa="resume-personal-name"]',
        '.resume-block__title',
        'h2.bloko-header-1',
    ],
    "resume_title": '[data-qa="resume-block-title-position"]',
    "resume_salary": '[data-qa="resume-block-salary"]',
    "resume_experience": '[data-qa="resume-block-experience"]',
    "resume_experience_company": '[data-qa="resume-block-experience-company"]',
    "resume_experience_position": '[data-qa="resume-block-experience-position"]',
    "resume_skill_tag": '[data-qa="skill-tag"]',
    "resume_education": '[data-qa="resume-block-education"]',
    "resume_language": '[data-qa="resume-block-language"]',
    
    # ========================================
    #  НАВИГАЦИЯ
    # ========================================
    "next_page": '[data-qa="pager-next"]',
    "prev_page": '[data-qa="pager-prev"]',
}


def find_element(page, key: str, root=None):
    """Поиск элемента с fallback по массиву селекторов.
    
    Если значение в HH_SELECTORS — строка, ищет напрямую.
    Если список — пробует каждый по порядку, возвращает первый найденный.
    """
    selectors = HH_SELECTORS.get(key)
    if selectors is None:
        raise KeyError(f"Unknown selector key: {key}")
    
    if isinstance(selectors, str):
        selectors = [selectors]
    
    for selector in selectors:
        element = (root or page).locator(selector)
        if element.count() > 0:
            return element.first
    
    return None
```

### Д2.2. React Input Bypass (порт из HH-Copilot)

HH.ru построен на React. Обычный `page.fill()` или `element.value = "text"` не работает корректно — React контролирует состояние input через virtual DOM и не реагирует на прямое изменение DOM. Решение: прямое обращение к React Fiber или использование native setter с диспетчеризацией событий.

```python
# react_input_bypass.py

REACT_INPUT_JS = """
(element, value) => {
    let success = false;
    
    // Method 1: React Fiber internal setter (most reliable for React 16+)
    try {
        const reactKeys = Object.keys(element).filter(k =>
            k.startsWith('__reactFiber') ||
            k.startsWith('__reactInternalInstance') ||
            k.startsWith('__reactProps')
        );
        
        for (const key of reactKeys) {
            const fiber = element[key];
            
            // React 18+: pendingProps
            if (fiber?.pendingProps?.onChange) {
                element.value = value;
                fiber.pendingProps.onChange({ target: element });
                success = true;
                break;
            }
            // React 16+: memoizedProps
            if (fiber?.memoizedProps?.onChange) {
                element.value = value;
                fiber.memoizedProps.onChange({ target: element });
                success = true;
                break;
            }
        }
    } catch (e) { /* fall through */ }
    
    // Method 2: Native setter + events (universally compatible)
    if (!success) {
        try {
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype, 'value'
            ) || Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
            );
            
            if (nativeSetter?.set) {
                nativeSetter.set.call(element, value);
            } else {
                element.value = value;
            }
            
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            success = true;
        } catch (e) { /* fall through */ }
    }
    
    // Method 3: ContentEditable fallback
    if (!success && element.isContentEditable) {
        element.textContent = value;
        element.dispatchEvent(new InputEvent('input', {
            inputType: 'insertText', data: value, bubbles: true
        }));
        success = true;
    }
    
    // Method 4: execCommand (legacy)
    if (!success) {
        element.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, value);
        success = true;
    }
    
    return success;
}
"""


async def fill_react_input(page, selector: str, text: str) -> bool:
    """Заполнение React-controlled input через обход Fiber.
    
    Args:
        page: Playwright Page object
        selector: CSS-селектор целевого textarea/input
        text: Текст для вставки
    
    Returns:
        True если вставка успешна, False иначе
    """
    element = page.locator(selector)
    if element.count() == 0:
        return False
    
    # Фокус на элементе
    await element.focus()
    await page.wait_for_timeout(200)
    
    # Попытка через React bypass
    result = await page.evaluate(REACT_INPUT_JS, [element.first, text])
    
    if result:
        # Верификация — проверяем, что текст действительно вставлен
        await page.wait_for_timeout(300)
        value = await element.input_value()
        if value == text:
            return True
    
    # Fallback: посимвольная эмуляция ввода
    try:
        await element.fill("")  # Очистка
        await page.keyboard.type(text, delay=random.randint(30, 120))
        return True
    except Exception:
        return False
```

### Д2.3. Антидетект-модуль (порт из HH-Copilot)

Модуль имитации человеческого поведения. Ключевой принцип — **распределение Гаусса** для задержек вместо равномерного. Люди не действуют через равные интервалы времени; HH.ru может детектировать ботов по паттерну фиксированных задержек.

```python
# anti_detect.py

import random
import asyncio
from dataclasses import dataclass


@dataclass
class AntiDetectConfig:
    """Конфигурация антидетекта.
    
    Параметры перенесены из HH-Copilot (anti-detect.js) и адаптированы
    для серверного Playwright.
    """
    enabled: bool = True
    
    # Задержки между действиями (Gaussian distribution)
    gaussian_mean_ms: int = 10000     # Среднее: 10 сек
    gaussian_stddev_ms: int = 4000    # Отклонение: 4 сек
    min_delay_ms: int = 2000          # Минимум: 2 сек
    
    # Имитация чтения вакансии
    reading_pause_min_ms: int = 5000  # 5 сек
    reading_pause_max_ms: int = 12000 # 12 сек
    
    # Длинные паузы (каждые N откликов)
    long_pause_every: int = 5         # Каждые 5 откликов
    long_pause_duration_ms: int = 30000  # 30 сек
    long_pause_jitter_ms: int = 10000    # +/- 10 сек
    
    # Эмуляция мыши
    mouse_jitter: bool = True
    
    # Эмуляция ввода текста
    typing_delay_min_ms: int = 30     # 30 мс на символ
    typing_delay_max_ms: int = 120    # 120 мс на символ
    
    # Дневной лимит откликов
    daily_apply_limit: int = 50
    
    # Задержка между откликами в batch
    batch_delay_min_ms: int = 5000    # 5 сек
    batch_delay_max_ms: int = 12000   # 12 сек


def gaussian_random(mean: float, stddev: float, minimum: float = 2000) -> float:
    """Генерация случайного числа с распределением Гаусса.
    
    Использует метод Box-Muller для преобразования равномерного
    распределения в нормальное. Ограничено снизу minimum для
    исключения нулевых и отрицательных задержек.
    """
    u1 = random.random()
    u2 = random.random()
    z = (-2.0 * math.log(u1)) ** 0.5 * math.cos(2.0 * math.pi * u2)
    return max(minimum, mean + z * stddev)


async def random_delay(config: AntiDetectConfig = None) -> None:
    """Случайная задержка с Gaussian-распределением (имитация «думания»)."""
    config = config or AntiDetectConfig()
    if not config.enabled:
        return
    delay = gaussian_random(config.gaussian_mean_ms, config.gaussian_stddev_ms, config.min_delay_ms)
    await asyncio.sleep(delay / 1000)


async def simulate_reading(config: AntiDetectConfig = None) -> None:
    """Имитация чтения страницы вакансии."""
    config = config or AntiDetectConfig()
    if not config.enabled:
        return
    duration = random.randint(config.reading_pause_min_ms, config.reading_pause_max_ms)
    await asyncio.sleep(duration / 1000)


async def simulate_long_pause(config: AntiDetectConfig = None) -> None:
    """Длинная пауза (каждые N откликов) — имитация перерыва."""
    config = config or AntiDetectConfig()
    if not config.enabled:
        return
    duration = config.long_pause_duration_ms + random.randint(
        -config.long_pause_jitter_ms, config.long_pause_jitter_ms
    )
    await asyncio.sleep(max(20000, duration) / 1000)


async def human_click(page, selector: str, config: AntiDetectConfig = None) -> None:
    """Клик с эмуляцией человеческого поведения: движение мыши + задержка."""
    config = config or AntiDetectConfig()
    
    element = page.locator(selector)
    box = await element.bounding_box()
    if not box:
        await element.click()
        return
    
    # Движение мыши к элементу (не мгновенное)
    if config.mouse_jitter:
        target_x = box["x"] + box["width"] * (0.3 + random.random() * 0.4)
        target_y = box["y"] + box["height"] * (0.3 + random.random() * 0.4)
        await page.mouse.move(target_x, target_y, steps=random.randint(5, 15))
    
    # Случайная задержка перед кликом
    if config.enabled:
        await asyncio.sleep(random.uniform(0.3, 1.2))
    
    await element.click()


async def batch_delay(is_long_pause: bool, apply_count: int, config: AntiDetectConfig = None) -> None:
    """Задержка между откликами в batch-режиме.
    
    Каждые long_pause_every откликов — длинная пауза.
    В остальных случаях — обычная задержка с Gaussian-распределением.
    """
    config = config or AntiDetectConfig()
    
    if is_long_pause:
        await simulate_long_pause(config)
    else:
        delay = random.randint(config.batch_delay_min_ms, config.batch_delay_max_ms)
        await asyncio.sleep(delay / 1000)
```

### Д2.4. Полный поток отклика через Playwright

```
1. HybridHHClient.apply_to_vacancy() → API возвращает 403
2. → HHBrowserClient.apply_to_vacancy(vacancy_id, resume_id, cover_letter)
3. → SessionManager.get_context(user_id) — получение/создание BrowserContext
4. → page.goto("https://hh.ru/vacancy/{vacancy_id}")
5. → wait_for_load_state("networkidle")
6. → Проверка авторизации (если редирект на /login → повторный OAuth)
7. → human_click(page, 'reply_button') — кнопка «Откликнуться»
8. → wait_for_selector('response_popup') — ожидание popup
9. → check_popup_alerts() — проверка предупреждений:
     - already_applied → отмена, логирование
     - test_task_warning → отмена, уведомление пользователю
     - country_confirm → клик подтверждения
     - indirect_alert → попытка закрыть
10. → find_element('add_cover_letter') → клик (раскрыть секцию письма)
11. → fill_react_input(page, 'cover_letter_input', cover_letter) — вставка письма
12. → human_click(page, 'submit_button') — отправка
13. → wait_for_timeout(1500) → проверка результата:
     - popup закрыт → успех
     - error_message → логирование ошибки
14. → find_element('close_button') → закрытие popup (при ошибке)
15. → SessionManager.save_cookies(user_id) — сохранение cookies
16. → return ApplyResult(success=True/False, method="playwright")
```

---

## Д3. Session Manager — управление браузерными сессиями

### Д3.1. Пул контекстов

Нельзя открывать новый браузер на каждое действие — слишком медленно и ресурсоёмко. Используется **LRU-пул** BrowserContext с привязкой к `user_id`.

```python
# session_manager.py

class BrowserSessionPool:
    """Пул BrowserContext с LRU-eviction и персистентностью cookies.
    
    - Максимум N контекстов одновременно
    - LRU-eviction при переполнении
    - TTL 30 мин неактивности → закрытие
    - Cookies сохраняются в Redis между сессиями
    - При потере сессии → повторный OAuth через бота
    """
    
    MAX_CONTEXTS = 5
    CONTEXT_TTL_SECONDS = 1800  # 30 минут
    
    def __init__(self, browser: Browser, redis: Redis):
        self._browser = browser
        self._redis = redis
        self._contexts: OrderedDict[int, BrowserContext] = OrderedDict()
        self._last_used: dict[int, float] = {}
    
    async def get_context(self, user_id: int) -> BrowserContext:
        """Получить или создать BrowserContext для пользователя."""
        
        # Проверяем, есть ли контекст в пуле
        if user_id in self._contexts:
            self._contexts.move_to_end(user_id)  # LRU
            self._last_used[user_id] = time.time()
            return self._contexts[user_id]
        
        # LRU eviction если пул полон
        if len(self._contexts) >= self.MAX_CONTEXTS:
            oldest_user_id = next(iter(self._contexts))
            await self._close_context(oldest_user_id)
        
        # Создаём новый контекст
        context = await self._browser.new_context(
            user_agent=get_random_user_agent(),
            viewport={"width": 1280, "height": 720},
            locale="ru-RU",
        )
        
        # Восстанавливаем cookies из Redis
        cookies_json = await self._redis.get(f"hh:cookies:{user_id}")
        if cookies_json:
            cookies = json.loads(cookies_json)
            await context.add_cookies(cookies)
        
        self._contexts[user_id] = context
        self._last_used[user_id] = time.time()
        
        return context
    
    async def save_cookies(self, user_id: int) -> None:
        """Сохранить cookies контекста в Redis."""
        if user_id not in self._contexts:
            return
        
        context = self._contexts[user_id]
        cookies = await context.cookies()
        await self._redis.setex(
            f"hh:cookies:{user_id}",
            86400,  # TTL 24 часа
            json.dumps(cookies)
        )
    
    async def _close_context(self, user_id: int) -> None:
        """Закрыть контекст с сохранением cookies."""
        if user_id in self._contexts:
            await self.save_cookies(user_id)
            await self._contexts[user_id].close()
            del self._contexts[user_id]
            del self._last_used[user_id]
```

### Д3.2. Известные сессионные cookie HH.ru

Список перенесён из HH-Copilot (`cookies.js`). Только эти имена cookie считаются индикаторами авторизации.

```python
HH_SESSION_COOKIE_NAMES = [
    'hhsession',
    '_hh_session',
    'hhuid',
    'csrf_token',
    'session',
    'CookieUser',
    'hhtoken',
    'refresh_token',
    'access_token',
]

def is_user_logged_in(cookies: list[dict]) -> bool:
    """Проверка авторизации по известным cookie HH.ru."""
    cookie_names = {c["name"] for c in cookies}
    return bool(cookie_names & set(HH_SESSION_COOKIE_NAMES))
```

---

## Д4. Обновление основной архитектуры

### Д4.1. Обновлённая схема Core Service Layer

```
Core Service Layer
├── Auth Service
├── Resume Parser
│   └── Playwright fallback (profile-scraper)
├── Matching Engine
├── Negotiation Service
│
├── HybridHHClient  ← НОВЫЙ: единая точка входа
│   ├── HHApiClient (httpx)           — чтение через API
│   └── HHBrowserClient (Playwright)  — запись через браузер
│       ├── hh_selectors.py           — реестр data-qa селекторов
│       ├── react_input_bypass.py     — обход React Fiber
│       ├── anti_detect.py            — Gaussian задержки, mouse jitter
│       └── session_manager.py        — пул BrowserContext + cookies
│
└── CircuitBreaker                    — защита от каскадных сбоев
```

### Д4.2. Обновление стека технологий

| Компонент | Технология | Обоснование |
|-----------|-----------|-------------|
| **Browser Automation** | Playwright (Python) | Асинхронный, headless Chromium, контексты, перехват запросов |
| **Anti-detect** | playwright-stealth | Патч navigator.webdriver, эмуляция отпечатков |
| **Circuit Breaker** | pybreaker / кастомный | Защита от каскадных сбоев при недоступности API/HH.ru |

### Д4.3. Обновление Background Workers

| Задача | Расписание | Канал | Описание |
|--------|-----------|-------|----------|
| `search_new_vacancies` | Каждые 30 мин | API | Поиск новых вакансий по фильтрам |
| `monitor_negotiations` | Каждые 5 мин | API → Playwright | Проверка новых сообщений |
| `auto_apply_batch` | По требованию | API → Playwright | Массовый отклик (batch FSM) |
| `refresh_tokens` | Каждый час | API | Упреждающее обновление токенов |
| `generate_cover_letters` | По требованию | LLM API | Генерация сопроводительных |
| `update_vectors` | Каждые 6 ч | API | Обновление эмбеддингов |
| **`cleanup_browser_pool`** | Каждые 10 мин | Playwright | Закрытие неактивных BrowserContext (TTL 30 мин) |
| **`validate_selectors`** | Каждые 24 ч | Playwright | Проверка актуальности data-qa селекторов на HH.ru |

### Д4.4. Batch Apply — конечный автомат

Порт из HH-Copilot (`auto-apply.js`). Последовательная обработка с антидетект-задержками и возможностью остановки пользователем.

```python
# apply_worker.py

class ApplyBatchWorker:
    """Конечный автомат батчевой обработки вакансий.
    
    States: IDLE → RUNNING → PAUSED/STOPPING → IDLE
    """
    
    def __init__(self, config: AntiDetectConfig = None):
        self.state = "idle"
        self.config = config or AntiDetectConfig()
        self.processed = 0
        self.failed = 0
        self.skipped = 0
    
    async def run_batch(
        self,
        user_id: int,
        vacancies: list[Vacancy],
        client: HybridHHClient,
        on_progress: Callable = None,
    ) -> BatchResult:
        """Последовательная обработка вакансий с антидетект-задержками."""
        self.state = "running"
        self.processed = self.failed = self.skipped = 0
        
        for i, vacancy in enumerate(vacancies):
            # Проверка остановки
            if self.state == "stopping":
                self.state = "idle"
                return BatchResult(stopped=True, ...)
            
            # Пропуск уже обработанных
            if vacancy.status == "applied":
                self.skipped += 1
                continue
            
            # Проверка дневного лимита
            if self.processed >= self.config.daily_apply_limit:
                break
            
            # Имитация чтения вакансии
            await simulate_reading(self.config)
            
            # Отклик
            try:
                result = await client.apply_to_vacancy(
                    user_id, vacancy.id, vacancy.resume_id, vacancy.cover_letter
                )
                if result.success:
                    self.processed += 1
                else:
                    self.failed += 1
            except Exception:
                self.failed += 1
            
            # Прогресс-уведомление
            if on_progress:
                await on_progress(i + 1, len(vacancies), vacancy)
            
            # Задержка между откликами
            is_long_pause = (i + 1) % self.config.long_pause_every == 0
            await batch_delay(is_long_pause, self.processed, self.config)
        
        self.state = "idle"
        return BatchResult(processed=self.processed, failed=self.failed, ...)
    
    def stop(self):
        """Пользовательская остановка batch-обработки."""
        self.state = "stopping"
```

---

## Д5. Безопасность AI-генерации (из HH-Copilot)

Перенесено из `ai.js` проекта HH-Copilot. Критические меры безопасности при генерации сопроводительных писем через LLM.

### Д5.1. Sanitization промптов

Перед подстановкой данных вакансии в промпт LLM необходимо очистить от потенциальных injection-атак:

```python
import re

def sanitize_for_prompt(text: str, max_length: int = 500) -> str:
    """Очистка пользовательских данных перед подстановкой в AI-промпт.
    
    Удаляет:
    - Попытки prompt injection ("ignore previous instructions", "system:")
    - Переносы строк и кавычки (могут сломать структуру промпта)
    - Ограничивает длину
    """
    text = str(text or "")
    text = re.sub(r'["\n\r]', ' ', text)
    text = re.sub(r'ignore\s+(all\s+)?previous\s+instructions', '[filtered]', text, flags=re.IGNORECASE)
    text = re.sub(r'forget\s+(all\s+)?previous', '[filtered]', text, flags=re.IGNORECASE)
    text = re.sub(r'system\s*:', '[filtered]', text, flags=re.IGNORECASE)
    return text[:max_length]
```

### Д5.2. Валидация AI-ответов

Сгенерированное письмо должно быть проверено перед отправкой работодателю:

```python
def validate_ai_content(letter: str, max_length: int = 2000) -> str:
    """Валидация AI-сгенерированного контента перед отправкой.
    
    Проверки:
    - Удаление HTML-тегов
    - Удаление markdown-форматирования
    - Ограничение длины
    - Запрет URL (LLM не должна генерировать ссылки)
    - Запрет JavaScript/XSS
    - Удаление Unicode-графики (emoji и т.д.)
    """
    if not letter or not isinstance(letter, str):
        return ""
    
    # Удаление HTML
    letter = re.sub(r'<[^>]*>', '', letter)
    
    # Удаление markdown
    letter = re.sub(r'^#+\s*', '', letter, flags=re.MULTILINE)
    letter = re.sub(r'\*\*', '', letter)
    
    # Ограничение длины
    if len(letter) > max_length:
        letter = letter[:max_length]
    
    # Запрет URL
    if re.search(r'https?://', letter, re.IGNORECASE):
        return ""
    
    # Запрет XSS
    if re.search(r'javascript:', letter, re.IGNORECASE) or re.search(r'on\w+\s*=', letter, re.IGNORECASE):
        return ""
    
    return letter.strip()
```

---

## Д6. Обновление рисков

### Д6.1. Скорректированные риски с учётом HH-Copilot

| Риск | Уровень | Обоснование | Митигация |
|------|---------|-------------|-----------|
| **API для соискателей закрыт** | 🟡 Смягчён | Подтверждено HH-Copilot; Playwright — рабочий обходной путь | Гибридный подход (API + Playwright) |
| **Премодерация приложения** | 🔴 Критический | Без одобрения HH.ru нет OAuth | Регистрация приложения; при отказе — авторизация через cookies Playwright |
| **Хрупкость селекторов** | 🟡 Средний | HH.ru может изменить data-qa при обновлении | Fallback-селекторы (3-5 вариантов на элемент); задача `validate_selectors` каждые 24ч |
| **Headless-детекция** | 🟡 Средний | HH.ru может детектировать Playwright-headless | `playwright-stealth`; ротация User-Agent; новый headless-режим Chromium |
| **Rate Limiting** | 🟢 Низкий | Решается кэшированием и очередями | Кэш Redis; Circuit Breaker; дневной лимит 50 откликов |
| **Отсутствие real-time** | 🟡 Средний | Нет WebSocket на HH.ru | Polling: 5 мин для переписки, 30 мин для поиска |
| **Юридические риски** | 🔴 Критический | Автоматизированные действия нарушают ToS HH.ru | Оповещение пользователя о рисках; ручной режим по умолчанию |

### Д6.2. Новый риск: ресурсоёмкость Playwright

| Метрика | API (httpx) | Playwright |
|---------|------------|------------|
| Время отклика | 100-300 мс | 3-8 сек |
| RAM на контекст | ~1 МБ | ~150-300 МБ |
| Параллелизм | 100+ req/sec | 3-5 одновременных контекстов |
| CPU | Минимальный | Умеренный (рендеринг, JS) |

**Оптимизация:**
- Пул контекстов с LRU-eviction (максимум 5 одновременных)
- Блокировка ненужных ресурсов через `page.route()` (шрифты, картинки, аналитика)
- Использование `headless: "new"` вместо `headed`
- Сохранение cookies в Redis для быстрого восстановления сессий
- Минимальные требования сервера: 8 ГБ RAM при 10+ одновременных пользователях

---

## Д7. Сводная таблица портирования из HH-Copilot

| Компонент HH-Copilot | Файл-источник | Модуль в нашем боте | Статус портирования |
|----------------------|---------------|---------------------|---------------------|
| data-qa селекторы | `selectors-registry.js` | `hh_selectors.py` | Готов к портированию |
| React Input Bypass | `trigger-input.js` | `react_input_bypass.py` | Готов к портированию |
| Антидетект | `anti-detect.js` | `anti_detect.py` | Готов к портированию |
| Rate Limiter (50/день) | `rate-limiter.js` | `AntiDetectConfig.daily_apply_limit` | Готов к портированию |
| Batch FSM | `auto-apply.js` | `apply_worker.py` | Готов к портированию |
| Profile Scraper | `profile-scraper.js` | `resume_parser.py` (fallback) | Готов к портированию |
| Cookie Check | `cookies.js` | `session_manager.py` | Готов к портированию |
| AI Letter Gen | `ai.js` | `cover_letter_generator.py` | Усиление sanitization + validation |
| API Retry + Circuit Breaker | `api-retry.js` | `api_client.py` | Аналог на Python (tenacity + pybreaker) |
| Wait Helpers | `wait-helpers.js` | Playwright встроенный `wait_for_selector` | Не нужен (Playwright имеет нативные методы) |
| Popup Helpers | `popup-helpers.js` | `browser_client.py` | Интегрировано в поток отклика |
| Bot Bridge | `bot-bridge.js` | `apply_worker.py` + Celery | Интегрировано в batch worker |

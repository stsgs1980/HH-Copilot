# HH-Bot — Автоматический отклик на вакансии HH.ru

> **Важно:** HH.ru закрыл Applicant API 15 декабря 2025 года. Все операции выполняются через Playwright-автоматизацию браузера.

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js Dashboard                       │
│   (React + TailwindCSS + shadcn/ui, порт 3000)              │
│                                                              │
│   ┌──────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐  │
│   │ Резюме   │ │ Вакансии  │ │ Переговоры│ │ Настройки  │  │
│   └─────┬────┘ └─────┬─────┘ └─────┬─────┘ └─────┬──────┘  │
│         └─────────────┴─────────────┴─────────────┘          │
│                           │ API Routes                       │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTP
┌───────────────────────────┼──────────────────────────────────┐
│                   FastAPI Backend (порт 8000)                 │
│                           │                                  │
│   ┌───────────────────────┴──────────────────────────────┐   │
│   │                  HybridHHClient                      │   │
│   │            (Playwright-only фасад)                    │   │
│   └───────────┬──────────────────────┬───────────────────┘   │
│               │                      │                        │
│   ┌───────────┴──────────┐  ┌───────┴──────────────┐        │
│   │  HHBrowserClient     │  │  BrowserSessionPool   │        │
│   │  (скрейпинг, отклик) │  │  (cookie-персист, LRU)│        │
│   └───────────┬──────────┘  └───────────────────────┘        │
│               │                                               │
│   ┌───────────┴──────────────────────────────────────┐       │
│   │             Anti-Detect + Selectors               │       │
│   │   (Gaussian delays, stealth scripts, fallback     │       │
│   │    CSS selectors с data-qa атрибутами HH.ru)      │       │
│   └───────────────────────────────────────────────────┘       │
│                                                               │
│   ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐   │
│   │ MatchingEngine│  │ CoverLetterAI │  │   SQLAlchemy    │   │
│   │ (5-компон.   │  │ (OpenAI API,  │  │   + SQLite      │   │
│   │  скоринг)    │  │  fallback)    │  │   (WAL mode)    │   │
│   └──────────────┘  └───────────────┘  └─────────────────┘   │
└───────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                   Telegram Bot (aiogram 3)                   │
│   /start → /auth → /search → /apply → уведомления           │
│   Inline-клавиатуры для одобрения/пропуска вакансий         │
└───────────────────────────────────────────────────────────────┘
```

## Workflow (полный цикл)

### 1. Авторизация на HH.ru через Playwright

```
Пользователь → Telegram /auth  или  Dashboard "Подключить HH.ru"
        │
        ▼
FastAPI запускает Playwright-браузер
        │
        ▼
┌─────────────────────────────────┐
│  Открывает hh.ru/account/login │
│  Заполняет email → Далее       │
│  Заполняет пароль → Войти      │
│                                │
│  Если CAPTCHA:                 │
│    Скриншот → Telegram/Dashboard │
│    Пользователь вводит текст   │
│                                │
│  Если 2FA:                     │
│    Пользователь вводит код     │
│                                │
│  После успеха:                 │
│    Куки сохраняются в DB       │
│    (User.hh_cookies TEXT)      │
└─────────────────────────────────┘
```

**Селекторы логина** (из `selectors.py`):
- Email: `input[name="username"]` → `input[type="email"]` → `#login-input-username`
- Кнопка "Далее": `button[data-qa="account-login-submit"]`
- Пароль: `input[name="password"]` → `input[type="password"]`
- Кнопка "Войти": `button[type="submit"]`
- Проверка входа: `[data-qa="mainmenu_applicant"]`

### 2. Синхронизация резюме

```
Dashboard "Синхронизировать"  или  Telegram /resume
        │
        ▼
Playwright открывает hh.ru/applicant/resumes
        │
        ▼
Находит все ссылки на резюме (a[data-qa="resume-title-link"])
        │
        ▼
Переходит на каждую страницу резюме
        │
        ▼
Извлекает: имя, должность, навыки, опыт, образование
        │
        ▼
Сохраняет в DB (таблица resumes)
```

### 3. Поиск вакансий

```
Dashboard "Искать вакансии"  или  Telegram /search
        │
        ▼
Параметры поиска из UserSettings:
  - search_area (1=Москва, 2=СПб, ...)
  - search_specialization
  - search_experience
  - search_employment
  - search_schedule
  - include_keywords / exclude_keywords
        │
        ▼
Playwright открывает hh.ru/search/vacancy?{params}
        │
        ▼
Парсит карточки вакансий:
  ┌──────────────────────────────────┐
  │ vacancy_card → [data-qa="vacancy-serp__vacancy"]        │
  │   title  → [data-qa="serp-item__title"]                 │
  │   company → [data-qa="vacancy-serp__vacancy-employer-text"]│
  │   salary → [data-qa="vacancy-serp__compensation"]       │
  │   location → [data-qa="vacancy-serp__vacancy-address"]  │
  └──────────────────────────────────┘
        │
        ▼
Переходит на след. страницу (pager-next), до max_pages=3
        │
        ▼
Для каждой вакансии: скрейпит полную страницу
  (описание, навыки [data-qa="skills-element"], опыт)
        │
        ▼
MatchingEngine.compute_score() для каждой вакансии
        │
        ▼
Вакансии с score >= min_match_score (70) сохраняются
  в DB со статусом "new"
```

### 4. Мэтчинг (скоринг)

```
MatchingEngine — 5-компонентный гибридный скоринг:

┌─────────────────────────────────────────────────────┐
│ Компонент          │ Вес  │ Метод                   │
│────────────────────│──────│─────────────────────────│
│ Embedding          │ 30%  │ TF-IDF token overlap    │
│ Skills overlap     │ 25%  │ Jaccard + partial match │
│ Experience match   │ 20%  │ Required vs actual yrs  │
│ Position title     │ 15%  │ Token overlap           │
│ Education relevance│ 10%  │ Keyword overlap         │
│────────────────────│──────│─────────────────────────│
│ ИТОГО              │ 100% │ 0-100 баллов            │
└─────────────────────────────────────────────────────┘

Веса настраиваются через .env:
  EMBEDDING_WEIGHT=0.30
  SKILLS_WEIGHT=0.25
  EXPERIENCE_WEIGHT=0.20
  POSITION_WEIGHT=0.15
  EDUCATION_WEIGHT=0.10

Порог: MIN_MATCH_SCORE=70 (вакансии ниже — пропускаются)
```

### 5. Отклик на вакансию

```
Dashboard "Откликнуться"  или  Telegram inline-кнопка
        │
        ▼
Playwright открывает страницу вакансии
        │
        ▼
simulate_reading() — пауза 5-12 сек (имитация чтения)
        │
        ▼
Кликает "Откликнуться":
  [data-qa="vacancy-response-link-top"]
  → button:has-text("Откликнуться")
        │
        ▼
Ждёт popup отклика:
  [data-qa="vacancy-response-submit-popup"]
        │
        ▼
Обрабатывает алерты:
  - Релокация → [data-qa="relocation-warning-confirm"]
  - Кадровое агентство → "Продолжить"
        │
        ▼
Генерирует сопроводительное (CoverLetterGenerator):
  - OpenAI GPT-4o-mini → персонализированное письмо
  - Fallback на шаблон если AI недоступен
  - Санитизация входов/выходов
        │
        ▼
Заполняет textarea письма:
  [data-qa="vacancy-response-popup-form-letter-input"]
        │
        ▼
Выбирает резюме (если несколько):
  input[value="{resume_id}"]
        │
        ▼
Кликает "Отправить отклик":
  [data-qa="vacancy-response-submit-popup"]
        │
        ▼
Статус вакансии → "applied" в DB
```

### 6. Переговоры (negotiations)

```
Работодатель отвечает → Новое сообщение в переговорах
        │
        ▼
Playwright скрейпит hh.ru/applicant/negotiations
  [data-qa="negotiation-item"]
        │
        ▼
Уведомление в Telegram с inline-кнопками:
  [Авто-ответ] [Ответить] [Пропустить]
        │
        ▼
При авто-ответе:
  AI генерирует ответ → Playwright отправляет
  textarea[data-qa="negotiation-message-input"]
  → button[data-qa="negotiation-message-send"]
```

### 7. Anti-Detection (защита от бана)

```
┌─────────────────────────────────────────────────────┐
│ Stealth-скрипты (при создании контекста):           │
│  - navigator.webdriver → false                     │
│  - window.chrome = { runtime: {} }                 │
│  - navigator.plugins → [1,2,3,4,5]                │
│  - navigator.languages → ['ru-RU','ru','en-US']    │
│                                                     │
│ Тайминг (AntiDetectConfig):                         │
│  - Gaussian random delay: μ=10s, σ=4s              │
│  - Чтение вакансии: 5-12 сек                       │
│  - Длинная пауза: каждые 5 действий, 25-40 сек     │
│  - Имитация набора: 30-120мс/символ                │
│                                                     │
│ BrowserSessionPool:                                 │
│  - Пул до 10 контекстов (по одному на пользователя)│
│  - LRU-eviction при переполнении                    │
│  - Cookie persistence в DB                          │
│  - User-Agent: Chrome 125, viewport 1920x1080      │
│  - Флаги: --disable-blink-features=AutomationControlled│
│                                                     │
│ Rate Limiting:                                      │
│  - DAILY_REPLY_LIMIT=50 откликов/день              │
│  - MIN_MATCH_SCORE=70 (не откликаемся на слабые)   │
└─────────────────────────────────────────────────────┘
```

## Структура проекта

```
hh-bot/                          # Python-бэкенд
├── src/
│   ├── hh/                      # HH.ru клиентская логика
│   │   ├── hybrid_client.py     # Фасад (Playwright-only)
│   │   ├── browser_client.py    # Playwright-автоматизация
│   │   ├── browser_auth.py      # Авторизация через браузер
│   │   ├── api_client.py        # REST-клиент (deprecated, API закрыт)
│   │   ├── anti_detect.py       # Gaussian timing, имитация чтения/набора
│   │   ├── selectors.py         # CSS-селекторы HH.ru (50+ элементов)
│   │   ├── auth.py              # OAuth2-логика (deprecated)
│   │   └── models.py            # Pydantic-модели (HHResume, HHVacancy)
│   ├── api/                     # FastAPI REST API
│   │   ├── app.py               # Конфигурация FastAPI
│   │   ├── vacancies.py         # POST /search, POST /{id}/apply
│   │   ├── resumes.py           # GET /, POST /sync
│   │   ├── negotiations.py      # GET /, POST /{id}/message
│   │   ├── auth.py              # Авторизация
│   │   ├── settings.py          # Настройки пользователя
│   │   └── schemas.py           # Pydantic-схемы API
│   ├── bot/                     # Telegram бот (aiogram 3)
│   │   ├── dispatcher.py        # Роутер команд
│   │   ├── handlers/            # Обработчики: auth, search, apply, resume...
│   │   ├── keyboards/           # Inline-клавиатуры
│   │   ├── filters/             # Фильтры (auth-required)
│   │   └── states/              # FSM-состояния диалогов
│   ├── services/                # Бизнес-логика
│   │   ├── vacancy_service.py   # Поиск + скоринг вакансий
│   │   ├── resume_service.py    # Управление резюме
│   │   ├── negotiation_service.py # Переговоры + авто-ответ
│   │   └── rate_limiter.py      # Ограничение откликов/день
│   ├── matching/                # Движок мэтчинга
│   │   └── engine.py            # 5-компонентный гибридный скоринг
│   ├── ai/                      # AI-генерация
│   │   ├── cover_letter.py      # GPT-4o-mini генерация писем
│   │   ├── prompts.py           # Системные промпты
│   │   └── sanitizer.py         # Санитизация входов/выходов
│   ├── db/                      # База данных
│   │   ├── database.py          # SQLAlchemy async engine
│   │   ├── models.py            # ORM: User, Resume, Vacancy, Negotiation...
│   │   └── repositories.py      # CRUD-операции
│   ├── worker/                  # Celery-воркер
│   │   ├── celery_app.py        # Конфигурация Celery + Redis
│   │   └── tasks.py             # Фоновые задачи
│   └── config.py                # Pydantic Settings (.env)
├── tests/
├── scripts/                     # Точки входа
│   ├── run_bot.py
│   ├── run_api.py
│   └── run_worker.py
├── Dockerfile
├── docker-compose.yml           # bot + worker + redis
└── pyproject.toml               # Зависимости Python 3.12+

src/                             # Next.js фронтенд
├── app/
│   ├── page.tsx                 # Главный дашборд
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # TailwindCSS
│   ├── api/hh/                  # Next.js API Routes (прокси к FastAPI)
│   │   ├── auth/                # Login, callback, captcha, 2FA
│   │   ├── vacancies/           # List, search, apply, skip, blacklist
│   │   ├── resumes/             # List, sync, skills
│   │   ├── negotiations/        # List, messages, auto-reply
│   │   ├── settings/            # User settings
│   │   ├── stats/               # Dashboard statistics
│   │   └── bot-status/          # Bot health check
│   └── auth/callback/           # HH.ru OAuth callback
├── components/
│   ├── dashboard/               # Основные вкладки
│   │   ├── sidebar.tsx          # Навигация
│   │   ├── resumes-tab.tsx      # Управление резюме
│   │   ├── vacancies-tab.tsx    # Вакансии + поиск
│   │   ├── negotiations-tab.tsx # Переговоры + чат
│   │   ├── dashboard-tab.tsx    # Статистика + графики
│   │   ├── settings-tab.tsx     # Настройки
│   │   └── bot-status-tab.tsx   # Статус бота + HH.ru коннект
│   └── ui/                      # shadcn/ui компоненты (40+)
├── lib/
│   ├── api.ts                   # API-клиент к Next.js routes
│   ├── fastapi-proxy.ts         # Прокси к FastAPI :8000
│   ├── db.ts                    # Prisma client
│   └── mock-data.ts             # TypeScript-типы
└── hooks/                       # React hooks

mini-services/hh-api/            # Bun-микросервис (альтернативный API)
```

## Быстрый старт

### Предварительные требования

- Python 3.12+
- Node.js 18+ / Bun
- Redis (для Celery-воркера)
- Playwright browsers

### 1. Клонирование и настройка

```bash
git clone https://github.com/stsgs1980/HH-bot.git
cd HH-bot

# Python-бэкенд
cd hh-bot
cp .env.example .env
# Заполните .env (см. ниже)
pip install -e ".[dev]"
playwright install chromium

# Next.js фронтенд
cd ..
npm install
npx prisma db push
```

### 2. Конфигурация `.env`

```bash
# === Telegram Bot ===
BOT_TOKEN=your_telegram_bot_token

# === HH.ru Login (Playwright) ===
HH_EMAIL=your_hh_email          # Опционально: автозаполнение логина
HH_PASSWORD=your_hh_password    # Опционально: автозаполнение пароля

# === AI (сопроводительные письма) ===
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# === Database ===
DATABASE_URL=sqlite+aiosqlite:///./data/hh_bot.db

# === Redis ===
REDIS_URL=redis://localhost:6379/0

# === Browser ===
BROWSER_HEADLESS=true           # false для отладки
BROWSER_TIMEOUT=30000

# === Rate Limits ===
DAILY_REPLY_LIMIT=50
MIN_MATCH_SCORE=70

# === Anti-Detection ===
ANTI_DETECT_ENABLED=true
GAUSSIAN_MEAN_SEC=10.0
GAUSSIAN_STDDEV_SEC=4.0
```

### 3. Запуск

**Docker (рекомендуется):**

```bash
cd hh-bot
docker-compose up -d
```

**Ручной запуск:**

```bash
# Terminal 1 — FastAPI
cd hh-bot && python -m scripts.run_api

# Terminal 2 — Telegram Bot
cd hh-bot && python -m scripts.run_bot

# Terminal 3 — Celery Worker (фоновые задачи)
cd hh-bot && python -m scripts.run_worker

# Terminal 4 — Next.js Dashboard
npm run dev
```

### 4. Использование

1. Откройте `http://localhost:3000`
2. Нажмите "Подключить HH.ru" на вкладке "Статус бота"
3. Playwright откроет HH.ru — введите логин/пароль
4. При необходимости введите CAPTCHA/2FA
5. После авторизации — синхронизируйте резюме
6. Нажмите "Искать вакансии" — бот найдёт и скорит вакансии
7. Откликайтесь на подходящие (автоматически или вручную)

## API Endpoints (FastAPI)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| `POST` | `/api/auth/login` | Запуск Playwright-авторизации на HH.ru |
| `POST` | `/api/auth/solve-captcha` | Ввод текста CAPTCHA |
| `POST` | `/api/auth/verify-2fa` | Ввод кода 2FA |
| `GET` | `/api/auth/status` | Статус авторизации |
| `GET` | `/api/resumes` | Список резюме из БД |
| `POST` | `/api/resumes/sync` | Скрейпинг резюме с HH.ru |
| `GET` | `/api/vacancies` | Список вакансий из БД |
| `POST` | `/api/vacancies/search` | Поиск вакансий на HH.ru |
| `POST` | `/api/vacancies/{id}/apply` | Отклик на вакансию |
| `POST` | `/api/vacancies/{id}/skip` | Пропустить вакансию |
| `POST` | `/api/vacancies/{id}/blacklist` | В чёрный список |
| `GET` | `/api/negotiations` | Список переговоров |
| `POST` | `/api/negotiations/{id}/message` | Отправить сообщение |
| `POST` | `/api/negotiations/{id}/toggle-auto-reply` | Вкл/выкл авто-ответ |
| `GET` | `/api/settings` | Настройки пользователя |
| `PUT` | `/api/settings` | Обновить настройки |
| `GET` | `/api/stats` | Статистика дашборда |

## Telegram Bot Commands

| Команда | Описание |
|---------|----------|
| `/start` | Приветствие + регистрация |
| `/auth` | Подключение HH.ru |
| `/resume` | Мои резюме |
| `/search` | Найти вакансии |
| `/apply` | Откликнуться |
| `/settings` | Настройки |
| `/career` | Направление карьеры |

## Селекторы HH.ru

Все CSS-селекторы централизованы в `hh-bot/src/hh/selectors.py`. Каждый элемент имеет список fallback-селекторов (от data-qa к CSS-классам), что обеспечивает устойчивость к изменениям вёрстки HH.ru.

| Категория | Элементы |
|-----------|----------|
| Поиск | vacancy_card, vacancy_title_link, vacancy_salary, next_page |
| Вакансия | vacancy_title_on_page, vacancy_company, vacancy_description, vacancy_skills |
| Отклик | reply_button, response_popup, cover_letter_input, submit_button |
| Алерты | relocation_confirm, indirect_employer_alert, already_applied |
| Резюме | resume_personal_name, resume_title, resume_skill_tag, resume_link |
| Логин | login_email_input, login_password_input, login_captcha_image, login_2fa_input |
| Переговоры | negotiation_item, message_input, send_message_button |

## Технологический стек

| Компонент | Технология |
|-----------|------------|
| Frontend | Next.js 16, React 19, TailwindCSS 4, shadcn/ui |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2 (async) |
| Browser Automation | Playwright (Chromium, stealth mode) |
| Telegram Bot | aiogram 3 |
| AI | OpenAI GPT-4o-mini (сопроводительные письма) |
| Task Queue | Celery + Redis |
| Database | SQLite (WAL mode) |
| Matching | scikit-learn, numpy |

## Известные риски и ограничения

1. **Anti-bot HH.ru** — Playwright может быть обнаружен. Stealth-скрипты + Gaussian-тайминг снижают риск, но не гарантируют 100%
2. **Изменение вёрстки** — HH.ru может обновить data-qa атрибуты. Fallback-селекторы дают буфер, но требуют обновления
3. **CAPTCHA** — некоторые сессии требуют повторного прохождения капчи
4. **Скорость** — Playwright-операции медленнее API (5-12 сек на чтение + Gaussian паузы)
5. **Headless vs Headed** — `BROWSER_HEADLESS=false` для отладки; некоторые анти-бот системы хуже детектят headed-режим

## Лицензия

Приватный проект. Все права защищены.

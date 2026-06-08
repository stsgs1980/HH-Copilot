# Отчёт по проекту HH-bot

**Дата:** 2026-06-09  
**Проект:** HH.ru automation bot  
**Репозиторий:** https://github.com/stsgs1980/HH-bot.git  
**Локальный путь:** `C:\Users\stsgr\HH-bot\hh-bot`

---

## 1. Обзор проекта

### 1.1 Цель проекта
Автоматизация работы с сайтом HH.ru (HeadHunter) — поиск вакансий, отклики, управление откликами и переговорами.

### 1.2 Ключевая особенность
**HH.ru закрыл Applicant API в декабре 2025 года!** Поэтому все операции выполняются через браузерную автоматизацию (Playwright) с сохранением cookies для переиспользования сессии.

### 1.3 Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXT.JS FRONTEND                          │
│                     (Port 3000, Turbopack)                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐  │
│  │Dashboard│ │Vacancies│ │ Resumes │ │Negotiat.│ │Bot Status │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └─────┬─────┘  │
│       │           │           │           │             │        │
│       └───────────┴───────────┴───────────┴─────────────┘        │
│                               │                                  │
│                    API Routes (/api/hh/*)                        │
│                               │                                  │
└───────────────────────────────┼──────────────────────────────────┘
                                │ HTTP Proxy
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                       FASTAPI BACKEND                             │
│                      (Port 8000)                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────────┐  │
│  │  Auth   │ │Resumes  │ │Vacancies│ │Negotiat.│ │ Bot Status │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └─────┬──────┘  │
│       │           │           │           │             │         │
│       └───────────┴───────────┴───────────┴─────────────┘         │
│                               │                                   │
│                    ┌──────────┴──────────┐                        │
│                    │   Playwright + HH   │                        │
│                    │   Browser Client    │                        │
│                    └──────────┬──────────┘                        │
│                               │                                   │
└───────────────────────────────┼───────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │      HH.ru Website    │
                    │   (Browser Automation)│
                    └───────────────────────┘
```

| Компонент | Технология | Порт |
|-----------|------------|------|
| Frontend | Next.js 16 + shadcn/ui | 3000 |
| Backend | FastAPI (Python 3.13) | 8000 |
| Браузерная автоматизация | Playwright (Chromium) | — |
| База данных | SQLite + SQLAlchemy + aiosqlite | — |
| ORM (Frontend) | Prisma | — |

---

## 2. Структура проекта

```
HH-bot/
├── hh-bot/                          # Python Backend
│   ├── src/
│   │   ├── api/                     # FastAPI Routers
│   │   │   ├── app.py               # Main FastAPI app
│   │   │   ├── auth.py              # Playwright login flow
│   │   │   ├── auth_verify.py       # Auth verification
│   │   │   ├── resumes.py           # Resume management
│   │   │   ├── vacancies.py         # Vacancy search & apply
│   │   │   ├── negotiations.py      # Messages & responses
│   │   │   ├── stats.py             # Dashboard statistics
│   │   │   ├── bot_status.py        # Bot status & control
│   │   │   └── settings.py          # User settings
│   │   │
│   │   ├── hh/                      # HH.ru Integration
│   │   │   ├── browser_auth.py      # Playwright authentication ⭐
│   │   │   ├── browser_client.py    # Browser operations ⭐
│   │   │   ├── api_client.py        # HTTP API client
│   │   │   ├── hybrid_client.py     # Combined HTTP + Browser
│   │   │   ├── anti_detect.py       # Stealth & timing
│   │   │   ├── selectors.py         # CSS selectors (HH 2026)
│   │   │   └── models.py            # Data models
│   │   │
│   │   ├── db/                      # Database
│   │   │   ├── database.py          # SQLAlchemy async setup
│   │   │   ├── models.py            # User, Vacancy, etc.
│   │   │   └── repositories.py      # Data access
│   │   │
│   │   ├── matching/                # Vacancy matching
│   │   │   └── engine.py            # ML-based matching
│   │   │
│   │   ├── ai/                      # AI features
│   │   │   ├── cover_letter.py      # Cover letter generation
│   │   │   └── prompts.py           # Prompts for AI
│   │   │
│   │   ├── bot/                     # Telegram bot (optional)
│   │   │   └── handlers/            # Bot handlers
│   │   │
│   │   └── config.py                # Settings
│   │
│   ├── requirements.txt             # Python dependencies
│   ├── pyproject.toml
│   └── tests/
│
├── src/                             # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx                 # Home page
│   │   ├── home-content.tsx         # Dashboard ⭐
│   │   ├── login/page.tsx           # Login page
│   │   ├── layout.tsx
│   │   │
│   │   └── api/hh/                  # API Routes (proxy to FastAPI)
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── status/route.ts
│   │       │   ├── verify-2fa/route.ts
│   │       │   └── solve-captcha/route.ts
│   │       ├── resumes/
│   │       ├── vacancies/
│   │       ├── negotiations/
│   │       ├── stats/
│   │       └── bot-status/
│   │
│   ├── components/
│   │   ├── dashboard/               # Dashboard tabs
│   │   │   ├── sidebar.tsx
│   │   │   ├── dashboard-tab.tsx
│   │   │   ├── vacancies-tab.tsx
│   │   │   ├── resumes-tab.tsx
│   │   │   ├── negotiations-tab.tsx
│   │   │   ├── settings-tab.tsx
│   │   │   └── bot-status-tab.tsx
│   │   │
│   │   └── ui/                      # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── tabs.tsx
│   │       └── ... (30+ components)
│   │
│   └── lib/
│       ├── fastapi-proxy.ts         # HTTP client to FastAPI ⭐
│       ├── api.ts                   # Frontend API functions
│       ├── hh-session.ts            # Session management
│       └── mock-data.ts             # TypeScript types
│
├── prisma/
│   └── schema.prisma                # Prisma schema
│
├── instrumentation.ts               # Next.js startup
├── package.json
└── README.md
```

---

## 3. Ключевые модули

### 3.1 Playwright Authentication (`hh-bot/src/hh/browser_auth.py`)

**Это сердце проекта!** Полностью реализованный Playwright-based логин:

```python
class HHBrowserAuth:
    """Playwright-based HH.ru authenticator."""
    
    # Login flow states
    class LoginState(str, Enum):
        IDLE = "idle"
        IN_PROGRESS = "in_progress"
        CAPTCHA_REQUIRED = "captcha_required"
        TWO_FA_REQUIRED = "two_fa_required"
        SUCCESS = "success"
        FAILED = "failed"
    
    # CSS selectors for HH.ru 2026 "Magritte" design
    LOGIN_SELECTORS = {
        "email_tab": [...],
        "email_input": [...],
        "password_input": [...],
        "captcha_image": [...],
        "two_fa_input": [...],
        "logged_in_indicator": [...],
    }
    
    async def start_login(user_id, email, password) -> dict
    async def solve_captcha(user_id, captcha_text) -> dict
    async def submit_2fa(user_id, code) -> dict
    async def save_cookies_to_db(user_id, session) -> None
    async def verify_session(user_id, cookies_json) -> dict
```

**Особенности:**
- Stealth режим (скрытие webdriver)
- CAPTCHA detection и screenshot для пользователя
- 2FA handling
- Cookie persistence в SQLite
- Session verification

### 3.2 Browser Client (`hh-bot/src/hh/browser_client.py`)

```python
class HHBrowserClient:
    """Playwright-based client for HH.ru write operations."""
    
    async def apply_to_vacancy(user_id, vacancy_url, resume_id, cover_letter)
    async def send_message(user_id, negotiation_url, message)
    async def scrape_profile(user_id) -> HHResume
    async def scrape_all_resumes(user_id) -> list[HHResume]
    async def scrape_vacancy_page(user_id, vacancy_url) -> HHVacancy
    async def search_vacancies_on_page(user_id, search_params, max_pages)
```

**Особенности:**
- Browser session pool (LRU eviction)
- Anti-detection timing
- Automatic cookie restoration

### 3.3 FastAPI Auth Router (`hh-bot/src/api/auth.py`)

```python
@router.post("/login")           # Start Playwright login
@router.get("/login-status")     # Check login progress
@router.post("/solve-captcha")   # Submit CAPTCHA text
@router.post("/verify-2fa")      # Submit 2FA code
@router.get("/status")           # Check auth status
@router.post("/disconnect")      # Remove cookies
@router.post("/verify-session")  # Re-check cookies
```

### 3.4 Next.js Proxy (`src/lib/fastapi-proxy.ts`)

```typescript
const FASTAPI_BASE = "http://localhost:8000";

export async function proxyPost<T>(path: string, body?: Record<string, any>): Promise<T> {
  const res = await fetch(`${FASTAPI_BASE}${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}
```

---

## 4. История установки

### 4.1 Проблема Python 3.14

**Обнаружено:** Python 3.14 (pre-release) установлен по умолчанию

**Ошибка при Playwright:**
```
File "asyncio/base_events.py", line 533, in _make_subprocess_transport
    raise NotImplementedError
```

**Причина:** Python 3.14 на Windows имеет неработающую реализацию asyncio subprocess.

### 4.2 Решение: Python 3.13.1

```powershell
# Проверка
py -3.13 --version
# Python 3.13.1 ✅

# Создание venv с Python 3.13
py -3.13 -m venv venv
.\venv\Scripts\activate
python --version
# Python 3.13.1 ✅
```

### 4.3 Проблема NumPy 1.26.4

**Ошибка:**
```
ERROR: Unknown compiler(s): [['cl'], ['gcc'], ['clang'], ...]
Running `cl /?` gave "[WinError 2] Не удается найти указанный файл"
```

**Причина:** `requirements.txt` содержит `numpy<2,>=1.26`. NumPy 1.26.x не имеет pre-built wheels для Python 3.13.

**Решение:**
```powershell
# Измените в requirements.txt:
# numpy<2,>=1.26  →  numpy>=2.0
```

---

## 5. Инструкции по запуску

### 5.1 Исправление requirements.txt

```powershell
cd C:\Users\stsgr\HH-bot\hh-bot

# Активировать venv (уже создан с Python 3.13)
.\venv\Scripts\activate

# Исправить numpy
(Get-Content requirements.txt) -replace 'numpy<2,>=1.26', 'numpy>=2.0' | Set-Content requirements.txt
```

### 5.2 Установка зависимостей

```powershell
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
playwright install chromium
```

### 5.3 Запуск Backend

```powershell
python -m uvicorn src.api.app:app --reload --port 8000
```

### 5.4 Запуск Frontend

```powershell
cd C:\Users\stsgr\HH-bot
npm run dev
```

---

## 6. Функционал

### 6.1 Авторизация HH.ru
- Playwright-based login с email + password
- CAPTCHA solving (пользователь вводит текст)
- 2FA verification (SMS/email код)
- Cookie persistence для повторного использования сессии
- Session verification (проверка валидности cookies)

### 6.2 Управление резюме
- Синхронизация резюме с HH.ru
- Просмотр навыков
- Установка основного резюме
- Добавление/удаление навыков

### 6.3 Поиск вакансий
- Поиск по ключевым словам
- Фильтрация по зарплате, локации, опыту
- Match score (ML-based matching)
- Чёрный список вакансий

### 6.4 Отклики
- Playwright-based apply (browser automation)
- Автоматическое создание cover letter (AI)
- Трекинг статусов откликов

### 6.5 Переговоры
- Просмотр переписки с работодателями
- Отправка сообщений через browser
- Авто-ответ (AI-powered)

### 6.6 Дашборд
- Статистика откликов
- Графики активности
- Логи действий бота
- Статус соединения с HH.ru

---

## 7. Статус проекта

| Компонент | Статус | Примечание |
|-----------|--------|------------|
| Frontend (Next.js) | ✅ Работает | Порт 3000 |
| shadcn/ui компоненты | ✅ Готово | 30+ компонентов |
| API Routes (proxy) | ✅ Работает | |
| Backend (FastAPI) | ⏳ Нужно проверить | Python 3.13 venv создан |
| Playwright Auth | ⏳ Нужно проверить | |
| Database (SQLite) | ⏳ Нужно проверить | |
| NumPy dependency | ❌ Нужно исправить | `numpy<2` → `numpy>=2.0` |

---

## 8. Следующие шаги

1. [ ] Исправить `requirements.txt`: `numpy>=2.0`
2. [ ] Установить pip dependencies
3. [ ] Установить Playwright браузеры: `playwright install chromium`
4. [ ] Запустить backend: `python -m uvicorn src.api.app:app --reload --port 8000`
5. [ ] Проверить http://localhost:8000/docs
6. [ ] Протестировать авторизацию HH.ru через веб-интерфейс

---

## 9. Вывод

**Это очень проработанный проект!**

- ✅ Полноценный Next.js frontend с shadcn/ui
- ✅ FastAPI backend с правильной архитектурой
- ✅ Playwright авторизация с CAPTCHA/2FA support
- ✅ Cookie persistence для сессий
- ✅ ML-based matching engine
- ✅ AI-generated cover letters
- ⏳ Требуется исправление numpy для запуска

**Главная проблема:** NumPy 1.26 в requirements.txt несовместим с Python 3.13 (нет wheels).

**Решение:** Изменить на `numpy>=2.0`.

---

*Документ обновлён: 2026-06-09 (полный обзор архитектуры)*

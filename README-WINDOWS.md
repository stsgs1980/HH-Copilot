# HH Bot - Запуск на Windows

## Требования

1. **Python 3.11+** - https://www.python.org/downloads/
2. **Node.js 18+** - https://nodejs.org/
3. **Git** - https://git-scm.com/

## Установка

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/stsgs1980/HH-bot.git
cd HH-bot
```

### 2. Установите зависимости Python

```bash
cd hh-bot
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

### 3. Установите зависимости Node.js

```bash
cd ..
npm install
# или
bun install
```

## Запуск

### Способ 1: Два терминала

**Терминал 1 - FastAPI бэкенд:**
```bash
cd hh-bot
venv\Scripts\activate
uvicorn src.api.app:app --host 0.0.0.0 --port 8000 --reload
```

**Терминал 2 - Next.js фронтенд:**
```bash
npm run dev
# или
bun run dev
```

Откройте: http://localhost:3000

### Способ 2: Один скрипт (Windows)

Создайте файл `start.bat`:
```batch
@echo off
start cmd /k "cd hh-bot && venv\Scripts\activate && uvicorn src.api.app:app --host 0.0.0.0 --port 8000"
timeout /t 5
start cmd /k "npm run dev"
```

## Использование

1. Откройте http://localhost:3000
2. Нажмите "Войти через HH.ru"
3. Введите email и пароль от HH.ru
4. Если появится CAPTCHA - введите текст с картинки
5. Если потребуется 2FA - введите код из SMS/email
6. После успешного входа - откроется дашборд

## Структура проекта

```
HH-bot/
├── src/                    # Next.js фронтенд
│   ├── app/                # Страницы
│   ├── components/         # React компоненты
│   └── lib/                # Утилиты
├── hh-bot/                 # Python бэкенд
│   ├── src/
│   │   ├── api/            # FastAPI endpoints
│   │   ├── hh/             # Playwright авторизация
│   │   └── db/             # База данных
│   └── data/               # SQLite база
└── README-WINDOWS.md       # Этот файл
```

## Возможные проблемы

### "Playwright not found"
```bash
cd hh-bot
venv\Scripts\activate
playwright install chromium
```

### "Port 3000 already in use"
```bash
# Найдите процесс на порту 3000
netstat -ano | findstr :3000
# Убейте процесс (замените PID)
taskkill /PID <PID> /F
```

### "Port 8000 already in use"
```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Ошибка авторизации HH.ru
- Проверьте правильность email и пароля
- HH.ru может требовать подтверждение через SMS/email
- Попробуйте сначала войти на hh.ru в обычном браузере

## Разработка

### Добавить новые зависимости Python:
```bash
cd hh-bot
venv\Scripts\activate
pip install <package>
pip freeze > requirements.txt
```

### Добавить новые зависимости Node.js:
```bash
npm install <package>
# или
bun add <package>
```

## Сборка для продакшена

### Next.js:
```bash
npm run build
npm run start
```

### FastAPI:
```bash
cd hh-bot
uvicorn src.api.app:app --host 0.0.0.0 --port 8000
```

---

Автор: HH Bot Team

# Отчёт по проекту HH-bot

**Дата:** 2026-06-09  
**Проект:** HH.ru automation bot  
**Репозиторий:** https://github.com/stsgs1980/HH-bot.git  
**Локальный путь:** `C:\Users\stsgr\HH-bot\hh-bot`

---

## 1. Обзор проекта

### 1.1 Цель проекта
Автоматизация работы с сайтом HH.ru (HeadHunter) — поиск вакансий, отклики, управление откликами.

### 1.2 Архитектура
| Компонент | Технология | Порт |
|-----------|------------|------|
| Backend | FastAPI (Python) | 8000 |
| Frontend | Next.js | 3000 |
| Браузерная автоматизация | Playwright | — |
| База данных | SQLite + SQLAlchemy + aiosqlite | — |

### 1.3 Точка входа Backend
```
src.api.app:app
```
Команда запуска:
```powershell
python -m uvicorn src.api.app:app --reload --port 8000
```

---

## 2. История установки и настройки

### 2.1 Клонирование репозитория
```powershell
git clone https://github.com/stsgs1980/HH-bot.git
cd HH-bot/hh-bot
```

**Статус:** ✅ Успешно

---

### 2.2 Создание виртуального окружения

**Команда:**
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**Обнаруженная версия Python:** 3.14 (pre-release)

**Статус:** ✅ Успешно

---

### 2.3 Установка Python-зависимостей

#### Попытка 1: Стандартная установка
```powershell
pip install -r requirements.txt
```

**Результат:** ❌ Ошибка timeout при загрузке numpy

**Ошибка:**
```
WARNING: There was an error confirming the ssl certificate
Operation timed out
```

#### Попытка 2: Использование китайского зеркала
```powershell
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

**Результат:** ❌ Ошибка совместимости numpy с Python 3.14

**Ошибка:**
```
ERROR: Could not find a version that satisfies the requirement numpy==1.26.4
No matching distribution found for numpy==1.26.4
```

**Причина:** NumPy 1.26.4 не имеет precompiled wheels для Python 3.14 (pre-release версия)

#### Попытка 3: Обновление numpy
```powershell
pip install numpy>=2.0 -i https://pypi.tuna.tsinghua.edu.cn/simple
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

**Результат:** ✅ Успешно (numpy 2.x имеет wheels для Python 3.14)

#### Дополнительные установки
Во время установки возникли ошибки отсутствия модулей. Установлены вручную:

```powershell
pip install loguru -i https://pypi.tuna.tsinghua.edu.cn/simple
pip install email-validator -i https://pypi.tuna.tsinghua.edu.cn/simple
pip install bcrypt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

**Статус:** ✅ Все зависимости установлены

---

### 2.4 Установка Playwright и браузеров

```powershell
pip install playwright -i https://pypi.tuna.tsinghua.edu.cn/simple
playwright install chromium
```

**Статус:** ✅ Успешно

---

### 2.5 Установка Frontend-зависимостей

```powershell
cd frontend
npm install
```

**Результат:** ✅ Установлено 829 пакетов

**Статус:** ✅ Успешно

---

### 2.6 Настройка базы данных

#### Создание папки data
Конфигурация в `src/config.py` указывает путь к базе данных:
```
sqlite+aiosqlite:///./data/hh_bot.db
```

Папка `data/` отсутствовала — создана вручную:
```powershell
mkdir data
```

#### Создание файла .env
```
DATABASE_URL=sqlite+aiosqlite:///./data/hh_bot.db
```

**Статус:** ✅ Успешно

---

### 2.7 Первый запуск Backend

#### Попытка 1: Неверный модуль
```powershell
python -m uvicorn app.main:app --reload --port 8000
```

**Ошибка:**
```
ModuleNotFoundError: No module named 'app'
```

**Причина:** Неверный путь к модулю. Правильный путь: `src.api.app:app`

#### Попытка 2: Правильная команда
```powershell
python -m uvicorn src.api.app:app --reload --port 8000
```

**Результат:** ✅ Сервер запущен

**Проверка:** http://localhost:8000/docs — открывается Swagger UI

**Статус:** ✅ Backend работает

---

### 2.8 Запуск Frontend

```powershell
cd frontend
npm run dev
```

**Результат:** ✅ Сервер запущен на порту 3000

**Проверка:** http://localhost:3000 — открывается страница

**Статус:** ✅ Frontend работает

---

## 3. Критическая ошибка: Playwright + Python 3.14

### 3.1 Описание проблемы

При попытке входа в систему через веб-интерфейс появляется ошибка:
```
Ошибка входа
```

### 3.2 Анализ логов

В терминале uvicorn обнаружена ошибка:
```python
Traceback (most recent call last):
  File ".../playwright/_impl/_browser_type.py", line 203, in launch
    browser = await self._launch_browser_with_tracing(
  ...
  File ".../asyncio/base_events.py", line 533, in _make_subprocess_transport
    raise NotImplementedError
NotImplementedError
```

### 3.3 Причина

**Python 3.14 — это pre-release версия.**

В Python 3.14 на Windows реализация asyncio имеет проблему с созданием subprocess:
```python
# asyncio/base_events.py, line 533
raise NotImplementedError
```

Playwright для запуска браузера использует subprocess, но на Python 3.14/Windows это не работает.

### 3.4 Диагностика

| Проверка | Результат |
|----------|-----------|
| Backend запускается | ✅ |
| Frontend запускается | ✅ |
| API endpoints отвечают | ✅ |
| База данных создаётся | ✅ |
| Playwright browser launch | ❌ NotImplementedError |

**Статус:** ❌ **Критическая ошибка — функционал не работает**

---

## 4. Решение

### 4.1 Рекомендация

Установить стабильную версию Python 3.11 или 3.12.

**Почему:**
- Python 3.11/3.12 — стабильные release-версии
- Полная поддержка asyncio на Windows
- Playwright официально поддерживает эти версии
- Все зависимости имеют precompiled wheels

### 4.2 План действий

1. Скачать Python 3.11.x с https://www.python.org/downloads/release/python-3119/
   - Выбрать "Windows installer (64-bit)"
   - **Важно:** Поставить галочку "Add Python to PATH"

2. Пересоздать виртуальное окружение:
```powershell
cd C:\Users\stsgr\HH-bot\hh-bot
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\activate
```

3. Переустановить зависимости:
```powershell
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
playwright install chromium
```

4. Запустить backend:
```powershell
python -m uvicorn src.api.app:app --reload --port 8000
```

5. Запустить frontend (в новом терминале):
```powershell
cd C:\Users\stsgr\HH-bot\hh-bot\frontend
npm run dev
```

---

## 5. Сводная таблица результатов

| Этап | Статус | Примечание |
|------|--------|------------|
| Клонирование репозитория | ✅ Успешно | |
| Создание venv | ✅ Успешно | Python 3.14 pre-release |
| Установка pip-зависимостей | ✅ Успешно | Потребовался numpy>=2.0 и китайский mirror |
| Установка Playwright | ✅ Успешно | |
| Установка Chromium | ✅ Успешно | |
| Установка npm-зависимостей | ✅ Успешно | 829 пакетов |
| Создание папки data/ | ✅ Успешно | Вручную |
| Создание .env | ✅ Успешно | |
| Запуск Backend | ✅ Успешно | http://localhost:8000/docs работает |
| Запуск Frontend | ✅ Успешно | http://localhost:3000 работает |
| **Вход в систему (Playwright)** | ❌ **Ошибка** | Python 3.14 asyncio NotImplementedError |

---

## 6. Файловая структура проекта

```
C:\Users\stsgr\HH-bot\hh-bot\
├── venv/                          # Виртуальное окружение
├── data/                          # Папка для базы данных
│   └── hh_bot.db                  # SQLite база данных (создаётся автоматически)
├── src/                           # Исходный код backend
│   ├── api/
│   │   └── app.py                 # Точка входа FastAPI
│   ├── config.py                  # Конфигурация (DATABASE_URL)
│   └── ...
├── frontend/                      # Next.js frontend
│   ├── node_modules/              # npm пакеты
│   ├── package.json
│   └── ...
├── requirements.txt               # Python зависимости
├── .env                           # Переменные окружения
└── README.md
```

---

## 7. Полезные команды

### Backend
```powershell
# Активация venv
.\venv\Scripts\activate

# Запуск сервера
python -m uvicorn src.api.app:app --reload --port 8000

# Остановка сервера
Ctrl+C
```

### Frontend
```powershell
cd frontend
npm run dev
# или
npm run build && npm start
```

### База данных
```powershell
# Путь к базе
.\data\hh_bot.db

# Открыть в SQLite (если установлен)
sqlite3 .\data\hh_bot.db
```

---

## 8. Следующие шаги

1. [ ] Установить Python 3.11.x (стабильную версию)
2. [ ] Удалить старое venv
3. [ ] Создать новое venv с Python 3.11
4. [ ] Переустановить все зависимости
5. [ ] Переустановить Playwright браузеры
6. [ ] Запустить backend и frontend
7. [ ] Протестировать вход в систему

---

## 9. Заключение

Проект HH-bot успешно развёрнут на локальной машине, но **не работает функционал входа** из-за несовместимости Python 3.14 (pre-release) с Playwright на Windows.

**Решение:** Заменить Python 3.14 на стабильную версию Python 3.11 или 3.12.

---

*Документ создан: 2026-06-09*

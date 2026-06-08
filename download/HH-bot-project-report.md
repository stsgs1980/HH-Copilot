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

### 3.2 Полный traceback ошибки

```python
File "C:\Users\stsgr\HH-bot\hh-bot\venv\Lib\site-packages\playwright\_impl\_transport.py", line 120, in connect
    self._proc = await asyncio.create_subprocess_exec(
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<9 lines>...
    )
File "C:\Users\stsgr\AppData\Local\Python\pythoncore-3.14-64\Lib\asyncio\subprocess.py", line 224, in create_subprocess_exec
    transport, protocol = await loop.subprocess_exec(
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
        stderr=stderr, **kwds)
        ^^^^^^^^^^^^^^^^^^^^^^
File "C:\Users\stsgr\AppData\Local\Python\pythoncore-3.14-64\Lib\asyncio\base_events.py", line 1809, in subprocess_exec
    transport = await self._make_subprocess_transport(
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        protocol, popen_args, False, stdin, stdout, stderr,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        bufsize, **kwargs)
        ^^^^^^^^^^^^^^^^^^
File "C:\Users\stsgr\AppData\Local\Python\pythoncore-3.14-64\Lib\asyncio\base_events.py", line 533, in _make_subprocess_transport
    raise NotImplementedError
NotImplementedError
Login failed for user 2:
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

## 4. Попытка исправления (НЕУДАЧНАЯ)

### 4.1 Действия

```powershell
# Перейдите в папку проекта
cd C:\Users\stsgr\HH-bot\hh-bot

# Удалите старое виртуальное окружение
Remove-Item -Recurse -Force venv

# Создайте новое с Python 3.11
python -m venv venv

# Активируйте
.\venv\Scripts\activate

# Установите зависимости
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 4.2 Результат

❌ **НЕУДАЧА — Python 3.11 НЕ УСТАНОВЛЕН!**

Команда `python` по-прежнему указывает на Python 3.14:

```
sqlalchemy-2.0.50-cp314-cp314-win_amd64.whl
                      ^^^^^ - cp314 = Python 3.14
```

### 4.3 Ошибка при установке numpy

```
error: subprocess-exited-with-error
× Preparing metadata (pyproject.toml) did not run successfully.
...
ERROR: Unknown compiler(s): [['icl'], ['cl'], ['cc'], ['gcc'], ['clang'], ['clang-cl'], ['pgcc']]
```

**Причина:** numpy 1.26.4 пытается компилироваться из исходников, потому что нет pre-built wheels для Python 3.14, но на машине нет компилятора C.

### 4.4 Ошибка при запуске Playwright

```powershell
playwright install chromium
```

```
playwright: The term 'playwright' is not recognized as a name of a cmdlet, function, script file, or executable program.
```

**Причина:** pip install не завершился успешно из-за ошибки numpy, playwright не установлен.

### 4.5 Ошибка при запуске uvicorn

```powershell
python -m uvicorn src.api.app:app --reload --port 8000
```

```
No module named uvicorn
```

**Причина:** Зависимости не установлены.

### 4.6 Вывод

**Команда `python -m venv venv` создаёт venv с той версией Python, которая сейчас активна (3.14).**

Чтобы создать venv с Python 3.11, нужно **СНАЧАЛА УСТАНОВИТЬ Python 3.11**.

---

## 5. Правильное решение

### 5.1 Шаг 1: Скачать Python 3.11

1. Перейти на https://www.python.org/downloads/release/python-3119/
2. Скачать **"Windows installer (64-bit)"**
3. Запустить установщик
4. ✅ **ГАЛОЧКА "Add Python to PATH"** — ОБЯЗАТЕЛЬНО!
5. Нажать "Install Now"

### 5.2 Шаг 2: Закрыть все терминалы

Закрыть ВСЕ окна PowerShell, открыть новое.

### 5.3 Шаг 3: Проверить версию

```powershell
python --version
```

Должно показать: `Python 3.11.x`

### 5.4 Шаг 4: Пересоздать venv

```powershell
cd C:\Users\stsgr\HH-bot\hh-bot

# Удалить старое venv
Remove-Item -Recurse -Force venv

# Создать новое venv с Python 3.11 (явно указать версию)
py -3.11 -m venv venv

# Активировать
.\venv\Scripts\activate

# Проверить версию Python в venv
python --version
# Должно быть: Python 3.11.x

# Установить зависимости
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# Установить Playwright браузеры
playwright install chromium

# Запустить backend
python -m uvicorn src.api.app:app --reload --port 8000
```

---

## 6. Сводная таблица результатов

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
| **Попытка пересоздать venv** | ❌ **Ошибка** | Python 3.11 не установлен, команда `python` = 3.14 |

---

## 7. Файловая структура проекта

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

## 8. Полезные команды

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

## 9. Чек-лист следующих действий

1. [ ] Скачать Python 3.11 с https://www.python.org/downloads/release/python-3119/
2. [ ] Установить с галочкой "Add Python to PATH"
3. [ ] Закрыть все терминалы
4. [ ] Открыть новый терминал, проверить `python --version`
5. [ ] Удалить venv: `Remove-Item -Recurse -Force venv`
6. [ ] Создать venv с Python 3.11: `py -3.11 -m venv venv`
7. [ ] Активировать: `.\venv\Scripts\activate`
8. [ ] Установить зависимости: `pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple`
9. [ ] Установить браузеры: `playwright install chromium`
10. [ ] Запустить backend: `python -m uvicorn src.api.app:app --reload --port 8000`
11. [ ] Запустить frontend: `cd frontend && npm run dev`
12. [ ] Протестировать вход в систему на http://localhost:3000

---

## 10. Заключение

### Проблема
Проект HH-bot развёрнут на локальной машине, но **не работает функционал входа** из-за несовместимости Python 3.14 (pre-release) с Playwright на Windows.

### Неудачная попытка исправления
Попытка пересоздать venv командой `python -m venv venv` не сработала, потому что:
- Python 3.11 **не установлен** на машине
- Команда `python` по-прежнему указывает на Python 3.14
- venv создаётся с той версией Python, которая активна в системе

### Решение
**СНАЧАЛА установить Python 3.11**, затем пересоздать venv с явным указанием версии: `py -3.11 -m venv venv`

---

*Документ обновлён: 2026-06-09*

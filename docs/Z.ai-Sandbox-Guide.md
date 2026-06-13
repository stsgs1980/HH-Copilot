# Z.ai Sandbox — Полное руководство

> Руководство основано на реальном опыте работы. Все ошибки и решения — настоящие.

---

## Оглавление

1. [Быстрый старт (чистая установка)](#1-быстрый старт-чистая-установка)
2. [Всё установлено, но ничего не работает](#2-всё-установлено-но-ничего-не-работает)
3. [Клонирование стороннего проекта в песочницу](#3-клонирование-стороннего-проекта-в-песочницу)
4. [Dev-сервер не запускается](#4-dev-сервер-не-запускается)
5. [Порт 3000 занят (EADDRINUSE)](#5-порт-3000-занят-eaddrinuse)
6. [HMR упал — страница стала 500](#6-hmr-упал-страница-стала-500)
7. [Модули не находятся (Module not found)](#7-модули-не-находятся-module-not-found)
8. [Добавление Git Submodule](#8-добавление-git-submodule)
9. [Обновление Submodule](#9-обновление-submodule)
10. [Полезные команды](#10-полезные-команды)
11. [Частые ошибки и решения](#11-частые-ошибки-и-решения)

---

## 1. Быстрый старт (чистая установка)

### Чистый старт — правильная последовательность

```bash
# Шаг 1: Инициализация песочницы (ВСЕГДА первой командой)
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
```

Эта команда:
- Создаёт структуру Next.js 16 проекта
- Устанавливает базовые зависимости
- Настраивает TypeScript, Tailwind CSS, shadcn/ui
- **Автоматически запускает dev-сервер** в фоне через `.zscripts/dev.sh`
- Логи пишет в `/home/z/my-project/.zscripts/dev.log`

```bash
# Шаг 2: Установка дополнительных зависимостей
cd /home/z/my-project && bun add <package-name>

# Пример:
bun add framer-motion
bun add three @react-three/fiber @react-three/drei
```

```bash
# Шаг 3: Проверка что всё работает
cat /home/z/my-project/.zscripts/dev.log | tail -20
# Должно быть: "GET / 200 in ..."
```

### Чего НЕ нужно делать

```bash
# ❌ НЕ запускай dev-сервер вручную
npm run dev
bun run dev
next dev
npx next dev

# ❌ НЕ создавай проекты с нуля
npx create-next-app

# ❌ НЕ клонируй в подпапки (см. раздел 3)
git clone ... && cd subdir && npm install
```

> **Почему:** Песочница управляет dev-сервером сама через `.zscripts/dev.sh`. Ручной запуск ломает Preview Panel — превью не обновляется и не работает.

---

## 2. Всё установлено, но ничего не работает

### Ситуация: «Я что-то делал, и песочница перестала показывать превью»

**Что мы сделали неправильно (реальный кейс):**

1. Клонировали репозиторий в **подпапку** `/home/z/my-project/Rust-performance-optimization/`
2. Запускали dev-сервер **вручную** через `npx next dev`
3. Dev-сервер периодически падал при HMR, превью не работал

**Как исправить:**

```bash
# Шаг 1: Убить ВСЕ вручную запущенные процессы
pkill -f "next dev"
pkill -f "bun run dev"

# Шаг 2: Убедиться что портов freed
lsof -i :3000  # должно быть пусто

# Шаг 3: Копировать код из подпапки в КОРЕНЬ проекта
# Если клонировал в подпапку — перенеси файлы:
rsync -av --exclude='node_modules' --exclude='.next' \
  /home/z/my-project/ subdir/ /home/z/my-project/

# Шаг 4: Переустановить зависимости в корне
cd /home/z/my-project && bun install

# Шаг 5: Переинициализировать песочницу
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash

# Шаг 6: Проверить логи
cat /home/z/my-project/.zscripts/dev.log | tail -20
# Ожидаем: "GET / 200 in ..."
```

### Другие причины неработающего превью

| Симптом | Причина | Решение |
|---|---|---|
| Страница 500 | Ошибка компиляции в коде | `cat .zscripts/dev.log \| tail -30` — ищи ошибку |
| Белый экран | Dev-сервер упал | Переинициализируй песочницу |
| Превью показывает старое | HMR сломался | Переинициализируй песочницу |
| «Connection refused» | Нет процесса на порте 3000 | Переинициализируй песочницу |
| Module not found | Забыл `bun add` | `bun add <package>` |

---

## 3. Клонирование стороннего проекта в песочницу

### Правильный способ (код в корень проекта)

```bash
# Шаг 1: Инициализация песочницы (создаст Next.js каркас)
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash

# Шаг 2: Клонировать ВРЕМЕННО в отдельную папку
cd /tmp && git clone https://github.com/user/project.git

# Шаг 3: Скопировать файлы проекта в КОРЕНЬ песочницы
rsync -av --exclude='node_modules' --exclude='.next' \
  /tmp/project/ /home/z/my-project/

# Шаг 4: Установить зависимости В КОРНЕ песочницы
cd /home/z/my-project && bun install

# Шаг 5: Переинициализировать (перезапустит dev-сервер)
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash

# Шаг 6: Проверить
cat /home/z/my-project/.zscripts/dev.log | tail -20
```

### Неправильный способ (ЧТО НЕ НАДО ДЕЛАТЬ)

```bash
# ❌ НЕ клонируй напрямую в подпапку проекта
cd /home/z/my-project
git clone https://github.com/user/project.git my-project
cd my-project && npm install && npm run dev  # Сломает песочницу!
```

> **Почему не работает:** Dev-сервер песочницы запускается в `/home/z/my-project/` и ожидает код там. Если код в подпапке — превью показывает дефолтную заглушку, а не твой проект.

### Если нужна база данных (Prisma)

```bash
# После копирования файлов в корень:
cd /home/z/my-project

# Применить схему
bunx prisma db push

# Сгенерировать клиент
bunx prisma generate
```

---

## 4. Dev-сервер не запускается

### Симптомы

```bash
cat .zscripts/dev.log | tail -30
# Видно: EADDRINUSE, Connection refused, или просто пусто
```

### Решение: полная переинициализация

```bash
# Шаг 1: Убить всё
pkill -f "next"
pkill -f "node"
pkill -f "bun"

# Шаг 2: Удалить кэш
rm -rf /home/z/my-project/.next

# Шаг 3: Переинициализировать
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash

# Шаг 4: Подождать 10-15 секунд
sleep 15

# Шаг 5: Проверить
cat /home/z/my-project/.zscripts/dev.log | tail -20
```

### Если переинициализация не помогает

```bash
# Проверить что лог-файл вообще пишется
ls -la /home/z/my-project/.zscripts/dev.log
ls -la /home/z/my-project/.zscripts/dev.pid

# Если dev.pid есть но сервер мёртв:
kill $(cat /home/z/my-project/.zscripts/dev.pid)
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
```

---

## 5. Порт 3000 занят (EADDRINUSE)

### Реальный кейс

```
Error: listen EADDRINUSE: address already in use :::3000
```

Это значит: dev-сервер уже запущен (возможно, вручную в предыдущей сессии).

### Решение

```bash
# Шаг 1: НЕ запускай вручную! Песочница сама запустит сервер.

# Шаг 2: Если нужен перезапуск:
pkill -f "next dev"
pkill -f "bun run dev"

# Шаг 3: Переинициализировать
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
```

> **Важно:** В песочнице НИКОГДА не запускай `npm run dev`, `bun run dev`, `next dev`. Сервер запускается автоматически через `.zscripts/dev.sh`.

---

## 6. HMR упал — страница стала 500

### Симптомы

```
GET / 500 in 942ms (compile: 852ms, render: 90ms)
```

### Причина

Изменил/удалил файлы, которые Turbopack (HMR) пытался перезагрузить. Например:
- Удалил компонент, который импортируется в `page.tsx`
- Переименовал папку
- Добавил submodule (удаление + пересоздание папки)

### Решение

```bash
# HMR после удаления файлов не восстанавливается сам.
# Нужен полный перезапуск:

pkill -f "next dev"
rm -rf /home/z/my-project/.next
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
sleep 15
cat /home/z/my-project/.zscripts/dev.log | tail -10
# Ожидаем: GET / 200
```

---

## 7. Модули не находятся (Module not found)

### Симптомы

```
Module not found: Can't resolve '@/lib/guided-tour/src'
```

### Причины и решения

| Причина | Решение |
|---|---|
| Пакет не установлен | `cd /home/z/my-project && bun add <package>` |
| Неправильный путь импорта | Проверь путь: файл должен существовать по указанному пути |
| Путь заканчивается на файл, а не на папку | `@/lib/guided-tour` вместо `@/lib/guided-tour/index` |
| Удалил файл, но импорт остался | Обнови импорт в `page.tsx` |
| Submodule не скачан | `git submodule update --init --recursive` |

### Как проверить

```bash
# Проверить что файл существует
ls /home/z/my-project/src/lib/guided-tour/index.ts

# Проверить путь алиаса (должен быть @/ -> src/)
cat /home/z/my-project/tsconfig.json | grep -A3 "paths"

# Проверить линтер
cd /home/z/my-project && bun run lint
```

---

## 8. Добавление Git Submodule

### Пример: добавляем GuidedTour как submodule

```bash
# Шаг 1: Подготовить папку для submodule
mkdir -p /home/z/my-project/src/lib/guided-tour

# Шаг 2: Добавить submodule
cd /home/z/my-project
git submodule add https://github.com/user/GuidedTour.git src/lib/guided-tour

# Шаг 3: Проверить
cat .gitmodules
# Должно быть:
# [submodule "src/lib/guided-tour"]
#     path = src/lib/guided-tour
#     url = https://github.com/user/GuidedTour.git

ls src/lib/guided-tour/
# Должны быть файлы компонента

# Шаг 4: Обновить импорты в коде
# Было: import { X } from "@/components/ui/guided-tour"
# Стало: import { X } from "@/lib/guided-tour"

# Шаг 5: Переинициализировать песочницу (HMR может упасть)
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
```

### Если submodule не пушится (protected branch)

```bash
# Пуш в отдельную ветку, потом PR через GitHub UI:
git checkout -b feature/my-changes
git push origin feature/my-changes

# Создай PR: https://github.com/user/repo/pull/new/feature/my-changes
```

---

## 9. Обновление Submodule

### Быстрое обновление

```bash
git submodule update --remote src/lib/guided-tour
```

### Полный цикл (обновить + закоммитить)

```bash
# 1. Подтянуть изменения из upstream
git submodule update --remote src/lib/guided-tour

# 2. Посмотреть что изменилось
git diff src/lib/guided-tour

# 3. Закоммитить новую версию
git add src/lib/guided-tour
git commit -m "chore: update GuidedTour submodule"

# 4. Переинициализировать песочницу (если нужны зависимости)
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
```

### Проверить текущую версию submodule

```bash
git submodule status src/lib/guided-tour
```

### Что нового с прошлого обновления

```bash
cd src/lib/guided-tour && git log --oneline HEAD..origin/main && cd -
```

### Откатить если сломалось

```bash
cd src/lib/guided-tour
git checkout <commit-hash>
cd ..
git add src/lib/guided-tour
git commit -m "chore: pin GuidedTour to <commit-hash>"
```

---

## 10. Полезные команды

### Проверка состояния песочницы

```bash
# Логи dev-сервера
cat /home/z/my-project/.zscripts/dev.log | tail -30

# PID dev-сервера
cat /home/z/my-project/.zscripts/dev.pid

# PID процесса
cat /home/z/my-project/.zscripts/dev.pid | xargs ps -p
```

### Проверка кода

```bash
# Линтер
cd /home/z/my-project && bun run lint

# TypeScript ошибки
bunx tsc --noEmit
```

### База данных (Prisma)

```bash
cd /home/z/my-project

# Применить схему
bunx prisma db push

# Сгенерировать клиент
bunx prisma generate

# Сбросить базу
bunx prisma migrate reset
```

### Перезапуск песочницы

```bash
# Стандартная переинициализация
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash

# Жёсткий перезапуск (если стандартная не помогает)
pkill -f "next dev"
rm -rf /home/z/my-project/.next
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
```

### Preview URL

```bash
# Узнать container ID
echo $FC_CONTAINER_ID
# или
hostname

# Preview URL:
# https://preview-<container-id>.space-z.ai/
```

---

## 11. Частые ошибки и решения

| # | Ошибка | Причина | Решение |
|---|---|---|---|
| 1 | `Module not found` | Пакет не установлен | `bun add <package>` |
| 2 | `EADDRINUSE` | Сервер уже запущен | `pkill -f next` + переинициализация |
| 3 | `GET / 500` | Ошибка в коде | Проверить `.zscripts/dev.log` |
| 4 | `GET / 200` но белый экран | HMR сломался | Переинициализация песочницы |
| 5 | `Connection refused` | Сервер не запущен | Переинициализация песочницы |
| 6 | Превью не обновляется | Dev-сервер упал | `cat .zscripts/dev.log` + переинициализация |
| 7 | Submodule folder empty | Забыл `--recurse-submodules` | `git submodule update --init --recursive` |
| 8 | TypeScript ошибки | Неверные типы | `bunx tsc --noEmit` |
| 9 | Импорты не работают | Неправильный путь | Используй `@/` алиас |
| 10 | Turbopack panic | Удаление файлов при работающем сервере | Переинициализация песочницы |

---

## Структура проекта

```
/home/z/my-project/
├── src/
│   ├── app/
│   │   ├── page.tsx          # ГЛАВНЫЙ ФАЙЛ — весь UI здесь
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/               # shadcn/ui компоненты
│   │   ├── sections/         # Секции страницы
│   │   ├── features/         # Компоненты с состоянием
│   │   └── perf/             # Специфичные компоненты
│   └── lib/
│       ├── guided-tour/      # Git submodule (GuidedTour)
│       ├── perf-data.ts
│       ├── db.ts
│       └── utils.ts
├── prisma/
│   └── schema.prisma
├── public/
├── .zscripts/
│   ├── dev.sh               # Скрипт запуска dev-сервера (НЕ РЕДАКТИРОВАТЬ)
│   ├── dev.pid              # PID процесса
│   └── dev.log              # ЛОГИ (читать отсюда при ошибках)
├── .gitmodules              # Submodule конфигурация
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Золотые правила песочницы

1. **ВСЕГДА** начинай с `curl ... init-fullstack ... | bash`
2. **НИКОГДА** не запускай dev-сервер вручную (`npm run dev`, `bun run dev`, `next dev`)
3. **ВЕСЬ КОД** пишется в `/home/z/my-project/` (корень проекта, не подпапки)
4. **ЛОГИ** всегда тут: `cat /home/z/my-project/.zscripts/dev.log | tail -30`
5. **ЗАВИСИМОСТИ** ставятся через: `cd /home/z/my-project && bun add <package>`
6. **ПЕРЕЗАПУСК** = переинициализация: `curl ... init-fullstack ... | bash`
7. **СЛОМАЛОСЬ** — не чини вручную, переинициализируй

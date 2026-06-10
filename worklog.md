# Worklog — HH Bot / HH-Copilot Research

---
Task ID: 1
Agent: Main
Task: Исследование HH-Copilot и hh.ru API для парсинга резюме

Work Log:
- Клонирован и изучен репозиторий HH-Copilot (Chrome Extension v1.7.3)
- Изучены все парсеры резюме из HH-Copilot (DOM-based, data-qa селекторы)
- Скачана официальная OpenAPI спецификация hh.ru (1.2MB YAML) с https://api.hh.ru/openapi/specification/public
- Проведён веб-поиск о статусе hh.ru API для соискателей
- Найдены множественные подтверждения: HH ЗАКРЫЛ API ДЛЯ СОИСКАТЕЛЕЙ с 15 декабря 2025 года
- Проанализированы все 106 эндпоинтов текущей OpenAPI спецификации hh.ru

Stage Summary:

## КРИТИЧЕСКИЙ ВЫВОД: Парсинг резюме через hh.ru API НЕВОЗМОЖЕН для соискателя

### Факты:
1. **HH закрыл соискательское API 15 декабря 2025** — подтверждено множественными источниками (Сетка, Habr, Threads, LinkedIn, Instagram)
2. **В текущей OpenAPI спецификации НЕТ эндпоинтов соискателя для работы со своими резюме:**
   - НЕТ `/resumes/mine` (список своих резюме)
   - НЕТ `POST /resumes` (создание резюме)
   - НЕТ `PUT /resumes/{id}` (редактирование резюме)
   - НЕТ `POST /resumes/{id}/publish` (публикация)
   - НЕТ `/resumes/{id}/contacts` (контакты)
3. **Единственные resume-эндпоинты — ТОЛЬКО для работодателя:**
   - `GET /resumes` — поиск резюме (платный доступ, employer only)
   - `GET /resumes/{resume_id}` — просмотр резюме (платный доступ, employer only)
   - `GET /resumes/{resume_id}/negotiations_history` — история откликов (employer)
4. **Для соискателя остались доступны только:**
   - `GET /vacancies` — поиск вакансий
   - `GET /vacancies/{id}/similar_vacancies` — похожие вакансии
   - `GET /negotiations` — список откликов/приглашений
   - `POST /negotiations/{nid}/messages` — отправка сообщений
   - `GET /me` — информация о текущем пользователе

### Что доступно из API соискателю:
- Поиск вакансий ✅
- Просмотр вакансий ✅
- Отклики/приглашения (переписка) ✅
- Чаты ✅
- Свои резюме — ❌ НЕДОСТУПНО через API

### Альтернативы для получения данных своего резюме:
1. **DOM-парсинг (как в HH-Copilot)** — через браузер/расширение, используя data-qa селекторы
2. **Playwright/Puppeteer** — автоматизация браузера для серверного парсинга
3. **Ручной ввод** — пользователь сам заполняет данные в боте

### HH-Copilot resume parser — полный справочник data-qa селекторов:
- `[data-qa="resume-block-title-position"]` — должность
- `[data-qa="resume-block-salary"]` — зарплата
- `[data-qa="resume-position-card"]` — карточка позиции (пол, возраст, адрес)
- `[data-qa="skills-card"]` — блок навыков
- `[data-qa^="skill-tag-"]` — теги навыков
- `[data-qa^="skill-level-title-"]` — уровни навыков (1=Начальный, 2=Средний, 3=Продвинутый)
- `[data-qa="resume-list-card-experience"]` — блок опыта
- `[data-qa="profile-experience-company-card"]` — карточка компании в опыте
- `[data-qa="cell-left-side"]` — левая ячейка (компания, должность)
- `[data-qa="cell-text-content"]` — текст ячейки
- `[data-qa="magritte-stepper-step-content"]` — контент шага (позиция, период)
- `[data-qa="resume-list-card-education"]` — блок образования
- `[data-qa="resume-about-card"]` — доп. информация / о себе
- `[data-qa="profile-experience-viewAll"]` — кнопка "Показать все"
- `.bloko-tag__text` — fallback для тегов (навыки, языки)

# Research: Chatik Page DOM Analysis (/chat)

**Date:** 2026-06-16
**Status:** Research in progress, NOT yet applied in code
**Trigger:** hh.ru имеет два разных интерфейса для общения с работодателями: /applicant/negotiations (список откликов) и /chat (мессенджер Chatik). Необходимо понять структуру Chatik для возможной интеграции.

---

## 1. Problem Statement

В дополнение к странице переговоров `/applicant/negotiations` (исследована в 04-negotiations-dom-analysis.md), hh.ru имеет отдельный мессенджер по адресу `/chat` (Chatik). Это разные интерфейсы:

| Страница | URL | Суть | data-qa prefix |
|----------|-----|------|----------------|
| Negotiations | `/applicant/negotiations` | Список откликов/приглашений/отказов | `negotiations-*` |
| Chatik | `/chat` | Мессенджер с работодателями | `chatik-*` |

Chatik — более современный интерфейс, где работодатель может написать первым. Необходимо понять его DOM-структуру для возможного парсинга.

---

## 2. Page URL and Structure

**URL:** `https://hh.ru/chat`

**SPA route:** `/chat`

**Top-level container:** `[data-qa="chatik-layout"]`

**Extension routing:** content.js регистрирует `/chat` как маршрут, вызывая `initPageLogic()`.

---

## 3. All data-qa Attributes Found (2026-06-16)

Полный список data-qa на странице `/chat`, сгруппированный по функциональным блокам:

### 3.1 Шапка и навигация
```
supernova-logo
supernova-search
searchVacancy-button / searchVacancy-button-text
allServices-button / allServices-button-text
applicantProfileDesktopDrop-button / applicantProfileDesktopDrop-button-text
applicantProfileMobileDrop-button / applicantProfileMobileDrop-button-text
applicantProfilePage-button / applicantProfilePage-button-text
geoSwitcher-button / geoSwitcher-button-text
favVacancies-button / favVacancies-button-text
vacancyResponses-button / vacancyResponses-button-text
profileAndResumes-button / profileAndResumes-button-text
profileAndResumes-badge
help-button / help-button-button-text
userNotifications-button / userNotifications-button-text
careerhhru-button / careerhhru-button-text
moreItems-button / moreItems-button-text
mainmenu_* (desktop/mobile menu items)
```

### 3.2 Chatik-специфичные
```
chatik-layout                          — корневой контейнер чатика
chatik-no-chats                        — пустое состояние (нет чатов)
chatik-zero-state                      — zero-state экран
chatik-checkbox-only-unread            — чекбокс «Только непрочитанные»
chatik-support-chat-button             — кнопка чата поддержки
chatik-support-chat-button-svg         — иконка кнопки поддержки
chatik-skeleton-chat--1                — скелетон загрузки чата
chats-list-skeleton-wrapper            — обёртка скелетона списка
```

### 3.3 Отдельные чаты (ключевая секция!)
```
chatik-open-chat-5289736329            — ссылка на чат (ID = chat ID)
chatik-open-chat-5328127671
chatik-open-chat-5342695893
chatik-open-chat-5342696805
chatik-open-chat-5342697594
chatik-open-chat-5342698505
chatik-open-chat-5342699286
chatik-open-chat-5358919797
chatik-open-chat-5361248038
chatik-open-chat-5386612383
chatik-open-chat-5392621506
chatik-open-chat-5395731584
chatik-open-chat-5408248148
```

### 3.4 Структура ячейки чата
```
chat-cell-creation-time                — время последнего сообщения
chat-cell-meta                         — мета-информация (статус доставки)
```

### 3.5 Статусы доставки сообщений
```
status-icon-delivered                  — доставлено
status-icon-read                       — прочитано
```

### 3.6 UI-элементы (не чатик)
```
cell / cell-left-side / cell-text / cell-text-content
checkbox / checkbox-container
placeholder-city
title / title-container
lux-container lux-container-rendered
bottom-sheet-css-variables
```

---

## 4. DOM Structure (one chat cell)

На основе анализа data-qa и текстового содержимого:

```
chatik-layout
  +-- chatik-checkbox-only-unread        (фильтр "Только непрочитанные")
  +-- chats-list-skeleton-wrapper        (скелетон загрузки)
  |     +-- chatik-skeleton-chat--1
  +-- chatik-open-chat-{CHAT_ID}         (<a> — ссылка на чат)
  |     +-- cell
  |           +-- cell-left-side         (аватар/иконка)
  |           +-- cell-text
  |                 +-- cell-text-content
  |                       +-- vacancy title
  |                       +-- chat-cell-meta
  |                       |     +-- status-icon-delivered / status-icon-read
  |                       +-- chat-cell-creation-time      (время)
  +-- chatik-support-chat-button         (кнопка чата поддержки)
  +-- chatik-zero-state / chatik-no-chats (пустое состояние)
```

---

## 5. Data Extracted from Real Page

Примеры данных (2026-06-16, 13 чатов):

### 5.1 Первые 5 чатов (data-qa + tagName + text)

| data-qa | tagName | Text (first 50 chars) |
|---------|---------|----------------------|
| `chatik-layout` | DIV | ЧатыТолько непрочитанныеРуководитель отдела продаж |
| `chatik-support-chat-button` | BUTTON | (иконка) |
| `chatik-support-chat-button-svg` | svg | (иконка) |
| `chatik-checkbox-only-unread` | INPUT | (checkbox) |
| `chatik-open-chat-5408248148` | A | Руководитель отдела продаж12:03КарнизоффБлагодарю |

### 5.2 Структура текста в chat cell

Из `chatik-open-chat-5408248148` текст: `Руководитель отдела продаж12:03КарнизоффБлагодарю`

Паттерн: `{vacancy_title}{time}{company_name}{last_message_preview}`

| Поле | Значение | Примечание |
|------|----------|------------|
| Vacancy title | Руководитель отдела продаж | Название вакансии |
| Time | 12:03 | Время последнего сообщения |
| Company | Карнизофф | Имя работодателя |
| Message preview | Благодарю | Начало последнего сообщения |

### 5.3 Chat IDs

Числа в `chatik-open-chat-{ID}` — это ID чатов, НЕ vacancy IDs:
- 5289736329, 5328127671, 5342695893, 5342696805, 5342697594, 5342698505
- 5342699286, 5358919797, 5361248038, 5386612383, 5392621506, 5395731584, 5408248148

Это 10-значные числа, отличаются от vacancy IDs (9-значных).

---

## 6. Chatik vs Negotiations — Key Differences

| Aspect | Negotiations (`/applicant/negotiations`) | Chatik (`/chat`) |
|--------|------------------------------------------|-------------------|
| **data-qa prefix** | `negotiations-*` | `chatik-*` |
| **Item identifier** | `negotiations-item` (no ID in data-qa) | `chatik-open-chat-{CHAT_ID}` |
| **Status** | Явный статус (not-viewed, viewed, discard, invite) | Статус доставки (delivered, read) |
| **Vacancy link** | Прямая ссылка на вакансию (с ID) | Только название вакансии (нет ссылки) |
| **Company** | `negotiations-item-company` | В тексте ячейки (без data-qa) |
| **Date** | `negotiations-item-date` | `chat-cell-creation-time` |
| **Message preview** | Нет | Есть (текст ячейки) |
| **Фильтр** | Нет встроенного | «Только непрочитанные» чекбокс |
| **Поддержка** | Статусы откликов (отказ/приглашение) | Мессенджер (живое общение) |

---

## 7. Selectors to Add

Current selectors in `selectors.js`:
```js
negotiationsChatItem:   ['[data-qa="negotiations-chat-item"]', '[class*="negotiations-chat"]'],
negotiationsChatUnread: ['[data-qa="negotiations-chat-unread"]', '[class*="unread"]'],
```

These are already identified as wrong in 04-negotiations-dom-analysis.md. For Chatik, new selectors:

```js
chatikLayout:              ['[data-qa="chatik-layout"]'],
chatikChatItem:            ['[data-qa^="chatik-open-chat-"]'],
chatikCheckboxOnlyUnread:  ['[data-qa="chatik-checkbox-only-unread"]'],
chatikSupportChatButton:   ['[data-qa="chatik-support-chat-button"]'],
chatCellCreationTime:      ['[data-qa="chat-cell-creation-time"]'],
chatCellMeta:              ['[data-qa="chat-cell-meta"]'],
statusIconDelivered:       ['[data-qa="status-icon-delivered"]'],
statusIconRead:            ['[data-qa="status-icon-read"]'],
```

---

## 8. Data Model for Parsed Chat

```js
{
  chatId: string,            // из data-qa="chatik-open-chat-{CHAT_ID}"
  vacancyTitle: string,      // название вакансии из текста ячейки
  company: string,           // имя работодателя из текста ячейки
  lastMessagePreview: string, // превью последнего сообщения
  time: string,              // время последнего сообщения
  isRead: boolean,           // status-icon-read vs status-icon-delivered
  parsedAt: string           // ISO timestamp
}
```

**Проблема:** На списковой странице Chatik НЕТ vacancy ID в чистом виде. Название вакансии — единственный способ связки. Vacancy ID можно было бы извлечь только при открытии конкретного чата.

---

## 9. Challenges and Open Questions

### 9.1 Нет прямого vacancy ID
В отличие от Negotiations (где ссылка содержит vacancy ID), Chatik показывает только название вакансии. Связка с matchScore возможна только по названию (неточная) или через открытие чата (дорого).

### 9.2 Текст ячейки — неструктурированный
Текст вида `Руководитель отдела продаж12:03КарнизоффБлагодарю` не имеет data-qa для отдельных полей. Парсинг по тексту хрупкий — зависит от локализации, длины названия, наличия спецсимволов.

### 9.3 Два интерфейса — дублирование данных
Некоторые отклики отображаются и в Negotiations, и в Chatik. Но статусы разные: Negotiations показывает статус отклика (отказ/приглашение), а Chatik — статус доставки сообщения.

### 9.4 Chatik — живой мессенджер
В отличие от Negotiations (статичный список), Chatik может обновляться в реальном времени (WebSocket?). Это требует другой модели парсинга — возможно, MutationObserver вместо однократного парсинга.

---

## 10. Implementation Priority

| Priority | Feature | Complexity | Value |
|----------|---------|------------|-------|
| P0 | Parse Negotiations list (04-negotiations-dom-analysis.md) | Low | High — статусы откликов |
| P1 | Chatik: parse chat list for unread count | Medium | Medium — быстрый обзор |
| P2 | Chatik: extract vacancy ID from opened chat | Medium | High — связка с matchScore |
| P3 | Chatik: parse individual chat messages | High | High — AI-auto-respond |

**Рекомендация:** Сначала реализовать Phase 1 из 04-negotiations-dom-analysis.md (парсинг Negotiations). Chatik — фаза 2+, потому что требует более сложного подхода к извлечению данных.

---

## 11. Console Commands Used for Research

```js
// All data-qa attributes on /chat page
[...document.querySelectorAll('[data-qa]')].map(e=>e.dataset.qa).filter(q=>q.length>0).filter((v,i,a)=>a.indexOf(v)===i).sort().join('\n')

// Chat-specific data-qa with element info
[...document.querySelectorAll('[data-qa*="chat"]')].slice(0,5).map(e=>e.dataset.qa+' | '+e.tagName+' | '+e.textContent.trim().substring(0,50)).join('\n')
```

---

## 12. Relation to Existing Research

- **04-negotiations-dom-analysis.md** — парсинг `/applicant/negotiations` (статусы откликов). Phase 1 приоритет.
- **Данный документ (05)** — парсинг `/chat` (мессенджер). Phase 2+ приоритет.
- Оба интерфейса могут быть интегрированы в единый tab «Переговоры» в сайдбаре, но с разделением на подсекции.

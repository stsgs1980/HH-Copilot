# Исследование: Role-Implied Skills (навыки, подразумеваемые должностью)

**Дата:** 2026-06-15  
**Статус:** Исследование завершено, реализация pending  
**Проблема:** Навыки, которые самоочевидны из должности (например, «руководство коллективом» для «Руководителя»), показываются как «отсутствующие» в рекомендациях.

---

## 1. Суть проблемы

Текущая система рекомендаций (`quality-recommendations.js`) сравнивает навыки вакансии с навыками резюме. Если навык вакансии отсутствует в резюме — он помечается как «missing» и показывается в рекомендации вида:

> «21 навыков вакансии нет в резюме: «руководство коллективом», «управление проектами»...»

**Но это неправильно**, если человек уже занимает должность «Руководитель отделов продаж». Для руководителя навыки «руководство коллективом», «управление проектами», «делегирование» — **подразумеваются самой должностью**. Показывать их как «отсутствующие» — это шум, который обесценивает реальные рекомендации.

---

## 2. Решение из ESCO (European Skills Classification)

### Что такое ESCO

ESCO (European Skills, Competences, Qualifications and Occupations) — европейская классификация навыков и профессий, разработанная Европейской комиссией. Включает 2942+ профессии, 13890+ навыков.

**Ключевая концепция ESCO:** для каждой профессии навыки делятся на две категории:

| Категория | Определение ESCO |
|-----------|-----------------|
| **Essential** | Знания, навыки и компетенции, которые **обычно требуются** при работе в данной профессии, **независимо от контекста** или работодателя |
| **Optional** | Знания, навыки и компетенции, которые **могут потребоваться** в зависимости от работодателя или конкретного контекста работы |

### Пример из ESCO API: Sales Manager

**Essential skills (40):**
- supervise sales activities
- sales strategies
- motivate employees
- carry out sales analysis
- make strategic business decisions
- track key performance indicators
- plan marketing strategy
- brand marketing techniques
- perform market research
- impart business plans to collaborators
- ...ещё 30

**Optional skills (18):**
- manage accounts
- forecast sales over periods of time
- customer segmentation
- public relations
- manage distribution channels
- statistics
- investigate customer complaints
- ...ещё 11

### Пример: Department Manager

**Essential skills (16):**
- manage staff
- strategic planning
- liaise with managers
- create a financial plan
- assume responsibility for the management of a business
- conclude business agreements
- delegate activities (not present — но «manage staff» есть)
- ...

**Optional skills (67):**
- supply chain management
- business management principles
- international trade
- ...

### Пример: Chief Operating Officer (COO)

**Essential skills (22):**
- lead managers of company departments
- evaluate performance of organisational collaborators
- delegate activities
- make strategic business decisions
- negotiate with stakeholders
- interpret financial statements
- ...

**Вывод:** ESCO подтверждает — для руководящих должностей навыки «руководство», «делегирование», «управление командой» — **essential**, т.е. подразумеваются должностью автоматически.

---

## 3. Применение к HH-Copilot

### Концепция: Role-Implied Skills Map

Вместо интеграции с ESCO API (слишком тяжело для расширения — нужен онлайн-запрос на каждый скоринг), мы создаём **локальную карту role-implied навыков** — статический словарь, который маппит ключевые слова должности → набор подразумеваемых навыков.

### Принцип работы

1. При скоринге/рекомендациях проверяем должность резюме
2. По должности определяем набор **role-implied навыков**
3. Если навык вакансии есть в role-implied наборе → он **НЕ показывается как missing**
4. Вместо этого он помечается как «implied» и показывается отдельно с низким приоритетом (или не показывается вообще)

### Категории должностей и их implied-навыки

#### Руководитель (head/director/руководитель/директор/начальник)

Implied навыки:
- управление командой / руководство командой
- руководство коллективом
- делегирование / постановка задач
- мотивация персонала / развитие персонала
- управление проектами
- стратегическое планирование
- оценка персонала / performance review
- подбор персонала (для руководителей уровня «руководитель отдела» и выше)
- операционное управление
- контроль исполнения
- планирование / постановка целей

#### Менеджер по продажам (sales manager / менеджер по продажам)

Implied навыки:
- переговоры / ведение переговоров
- работа с клиентами
- воронка продаж
- активные продажи / прямые продажи
- заключение договоров
- аналитика продаж
- работа с возражениями

#### Руководитель отдела продаж (head of sales / руководитель отдела продаж)

= Руководитель + Менеджер по продажам (объединённый набор)

#### Маркетолог (marketing / маркетолог / маркетинг менеджер)

Implied навыки:
- маркетинг / продвижение
- маркетинговые исследования
- анализ конкурентов
- цифровой маркетинг
- создание контента

#### HR-специалист (HR / кадровик / рекрутер)

Implied навыки:
- подбор персонала / рекрутинг
- адаптация персонала / онбординг
- оценка персонала
- обучение персонала
- мотивация персонала

---

## 4. Техническая реализация

### Файл: `src/lib/role-implied-skills.js` (НОВЫЙ)

```js
/**
 * ROLE-IMPLIED SKILLS
 * ====================
 * Skills automatically implied by job position.
 * Based on ESCO essential/optional concept adapted for hh.ru Russian job market.
 *
 * When a person holds position "Руководитель отделов продаж",
 * skills like "руководство коллективом", "управление проектами"
 * are self-evident from the title and should NOT be shown as "missing".
 */

const ROLE_SKILL_MAP = [
  {
    // Ключевые слова должности (normalized)
    triggers: ['руководител', 'director', 'head', 'директор', 'начальник'],
    // Исключения — если должность содержит эти слова, не применять
    exclude: ['заместитель', 'зам ', 'зам.', 'помощник', 'assistant', 'deputy'],
    // Подразумеваемые навыки (normalized)
    implied: [
      'управление командой',
      'руководство командой',
      'руководство коллективом',
      'делегирование',
      'постановка задач',
      'мотивация персонала',
      'развитие персонала',
      'управление проектами',
      'стратегическое планирование',
      'оценка персонала',
      'операционное управление',
      'контроль исполнения',
      'планирование',
    ],
  },
  {
    triggers: ['менеджер по продажам', 'sales manager', 'менеджер продаж'],
    exclude: ['ассистент', 'помощник'],
    implied: [
      'переговоры',
      'ведение переговоров',
      'работа с клиентами',
      'воронка продаж',
      'активные продажи',
      'прямые продажи',
      'заключение договоров',
      'аналитика продаж',
      'работа с возражениями',
    ],
  },
  // ... другие группы
];
```

### Интеграция в `quality-recommendations.js`

В функции `buildRecommendations()` добавить шаг:

```js
// После строки 47: const allResume = new Set([...resumeExplicit, ...resumeDerived]);
// Добавить:
const roleImplied = getRoleImpliedSkills(r.title || '');
const allResumeWithImplied = new Set([...allResume, ...roleImplied]);

// В цикле проверки missing добавить:
if (roleImplied.has(vs)) continue; // Навык подразумевается должностью
```

### Интеграция в `match-scorer-skills.js`

Добавить **implied match** как ещё одну категорию (между synonym и missing):

| Категория | Вес | Описание |
|-----------|-----|----------|
| Explicit | 100% | Навык прямо указан в резюме |
| Derived | 70% | Навык выведен из описания опыта |
| Synonym | 50% | Связанный навык из группы синонимов |
| **Implied** | **40%** | **Навык подразумевается должностью** |
| Missing | 0% | Навык отсутствует |

Вес 40% (а не 100%) потому что implied — это предположение. Человек может формально быть «руководителем», но не иметь навыка «управление проектами». Но это лучше, чем 0% — мы даём частичный кредит.

---

## 5. Что предстоит сделать (roadmap)

### Фаза 1: Базовая карта role-implied навыков (Текущая задача)
- [ ] Создать `src/lib/role-implied-skills.js` с картой для 5-7 ключевых категорий должностей
- [ ] Интегрировать в `quality-recommendations.js` — фильтрация implied из missing
- [ ] Интегрировать в `match-scorer-skills.js` — категория implied match (40%)
- [ ] Покрыть тестами: «Руководитель отделов продаж» не получает «руководство коллективом» как missing

### Фаза 2: Расширение карты
- [ ] Добавить больше категорий должностей (IT, финансы, логистика и т.д.)
- [ ] Учесть уровень должности (intern → junior → middle → senior → lead → head)
- [ ] Синергия с `quality-experience.js` — detectProgression lvl() для определения уровня

### Фаза 3: Возможная интеграция с ESCO API (опционально, на будущее)
- [ ] ESCO API endpoint: `https://ec.europa.eu/esco/api/search?text=...&type=occupation`
- [ ] Получение essential/optional навыков по профессии
- [ ] Кэширование результатов в chrome.storage
- [ ] Проблема: ESCO на английском, hh.ru на русском → нужен маппинг или перевод
- [ ] Проблема: ESCO навыки не совпадают 1:1 с hh.ru навыками → нужен fuzzy matching

---

## 6. Источники

1. **ESCO Optional definition**: https://esco.ec.europa.eu/en/about-esco/escopedia/escopedia/optional  
   > "Optional refers to knowledge, skills and competences that may be required or occur when working in an occupation depending on the employer."

2. **ESCO Essential definition**: https://esco.ec.europa.eu/en/about-esco/escopedia/escopedia/essential  
   > "Essential are those knowledge, skills and competences that are usually required when working in the occupation, independently of the work context or the employer."

3. **ESCO API**: https://ec.europa.eu/esco/api/search — доступен бесплатно, без авторизации

4. **ESCO v1.1.1 handbook** (PDF): https://www.skillsforemployment.org/sites/default/files/2024-01/edmsp1_212824.pdf

5. **ESCO Occupation definition**: https://esco.ec.europa.eu/en/about-esco/escopedia/escopedia/occupation

### Проверка через API (выполнено 2026-06-15)

- `GET /search?text=sales+manager&type=occupation` → found: Sales Manager (URI: a7594892-...)
- `GET /resource/occupation?uris=...&language=en` → 40 essential + 18 optional skills
- `GET /resource/occupation?uris=...&language=ru` → Russian translations available but inconsistent
- Department Manager → 16 essential + 67 optional
- COO → 22 essential + 21 optional

---

## 7. Почему НЕ используем ESCO API напрямую сейчас

1. **Задержка**: онлайн-запрос к ESCO API при каждом скоринге — 200-500мс, неприемлемо для UX расширения
2. **Языковой барьер**: ESCO навыки на английском, hh.ru — на русском. Маппинг неполный
3. **Разные онтологии**: навыки ESCO не совпадают 1:1 с ключевыми навыками hh.ru
4. **Оффлайн-требование**: расширение должно работать без интернета (кроме hh.ru)
5. **Избыточность**: для наших целей нужна только малая часть ESCO (5-7 категорий должностей × 10-15 навыков)

**Решение:** локальная статическая карта, вдохновлённая концепцией ESCO essential/optional, но адаптированная под русский рынок и навыки hh.ru.

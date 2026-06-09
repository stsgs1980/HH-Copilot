# UNICODE_POLICY -- HH Copilot Extension

Проект: hh-auto-respond-extension
Версия: 1.5.0
Статус: enforcement

---

## 1. Цель

Документ регулирует использование Unicode-символов в кодовой базе Chrome-расширения HH Copilot. Цель -- предотвратить попадание emoji, декоративных Unicode-символов и нестандартных символов в код, который инжектируется в DOM страницы hh.ru. Контент-скрипт работает в чужом DOM: побочные символы ломают парсинг, визуальную целостность и совместимость с Magritte CSS-фреймворком hh.ru.

---

## 2. Уровни строгости

| Уровень | Область | Действие при нарушении |
|---------|---------|------------------------|
| [C] Critical | content.js, panel CSS (инжектируемые стили), manifest.json | Блокирует коммит |
| [W] Warning | CHANGELOG.md, ARCHITECTURE.md, README.md | Предупреждение в CI |
| [I] Info | Debug-логи (console.log), внутренние заметки | Рекомендация |

---

## 3. Что запрещено в [C] контексте

- Emoji в UI строках: template literals, innerHTML, textContent
- Unicode-символы в CSS-классах и CSS-селекторах
- Decorative Unicode в button text, labels, status messages
- Box-drawing символы в строках, попадающих в DOM
- HTML entities для декоративных символов: &#x2B50;, &#10084; и т.п.
- Unicode-разделители и whitespace-символы: U+200B, U+200D, U+FEFF

Исключение: Unicode-декораторы в JS-комментариях не инжектируются в DOM и
допускаются, но не рекомендуются. Текущее содержимое content.js содержит
декоративные строки (box-drawing) в комментариях -- это legacy, новые
файлы должны использовать ASCII-комментарии.

---

## 4. Что разрешено

**Повсеместно:**

- ASCII: a-z, A-Z, 0-9
- Стандартная пунктуация: . , : ; ! ? ( ) [ ] { } " ' / \ - _ + = @ # $ % ^ & * ~ ` | < >
- Cyrillic: а-я, А-Я, ё, Ё
- HTML entities для функциональных символов: `&middot;`, `&mdash;`, `&ndash;`, `&laquo;`, `&raquo;`, `&copy;`, `&trade;`

**Визуальные элементы:**

- SVG иконки (inline SVG, data URI, внешние файлы) -- предпочтительный способ
- CSS pseudo-elements (::before, ::after) с content на ASCII/Cyrillic
- Шрифтовые иконки (если подключены) через CSS-классы

---

## 5. Правила для content.js

5.1. Все UI строки в template literals -- только ASCII + Cyrillic:

    // ПРАВИЛЬНО
    const status = `Статус: OK (${count})`;
    const label = 'Откликнуть';

    // ЗАПРЕЩЕНО
    const status = `Статус: \u2713 (${count})`;
    const label = 'Откликнуть \u2192';

5.2. Иконки -- только SVG:

    // ПРАВИЛЬНО
    const icon = `<svg width="16" height="16" viewBox="0 0 16 16"><path d="..."/></svg>`;

    // ЗАПРЕЩЕНО
    const icon = '\u{1F4E7}';  // email emoji

5.3. Статус-индикаторы -- текстовые метки:

    Допустимые значения: OK, ERROR, WARN, DONE, SKIP, ACTIVE, IDLE.
    Запрещены: Unicode-галочки, крестики, стрелки, кружки.

5.4. Esc-функция должна пропускать только ASCII + Cyrillic:

    function sanitizeUI(str) {
      return str.replace(/[^\x20-\x7E\u0410-\u044F\u0401\u0451]/g, '');
    }

---

## 6. Правила для документации

**CHANGELOG.md [W]:** ASCII + Cyrillic + стандартная пунктуация.
Типографические символы (em dash, en dash) разрешены через HTML entities.

**ARCHITECTURE.md [W]:** ASCII + Cyrillic + code blocks. Code blocks наследуют
правила файла, в котором они находятся (content.js блоки -- [C]).

**README.md [W]:** ASCII + Cyrillic + typographic entities.
Markdown-разделители (-- для em dash) допустимы.

---

## 7. Регулярные выражения для валидации

### 7.1. [C] Санитизация UI-строк

    // Очистка строки для DOM
    const SAFE_PATTERN = /^[\x20-\x7E\u0410-\u044F\u0451\u0401]*$/;

    function validateUIString(str) {
      if (!SAFE_PATTERN.test(str)) {
        console.warn('[HH-AR][Unicode] Небезопасная строка:', str);
        return str.replace(/[^\x20-\x7E\u0410-\u044F\u0451\u0401]/g, '');
      }
      return str;
    }

### 7.2. [C] Поиск emoji и декоративных Unicode

    // Выявляет emoji, box-drawing, decorative
    const EMOJI_PATTERN = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u2500-\u257F\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/u;

    function hasEmoji(str) {
      return EMOJI_PATTERN.test(str);
    }

### 7.3. [C] ESLint-правило (для будущего добавления)

    // .eslintrc.js -- custom rule
    // Имя: no-unicode-decorative
    // Файлы: content.js, **/*.css
    // Pattern: reject non-ASCII/non-Cyrillic in string literals
    // whitelist: \n, \r, \t, стандартные пунктуационные диапазоны

---

## 8. Контрольный чеклист pre-commit

Перед коммитом проверить:

- [ ] content.js: нет emoji в template literals и строковых константах
- [ ] content.js: нет Unicode в статус-индикаторах (только OK/ERROR/WARN)
- [ ] content.js: иконки реализованы через SVG, не Unicode
- [ ] Инжектируемый CSS: нет Unicode в классах, селекторах, content
- [ ] manifest.json: name и description -- ASCII + Cyrillic
- [ ] CHANGELOG.md: нет emoji (допускаются только текстовые маркеры: [FIX], [FEAT])
- [ ] Все UI строки проходят regex-проверку: /^[\x20-\x7E\u0410-\u044F\u0451\u0401]*$/

---

*Документ актуален на момент версии 1.5.0. Обновляется при изменении
структуры проекта или добавлении новых инжектируемых файлов.*

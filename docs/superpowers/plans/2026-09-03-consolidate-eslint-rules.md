# Объединение каталогов eslint-rules

> **Для агентов:** Используй superpowers:subagent-driven-development или superpowers:executing-plans для выполнения пошагово.

**Цель:** Перенести все кастомные ESLint-правила из `extension/eslint-rules/` в `eslint-rules/` и удалить дублирующий каталог.

**Архитектура:** Все 5 правил (`code-block-language.js`, `unicode-policy.js`, `max-file-lines.js`, `max-file-lines-hard.js`, `no-unicode-graphics.js`) живут в одном `eslint-rules/` рядом с `eslint.config.js`. Импорты обновляются в конфиге. Пустой `extension/eslint-rules/` удаляется.

**Tech Stack:** ESLint flat config, Node.js

---

## Task 1: Перенести файлы

**Files:**

- Move: `extension/eslint-rules/no-unicode-graphics.js` -> `eslint-rules/no-unicode-graphics.js`
- Move: `extension/eslint-rules/max-file-lines.js` -> `eslint-rules/max-file-lines.js`
- Move: `extension/eslint-rules/max-file-lines-hard.js` -> `eslint-rules/max-file-lines-hard.js`

**Steps:**

- [ ] Скопировать три файла в `eslint-rules/`:

```bash
cp extension/eslint-rules/no-unicode-graphics.js eslint-rules/
cp extension/eslint-rules/max-file-lines.js eslint-rules/
cp extension/eslint-rules/max-file-lines-hard.js eslint-rules/
```

- [ ] Проверить что файлы на месте:

```bash
ls eslint-rules/
# Ожидаемый результат: 5 файлов
# code-block-language.js  max-file-lines-hard.js  no-unicode-graphics.js
# max-file-lines.js       unicode-policy.js
```

- [ ] Удалить старые копии:

```bash
rm -r extension/eslint-rules/
```

---

## Task 2: Обновить импорты в eslint.config.js

**Files:**

- Modify: `eslint.config.js:8-10`

**Steps:**

- [ ] Заменить импорты (строки 8-10):

```javascript
// Старое:
import maxFileLinesHard from "./extension/eslint-rules/max-file-lines-hard.js";
import maxFileLines from "./extension/eslint-rules/max-file-lines.js";
import noUnicodeGraphicsExt from "./extension/eslint-rules/no-unicode-graphics.js";

// Новое:
import maxFileLinesHard from "./eslint-rules/max-file-lines-hard.js";
import maxFileLines from "./eslint-rules/max-file-lines.js";
import noUnicodeGraphicsExt from "./eslint-rules/no-unicode-graphics.js";
```

---

## Task 3: Верификация

**Steps:**

- [ ] Запустить линтер и убедиться что все правила работают:

```bash
npx eslint .
```

Ожидаемый результат: нет ошибок импорта, ошибки юникода/длины файлов работают как раньше.

- [ ] Закоммитить:

```bash
git add eslint-rules/ eslint.config.js
git rm -r extension/eslint-rules/
git commit -m "chore: consolidate eslint-rules into single directory"
```

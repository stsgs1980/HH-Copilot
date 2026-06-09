# ПРАВИЛА АГЕНТА -- НАРУШЕНИЕ НЕДОПУСТИМО

> Копируется в корень проекта setup.sh. Агент читает перед началом работы.

---

## Правило 1: worklog -- ДО и ПОСЛЕ каждого действия

- Перед ЛЮБЫМ действием: прочитай /worklog.md
- После ЛЮБОГО действия: обнови /worklog.md
- Формат: только блоки с --- разделителем
- Содержание: конкретные факты (файлы, команды, результаты)

## Правило 2: Читай перед записью (READ BEFORE WRITE)

- НИКОГДА не пиши файл, не прочитав его сначала (Read tool)
- Исключение: если файл не существует (проверь через LS/Glob)
- Причина: без чтения агент рискует уничтожить существующий код

## Правило 3: Один логический блок -- один коммит

- Закончил meaningful chunk работы -> git add -A && git commit
- Сообщение коммита: конкретное описание (не "update", не "fix")
- Коммит без обновлённого worklog -> ОШИБКА (pre-commit hook заблокирует)

## Правило 4: Запрет на циклы

- Если ты делаешь то же самое 3-й раз с тем же результатом -> СТОП
- Не пытайся "ещё раз, но по-другому"
- Напиши в чат: "Застрял на [конкретный шаг], нужна помощь"
- Это НЕ провал -- это экономия времени пользователя

## Правило 5: Честность в отчётах

- НЕ пиши "работа завершена" если тесты не пройдены
- НЕ пиши "файл создан" если он не существует
- НЕ пиши "ошибка исправлена" если не проверил
- Каждое утверждение -> должно быть верифицируемо

## Правило 6: Структура работы

1. Прочитай AGENT_RULES.md и worklog.md
2. Определи конкретный следующий шаг
3. Выполни шаг
4. Зафиксируй в worklog
5. Git commit
6. Перейди к шагу 2

---

## Формат worklog.md

```markdown
---
Task ID: [номер шага]
Agent: [имя агента или "main"]
Task: [что делаем]

Work Log:
- [ФАКТ: что конкретно сделали]
- [ФАКТ: какой файл изменили, команда]
- [ФАКТ: результат команды или операции]

Stage Summary:
- [Что получилось, что дальше]
---
```

---

v1.0 | 2026-06-09 | anti-hallucination-guard

<!-- CASCADE-GUARD:START -->
<!-- Do NOT edit between START and END markers. This block is managed by cascade-guard/setup.sh -->

## Cascade: Task Execution Discipline

> Rules for dependency-aware, priority-ordered task execution.

### C-1: Single source of truth

The file **`cascade-state.json`** is the only source of truth for task status.

- All task statuses live ONLY there
- If your context is stale — re-read the file
- NEVER rely on memory for "what's done"

### C-2: Start protocol

Before any work, you MUST:

1. Read `cascade-state.json`
2. Run `./cascade-cli.sh next-task` to find the next available task
3. Confirm the task status is `ready` (all depends_on = completed)
4. If the task is `blocked` — DO NOT touch it. Work only on `ready` tasks

**Forbidden:**
- Starting a task with unmet dependencies
- Self-selecting tasks by "I think this is more important"
- Working on P2 tasks when P0/P1 tasks are unfinished

### C-3: Task execution protocol

#### Start

```
1. Read cascade-state.json -> find task by ID
2. Study: title, acceptance criteria, anti_hallucination checks
3. Identify: which files to create/edit
4. Write to worklog.md: "STARTED: {task_id} — {title}"
5. Run: ./cascade-cli.sh start-task {task_id}
```

#### Work

```
1. Implement code per acceptance criteria
2. Check all anti_hallucination rules
3. Check project-specific quality rules (anti-monolith, unicode policy, etc.)
4. Each logical unit = separate commit
```

#### Complete

```
1. Verify ALL acceptance criteria — every single point
2. If even ONE criterion is not met — task is NOT complete
3. Run: ./cascade-cli.sh complete-task {task_id}
4. Write to worklog.md: "COMPLETED: {task_id} — {title}" + results
5. Git commit with message "feat({task_id}): description"
6. Push to remote
```

### C-4: Forbidden actions

| # | Prohibition | Why |
|---|-------------|-----|
| 1 | Mark task completed without checking ALL acceptance criteria | Quality hallucination |
| 2 | Skip anti_hallucination checks | Unreliable code |
| 3 | Start a task where any depends_on is not completed | Dependency violation |
| 4 | Modify cascade-state.json without actually doing the work | False status |
| 5 | Work on tasks out of priority order (skip P0 for P2) | Priority violation |
| 6 | Commit with messages like "update", "fix", "wip" | No audit trail |

### C-5: Allowed parallelism

Tasks can be parallelized ONLY when:

1. They are in the same phase
2. They have no mutual dependencies (depends_on)
3. They touch different files (no write conflict)

### C-6: Blocking handling

If a task is blocked (depends_on not completed):

1. DO NOT try to bypass the block
2. Report: "Task blocked: waiting for [dep_ids]"
3. Suggest alternative: "Available tasks: [ids]"
4. Work on available tasks instead

### C-7: CLI reference

```bash
./cascade-cli.sh next-task          # What should I work on next?
./cascade-cli.sh ready-tasks        # Show all ready tasks
./cascade-cli.sh start-task F0.2    # I'm starting this task
./cascade-cli.sh complete-task F0.2 # I finished this task
./cascade-cli.sh status             # Show overall progress
./cascade-cli.sh deps F3.4          # What does this task depend on?
./cascade-cli.sh implements F2.1    # What functions does this implement?
./cascade-cli.sh critical-path      # Show the longest dependency chain
./cascade-cli.sh export-dot         # Export dependency graph
./cascade-cli.sh validate           # Check cascade-state.json integrity
```

### C-8: Priority rules

| Priority | Meaning | When can it be deferred |
|----------|---------|------------------------|
| P0 | Critical — project doesn't work without it | NEVER |
| P1 | Important — significant functionality | Only when all P0 in current phase are done |
| P2 | Nice to have — UX improvements | Only when all P0 and P1 are done |

### C-9: Pre-response checklist

Before telling the user "task is done", verify:

- [ ] All acceptance criteria passed?
- [ ] All anti_hallucination checks passed?
- [ ] cascade-state.json updated?
- [ ] worklog.md updated?
- [ ] Git commit made?

If ANY item is unchecked — the task is NOT done.

<!-- CASCADE-GUARD:END -->

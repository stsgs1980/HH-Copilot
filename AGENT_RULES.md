# ПРАВИЛА АГЕНТА -- НАРУШЕНИЕ НЕДОПУСТИМО

> Копируется в корень проекта setup.sh. Агент читает перед началом работы.

---

## Правило 1: worklog -- ДО и ПОСЛЕ каждого действия

- Перед ЛЮБЫМ действием: прочитай /worklog.md
- После ЛЮБОГО действия: обнови /worklog.md
- Формат: только блоки с --- разделителем
- Содержание: конкретные факты (файлы, команды, результаты)

## Правило 1.1: Структура проекта -- ПЕРВЫМ делом в каждой сессии

- Каждая новая сессия начинается с чтения структуры проекта
- ПРОЧИТАЙ: README.md, AGENT_RULES.md, cascade-state.json, worklog.md
- ПРОЧИТАЙ: src/ дерево файлов (LS или Glob) — чтобы понимать актуальную структуру кода
- КРОСС-ПРОВЕРКА: сверяй документы с реальным кодом. Если README говорит "65+ файлов", а в src/ 100+ файлов — это кросс-разрыв, его нужно исправить
- ПРИЧИНА: без понимания структуры агент рискует создать некорректный код, нарушить архитектуру или продублировать существующую логику

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



<!-- AHG:START -->
<!-- Do NOT edit between START and END markers. This block is managed by anti-hallucination-guard/setup.sh -->
## Rule 1: worklog -- BEFORE and AFTER every action

- Before ANY action: read /worklog.md
- After ANY action: update /worklog.md
- Format: only blocks with --- separator
- Content: specific facts (files, commands, results)

## Rule 1.1: Project structure -- FIRST thing in every session

- Every new session MUST start with reading project structure
- READ: README.md, AGENT_RULES.md, cascade-state.json, worklog.md
- READ: src/ file tree (LS or Glob) -- to understand actual code structure
- CROSS-CHECK: verify documents match actual code. If README says "65+ files" but src/ has 100+ files -- that is a cross-gap, fix it
- REASON: without understanding structure, agent risks creating incorrect code, breaking architecture, or duplicating existing logic

## Rule 2: Read before write (READ BEFORE WRITE)

- NEVER write a file without reading it first (Read tool)
- Exception: if file does not exist (verify via LS/Glob)
- Reason: without reading, agent risks destroying existing code

## Rule 3: One logical block -- one commit

- Finished a meaningful chunk of work -> git add -A && git commit
- Commit message: specific description (not "update", not "fix")
- Commit without updated worklog -> ERROR (pre-commit hook will block)

## Rule 4: No loops

- If you are doing the same thing for the 3rd time with the same result -> STOP
- Do not try "once more, but differently"
- Write in chat: "Stuck on [specific step], need help"
- This is NOT a failure -- this saves user time

## Rule 5: Honest reporting

- Do NOT write "work completed" if tests are not passed
- Do NOT write "file created" if it does not exist
- Do NOT write "error fixed" if you did not verify
- Every claim -> must be verifiable

## Rule 6: PlantUML -- read reference before editing PUML files

- Before creating or editing ANY `.puml` file, the agent MUST read `docs/PLANTUML-REFERENCE.md`
- This ensures correct PlantUML syntax (aliases, quotes, arrow types, skinparam, component notation)
- All PUML files must pass the verification checklist in Section 9 of the reference
- HH-Copilot conventions (Section 10) must be followed: theme, colors, naming, grouping
- VIOLATION: writing PUML without reading reference = syntax errors and broken diagrams

## Rule 7: Work structure

1. Read AGENT_RULES.md and worklog.md
2. Determine the specific next step
3. Execute the step
4. Record in worklog
5. Git commit
6. Go to step 2


## worklog.md format

```markdown
Task ID: [step number]
Agent: [agent name or "main"]
Task: [what we are doing]

Work Log:
- [FACT: what specifically was done]
- [FACT: which file was changed, command]
- [FACT: command result or operation outcome]

Stage Summary:
- [What was accomplished, what is next]
```



<!-- AHG:END -->

## Rule 8: NEVER call docx/pdf/pptx/xlsx Skill without user approval

- DO NOT invoke Skill(command="docx"), Skill(command="pdf"), Skill(command="pptx"), Skill(command="xlsx") automatically
- ALWAYS ask the user first
- This rule exists because auto-invoking docx skill wastes time on formatting when plain text is needed
- VIOLATION OF THIS RULE IS NOT ACCEPTABLE

## Rule 9: Document format -- MD only, no auto-generation of binary files

- DO NOT create, invoke, or generate PDF, XLS, DOC/DOCX files without explicit user request or approval
- All documents MUST be in MD format, in compliance with Unicode Policy
- This rule EXPANDS on Rule 8: even if user mentions "document" or "report", default to MD text in chat
- Only create binary files (docx/pdf/xlsx/pptx) when user EXPLICITLY says "make a docx" / "create a pdf" / etc.
- VIOLATION OF THIS RULE IS NOT ACCEPTABLE

## Rule 10: No unsolicited initiative

- Do NOT take initiative beyond what was explicitly requested
- Do NOT add features, refactor, or expand scope unless asked
- Do NOT generate extra files, reports, or summaries unless asked
- If in doubt -- ask the user, do not assume

## Rule 11: Answer only what was asked

- When asked a question -- provide ONLY the answer
- Do NOT add unsolicited context, explanations, or tangential information
- Do NOT restructure or reframe the user's question
- If the user asked for X -- give X, not X+Y+Z

## Rule 12: Execute only on direct instruction, always record results

- Perform tasks ONLY after a direct instruction from the user
- Do NOT proactively start work based on assumptions or implied intent
- After completing any task, ALWAYS record results in ALL relevant project documents (worklog, cascade-state, etc.)
- Unrecorded work = undone work

# AGENT RULES - Cascade-guard

> **Mandatory reading before ANY work on the project.**
> If you are an AI agent and have not read this file - stop and read it now.

---

## 1. SINGLE SOURCE OF TRUTH

The only source of truth for task states is the **`cascade-state.json`** file.

- All task statuses are stored ONLY there
- If your context has stale information - re-read the file
- NEVER rely on your memory of "what has already been done"

---

## 2. WORK START PROTOCOL

Before starting ANY work, the agent MUST:

1. Read `cascade-state.json`
2. Run `./cascade-cli.sh next-task` to find out which task is next
3. Verify the task is in `ready` status (all depends_on = completed)
4. If a task is `blocked` - do NOT touch it. Work only on `ready` tasks

**Forbidden:**
- Starting a task with unmet dependencies
- Choosing a task based on "I think this is more important"
- Working on P2 tasks when there are unfinished P0/P1 tasks

---

## 3. TASK EXECUTION PROTOCOL

### 3.1 Start

```
1. Read cascade-state.json -> find the task by ID
2. Study: title, acceptance criteria, anti_hallucination checks
3. Determine: which files to create/edit
4. Write to worklog.md: "STARTED: {task_id} - {title}"
5. Update cascade-state.json: status = "in_progress"
```

### 3.2 Work

```
1. Implement code according to acceptance criteria
2. Verify all anti_hallucination rules
3. Verify anti-monolith rule (max 250 lines per file)
4. Verify Unicode policy (no emoji, no decorative Unicode)
5. Each logical block - separate commit
```

### 3.3 Completion

```
1. Verify ALL acceptance criteria - each item
2. If even one criterion is NOT met - the task is NOT complete
3. Update cascade-state.json: status = "completed"
4. Write to worklog.md: "COMPLETED: {task_id} - {title}" + results
5. Make a git commit with description "feat(task_id): description"
6. Push to GitHub
```

---

## 4. FORBIDDEN ACTIONS

| # | Prohibition | Reason |
|---|-------------|--------|
| 1 | Changing task status to completed without checking ALL acceptance criteria | Quality hallucination |
| 2 | Skipping anti_hallucination checks | Unreliable code |
| 3 | Creating files larger than 250 lines (exceptions require explicit approval) | Anti-monolith |
| 4 | Using emoji or decorative Unicode in DOM-injected files | Unicode Policy |
| 5 | Starting a task with depends_on where at least one is not completed | Dependency violation |
| 6 | Modifying cascade-state.json without actually doing the work | False status |
| 7 | Working on tasks out of order (skipping P0 for P2) | Priority violation |
| 8 | Making commits with descriptions like "update", "fix", "wip" | No traceability |

---

## 5. ALLOWED PARALLELISM

Tasks can be executed in parallel ONLY if:

1. They are in the same phase
2. They have no mutual dependencies (depends_on)
3. They work with different files (no write conflict)

**Examples of parallel tasks:**
- Tasks that all depend only on F0.1 and do not depend on each other

**Forbidden to parallelize:**
- Tasks where one depends on the other

---

## 6. BLOCKING HANDLING

If a task is blocked (depends_on not completed):

1. Do NOT attempt to bypass the block
2. Report to the user: "Task F1.3 is blocked: waiting for F0.7, F1.4"
3. Suggest an alternative: "Available tasks: F1.5, F1.6 (no dependencies except F0.1)"
4. Work on available tasks

---

## 7. WORKING WITH CASCADE-CLI.SH

The `cascade-cli.sh` script is your primary tool for navigating the cascade.

```bash
# Which task is next?
./cascade-cli.sh next-task

# Show all ready tasks
./cascade-cli.sh ready-tasks

# Complete a task (checks all depends_on)
./cascade-cli.sh complete-task F0.2

# Show cascade status
./cascade-cli.sh status

# Show task dependencies
./cascade-cli.sh deps F3.4

# Show which functions a task implements
./cascade-cli.sh implements F2.1
```

---

## 8. PRIORITY CRITERIA

| Priority | Meaning | When it can be deferred |
|----------|---------|------------------------|
| P0 | Critical. The project does not work without it | NEVER |
| P1 | Important. Significant functionality | Only if all P0 tasks in the current phase are completed |
| P2 | Nice to have. UX improvements | Only if all P0 and P1 are completed |

---

## 9. REPOSITORY WORKFLOW

- Commit format: `feat(F0.2): extract selectors module` or `fix(F0.3): handle null in safeGetText`
- Each commit MUST update worklog.md
- Each commit MUST follow the task-based format

---

## 10. CHECKLIST BEFORE EVERY RESPONSE TO USER

Before reporting "task completed", verify:

- [ ] All acceptance criteria met?
- [ ] All anti_hallucination checks passed?
- [ ] Files do not exceed 250 lines?
- [ ] No emoji/decorative Unicode?
- [ ] cascade-state.json updated?
- [ ] worklog.md updated?
- [ ] Git commit made?

If even one item is NOT met - the task is NOT complete.

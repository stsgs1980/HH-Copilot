# Task 5 Report: Add tooltips to skill categories

## What was implemented

Added `title` attributes (tooltips) to three skill category labels in `extension/src/ui/html/tabs/vacancies.js`:

| Category | Tooltip |
|---|---|
| Из опыта работы | Навыки, которые AI извлек из описания опыта |
| Связанные | Навыки, похожие по смыслу (синонимы) |
| Не хватает | Навыки из вакансии, которых нет в вашем резюме |

## What was tested

- `npm run lint` — PASS (no new warnings/errors introduced by this change)
- All 73 warnings and 1 error are pre-existing in other files

## Files changed

- `extension/src/ui/html/tabs/vacancies.js` — 3 lines modified (title attributes added)

## Self-review findings

None. Changes are minimal, targeted, and match the task brief exactly.

## Issues or concerns

None.

## Commit

- `32a7600` — `docs: add tooltips to skill categories`

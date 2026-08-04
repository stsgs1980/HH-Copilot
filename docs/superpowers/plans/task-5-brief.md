# Task 5: Add tooltips to skill categories

## Files
- Modify: `extension/src/ui/html/tabs/vacancies.js:118,198,207`

## Interfaces
- Consumes: None
- Produces: Updated UI with title attributes

## Steps

1. Add tooltip to "Из опыта работы" - change line 118 from:
```javascript
<span style="font-size:11px;font-weight:600;color:#B45309;">Из опыта работы</span>
```
To:
```javascript
<span style="font-size:11px;font-weight:600;color:#B45309;" title="Навыки, которые AI извлек из описания опыта">Из опыта работы</span>
```

2. Add tooltip to "Связанные" - change line 201 from:
```javascript
<span style="font-size:11px;font-weight:600;color:#D97706;">Связанные</span>
```
To:
```javascript
<span style="font-size:11px;font-weight:600;color:#D97706;" title="Навыки, похожие по смыслу (синонимы)">Связанные</span>
```

3. Add tooltip to "Не хватает" - change line 210 from:
```javascript
<span style="font-size:11px;font-weight:600;color:#DC2626;">Не хватает</span>
```
To:
```javascript
<span style="font-size:11px;font-weight:600;color:#DC2626;" title="Навыки из вакансии, которых нет в вашем резюме">Не хватает</span>
```

4. Run lint: `cd extension && npm run lint` (Expected: PASS)
5. Commit with message: `docs: add tooltips to skill categories`

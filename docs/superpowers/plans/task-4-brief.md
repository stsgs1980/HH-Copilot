# Task 4: Rename sections for clarity

## Files
- Modify: `extension/src/ui/html/tabs/vacancies.js:79,175`

## Interfaces
- Consumes: None
- Produces: Updated UI text

## Steps

1. Rename vacancy match section - change line 79 from:
```javascript
<div style="font-size:13px;font-weight:600;">Совпадение с вакансией</div>
```
To:
```javascript
<div style="font-size:13px;font-weight:600;">Оценка для этой вакансии</div>
```

2. Rename skill gap section - change line 175 from:
```javascript
<div style="font-size:13px;font-weight:600;">Совпадение навыков</div>
```
To:
```javascript
<div style="font-size:13px;font-weight:600;">Анализ навыков рынка</div>
```

3. Run lint: `cd extension && npm run lint` (Expected: PASS)
4. Commit with message: `docs: rename match sections for clarity`

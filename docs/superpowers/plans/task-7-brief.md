# Task 7: Make Analysis button more visible

## Files
- Modify: `extension/src/ui/html/tabs/vacancies.js:178-180`

## Interfaces
- Consumes: None
- Produces: Updated button styling

## Steps

1. Update button styling - change lines 178-180 from:
```javascript
<button class="btn btn-outline btn-sm" data-action="analyze-skills">
  ${ICONS.ai} Анализ
</button>
```
To:
```javascript
<button class="btn btn-primary btn-sm" data-action="analyze-skills" style="background:#7c3aed;color:#fff;">
  ${ICONS.ai} Анализ навыков
</button>
```

2. Run lint: `cd extension && npm run lint` (Expected: PASS)
3. Commit with message: `style: make analysis button more prominent`

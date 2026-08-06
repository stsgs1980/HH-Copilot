# Task 9: Add match mode setting to UI

## Files
- Modify: `extension/src/ui/html/tabs/settings.js`
- Modify: `extension/src/ui/panel/ai-settings-handlers.js`

## Interfaces
- Consumes: `WEIGHT_PROFILES` from match-scorer.js
- Produces: New setting dropdown

## Steps

1. Read `extension/src/ui/html/tabs/settings.js` to find appropriate location.

2. Add match mode dropdown after existing settings section:
```javascript
<div style="margin-bottom:12px;">
  <label style="display:block;font-size:12px;font-weight:500;margin-bottom:4px;">Режим матчинга</label>
  <select id="s-match-mode" style="width:100%;padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;background:#FAFAFA;">
    <option value="precise">Точный (навыки + должность)</option>
    <option value="flexible">Гибкий (семантика + опыт)</option>
  </select>
  <div style="font-size:10px;color:#71717A;margin-top:4px;">Точный: навыки 35%, должность 25%. Гибкий: семантика 45%, опыт 20%.</div>
</div>
```

3. In `extension/src/ui/panel/ai-settings-handlers.js` or similar, add event handler:
```javascript
// Match mode change handler
const matchModeSelect = document.getElementById('s-match-mode');
if (matchModeSelect) {
  matchModeSelect.addEventListener('change', async (e) => {
    const mode = e.target.value;
    await chrome.storage.local.set({ matchMode: mode });
    // Re-score all vacancies with new mode
    window.dispatchEvent(new CustomEvent('hh-ar-match-mode-changed', { detail: { mode } }));
  });
}
```

4. Run lint: `cd extension && npm run lint` (Expected: PASS)
5. Commit with message: `feat: add match mode setting (precise/flexible)`

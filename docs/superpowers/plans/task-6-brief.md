# Task 6: Connect cover letter template to match score

## Files
- Modify: `extension/src/ui/html/tabs/vacancies.js:158`

## Interfaces
- Consumes: `extractPlaceholders()` from cover-letter-placeholders.js
- Produces: Updated default template

## Steps

1. Verify the default template already includes `{matching_sentence}`:
```javascript
<textarea id="cover-letter-text" style="...">Здравствуйте! Меня заинтересовала вакансия {position} в {company}. Имею {experience} опыта в {skills}. {matching_sentence}Буду рад обсудить детали на интервью.</textarea>
```

2. Verify `extractPlaceholders()` in `extension/src/lib/cover-letter-placeholders.js` includes `matching_sentence` (lines 64-66):
```javascript
p.matching_sentence = allMatches.length > 0
  ? 'Мой опыт включает ' + formatSkillList(allMatches) + ', что соответствует требованиям вакансии. '
  : '';
```

3. Run lint: `cd extension && npm run lint` (Expected: PASS)
4. Commit with message: `docs: verify cover letter template includes matching skills`

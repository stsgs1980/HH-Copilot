# Task 11: Integrate semantic score into match-scorer

## Files
- Modify: `extension/src/lib/match-scorer.js:52-70`
- Modify: `extension/src/content/main.js:172`
- Modify: `extension/src/content/main-page-handlers-vacancy.js:94`
- Modify: `extension/src/ui/tabs/vacancies-match.js:113`
- Modify: `extension/src/lib/cover-letter-ai.js:61`
- Modify: `extension/src/lib/cover-letter-placeholders.js:40`
- Modify: `extension/src/lib/cover-letter-rich.js:91`
- Modify: `extension/src/lib/vacancy-fetch-enrichment.js:95`

## Interfaces
- Consumes: `computeSemanticSimilarity()` from ai-semantic.js
- Produces: Updated `computeMatchScore()` with semantic mode

## Steps

1. Import semantic module in `extension/src/lib/match-scorer.js` after line 34:
```javascript
import { computeSemanticSimilarity } from './ai-semantic.js';
```

2. Update `computeMatchScore` function to async and add semantic logic:
```javascript
export async function computeMatchScore(resume, vacancy, mode = 'precise') {
  if (!resume || !vacancy) {
    return { total: 0, breakdown: { skills: 0, title: 0, salary: 0, experience: 0, location: 0 }, details: {} };
  }

  const profile = WEIGHT_PROFILES[mode] || WEIGHT_PROFILES.precise;

  let semanticScore = 0;
  if (mode === 'flexible') {
    semanticScore = await computeSemanticSimilarity(resume, vacancy);
  }

  const skillResult = scoreSkills(resume, vacancy);
  const titleResult = scoreTitle(resume, vacancy);
  const salaryResult = scoreSalary(resume, vacancy);
  const expResult = scoreExperience(resume, vacancy);
  const locResult = scoreLocation(resume, vacancy);

  const breakdown = {
    skills: Math.round(skillResult.score * (profile.skills / 40)),
    title: Math.round(titleResult.score * (profile.title / 30)),
    salary: Math.round(salaryResult.score * (profile.salary / 15)),
    experience: Math.round(expResult.score * (profile.experience / 15)),
    location: locResult.score,
    semantic: mode === 'flexible' ? Math.round(semanticScore * 45) : 0
  };

  let total = Math.min(100, breakdown.skills + breakdown.title + breakdown.salary + breakdown.experience + breakdown.location + breakdown.semantic);

  // Role mismatch penalty (only in precise mode)
  if (mode === 'precise') {
    if (titleResult.score === 0 && titleResult.similarity === 0) {
      total = Math.min(total, 25);
    } else if (titleResult.similarity > 0 && titleResult.similarity < 0.15) {
      total = Math.min(total, 40);
    }
  }

  const details = {
    matchingSkills: skillResult.matching,
    derivedMatchSkills: skillResult.derivedMatch,
    synonymMatchSkills: skillResult.synonymMatch,
    impliedMatchSkills: skillResult.impliedMatch,
    missingSkills: skillResult.missing,
    extraSkills: skillResult.extra,
    titleSimilarity: titleResult.similarity,
    salaryMatch: salaryResult.reason,
    experienceMatch: expResult.reason,
    locationMatch: locResult.reason,
    semanticScore: semanticScore
  };

  scoreLog.info('Score ' + total + '%: skills=' + breakdown.skills + ' title=' + breakdown.title + ' salary=' + breakdown.salary + ' exp=' + breakdown.experience + ' loc=' + breakdown.location + ' semantic=' + breakdown.semantic);

  return { total, breakdown, details };
}
```

3. Update callers to use async/await:
- `extension/src/content/main.js:172`
- `extension/src/content/main-page-handlers-vacancy.js:94`
- `extension/src/ui/tabs/vacancies-match.js:113`
- `extension/src/lib/cover-letter-ai.js:61`
- `extension/src/lib/cover-letter-placeholders.js:40`
- `extension/src/lib/cover-letter-rich.js:91`
- `extension/src/lib/vacancy-fetch-enrichment.js:95`

4. Run lint: `cd extension && npm run lint` (Expected: PASS)
5. Commit with message: `feat: integrate semantic score into match-scorer for flexible mode`

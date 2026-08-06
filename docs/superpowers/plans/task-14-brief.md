# Task 14: Write unit tests for match-scorer weight profiles

## Files
- Create: `extension/tests/match-scorer.test.js`

## Interfaces
- Consumes: `computeMatchScore()` from match-scorer.js
- Produces: Test coverage for weight profiles

## Steps

1. Create `extension/tests/match-scorer.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { computeMatchScore } from '../src/lib/match-scorer.js';

describe('computeMatchScore', () => {
  const mockResume = {
    title: 'Менеджер по продажам',
    skills: ['продажи', 'переговоры', 'CRM'],
    experience: [{ duration: '3 года' }],
    derivedSkills: ['работа с клиентами']
  };

  const mockVacancy = {
    title: 'Менеджер по продажам',
    keySkills: ['продажи', 'переговоры', 'опыт работы'],
    description: { text: 'Требуется менеджер по продажам' }
  };

  it('should return score with precise mode by default', async () => {
    const result = await computeMatchScore(mockResume, mockVacancy);
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.breakdown).toHaveProperty('skills');
    expect(result.breakdown).toHaveProperty('title');
    expect(result.breakdown).toHaveProperty('salary');
    expect(result.breakdown).toHaveProperty('experience');
    expect(result.breakdown).toHaveProperty('location');
  });

  it('should use precise weights by default', async () => {
    const result = await computeMatchScore(mockResume, mockVacancy);
    // Skills max is 35, title max is 25
    expect(result.breakdown.skills).toBeLessThanOrEqual(35);
    expect(result.breakdown.title).toBeLessThanOrEqual(25);
  });

  it('should use flexible mode when specified', async () => {
    const result = await computeMatchScore(mockResume, mockVacancy, 'flexible');
    expect(result.total).toBeGreaterThan(0);
    expect(result.breakdown).toHaveProperty('semantic');
  });

  it('should return 0 for null inputs', async () => {
    const result = await computeMatchScore(null, null);
    expect(result.total).toBe(0);
  });
});
```

2. Run tests: `cd extension && npm test` (Expected: PASS)
3. Commit with message: `test: add unit tests for match-scorer weight profiles`

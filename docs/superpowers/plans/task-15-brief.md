# Task 15: Write unit tests for AI semantic comparison

## Files
- Create: `extension/tests/ai-semantic.test.js`

## Interfaces
- Consumes: `computeSemanticSimilarity()` from ai-semantic.js
- Produces: Test coverage for semantic comparison

## Steps

1. Create `extension/tests/ai-semantic.test.js`:
```javascript
import { describe, it, expect, vi } from 'vitest';
import { computeSemanticSimilarity } from '../src/lib/ai-semantic.js';

describe('computeSemanticSimilarity', () => {
  it('should return 0 for null inputs', async () => {
    const result = await computeSemanticSimilarity(null, null);
    expect(result).toBe(0);
  });

  it('should return 0 for null resume', async () => {
    const result = await computeSemanticSimilarity(null, { title: 'Test' });
    expect(result).toBe(0);
  });

  it('should return 0 for null vacancy', async () => {
    const result = await computeSemanticSimilarity({ title: 'Test' }, null);
    expect(result).toBe(0);
  });

  it('should return number between 0 and 1', async () => {
    // Mock fetch to return a valid response
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        choices: [{ message: { content: '0.75' } }]
      })
    });

    const result = await computeSemanticSimilarity(
      { title: 'Менеджер', skills: ['продажи'] },
      { title: 'Менеджер', keySkills: ['продажи'] }
    );

    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should clamp values outside 0-1 range', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        choices: [{ message: { content: '1.5' } }]
      })
    });

    const result = await computeSemanticSimilarity(
      { title: 'Test' },
      { title: 'Test' }
    );

    expect(result).toBe(1);
  });
});
```

2. Run tests: `cd extension && npm test` (Expected: PASS)
3. Commit with message: `test: add unit tests for AI semantic comparison`

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { handleSearchEnvironmentalRules } from '../../src/tools/search-environmental-rules.js';
import { createSeededDatabase } from '../helpers/seed-db.js';
import type { Database } from '../../src/db.js';
import { existsSync, unlinkSync } from 'fs';

const TEST_DB = 'tests/test-search-env.db';

describe('search_environmental_rules tool', () => {
  let db: Database;

  beforeAll(() => {
    db = createSeededDatabase(TEST_DB);
  });

  afterAll(() => {
    db.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  test('returns results for slurry query', () => {
    const result = handleSearchEnvironmentalRules(db, { query: 'slurry' });
    expect(result).toHaveProperty('results_count');
    expect((result as { results_count: number }).results_count).toBeGreaterThan(0);
  });

  test('respects topic filter', () => {
    const result = handleSearchEnvironmentalRules(db, { query: 'slurry', topic: 'nvz' });
    const typed = result as { results: Array<{ topic: string }> };
    expect(typed.results.length).toBeGreaterThan(0);
    for (const r of typed.results) {
      expect(r.topic).toBe('nvz');
    }
  });

  test('rejects unsupported jurisdiction', () => {
    const result = handleSearchEnvironmentalRules(db, { query: 'slurry', jurisdiction: 'FR' });
    expect(result).toHaveProperty('error', 'jurisdiction_not_supported');
  });

  test('returns results for storage query', () => {
    const result = handleSearchEnvironmentalRules(db, { query: 'storage tank' });
    expect(result).toHaveProperty('results_count');
    expect((result as { results_count: number }).results_count).toBeGreaterThan(0);
  });

  test('returns results for silage query', () => {
    const result = handleSearchEnvironmentalRules(db, { query: 'silage effluent' });
    expect(result).toHaveProperty('results_count');
    expect((result as { results_count: number }).results_count).toBeGreaterThan(0);
  });
});

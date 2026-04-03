import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { handleGetSpreadingWindows } from '../../src/tools/get-spreading-windows.js';
import { createSeededDatabase } from '../helpers/seed-db.js';
import type { Database } from '../../src/db.js';
import { existsSync, unlinkSync } from 'fs';

const TEST_DB = 'tests/test-spreading-windows.db';

describe('get_spreading_windows tool', () => {
  let db: Database;

  beforeAll(() => {
    db = createSeededDatabase(TEST_DB);
  });

  afterAll(() => {
    db.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  test('returns windows for slurry on sandy soils', () => {
    const result = handleGetSpreadingWindows(db, { manure_type: 'slurry', land_type: 'sandy' });
    expect(result).toHaveProperty('windows');
    const typed = result as { windows: Array<{ closed_period: { start: string; end: string } | null }> };
    expect(typed.windows.length).toBeGreaterThan(0);
    const hasClosedPeriod = typed.windows.some(w => w.closed_period !== null);
    expect(hasClosedPeriod).toBe(true);
  });

  test('returns windows for slurry on all other soils', () => {
    const result = handleGetSpreadingWindows(db, { manure_type: 'slurry', land_type: 'other' });
    expect(result).toHaveProperty('windows');
    const typed = result as { windows: Array<{ closed_period: { start: string; end: string } | null }> };
    expect(typed.windows.length).toBeGreaterThan(0);
  });

  test('returns not_found for unknown manure type', () => {
    const result = handleGetSpreadingWindows(db, { manure_type: 'uranium', land_type: 'sandy' });
    expect(result).toHaveProperty('error', 'not_found');
  });

  test('rejects unsupported jurisdiction', () => {
    const result = handleGetSpreadingWindows(db, { manure_type: 'slurry', land_type: 'sandy', jurisdiction: 'NL' });
    expect(result).toHaveProperty('error', 'jurisdiction_not_supported');
  });

  test('includes NVZ context note', () => {
    const result = handleGetSpreadingWindows(db, { manure_type: 'slurry', land_type: 'sandy' });
    expect(result).toHaveProperty('nvz_context');
  });
});

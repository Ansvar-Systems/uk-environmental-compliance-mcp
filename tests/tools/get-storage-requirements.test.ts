import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { handleGetStorageRequirements } from '../../src/tools/get-storage-requirements.js';
import { createSeededDatabase } from '../helpers/seed-db.js';
import type { Database } from '../../src/db.js';
import { existsSync, unlinkSync } from 'fs';

const TEST_DB = 'tests/test-storage-req.db';

describe('get_storage_requirements tool', () => {
  let db: Database;

  beforeAll(() => {
    db = createSeededDatabase(TEST_DB);
  });

  afterAll(() => {
    db.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  test('returns requirements for slurry', () => {
    const result = handleGetStorageRequirements(db, { material: 'slurry' });
    expect(result).toHaveProperty('requirements');
    const typed = result as { requirements: Array<{ min_capacity_months: number }> };
    expect(typed.requirements.length).toBeGreaterThan(0);
    expect(typed.requirements[0].min_capacity_months).toBe(6);
  });

  test('returns requirements for fuel oil', () => {
    const result = handleGetStorageRequirements(db, { material: 'fuel' });
    expect(result).toHaveProperty('requirements');
    const typed = result as { requirements: Array<{ material: string }> };
    expect(typed.requirements.length).toBeGreaterThan(0);
  });

  test('returns not_found for unknown material', () => {
    const result = handleGetStorageRequirements(db, { material: 'plutonium' });
    expect(result).toHaveProperty('error', 'not_found');
  });

  test('rejects unsupported jurisdiction', () => {
    const result = handleGetStorageRequirements(db, { material: 'slurry', jurisdiction: 'US' });
    expect(result).toHaveProperty('error', 'jurisdiction_not_supported');
  });
});

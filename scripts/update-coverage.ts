/**
 * Regenerate data/coverage.json from the current database.
 * Usage: npm run coverage:update
 */

import { createDatabase } from '../src/db.js';
import { writeFileSync } from 'fs';

const db = createDatabase();

const nvzRules = db.get<{ c: number }>('SELECT count(*) as c FROM nvz_rules')!.c;
const storage = db.get<{ c: number }>('SELECT count(*) as c FROM storage_requirements')!.c;
const bufferStrips = db.get<{ c: number }>('SELECT count(*) as c FROM buffer_strip_rules')!.c;
const abstraction = db.get<{ c: number }>('SELECT count(*) as c FROM abstraction_rules')!.c;
const pollution = db.get<{ c: number }>('SELECT count(*) as c FROM pollution_prevention')!.c;
const eia = db.get<{ c: number }>('SELECT count(*) as c FROM eia_screening')!.c;
const fts = db.get<{ c: number }>('SELECT count(*) as c FROM search_index')!.c;
const lastIngest = db.get<{ value: string }>('SELECT value FROM db_metadata WHERE key = ?', ['last_ingest']);

db.close();

const coverage = {
  mcp_name: 'UK Environmental Compliance MCP',
  jurisdiction: 'GB',
  build_date: lastIngest?.value ?? new Date().toISOString().split('T')[0],
  nvz_rules: nvzRules,
  storage_requirements: storage,
  buffer_strip_rules: bufferStrips,
  abstraction_rules: abstraction,
  pollution_prevention: pollution,
  eia_screening: eia,
  fts_entries: fts,
};

writeFileSync('data/coverage.json', JSON.stringify(coverage, null, 2));
console.log('Updated data/coverage.json:', coverage);

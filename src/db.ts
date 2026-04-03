import BetterSqlite3 from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface Database {
  get<T>(sql: string, params?: unknown[]): T | undefined;
  all<T>(sql: string, params?: unknown[]): T[];
  run(sql: string, params?: unknown[]): void;
  close(): void;
  readonly instance: BetterSqlite3.Database;
}

export function createDatabase(dbPath?: string): Database {
  const resolvedPath =
    dbPath ??
    join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'database.db');
  const db = new BetterSqlite3(resolvedPath);

  db.pragma('journal_mode = DELETE');
  db.pragma('foreign_keys = ON');

  initSchema(db);

  return {
    get<T>(sql: string, params: unknown[] = []): T | undefined {
      return db.prepare(sql).get(...params) as T | undefined;
    },
    all<T>(sql: string, params: unknown[] = []): T[] {
      return db.prepare(sql).all(...params) as T[];
    },
    run(sql: string, params: unknown[] = []): void {
      db.prepare(sql).run(...params);
    },
    close(): void {
      db.close();
    },
    get instance() {
      return db;
    },
  };
}

function initSchema(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nvz_rules (
      id INTEGER PRIMARY KEY,
      activity TEXT NOT NULL,
      material_type TEXT,
      soil_type TEXT,
      closed_period_start TEXT,
      closed_period_end TEXT,
      max_application_rate TEXT,
      conditions TEXT,
      regulation_ref TEXT,
      jurisdiction TEXT NOT NULL DEFAULT 'GB'
    );

    CREATE TABLE IF NOT EXISTS storage_requirements (
      id INTEGER PRIMARY KEY,
      material TEXT NOT NULL,
      min_capacity_months INTEGER,
      construction_standard TEXT,
      separation_distance_m INTEGER,
      inspection_frequency TEXT,
      regulation_ref TEXT,
      jurisdiction TEXT NOT NULL DEFAULT 'GB'
    );

    CREATE TABLE IF NOT EXISTS buffer_strip_rules (
      id INTEGER PRIMARY KEY,
      watercourse_type TEXT NOT NULL,
      activity TEXT,
      min_width_m REAL,
      conditions TEXT,
      scheme_payment TEXT,
      regulation_ref TEXT,
      jurisdiction TEXT NOT NULL DEFAULT 'GB'
    );

    CREATE TABLE IF NOT EXISTS abstraction_rules (
      id INTEGER PRIMARY KEY,
      source_type TEXT,
      threshold_m3_per_day REAL,
      licence_required INTEGER,
      exemptions TEXT,
      conditions TEXT,
      jurisdiction TEXT NOT NULL DEFAULT 'GB'
    );

    CREATE TABLE IF NOT EXISTS pollution_prevention (
      id INTEGER PRIMARY KEY,
      activity TEXT NOT NULL,
      hazards TEXT,
      control_measures TEXT,
      regulatory_requirements TEXT,
      regulation_ref TEXT,
      jurisdiction TEXT NOT NULL DEFAULT 'GB'
    );

    CREATE TABLE IF NOT EXISTS eia_screening (
      id INTEGER PRIMARY KEY,
      project_type TEXT NOT NULL,
      threshold_area_ha REAL,
      threshold_other TEXT,
      screening_required INTEGER,
      process TEXT,
      jurisdiction TEXT NOT NULL DEFAULT 'GB'
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      title, body, topic, jurisdiction
    );

    CREATE TABLE IF NOT EXISTS db_metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    INSERT OR IGNORE INTO db_metadata (key, value) VALUES ('schema_version', '1.0');
    INSERT OR IGNORE INTO db_metadata (key, value) VALUES ('mcp_name', 'UK Environmental Compliance MCP');
    INSERT OR IGNORE INTO db_metadata (key, value) VALUES ('jurisdiction', 'GB');
  `);
}

export function ftsSearch(
  db: Database,
  query: string,
  limit: number = 20
): { title: string; body: string; topic: string; jurisdiction: string; rank: number }[] {
  return db.all(
    `SELECT title, body, topic, jurisdiction, rank
     FROM search_index
     WHERE search_index MATCH ?
     ORDER BY rank
     LIMIT ?`,
    [query, limit]
  );
}

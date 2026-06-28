import Database from 'better-sqlite3';
import { dirname, resolve } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the SQLite file path. Defaults to slate-backend/data/slate.db.
 * Override with DB_PATH (e.g. ':memory:' for tests).
 */
export function resolveDbPath(): string {
  const fromEnv = process.env.DB_PATH;
  if (fromEnv) return fromEnv;
  return resolve(__dirname, '../../data/slate.db');
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const path = resolveDbPath();
  if (path !== ':memory:') {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

/** For tests: reset the singleton so a fresh in-memory DB can be created. */
export function _resetDbForTests(): void {
  if (db) db.close();
  db = null;
}

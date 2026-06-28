import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Idempotent migration runner.
 *  1. Applies schema.sql (all CREATE ... IF NOT EXISTS, so safe to repeat).
 *  2. Applies any migrations/NNNN_*.sql not yet recorded in schema_migrations.
 */
export function migrate(): void {
  const db = getDb();

  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  );`);

  const schemaPath = resolve(__dirname, 'schema.sql');
  db.exec(readFileSync(schemaPath, 'utf8'));

  const migrationsDir = resolve(__dirname, 'migrations');
  if (existsSync(migrationsDir)) {
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const applied = new Set(
      db.prepare('SELECT name FROM schema_migrations').all().map((r: any) => r.name),
    );
    const record = db.prepare(
      'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
    );
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      db.exec(sql);
      record.run(file, Date.now());
      console.log(`[migrate] applied ${file}`);
    }
  }

  console.log('[migrate] schema up to date');
}

// Allow `tsx src/db/migrate.ts` to run directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

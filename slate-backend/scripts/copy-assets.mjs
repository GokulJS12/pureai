// Copy non-TS runtime assets into dist/ after `tsc` (which only emits .js).
// Needed so `node dist/server.js` can read the SQL schema and migrations.
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

mkdirSync(join(root, 'dist', 'db'), { recursive: true });
cpSync(join(root, 'src', 'db', 'schema.sql'), join(root, 'dist', 'db', 'schema.sql'));

const migrations = join(root, 'src', 'db', 'migrations');
if (existsSync(migrations)) {
  cpSync(migrations, join(root, 'dist', 'db', 'migrations'), { recursive: true });
}

console.log('[build] copied schema.sql + migrations into dist/db');

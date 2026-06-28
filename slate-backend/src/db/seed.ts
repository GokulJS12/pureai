import { getDb } from './client.js';
import { migrate } from './migrate.js';
import { makeId } from '../util/ids.js';
import { nowMs } from '../util/time.js';
import { hashPassword } from '../auth/password.js';
import { applySeedTemplate } from './seedTemplate.js';

const DEMO_EMAIL = 'maya@slate.local';
const DEMO_PASSWORD = 'slate';

/**
 * Creates (or resets) the demo account maya@slate.local / slate with the full
 * Maya dataset. Idempotent: re-running wipes the demo user's content and
 * re-applies the template, leaving other users untouched.
 */
async function seed(): Promise<void> {
  migrate();
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO_EMAIL) as any;

  if (existing) {
    // Cascade deletes wipe all of the demo user's content rows.
    db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);
    console.log('[seed] removed existing demo account, recreating');
  }

  const userId = makeId('usr');
  const hash = await hashPassword(DEMO_PASSWORD);
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?,?,?,?)').run(
      userId,
      DEMO_EMAIL,
      hash,
      nowMs(),
    );
    applySeedTemplate(db, userId);
  });
  tx();

  console.log(`[seed] demo account ready → ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

seed().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});

import { getDb } from '../../db/client.js';
import { makeId } from '../../util/ids.js';
import { nowMs } from '../../util/time.js';

export interface JournalEntry {
  id: string;
  period: string;
  mood: string;
  body: string;
  created: number;
}

function rowTo(r: any): JournalEntry {
  return { id: r.id, period: r.period, mood: r.mood, body: r.body, created: r.created };
}

export function listJournal(userId: string): JournalEntry[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created DESC')
    .all(userId)
    .map(rowTo);
}

export function createJournal(
  userId: string,
  data: { period: string; mood: string; body: string },
): JournalEntry {
  const db = getDb();
  const id = makeId('j');
  db.prepare(
    'INSERT INTO journal_entries (id, user_id, period, mood, body, created) VALUES (?,?,?,?,?,?)',
  ).run(id, userId, data.period, data.mood, data.body, nowMs());
  return db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as JournalEntry;
}

export function deleteJournal(userId: string, id: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM journal_entries WHERE user_id = ? AND id = ?').run(userId, id);
  return res.changes > 0;
}

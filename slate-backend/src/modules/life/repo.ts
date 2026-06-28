import { getDb } from '../../db/client.js';
import { makeId } from '../../util/ids.js';

export interface LifeBoard {
  question: string;
  pros: string[];
  cons: string[];
  note: string;
}
export type LifeMap = Record<string, LifeBoard>;

export const LIFE_CATEGORIES = [
  'career',
  'education',
  'business',
  'relationships',
  'marriage',
  'finance',
  'health',
  'learning',
  'purpose',
  'relocation',
] as const;

export function getLife(userId: string): LifeMap {
  const db = getDb();
  const boards = db.prepare('SELECT category, question, note FROM life_boards WHERE user_id = ?').all(userId) as any[];
  const items = db
    .prepare('SELECT category, side, label FROM life_items WHERE user_id = ? ORDER BY position ASC')
    .all(userId) as any[];

  const map: LifeMap = {};
  for (const b of boards) {
    map[b.category] = { question: b.question, note: b.note, pros: [], cons: [] };
  }
  for (const it of items) {
    const board = map[it.category];
    if (!board) continue;
    if (it.side === 'pro') board.pros.push(it.label);
    else board.cons.push(it.label);
  }
  return map;
}

export function getBoard(userId: string, category: string): LifeBoard | null {
  const map = getLife(userId);
  return map[category] ?? null;
}

/** Ensure a board row exists for this category before mutating it. */
function ensureBoard(userId: string, category: string): void {
  const db = getDb();
  const exists = db
    .prepare('SELECT 1 FROM life_boards WHERE user_id = ? AND category = ?')
    .get(userId, category);
  if (!exists) {
    db.prepare('INSERT INTO life_boards (id, user_id, category, question, note) VALUES (?,?,?,?,?)').run(
      makeId('lb'),
      userId,
      category,
      '',
      '',
    );
  }
}

export function updateBoard(
  userId: string,
  category: string,
  data: { question?: string; note?: string },
): LifeBoard {
  ensureBoard(userId, category);
  const db = getDb();
  const cur = db
    .prepare('SELECT question, note FROM life_boards WHERE user_id = ? AND category = ?')
    .get(userId, category) as any;
  db.prepare('UPDATE life_boards SET question = ?, note = ? WHERE user_id = ? AND category = ?').run(
    data.question ?? cur.question,
    data.note ?? cur.note,
    userId,
    category,
  );
  return getBoard(userId, category)!;
}

export function addItem(userId: string, category: string, side: 'pro' | 'con', label: string): LifeBoard {
  ensureBoard(userId, category);
  const db = getDb();
  const pos = (
    db
      .prepare(
        'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM life_items WHERE user_id = ? AND category = ? AND side = ?',
      )
      .get(userId, category, side) as any
  ).pos;
  db.prepare('INSERT INTO life_items (id, user_id, category, side, label, position) VALUES (?,?,?,?,?,?)').run(
    makeId('li'),
    userId,
    category,
    side,
    label,
    pos,
  );
  return getBoard(userId, category)!;
}

export function removeItem(userId: string, id: string): boolean {
  return getDb().prepare('DELETE FROM life_items WHERE user_id = ? AND id = ?').run(userId, id).changes > 0;
}

import { getDb } from '../../db/client.js';
import { makeId } from '../../util/ids.js';
import { nowMs } from '../../util/time.js';

export interface Note {
  id: string;
  title: string;
  body: string;
  tag: string;
  pinned: boolean;
  updated: number;
}

function rowToNote(r: any): Note {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    tag: r.tag,
    pinned: !!r.pinned,
    updated: r.updated,
  };
}

export function listNotes(userId: string): Note[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY pinned DESC, updated DESC')
    .all(userId);
  return rows.map(rowToNote);
}

export function getNote(userId: string, id: string): Note | null {
  const db = getDb();
  const r = db.prepare('SELECT * FROM notes WHERE user_id = ? AND id = ?').get(userId, id);
  return r ? rowToNote(r) : null;
}

export function createNote(
  userId: string,
  data: { title?: string; body?: string; tag?: string; pinned?: boolean },
): Note {
  const db = getDb();
  const id = makeId('n');
  const updated = nowMs();
  db.prepare(
    'INSERT INTO notes (id, user_id, title, body, tag, pinned, updated) VALUES (?,?,?,?,?,?,?)',
  ).run(
    id,
    userId,
    data.title ?? 'Untitled note',
    data.body ?? '',
    data.tag ?? 'Note',
    data.pinned ? 1 : 0,
    updated,
  );
  return getNote(userId, id)!;
}

export function updateNote(
  userId: string,
  id: string,
  data: { title?: string; body?: string; tag?: string; pinned?: boolean },
): Note | null {
  const existing = getNote(userId, id);
  if (!existing) return null;
  const db = getDb();
  db.prepare(
    'UPDATE notes SET title = ?, body = ?, tag = ?, pinned = ?, updated = ? WHERE user_id = ? AND id = ?',
  ).run(
    data.title ?? existing.title,
    data.body ?? existing.body,
    data.tag ?? existing.tag,
    data.pinned === undefined ? (existing.pinned ? 1 : 0) : data.pinned ? 1 : 0,
    nowMs(),
    userId,
    id,
  );
  return getNote(userId, id);
}

export function togglePin(userId: string, id: string): Note | null {
  const existing = getNote(userId, id);
  if (!existing) return null;
  return updateNote(userId, id, { pinned: !existing.pinned });
}

export function deleteNote(userId: string, id: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM notes WHERE user_id = ? AND id = ?').run(userId, id);
  return res.changes > 0;
}

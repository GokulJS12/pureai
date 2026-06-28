import { getDb } from '../../db/client.js';
import { makeId } from '../../util/ids.js';
import { nowMs } from '../../util/time.js';

export interface Goal {
  id: string;
  t: string;
  meta: string;
}
export interface Memory {
  id: string;
  t: string;
  when: string;
}
export interface Twin {
  name: string;
  about: string;
  interests: string[];
  goals: Goal[];
  learning: string;
  comm: string;
  memories: Memory[];
}

export function getTwin(userId: string): Twin {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM twin_profiles WHERE user_id = ?').get(userId) as any;
  const interests = db
    .prepare('SELECT label FROM twin_interests WHERE user_id = ? ORDER BY position ASC')
    .all(userId)
    .map((r: any) => r.label);
  const goals = db
    .prepare('SELECT id, t, meta FROM twin_goals WHERE user_id = ? ORDER BY position ASC')
    .all(userId) as Goal[];
  const memories = db
    .prepare('SELECT id, t, when_label as "when" FROM twin_memories WHERE user_id = ? ORDER BY created DESC')
    .all(userId) as Memory[];
  return {
    name: profile?.name ?? '',
    about: profile?.about ?? '',
    learning: profile?.learning ?? '',
    comm: profile?.comm ?? '',
    interests,
    goals,
    memories,
  };
}

/** Ensure a profile row exists (defensive for users created outside seed). */
function ensureProfile(userId: string): void {
  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM twin_profiles WHERE user_id = ?').get(userId);
  if (!exists) {
    db.prepare('INSERT INTO twin_profiles (user_id) VALUES (?)').run(userId);
  }
}

export function updateProfile(
  userId: string,
  data: { name?: string; about?: string; learning?: string; comm?: string },
): Twin {
  ensureProfile(userId);
  const db = getDb();
  const cur = db.prepare('SELECT * FROM twin_profiles WHERE user_id = ?').get(userId) as any;
  db.prepare('UPDATE twin_profiles SET name = ?, about = ?, learning = ?, comm = ? WHERE user_id = ?').run(
    data.name ?? cur.name,
    data.about ?? cur.about,
    data.learning ?? cur.learning,
    data.comm ?? cur.comm,
    userId,
  );
  return getTwin(userId);
}

function nextPosition(userId: string, table: string): number {
  const db = getDb();
  const r = db
    .prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM ${table} WHERE user_id = ?`)
    .get(userId) as any;
  return r.pos;
}

export function addInterest(userId: string, label: string): Twin {
  const db = getDb();
  db.prepare('INSERT INTO twin_interests (id, user_id, label, position) VALUES (?,?,?,?)').run(
    makeId('i'),
    userId,
    label,
    nextPosition(userId, 'twin_interests'),
  );
  return getTwin(userId);
}

export function removeInterest(userId: string, id: string): boolean {
  return getDb().prepare('DELETE FROM twin_interests WHERE user_id = ? AND id = ?').run(userId, id)
    .changes > 0;
}

export function addGoal(userId: string, t: string, meta: string): Goal {
  const db = getDb();
  const id = makeId('g');
  db.prepare('INSERT INTO twin_goals (id, user_id, t, meta, position) VALUES (?,?,?,?,?)').run(
    id,
    userId,
    t,
    meta,
    nextPosition(userId, 'twin_goals'),
  );
  return db.prepare('SELECT id, t, meta FROM twin_goals WHERE id = ?').get(id) as Goal;
}

export function updateGoal(userId: string, id: string, data: { t?: string; meta?: string }): Goal | null {
  const db = getDb();
  const cur = db.prepare('SELECT * FROM twin_goals WHERE user_id = ? AND id = ?').get(userId, id) as any;
  if (!cur) return null;
  db.prepare('UPDATE twin_goals SET t = ?, meta = ? WHERE user_id = ? AND id = ?').run(
    data.t ?? cur.t,
    data.meta ?? cur.meta,
    userId,
    id,
  );
  return db.prepare('SELECT id, t, meta FROM twin_goals WHERE id = ?').get(id) as Goal;
}

export function removeGoal(userId: string, id: string): boolean {
  return getDb().prepare('DELETE FROM twin_goals WHERE user_id = ? AND id = ?').run(userId, id).changes > 0;
}

export function listMemories(userId: string): Memory[] {
  return getDb()
    .prepare('SELECT id, t, when_label as "when" FROM twin_memories WHERE user_id = ? ORDER BY created DESC')
    .all(userId) as Memory[];
}

export function addMemory(userId: string, t: string, when: string): Memory {
  const db = getDb();
  const id = makeId('m');
  db.prepare('INSERT INTO twin_memories (id, user_id, t, when_label, created) VALUES (?,?,?,?,?)').run(
    id,
    userId,
    t,
    when,
    nowMs(),
  );
  return db.prepare('SELECT id, t, when_label as "when" FROM twin_memories WHERE id = ?').get(id) as Memory;
}

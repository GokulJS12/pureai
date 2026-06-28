import { getDb } from '../../db/client.js';
import { makeId } from '../../util/ids.js';
import { nowMs } from '../../util/time.js';

export type Priority = 'high' | 'med' | 'low';

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  due: string;
  done: boolean;
}

function rowTo(r: any): Task {
  return { id: r.id, title: r.title, priority: r.priority, due: r.due, done: !!r.done };
}

export function listTasks(userId: string): Task[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created DESC')
    .all(userId)
    .map(rowTo);
}

export function getTask(userId: string, id: string): Task | null {
  const db = getDb();
  const r = db.prepare('SELECT * FROM tasks WHERE user_id = ? AND id = ?').get(userId, id);
  return r ? rowTo(r) : null;
}

export function createTask(
  userId: string,
  data: { title: string; priority?: Priority; due?: string; done?: boolean },
): Task {
  const db = getDb();
  const id = makeId('t');
  db.prepare(
    'INSERT INTO tasks (id, user_id, title, priority, due, done, created) VALUES (?,?,?,?,?,?,?)',
  ).run(id, userId, data.title, data.priority ?? 'med', data.due ?? 'Today', data.done ? 1 : 0, nowMs());
  return getTask(userId, id)!;
}

export function updateTask(
  userId: string,
  id: string,
  data: { title?: string; priority?: Priority; due?: string; done?: boolean },
): Task | null {
  const existing = getTask(userId, id);
  if (!existing) return null;
  const db = getDb();
  db.prepare('UPDATE tasks SET title = ?, priority = ?, due = ?, done = ? WHERE user_id = ? AND id = ?').run(
    data.title ?? existing.title,
    data.priority ?? existing.priority,
    data.due === undefined ? existing.due : data.due,
    data.done === undefined ? (existing.done ? 1 : 0) : data.done ? 1 : 0,
    userId,
    id,
  );
  return getTask(userId, id);
}

export function deleteTask(userId: string, id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM tasks WHERE user_id = ? AND id = ?').run(userId, id).changes > 0;
}

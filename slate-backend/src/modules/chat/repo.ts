import { getDb } from '../../db/client.js';
import { makeId } from '../../util/ids.js';
import { nowMs } from '../../util/time.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'slate';
  text: string;
  created: number;
}

function rowTo(r: any): ChatMessage {
  return { id: r.id, role: r.role, text: r.text, created: r.created };
}

export function listChat(userId: string): ChatMessage[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created ASC')
    .all(userId)
    .map(rowTo);
}

export function addMessage(userId: string, role: 'user' | 'slate', text: string): ChatMessage {
  const db = getDb();
  const id = makeId(role === 'user' ? 'u' : 's');
  // +1 offset ensures the assistant message sorts strictly after the user one
  // even when both are created within the same millisecond.
  const created = role === 'slate' ? nowMs() + 1 : nowMs();
  db.prepare('INSERT INTO chat_messages (id, user_id, role, text, created) VALUES (?,?,?,?,?)').run(
    id,
    userId,
    role,
    text,
    created,
  );
  return db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id) as ChatMessage;
}

export function clearChat(userId: string): void {
  getDb().prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId);
}

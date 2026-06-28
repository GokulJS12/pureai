import { z } from 'zod';
import { getDb } from '../db/client.js';
import { makeId } from '../util/ids.js';
import { nowMs } from '../util/time.js';

/**
 * Bulk state replace, backing PUT /api/state. The front end mirrors its whole
 * `slate-state-v1` snapshot here (debounced) as the pragmatic Phase-1 sync.
 *
 * Chat is intentionally excluded — it's owned by the granular POST /api/chat so
 * replies are generated server-side. Client-minted ids are preserved (ids are
 * opaque TEXT), so the client and DB stay in agreement with no reconciliation.
 */

const StateSchema = z.object({
  notes: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().default(''),
        body: z.string().default(''),
        tag: z.string().default('Note'),
        pinned: z.boolean().default(false),
        updated: z.number().default(() => nowMs()),
      }),
    )
    .optional(),
  activeNoteId: z.string().nullable().optional(),
  journal: z
    .array(
      z.object({
        id: z.string().optional(),
        period: z.string().default('Free writing'),
        mood: z.string().default('calm'),
        body: z.string().default(''),
        created: z.number().default(() => nowMs()),
      }),
    )
    .optional(),
  tasks: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().default(''),
        priority: z.string().default('med'),
        due: z.string().default(''),
        done: z.boolean().default(false),
      }),
    )
    .optional(),
  twin: z
    .object({
      name: z.string().default(''),
      about: z.string().default(''),
      learning: z.string().default(''),
      comm: z.string().default(''),
      interests: z.array(z.string()).default([]),
      goals: z
        .array(z.object({ id: z.string().optional(), t: z.string(), meta: z.string().default('') }))
        .default([]),
      memories: z
        .array(z.object({ id: z.string().optional(), t: z.string(), when: z.string().default('') }))
        .default([]),
    })
    .optional(),
  life: z
    .record(
      z.object({
        question: z.string().default(''),
        pros: z.array(z.string()).default([]),
        cons: z.array(z.string()).default([]),
        note: z.string().default(''),
      }),
    )
    .optional(),
  lifeCat: z.string().optional(),
  screen: z.string().optional(),
  companionOpen: z.boolean().optional(),
  voiceOn: z.boolean().optional(),
  cameraOn: z.boolean().optional(),
  ambient: z.string().nullable().optional(),
  ambientVol: z.number().optional(),
  mood: z.string().nullable().optional(),
});

export type StatePayload = z.infer<typeof StateSchema>;

export function parseStatePayload(input: unknown): StatePayload {
  return StateSchema.parse(input);
}

export function replaceState(userId: string, payload: StatePayload): void {
  const db = getDb();

  const tx = db.transaction(() => {
    // ---- notes ----
    if (payload.notes) {
      db.prepare('DELETE FROM notes WHERE user_id = ?').run(userId);
      const stmt = db.prepare(
        'INSERT INTO notes (id, user_id, title, body, tag, pinned, updated) VALUES (?,?,?,?,?,?,?)',
      );
      for (const n of payload.notes) {
        stmt.run(n.id ?? makeId('n'), userId, n.title, n.body, n.tag, n.pinned ? 1 : 0, n.updated);
      }
    }

    // ---- journal ----
    if (payload.journal) {
      db.prepare('DELETE FROM journal_entries WHERE user_id = ?').run(userId);
      const stmt = db.prepare(
        'INSERT INTO journal_entries (id, user_id, period, mood, body, created) VALUES (?,?,?,?,?,?)',
      );
      for (const j of payload.journal) {
        stmt.run(j.id ?? makeId('j'), userId, j.period, j.mood, j.body, j.created);
      }
    }

    // ---- tasks ---- (no client `created`; derive a descending order)
    if (payload.tasks) {
      db.prepare('DELETE FROM tasks WHERE user_id = ?').run(userId);
      const stmt = db.prepare(
        'INSERT INTO tasks (id, user_id, title, priority, due, done, created) VALUES (?,?,?,?,?,?,?)',
      );
      const base = nowMs();
      payload.tasks.forEach((t, i) => {
        stmt.run(t.id ?? makeId('t'), userId, t.title, t.priority, t.due, t.done ? 1 : 0, base - i);
      });
    }

    // ---- twin ----
    if (payload.twin) {
      const tw = payload.twin;
      const exists = db.prepare('SELECT 1 FROM twin_profiles WHERE user_id = ?').get(userId);
      if (exists) {
        db.prepare('UPDATE twin_profiles SET name=?, about=?, learning=?, comm=? WHERE user_id=?').run(
          tw.name,
          tw.about,
          tw.learning,
          tw.comm,
          userId,
        );
      } else {
        db.prepare('INSERT INTO twin_profiles (user_id, name, about, learning, comm) VALUES (?,?,?,?,?)').run(
          userId,
          tw.name,
          tw.about,
          tw.learning,
          tw.comm,
        );
      }

      db.prepare('DELETE FROM twin_interests WHERE user_id = ?').run(userId);
      const iStmt = db.prepare('INSERT INTO twin_interests (id, user_id, label, position) VALUES (?,?,?,?)');
      tw.interests.forEach((label, i) => iStmt.run(makeId('i'), userId, label, i));

      db.prepare('DELETE FROM twin_goals WHERE user_id = ?').run(userId);
      const gStmt = db.prepare('INSERT INTO twin_goals (id, user_id, t, meta, position) VALUES (?,?,?,?,?)');
      tw.goals.forEach((g, i) => gStmt.run(g.id ?? makeId('g'), userId, g.t, g.meta, i));

      db.prepare('DELETE FROM twin_memories WHERE user_id = ?').run(userId);
      const mStmt = db.prepare(
        'INSERT INTO twin_memories (id, user_id, t, when_label, created) VALUES (?,?,?,?,?)',
      );
      const base = nowMs();
      tw.memories.forEach((m, i) => mStmt.run(m.id ?? makeId('m'), userId, m.t, m.when, base - i));
    }

    // ---- life ----
    if (payload.life) {
      db.prepare('DELETE FROM life_boards WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM life_items WHERE user_id = ?').run(userId);
      const bStmt = db.prepare(
        'INSERT INTO life_boards (id, user_id, category, question, note) VALUES (?,?,?,?,?)',
      );
      const itStmt = db.prepare(
        'INSERT INTO life_items (id, user_id, category, side, label, position) VALUES (?,?,?,?,?,?)',
      );
      for (const [category, board] of Object.entries(payload.life)) {
        bStmt.run(makeId('lb'), userId, category, board.question, board.note);
        board.pros.forEach((label, i) => itStmt.run(makeId('li'), userId, category, 'pro', label, i));
        board.cons.forEach((label, i) => itStmt.run(makeId('li'), userId, category, 'con', label, i));
      }
    }

    // ---- settings (only fields present in the payload) ----
    const settingsKeys = [
      'screen',
      'companionOpen',
      'voiceOn',
      'cameraOn',
      'ambient',
      'ambientVol',
      'mood',
      'activeNoteId',
      'lifeCat',
    ] as const;
    const hasSettings = settingsKeys.some((k) => (payload as any)[k] !== undefined);
    if (hasSettings) {
      const exists = db.prepare('SELECT 1 FROM user_settings WHERE user_id = ?').get(userId);
      if (!exists) db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(userId);
      const cur = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
      db.prepare(
        `UPDATE user_settings SET
           screen=?, companion_open=?, voice_on=?, camera_on=?,
           ambient=?, ambient_vol=?, mood=?, active_note_id=?, life_cat=?
         WHERE user_id=?`,
      ).run(
        payload.screen ?? cur.screen,
        payload.companionOpen === undefined ? cur.companion_open : payload.companionOpen ? 1 : 0,
        payload.voiceOn === undefined ? cur.voice_on : payload.voiceOn ? 1 : 0,
        payload.cameraOn === undefined ? cur.camera_on : payload.cameraOn ? 1 : 0,
        payload.ambient === undefined ? cur.ambient : payload.ambient,
        payload.ambientVol ?? cur.ambient_vol,
        payload.mood === undefined ? cur.mood : payload.mood,
        payload.activeNoteId === undefined ? cur.active_note_id : payload.activeNoteId,
        payload.lifeCat ?? cur.life_cat,
        userId,
      );
    }
  });

  tx();
}

import { getDb } from '../db/client.js';
import { DAY_MS, nowMs, startOfDay } from '../util/time.js';
import { CALM } from './responses.js';

/**
 * Behaviour metrics, DERIVED from each user's real activity over the last 30
 * days — never hardcoded. Four gentle labels (Listening, Curiosity, Confidence,
 * Clarity), each a 0..100 value with a one-line note. If there isn't enough
 * activity yet, we return an empty "still getting to know you" state rather
 * than zeros.
 *
 * Formulas (kept simple and explainable):
 *  - Listening  = reflection cadence: distinct days journalled in last 30 / 12 target.
 *  - Curiosity  = exploration: (notes touched + chat messages sent in 30d) / 15 target.
 *  - Confidence = follow-through: completed tasks / total tasks.
 *  - Clarity    = expression: average journal entry length (words) / 80 target.
 * Each is clamped to [0, 100].
 */

export interface BehaviorCard {
  label: string;
  pct: string; // e.g. "72"
  width: string; // e.g. "72%"
  note: string;
}

export interface BehaviorResult {
  empty: boolean;
  message?: string;
  cards: BehaviorCard[];
}

// The "heavy"/calm-trigger regex, shared with the reply engine, used to gauge
// how much of recent chat carried difficult feeling.
const HEAVY = /(anx|stress|worried|scared|afraid|tired|overwhelm|sad|lonely|fail|lost|hard)/;

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function card(label: string, value: number, note: string): BehaviorCard {
  const pct = clampPct(value);
  return { label, pct: String(pct), width: `${pct}%`, note };
}

export function computeBehavior(userId: string): BehaviorResult {
  const db = getDb();
  const since = nowMs() - 30 * DAY_MS;

  const journalRows = db
    .prepare('SELECT body, created FROM journal_entries WHERE user_id = ? AND created >= ?')
    .all(userId, since) as { body: string; created: number }[];

  const notesTouched = (
    db
      .prepare('SELECT COUNT(*) AS c FROM notes WHERE user_id = ? AND updated >= ?')
      .get(userId, since) as any
  ).c as number;

  const chatRows = db
    .prepare("SELECT text FROM chat_messages WHERE user_id = ? AND role = 'user' AND created >= ?")
    .all(userId, since) as { text: string }[];

  const taskTotals = db
    .prepare('SELECT COUNT(*) AS total, SUM(done) AS done FROM tasks WHERE user_id = ?')
    .get(userId) as any;
  const totalTasks = (taskTotals.total as number) ?? 0;
  const doneTasks = (taskTotals.done as number) ?? 0;

  const hasData =
    journalRows.length > 0 || notesTouched > 0 || chatRows.length > 0 || totalTasks > 0;

  if (!hasData) {
    return {
      empty: true,
      message: "Still getting to know you. As you write, plan, and talk things through, a gentle mirror will appear here.",
      cards: [],
    };
  }

  // Listening — distinct days with a journal entry in the last 30.
  const journalDays = new Set(journalRows.map((r) => startOfDay(r.created))).size;
  const listening = (journalDays / 12) * 100;

  // Curiosity — notes touched + messages sent, against a soft 15-action target.
  const curiosity = ((notesTouched + chatRows.length) / 15) * 100;

  // Confidence — task completion rate.
  const confidence = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

  // Clarity — average journal entry length in words, against an 80-word target.
  const avgWords =
    journalRows.length > 0
      ? journalRows.reduce((sum, r) => sum + r.body.trim().split(/\s+/).filter(Boolean).length, 0) /
        journalRows.length
      : 0;
  const clarity = (avgWords / 80) * 100;

  // A small, honest signal for the Clarity note: how much recent chat was heavy.
  const heavyShare =
    chatRows.length > 0 ? chatRows.filter((r) => HEAVY.test(r.text.toLowerCase())).length / chatRows.length : 0;
  void CALM; // responses kept importable for Phase 2 note-generation.

  return {
    empty: false,
    cards: [
      card(
        'Listening',
        listening,
        journalDays > 0
          ? `You reflected on ${journalDays} day${journalDays === 1 ? '' : 's'} in the last month — letting thoughts land before reacting.`
          : 'A quiet month for reflection. Even a line or two helps.',
      ),
      card(
        'Curiosity',
        curiosity,
        `You touched ${notesTouched} note${notesTouched === 1 ? '' : 's'} and started ${chatRows.length} conversation${chatRows.length === 1 ? '' : 's'} — staying curious.`,
      ),
      card(
        'Confidence',
        confidence,
        totalTasks > 0
          ? `You've followed through on ${doneTasks} of ${totalTasks} intentions.`
          : 'No tasks yet — set a gentle intention when you’re ready.',
      ),
      card(
        'Clarity',
        clarity,
        heavyShare > 0.5
          ? 'A heavier stretch lately — your words are still finding their shape, and that’s okay.'
          : 'Your writing is getting simpler and kinder.',
      ),
    ],
  };
}

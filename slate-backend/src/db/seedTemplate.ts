import type Database from 'better-sqlite3';
import { makeId } from '../util/ids.js';
import { DAY_MS, nowMs } from '../util/time.js';

/**
 * The demo "Maya" dataset, ported verbatim from the front end's defaults()
 * in SLATE.dc.html. applySeedTemplate() clones it for a given user — used by
 * both signup (every new user starts here) and `npm run seed` (demo account).
 *
 * All rows are scoped to userId. Ids are generated server-side; timestamps are
 * relative to "now" so the seeded data always looks fresh.
 */
export function applySeedTemplate(db: Database.Database, userId: string): void {
  const day = nowMs();

  // ---- notes ----
  const notes = [
    {
      title: 'Morning pages',
      body: 'Slept well. The walk by the river helped settle my mind. Today I want to be more present in conversations — listen first, speak second, and not reach for my phone in the gaps.',
      tag: 'Reflection',
      pinned: 1,
      updated: day,
    },
    {
      title: 'Four Thousand Weeks',
      body: 'The core idea: a life is only about four thousand weeks long. The point is not to do everything faster, but to choose what truly matters and let the rest fall away without guilt.',
      tag: 'Reading',
      pinned: 0,
      updated: day - DAY_MS,
    },
    {
      title: 'The small garden',
      body: 'Tomatoes along the south wall. A low bench under the neem tree. Somewhere quiet to read in the early light.',
      tag: 'Home',
      pinned: 0,
      updated: day - 2 * DAY_MS,
    },
  ];
  const noteStmt = db.prepare(
    'INSERT INTO notes (id, user_id, title, body, tag, pinned, updated) VALUES (?,?,?,?,?,?,?)',
  );
  let firstNoteId = '';
  notes.forEach((n, i) => {
    const id = makeId('n');
    if (i === 0) firstNoteId = id;
    noteStmt.run(id, userId, n.title, n.body, n.tag, n.pinned, n.updated);
  });

  // ---- journal ----
  const journal = [
    {
      period: 'Morning',
      mood: 'calm',
      body: 'Woke before the alarm and made tea slowly. I notice I feel lighter on the mornings I don’t reach for my phone first. Holding on to that.',
      created: day - 3600000,
    },
    {
      period: 'Evening',
      mood: 'content',
      body: 'A full day, but a kind one. The meeting I was dreading went gently. I was honest about what I didn’t know, and it was received with warmth.',
      created: day - DAY_MS + 3600000,
    },
    {
      period: 'Free writing',
      mood: 'hopeful',
      body: 'I keep returning to the idea of research. It scares me, which probably means it matters.',
      created: day - 2 * DAY_MS,
    },
  ];
  const jStmt = db.prepare(
    'INSERT INTO journal_entries (id, user_id, period, mood, body, created) VALUES (?,?,?,?,?,?)',
  );
  journal.forEach((j) => jStmt.run(makeId('j'), userId, j.period, j.mood, j.body, j.created));

  // ---- tasks ----
  const tasks = [
    { title: 'Call Amma', priority: 'high', due: 'Today', done: 0 },
    { title: 'Finish reading chapter four', priority: 'med', due: 'Today', done: 0 },
    { title: 'Evening walk by the river', priority: 'low', due: 'Today', done: 0 },
    { title: 'Water the plants', priority: 'low', due: '', done: 1 },
    { title: 'Draft the research proposal', priority: 'med', due: 'Tomorrow', done: 0 },
    { title: 'Reply to Priya', priority: 'low', due: 'Tomorrow', done: 0 },
  ];
  const tStmt = db.prepare(
    'INSERT INTO tasks (id, user_id, title, priority, due, done, created) VALUES (?,?,?,?,?,?,?)',
  );
  // created descending so insertion order matches the front end's array order.
  tasks.forEach((t, i) =>
    tStmt.run(makeId('t'), userId, t.title, t.priority, t.due, t.done, day - i),
  );

  // ---- chat ----
  const chat = [
    {
      role: 'slate',
      text: 'Good morning, Maya. You went to bed a little earlier last night — how does today feel so far?',
    },
    { role: 'user', text: 'A little anxious about the proposal, honestly.' },
    {
      role: 'slate',
      text: 'That makes sense — it matters to you, and that’s exactly why it feels heavy. Would it help to talk it through, or would you rather we break it into a few smaller, calmer steps?',
    },
  ];
  const cStmt = db.prepare(
    'INSERT INTO chat_messages (id, user_id, role, text, created) VALUES (?,?,?,?,?)',
  );
  chat.forEach((c, i) => cStmt.run(makeId('c'), userId, c.role, c.text, day - 3600000 + i * 1000));

  // ---- twin ----
  db.prepare(
    'INSERT INTO twin_profiles (user_id, name, about, learning, comm) VALUES (?,?,?,?,?)',
  ).run(
    userId,
    'Maya',
    'I’m trying to live a little more slowly. I care deeply about my family, my work, and learning something new each week. I tend to overthink decisions, and I’m learning to trust myself a little more each day.',
    'Learns best through stories and real examples, in the early morning, in short and focused sessions.',
    'Thoughtful and warm. Listens more than she speaks. Working on being more direct without losing her kindness.',
  );

  const interests = ['Reading', 'Gardening', 'Long walks', 'Behavioural science', 'Tea', 'Malayalam poetry'];
  const iStmt = db.prepare(
    'INSERT INTO twin_interests (id, user_id, label, position) VALUES (?,?,?,?)',
  );
  interests.forEach((label, i) => iStmt.run(makeId('i'), userId, label, i));

  const goals = [
    { t: 'Read twenty-four books this year', meta: '9 of 24' },
    { t: 'Stay calm under pressure when I speak', meta: 'In progress' },
    { t: 'Save for a small, quiet home', meta: 'On track' },
  ];
  const gStmt = db.prepare(
    'INSERT INTO twin_goals (id, user_id, t, meta, position) VALUES (?,?,?,?,?)',
  );
  goals.forEach((g, i) => gStmt.run(makeId('g'), userId, g.t, g.meta, i));

  const memories = [
    { t: 'Prefers morning reflection over evening', when: 'Noticed this week' },
    { t: 'Feels noticeably calmer after walks by the river', when: 'Noticed often' },
    { t: 'Quietly considering a move into research', when: 'Shared in May' },
  ];
  const mStmt = db.prepare(
    'INSERT INTO twin_memories (id, user_id, t, when_label, created) VALUES (?,?,?,?,?)',
  );
  memories.forEach((m, i) =>
    mStmt.run(makeId('m'), userId, m.t, m.when, day - i * 1000),
  );

  // ---- life boards ----
  const life: Record<string, { question: string; pros: string[]; cons: string[]; note: string }> = {
    career: {
      question: 'Should I move from my current role into research?',
      pros: ['More aligned with my curiosity', 'Long-term growth and depth', 'Work alongside people I admire'],
      cons: ['A pay cut for the first year', 'Less day-to-day stability', 'A steep learning curve at first'],
      note: 'I keep coming back to this. The fear is mostly financial. Maybe a six-month runway is what would make it feel possible rather than reckless.',
    },
    education: { question: 'What do I most want to learn this year?', pros: [], cons: [], note: '' },
    business: { question: 'Is there a small idea worth starting?', pros: [], cons: [], note: '' },
    relationships: { question: 'How do I want to show up for the people I love?', pros: [], cons: [], note: '' },
    marriage: { question: 'What kind of partnership do I hope to build?', pros: [], cons: [], note: '' },
    finance: { question: 'What would real financial calm look like?', pros: [], cons: [], note: '' },
    health: { question: 'What is one habit my body would thank me for?', pros: [], cons: [], note: '' },
    learning: { question: 'How do I learn best, and how can I do more of it?', pros: [], cons: [], note: '' },
    purpose: { question: 'What do I want this season of life to be about?', pros: [], cons: [], note: '' },
    relocation: { question: 'Is it time to think about where I live?', pros: [], cons: [], note: '' },
  };
  const boardStmt = db.prepare(
    'INSERT INTO life_boards (id, user_id, category, question, note) VALUES (?,?,?,?,?)',
  );
  const itemStmt = db.prepare(
    'INSERT INTO life_items (id, user_id, category, side, label, position) VALUES (?,?,?,?,?,?)',
  );
  for (const [category, board] of Object.entries(life)) {
    boardStmt.run(makeId('lb'), userId, category, board.question, board.note);
    board.pros.forEach((label, i) => itemStmt.run(makeId('li'), userId, category, 'pro', label, i));
    board.cons.forEach((label, i) => itemStmt.run(makeId('li'), userId, category, 'con', label, i));
  }

  // ---- settings ----
  db.prepare(
    `INSERT INTO user_settings
       (user_id, screen, companion_open, voice_on, camera_on, ambient, ambient_vol, mood, active_note_id, life_cat)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).run(userId, 'home', 1, 0, 0, null, 0.4, null, firstNoteId, 'career');
}

-- SLATE schema (SQLite). All content tables carry user_id + indexes on (user_id, ...).
-- Booleans are stored as INTEGER 0/1. Timestamps are epoch milliseconds (INTEGER).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

-- DB-backed sessions: a signed cookie carries the session id; the row tracks expiry.
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS notes (
  id      TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title   TEXT NOT NULL DEFAULT '',
  body    TEXT NOT NULL DEFAULT '',
  tag     TEXT NOT NULL DEFAULT '',
  pinned  INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, updated DESC);

CREATE TABLE IF NOT EXISTS journal_entries (
  id      TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period  TEXT NOT NULL,
  mood    TEXT NOT NULL DEFAULT '',
  body    TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id, created DESC);

CREATE TABLE IF NOT EXISTS tasks (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title    TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'med',
  due      TEXT NOT NULL DEFAULT '',
  done     INTEGER NOT NULL DEFAULT 0,
  created  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, created DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id      TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role    TEXT NOT NULL,
  text    TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, created ASC);

CREATE TABLE IF NOT EXISTS twin_profiles (
  user_id  TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name     TEXT NOT NULL DEFAULT '',
  about    TEXT NOT NULL DEFAULT '',
  learning TEXT NOT NULL DEFAULT '',
  comm     TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS twin_interests (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_interests_user ON twin_interests(user_id, position);

CREATE TABLE IF NOT EXISTS twin_goals (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  t        TEXT NOT NULL,
  meta     TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_goals_user ON twin_goals(user_id, position);

CREATE TABLE IF NOT EXISTS twin_memories (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  t          TEXT NOT NULL,
  when_label TEXT NOT NULL DEFAULT '',
  created    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memories_user ON twin_memories(user_id, created DESC);

CREATE TABLE IF NOT EXISTS life_boards (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  question TEXT NOT NULL DEFAULT '',
  note     TEXT NOT NULL DEFAULT '',
  UNIQUE(user_id, category)
);
CREATE INDEX IF NOT EXISTS idx_life_boards_user ON life_boards(user_id);

CREATE TABLE IF NOT EXISTS life_items (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  side     TEXT NOT NULL,            -- 'pro' | 'con'
  label    TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_life_items_user ON life_items(user_id, category, side, position);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id        TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  screen         TEXT NOT NULL DEFAULT 'home',
  companion_open INTEGER NOT NULL DEFAULT 1,
  voice_on       INTEGER NOT NULL DEFAULT 0,
  camera_on      INTEGER NOT NULL DEFAULT 0,
  ambient        TEXT,
  ambient_vol    REAL NOT NULL DEFAULT 0.4,
  mood           TEXT,
  active_note_id TEXT,
  life_cat       TEXT NOT NULL DEFAULT 'career'
);

# SLATE — Backend (Phase 1)

A local, server-backed backend for **SLATE**, the calm "lifestyle operating
system." It takes over **persistence** and the **AI replies** from the existing
single-page front end, turning a `localStorage`-only app into a real
multi-session, server-backed product.

> **No external APIs are used.** The "AI" is a deterministic, rule-based engine
> in [`src/ai/engine.ts`](src/ai/engine.ts). No LLM, no cloud SDKs, no paid
> services. Everything runs offline on `localhost` against a SQLite file.

---

## Quick start

```bash
cd slate-backend
npm install
npm run migrate     # create / update the SQLite schema (idempotent)
npm run seed        # create the demo account  maya@slate.local / slate
npm run dev         # API on :8787  +  static front end on :5173
```

- `npm run dev:api` — API only (`:8787`).
- `npm run serve:frontend` — static front end only (`:5173`).
- `npm test` — run the vitest suite.
- `npm run build` — type-check & emit to `dist/`; `npm start` runs the build.

### Environment

| Variable         | Default                                 | Purpose                                  |
| ---------------- | --------------------------------------- | ---------------------------------------- |
| `PORT`           | `8787`                                  | API port                                 |
| `SESSION_SECRET` | `dev-only-insecure-secret-change-me`    | Signs the session cookie                 |
| `DB_PATH`        | `./data/slate.db`                       | SQLite file (`:memory:` for tests)       |
| `DEV_ORIGIN`     | `http://localhost:5173`                 | CORS origin allowed with credentials     |
| `FRONTEND_PORT`  | `5173`                                  | Static front-end server port             |

---

## Stack

- **Node 20+**, TypeScript, ESM.
- **Fastify** with `@fastify/cookie` (signed, httpOnly session cookie) and
  `@fastify/cors` (credentialed, dev origin).
- **SQLite** via `better-sqlite3` (synchronous, file-based) — no Docker, no DB
  server. Hand-written SQL + an idempotent migration runner.
- **zod** validates every request body.
- **argon2** password hashing.
- **vitest** + Fastify `inject` for tests.

### Auth model

Sessions are **DB-backed**: a signed, httpOnly cookie (`slate_session`) carries
a session id; the `sessions` row tracks expiry (30 days). Logout deletes the
row and clears the cookie.

---

## Project layout

```
slate-backend/
  src/
    server.ts                # bootstrap, plugins, error handler, route registration
    db/
      client.ts              # better-sqlite3 connection (WAL, FKs)
      schema.sql             # full schema
      migrate.ts             # idempotent schema + migrations/NNNN_*.sql runner
      seed.ts                # creates demo account maya@slate.local / slate
      seedTemplate.ts        # the Maya dataset; cloned on every signup
    auth/
      routes.ts middleware.ts password.ts
    modules/
      state.ts               # GET /api/state aggregator
      notes/ journal/ tasks/ chat/ twin/ life/ settings/ calendar/ behavior/ catalog/
        (each: routes.ts [+ repo.ts])
    ai/
      engine.ts              # ReplyEngine interface + RuleBasedEngine (NO API)
      responses.ts           # reply copy constants (ported from front end)
      behavior.ts            # derived behaviour metrics from real activity
    util/ errors.ts ids.ts time.ts
  scripts/serve-frontend.mjs # dependency-free static server for ./frontend
  frontend/                  # the SLATE front end + slate-api.js client
  data/                      # SQLite file lives here (gitignored)
  tests/
```

---

## Data model

Everything is scoped to the authenticated `user_id`. Timestamps are epoch ms;
booleans are stored `0/1`; ids are server-generated strings.

| Table              | Shape (front-end equivalent)                                                        |
| ------------------ | ----------------------------------------------------------------------------------- |
| `users`            | `id, email, password_hash, created_at`                                              |
| `sessions`         | `id, user_id, created_at, expires_at`                                               |
| `notes`            | `{ id, title, body, tag, pinned, updated }`                                          |
| `journal_entries`  | `{ id, period, mood, body, created }`                                                |
| `tasks`            | `{ id, title, priority, due, done }` (+`created`)                                    |
| `chat_messages`    | `{ id, role, text }` (+`created`)                                                    |
| `twin_profiles`    | `{ name, about, learning, comm }` (one per user)                                     |
| `twin_interests`   | `{ id, label, position }` → `interests: string[]`                                    |
| `twin_goals`       | `{ id, t, meta, position }`                                                          |
| `twin_memories`    | `{ id, t, when_label }` → `{ id, t, when }`                                          |
| `life_boards`      | per category `{ question, note }`, `UNIQUE(user_id, category)`                       |
| `life_items`       | `{ id, category, side('pro'|'con'), label, position }`                               |
| `user_settings`    | `screen, companion_open, voice_on, camera_on, ambient, ambient_vol, mood, active_note_id, life_cat` |

`GET /api/state` reassembles these into the exact `slate-state-v1` shape the
front end expects (notes, activeNoteId, journal, tasks, chat, twin, life,
lifeCat, screen, companionOpen, voiceOn, cameraOn, ambient, ambientVol, mood).

---

## REST API

All `/api` routes except `/api/auth/*` and `/api/health` require a session.
Every write returns the created/updated row (with its server-generated id).

**Auth**
| Method | Path               | Body                  |
| ------ | ------------------ | --------------------- |
| POST   | `/api/auth/signup` | `{ email, password }` → creates user, clones seed, starts session |
| POST   | `/api/auth/login`  | `{ email, password }` |
| POST   | `/api/auth/logout` | —                     |
| GET    | `/api/auth/me`     | → user or 401         |

**Bootstrap** — `GET /api/state`

**Notes** — `GET /api/notes` · `POST /api/notes` · `PATCH /api/notes/:id` · `DELETE /api/notes/:id` · `POST /api/notes/:id/pin`

**Journal** — `GET /api/journal` · `POST /api/journal` · `DELETE /api/journal/:id`

**Tasks** — `GET /api/tasks` · `POST /api/tasks` · `PATCH /api/tasks/:id` · `DELETE /api/tasks/:id`

**Chat** — `GET /api/chat` · `POST /api/chat {text}` · `DELETE /api/chat`

**Twin** — `GET /api/twin` · `PATCH /api/twin` · interests `POST /api/twin/interests` / `DELETE /api/twin/interests/:id` · goals `GET|POST /api/twin/goals` `PATCH|DELETE /api/twin/goals/:id` · memories `GET|POST /api/twin/memories`

**Life** — `GET /api/life` · `GET /api/life/:category` · `PATCH /api/life/:category` · `POST /api/life/:category/items {side,label}` · `DELETE /api/life/items/:id` · `PUT /api/life/selected {category}`

**Settings** — `GET /api/settings` · `PATCH /api/settings`

**Derived** — `GET /api/behavior` · `GET /api/calendar?month=YYYY-MM` · `GET /api/catalog`

---

## The AI engine — rule-based, NO API

[`src/ai/engine.ts`](src/ai/engine.ts) is a **verbatim port** of the front
end's `replyTo(text)`. It lowercases the input and matches, in order:

1. `/(anx|stress|worried|scared|afraid|tired|overwhelm|sad|lonely|fail|lost|hard)/` → **calm** set (+ one "ask" variant)
2. `/(should|decide|decision|choose|whether|move|change)/` → **decide** set
3. `/(plan|tomorrow|today|schedule|focus)/` → the gentle plan reply
4. `/(thank|thanks)/` → the gratitude reply
5. `/(summar|notes)/` → the "themes in your notes" reply
6. default → **ask** set

Copy strings live in [`src/ai/responses.ts`](src/ai/responses.ts).

`POST /api/chat` saves the user message, runs `generateReply`, saves the
assistant message, and returns **both** persisted rows. The ~1.6s "thinking"
pause is simulated **on the client** — the server responds immediately.

### Phase 2 swap (single seam)

The engine sits behind:

```ts
interface ReplyEngine { generateReply(text, ctx?): Promise<string> }
```

To drop in a real model later: implement `ReplyEngine`, then change the single
`export const engine` binding at the bottom of `engine.ts`. **No route changes.**
`generateReply` already receives a `ReplyContext` (recent notes/journal),
assembled in `chat/routes.ts` but ignored in Phase 1 for parity.

---

## Derived data (computed, not faked)

- **Behaviour** ([`src/ai/behavior.ts`](src/ai/behavior.ts)) — replaces the
  hardcoded `72/81/64/70` with values from the user's last 30 days:
  - **Listening** = distinct days journalled / 12 target
  - **Curiosity** = (notes touched + messages sent) / 15 target
  - **Confidence** = completed tasks / total tasks
  - **Clarity** = average journal entry length (words) / 80 target

  Each clamps to `[0,100]` with a gentle one-line note. Brand-new users (no
  journal, notes, chat, or tasks) get an `{ empty: true, message }`
  "still getting to know you" state instead of zeros.
- **Calendar** — `GET /api/calendar?month=YYYY-MM` builds the month grid
  server-side and marks days with real journal activity.
- **Catalog** — `GET /api/catalog` serves [`data/catalog.json`](data/catalog.json)
  (library, stories, practice modes, home events, quotes) so it's editable
  without code changes.

---

## Seed data

[`src/db/seedTemplate.ts`](src/db/seedTemplate.ts) holds the demo **Maya**
dataset, ported verbatim from the front end's `defaults()`:
3 notes (Morning pages pinned, Four Thousand Weeks, The small garden), 3 journal
entries, 6 tasks, the 3-message morning chat, the full Twin (6 interests, 3
goals, 3 memories), the `career` life board filled plus 9 seeded-question
boards, and the default settings.

- **Signup** clones this template for every new user.
- **`npm run seed`** creates/refreshes the demo account `maya@slate.local / slate`.

---

## Front-end integration

The front end (`frontend/SLATE.dc.html`) is a DC-runtime component that today
keeps all state in `localStorage` under `slate-state-v1` and generates replies
with an in-component `replyTo()`. The integration is **minimal and reversible**:
all state shape stays the same; only the persistence and reply layers change.

> Note: the DC component runs inside the Pure AI design-tool host (which
> provides React and re-fetches the document), so it isn't a plain static page.
> `frontend/slate-api.js` is the drop-in client; the steps below are the exact,
> reviewable changes to make in `SLATE.dc.html`.

**1. Load the client.** In `<head>`, after `support.js`:
```html
<script>window.SLATE_API_BASE = 'http://localhost:8787';</script>
<script src="./slate-api.js"></script>
```

**2. Hydrate from the API (with offline fallback).** In `componentDidMount`,
before the boot timer:
```js
SlateAPI.me()
  .then(() => SlateAPI.state())
  .then((s) => this.setState(s, () => this.persist()))   // API is source of truth
  .catch((err) => { if (err.status === 401) this.setState({ showLogin: true }); });
// if the request fails entirely, the constructor's localStorage seed still runs
```

**3. Mirror writes to the API (keep localStorage as offline cache).** Replace
`persist()` so it still writes `localStorage` **and** debounce-syncs settings,
and route each action's write through `SlateAPI` (e.g. `newNote` →
`SlateAPI.createNote`, `toggleTask` → `SlateAPI.updateTask`, `addInterest` →
`SlateAPI.addInterest`, life edits → `SlateAPI.addLifeItem` / `updateBoard`).
Each call returns the persisted row with its server id — swap it into state to
replace the client's optimistic copy.

**4. Chat through the API.** Replace the body of `sendChat`'s `setTimeout` so it
calls `SlateAPI.sendChat(text)` and appends `res.slate`; keep the 1.6s client
delay and typing indicator for the same feel.

**5. Login gate.** When `showLogin` is set (step 2), render a small email +
password overlay in the existing calm style (paper `#F9F8F6`, ink `#1A1917`,
Satoshi/Inter) that calls `SlateAPI.login` / `SlateAPI.signup`, then re-runs the
hydrate from step 2.

**6. Leave untouched:** boot animation, ambient audio (Web Audio, client-side),
voice/camera toggles (UI state only), and the `sessionStorage` boot flag.

---

## Acceptance

- ✅ Fresh clone → `npm i && npm run migrate && npm run seed && npm run dev` — no external network calls.
- ✅ Sign up → seeded Maya dataset; persists across logout/login and restart (SQLite file).
- ✅ Notes/journal/tasks CRUD, task toggle, note pin — all served from DB.
- ✅ Chat: "anxious" → a calm-set reply; both messages persist.
- ✅ Twin edits, interest add/remove, life pros/cons → reflected in `GET /api/state`.
- ✅ `GET /api/behavior` derived from real data, with an empty state for new users.
- ✅ `vitest` passes; every route group has a happy-path + an auth-failure test.
- ✅ No `openai` / `anthropic` / third-party `fetch(` in `src/` (the AI is `src/ai/engine.ts`).

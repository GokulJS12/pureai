# SLATE — Backend (Phase 1)

A local, server-backed backend for **SLATE**, the calm "lifestyle operating
system." It takes over **persistence** and the **AI replies** from the existing
single-page front end, turning a `localStorage`-only app into a real
multi-session, server-backed product.

> **No external APIs are used.** The "AI" is a deterministic, rule-based engine
> in [`src/ai/engine.ts`](src/ai/engine.ts). No LLM, no cloud SDKs, no paid
> services. Everything runs offline on `localhost` against a SQLite file.

---

## Run as a desktop app (Electron)

**Slate** ships as an Electron desktop app that bundles the API and the MVP
front end into one window.

```bash
cd slate-backend
npm install         # downloads the Electron binary (needs network access)
npm run app         # builds the backend, launches the Slate desktop app
```

`npm run app` compiles the backend to `dist/`, then Electron (`electron/main.cjs`)
starts the API as a child process, waits for `/api/health`, and opens the SLATE
UI served same-origin from `http://127.0.0.1:8787`. The SQLite database lives in
the OS app-data directory (`app.getPath('userData')/slate.db`) so it persists
across restarts and updates. Sign up in-app, or use the demo `maya@slate.local /
slate` (run `npm run seed` once to create it).

> The front end renders with vendored React 18 (`frontend/vendor/`) and the DC
> runtime — no network needed at runtime. Verified to render in the same
> Chromium engine Electron uses (login → seeded dashboard → server-backed chat).

## Quick start (web / headless)

```bash
cd slate-backend
npm install
npm run migrate     # create / update the SQLite schema (idempotent)
npm run seed        # create the demo account  maya@slate.local / slate
npm run dev         # API on :8787 (also serves the UI) + static front end on :5173
```

Open `http://localhost:8787/SLATE.dc.html` for the same-origin app (recommended),
or `http://localhost:5173` for the standalone static server.

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
  electron/main.cjs          # Slate desktop app: spawns backend, opens the window
  scripts/
    serve-frontend.mjs       # dependency-free static server for ./frontend
    copy-assets.mjs          # copies schema.sql + migrations into dist on build
  frontend/                  # the SLATE front end, slate-api.js client, vendored React
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

**Bootstrap** — `GET /api/state` (hydrate) · `PUT /api/state` (bulk mirror; chat excluded)

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

## Front-end integration — applied

The front end (`frontend/SLATE.dc.html`) is a DC-runtime component that used to
keep all state in `localStorage` under `slate-state-v1` and generate replies
with an in-component `replyTo()`. It is now **wired to the backend**. The edits
are minimal and reversible — the state shape is unchanged; only the persistence
and reply layers were touched. `frontend/slate-api.js` is the fetch client
(`credentials:'include'`).

> The DC component runs inside the Pure AI design-tool host (which provides
> React and re-fetches the document), so it isn't a plain static page. The
> backend side of this integration is verified end-to-end (401 → signup →
> hydrate → mirrored writes persist → server reply → survives reload).

**Sync model.** The component mirrors its **whole** `slate-state-v1` snapshot
to `PUT /api/state` (debounced 700 ms) on every change, and `localStorage`
stays as an offline cache. On load, `GET /api/state` is the source of truth.
**Chat** is the one exception: it goes through `POST /api/chat` so the reply is
generated by the server-side rule engine (chat is excluded from the bulk PUT to
avoid double-writes).

Exact changes made in `SLATE.dc.html` (search for these to review the diff):

| Where | Change |
| ----- | ------ |
| `<head>` | Loads `slate-api.js` and sets `window.SLATE_API_BASE`. |
| `constructor` | Adds auth/sync state (`showLogin`, `authMode`, `authError`) and email/password refs. |
| `persist()` | Still writes `localStorage`, now also calls `syncToApi()`. |
| `syncToApi()` *(new)* | Debounced `SlateAPI.putState(snapshot)` (excludes `chat`); only runs once authenticated; offline-tolerant. |
| `componentDidMount` / `hydrateFromApi()` *(new)* | `me()` → `state()` → `setState`; 401 shows the login overlay; any other failure keeps the localStorage seed. |
| `sendChat()` | Routes through `SlateAPI.sendChat(text)`, swaps in the server's persisted user message and reply, keeps the 1.6 s "thinking" pause; falls back to the local rule engine offline. |
| `doAuth()` / `toggleAuthMode()` / `onAuthKey()` *(new)* | Login/signup handlers that re-hydrate on success. |
| Template | A calm login/signup overlay (`sc-if showLogin`) in the existing paper/ink style. |

**Left untouched:** boot animation, ambient audio (Web Audio, client-side),
voice/camera toggles (UI state only), and the `sessionStorage` boot flag.

To run against the API: `npm run dev` (API `:8787` + front end `:5173`), open
`http://localhost:5173`, and sign up — the app lands on the seeded Maya dataset.

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

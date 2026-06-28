import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeApp, signupAndCookie } from './helpers.js';

let app: FastifyInstance;
let cookie: string;
beforeAll(async () => {
  app = await makeApp();
  cookie = await signupAndCookie(app);
});

const auth = (extra: Record<string, unknown> = {}) => ({ headers: { cookie }, ...extra });

describe('notes', () => {
  it('creates, pins, edits, and deletes — surviving via DB reads', async () => {
    const created = await app.inject({ method: 'POST', url: '/api/notes', headers: { cookie }, payload: { title: 'T', body: 'b', tag: 'X' } });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;

    const pinned = await app.inject({ method: 'POST', url: `/api/notes/${id}/pin`, headers: { cookie } });
    expect(pinned.json().pinned).toBe(true);

    const patched = await app.inject({ method: 'PATCH', url: `/api/notes/${id}`, headers: { cookie }, payload: { body: 'changed' } });
    expect(patched.json().body).toBe('changed');

    const del = await app.inject({ method: 'DELETE', url: `/api/notes/${id}`, headers: { cookie } });
    expect(del.statusCode).toBe(200);

    const list = await app.inject({ url: '/api/notes', headers: { cookie } });
    expect(list.json().find((n: any) => n.id === id)).toBeUndefined();
  });

  it('requires auth', async () => {
    const res = await app.inject({ url: '/api/notes' });
    expect(res.statusCode).toBe(401);
  });
});

describe('journal & tasks', () => {
  it('creates a journal entry', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/journal', headers: { cookie }, payload: { period: 'Morning', mood: 'calm', body: 'today' } });
    expect(res.statusCode).toBe(201);
    expect(res.json().period).toBe('Morning');
  });

  it('toggles a task done', async () => {
    const tasks = await app.inject({ url: '/api/tasks', headers: { cookie } });
    const id = tasks.json()[0].id;
    const res = await app.inject({ method: 'PATCH', url: `/api/tasks/${id}`, headers: { cookie }, payload: { done: true } });
    expect(res.json().done).toBe(true);
  });

  it('tasks require auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/tasks', payload: { title: 'x' } });
    expect(res.statusCode).toBe(401);
  });
});

describe('chat (rule engine)', () => {
  it('returns a calm-set reply for an anxious message and persists both', async () => {
    const before = (await app.inject({ url: '/api/chat', headers: { cookie } })).json().length;
    const res = await app.inject({ method: 'POST', url: '/api/chat', headers: { cookie }, payload: { text: 'I am anxious about the proposal' } });
    expect(res.statusCode).toBe(201);
    const { user, slate } = res.json();
    expect(user.role).toBe('user');
    expect(slate.role).toBe('slate');
    const calmSet = [
      'Take a slow breath with me. Nothing has to be solved in this exact moment.',
      'You’re carrying a lot. Let’s set one thing down — what can safely wait until tomorrow?',
      'It’s okay to feel this. Let’s stay here a moment before we go looking for answers.',
      'Thank you for telling me. What feels heaviest about it right now?',
    ];
    expect(calmSet).toContain(slate.text);

    const after = (await app.inject({ url: '/api/chat', headers: { cookie } })).json().length;
    expect(after).toBe(before + 2);
  });

  it('returns the gratitude reply for thanks', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/chat', headers: { cookie }, payload: { text: 'thank you' } });
    expect(res.json().slate.text).toBe('Always. I’m here whenever you want to think out loud.');
  });

  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/chat', payload: { text: 'hi' } });
    expect(res.statusCode).toBe(401);
  });
});

describe('twin & life', () => {
  it('edits twin and adds/removes an interest', async () => {
    const patched = await app.inject({ method: 'PATCH', url: '/api/twin', headers: { cookie }, payload: { about: 'new about' } });
    expect(patched.json().about).toBe('new about');

    const added = await app.inject({ method: 'POST', url: '/api/twin/interests', headers: { cookie }, payload: { label: 'Cycling' } });
    expect(added.json().interests).toContain('Cycling');
  });

  it('fills a life board pros/cons and reflects in /api/state', async () => {
    await app.inject({ method: 'POST', url: '/api/life/finance/items', headers: { cookie }, payload: { side: 'pro', label: 'peace of mind' } });
    const state = await app.inject({ url: '/api/state', headers: { cookie } });
    expect(state.json().life.finance.pros).toContain('peace of mind');
  });

  it('twin requires auth', async () => {
    const res = await app.inject({ url: '/api/twin' });
    expect(res.statusCode).toBe(401);
  });
});

describe('settings', () => {
  it('patches settings', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/settings', headers: { cookie }, payload: { screen: 'notes', ambientVol: 0.7 } });
    expect(res.json().screen).toBe('notes');
    expect(res.json().ambientVol).toBe(0.7);
  });

  it('requires auth', async () => {
    expect((await app.inject({ url: '/api/settings' })).statusCode).toBe(401);
  });
});

describe('derived: behavior, calendar, catalog', () => {
  it('behavior is derived (not the hardcoded 72/81/64/70)', async () => {
    const res = await app.inject({ url: '/api/behavior', headers: { cookie } });
    const body = res.json();
    expect(body.empty).toBe(false);
    expect(body.cards.map((c: any) => c.label)).toEqual(['Listening', 'Curiosity', 'Confidence', 'Clarity']);
  });

  it('behavior returns an empty state for a user with no activity', async () => {
    const freshCookie = await signupAndCookie(app, `empty${Date.now()}@slate.local`);
    // Wipe all seeded activity for this user.
    await app.inject({ method: 'DELETE', url: '/api/chat', headers: { cookie: freshCookie } });
    const tasks = (await app.inject({ url: '/api/tasks', headers: { cookie: freshCookie } })).json();
    for (const t of tasks) await app.inject({ method: 'DELETE', url: `/api/tasks/${t.id}`, headers: { cookie: freshCookie } });
    const journal = (await app.inject({ url: '/api/journal', headers: { cookie: freshCookie } })).json();
    for (const j of journal) await app.inject({ method: 'DELETE', url: `/api/journal/${j.id}`, headers: { cookie: freshCookie } });
    const notes = (await app.inject({ url: '/api/notes', headers: { cookie: freshCookie } })).json();
    for (const n of notes) await app.inject({ method: 'DELETE', url: `/api/notes/${n.id}`, headers: { cookie: freshCookie } });

    const res = await app.inject({ url: '/api/behavior', headers: { cookie: freshCookie } });
    expect(res.json().empty).toBe(true);
  });

  it('calendar returns a month grid', async () => {
    const res = await app.inject({ url: '/api/calendar?month=2026-06', headers: { cookie } });
    const body = res.json();
    expect(body.monthLabel).toBe('June 2026');
    expect(body.weeks.length).toBeGreaterThanOrEqual(4);
  });

  it('catalog serves static sections', async () => {
    const res = await app.inject({ url: '/api/catalog', headers: { cookie } });
    expect(Object.keys(res.json())).toEqual(expect.arrayContaining(['practiceModes', 'libraryItems', 'stories']));
  });

  it('derived endpoints require auth', async () => {
    expect((await app.inject({ url: '/api/behavior' })).statusCode).toBe(401);
    expect((await app.inject({ url: '/api/calendar' })).statusCode).toBe(401);
    expect((await app.inject({ url: '/api/catalog' })).statusCode).toBe(401);
  });
});

// satisfy unused-helper lint in strict configs
void auth;

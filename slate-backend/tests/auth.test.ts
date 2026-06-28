import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeApp, signupAndCookie } from './helpers.js';

let app: FastifyInstance;
beforeAll(async () => {
  app = await makeApp();
});

describe('auth', () => {
  it('signs up, returns a session, and clones the seed template', async () => {
    const cookie = await signupAndCookie(app, `signup${Date.now()}@slate.local`);
    const me = await app.inject({ url: '/api/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);

    const state = await app.inject({ url: '/api/state', headers: { cookie } });
    const body = state.json();
    expect(body.notes).toHaveLength(3);
    expect(body.twin.name).toBe('Maya');
    expect(body.life.career.pros).toHaveLength(3);
  });

  it('rejects duplicate signup', async () => {
    const email = `dupe${Date.now()}@slate.local`;
    await signupAndCookie(app, email);
    const res = await app.inject({ method: 'POST', url: '/api/auth/signup', payload: { email, password: 'slate' } });
    expect(res.statusCode).toBe(409);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    const email = `login${Date.now()}@slate.local`;
    await signupAndCookie(app, email, 'rightpass');

    const ok = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password: 'rightpass' } });
    expect(ok.statusCode).toBe(200);

    const bad = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password: 'wrong' } });
    expect(bad.statusCode).toBe(401);
  });

  it('returns 401 from /api/auth/me without a session', async () => {
    const res = await app.inject({ url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});

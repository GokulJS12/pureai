import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/client.js';
import { makeId } from '../util/ids.js';
import { nowMs, DAY_MS } from '../util/time.js';
import { hashPassword, verifyPassword } from './password.js';
import { applySeedTemplate } from '../db/seedTemplate.js';
import { SESSION_COOKIE, getUserFromRequest } from './middleware.js';
import { conflict, unauthorized } from '../util/errors.js';

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

const SESSION_TTL = 30 * DAY_MS;

function startSession(reply: FastifyReply, userId: string): void {
  const db = getDb();
  const sessionId = makeId('sess');
  const created = nowMs();
  db.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?,?,?,?)').run(
    sessionId,
    userId,
    created,
    created + SESSION_TTL,
  );
  reply.setCookie(SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    signed: true,
    maxAge: SESSION_TTL / 1000,
  });
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Signup: create the user, clone the seed template, and start a session.
  app.post('/api/auth/signup', async (req, reply) => {
    const { email, password } = credsSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) throw conflict('An account with this email already exists');

    const userId = makeId('usr');
    const hash = await hashPassword(password);

    const tx = db.transaction(() => {
      db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?,?,?,?)').run(
        userId,
        email.toLowerCase(),
        hash,
        nowMs(),
      );
      applySeedTemplate(db, userId);
    });
    tx();

    startSession(reply, userId);
    reply.code(201);
    return { id: userId, email: email.toLowerCase() };
  });

  app.post('/api/auth/login', async (req, reply) => {
    const { email, password } = credsSchema.parse(req.body);
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as any;
    if (!user) throw unauthorized('Invalid email or password');
    const ok = await verifyPassword(user.password_hash, password);
    if (!ok) throw unauthorized('Invalid email or password');

    startSession(reply, user.id);
    return { id: user.id, email: user.email };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const raw = req.cookies?.[SESSION_COOKIE];
    if (raw) {
      const unsigned = req.unsignCookie(raw);
      if (unsigned.valid && unsigned.value) {
        getDb().prepare('DELETE FROM sessions WHERE id = ?').run(unsigned.value);
      }
    }
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', async (req) => {
    const user = getUserFromRequest(req);
    if (!user) throw unauthorized();
    return user;
  });
}

import type { FastifyRequest } from 'fastify';
import { getDb } from '../db/client.js';
import { unauthorized } from '../util/errors.js';

export const SESSION_COOKIE = 'slate_session';

export interface SessionUser {
  id: string;
  email: string;
}

/** Look up a user from the signed session cookie, or null if none/expired. */
export function getUserFromRequest(req: FastifyRequest): SessionUser | null {
  const raw = req.cookies?.[SESSION_COOKIE];
  if (!raw) return null;
  // Cookie is signed; @fastify/cookie unsigns on read in the route, but we
  // also accept the already-unsigned value here.
  const unsigned = req.unsignCookie ? req.unsignCookie(raw) : { valid: true, value: raw };
  if (!unsigned.valid || !unsigned.value) return null;
  const sessionId = unsigned.value;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.id as sid, s.expires_at as expires_at, u.id as uid, u.email as email
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(sessionId) as any;

  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return null;
  }
  return { id: row.uid, email: row.email };
}

/**
 * requireUser — Fastify preHandler. Attaches req.user or throws 401.
 * Routes read the user via (req as AuthedRequest).user.
 */
export async function requireUser(req: FastifyRequest): Promise<void> {
  const user = getUserFromRequest(req);
  if (!user) throw unauthorized();
  (req as AuthedRequest).user = user;
}

export interface AuthedRequest extends FastifyRequest {
  user: SessionUser;
}

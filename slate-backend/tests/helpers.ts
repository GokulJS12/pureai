import type { FastifyInstance } from 'fastify';

// Each test process gets its own isolated in-memory database.
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';

export async function makeApp(): Promise<FastifyInstance> {
  const { migrate } = await import('../src/db/migrate.js');
  const { buildServer } = await import('../src/server.js');
  migrate();
  const app = await buildServer();
  await app.ready();
  return app;
}

/** Sign up a fresh user and return the session cookie for subsequent calls. */
export async function signupAndCookie(
  app: FastifyInstance,
  email = `u${Date.now()}@slate.local`,
  password = 'slate',
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/signup',
    payload: { email, password },
  });
  if (res.statusCode !== 201) throw new Error(`signup failed: ${res.statusCode} ${res.body}`);
  const setCookie = res.headers['set-cookie'];
  const raw = Array.isArray(setCookie) ? setCookie[0] : (setCookie as string);
  return raw.split(';')[0]; // "slate_session=<signed>"
}

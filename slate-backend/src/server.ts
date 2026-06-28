import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import { HttpError } from './util/errors.js';
import { migrate } from './db/migrate.js';
import { authRoutes } from './auth/routes.js';
import { stateRoutes } from './modules/state.js';
import { notesRoutes } from './modules/notes/routes.js';
import { journalRoutes } from './modules/journal/routes.js';
import { tasksRoutes } from './modules/tasks/routes.js';
import { chatRoutes } from './modules/chat/routes.js';
import { twinRoutes } from './modules/twin/routes.js';
import { lifeRoutes } from './modules/life/routes.js';
import { settingsRoutes } from './modules/settings/routes.js';
import { calendarRoutes } from './modules/calendar/routes.js';
import { behaviorRoutes } from './modules/behavior/routes.js';
import { catalogRoutes } from './modules/catalog/routes.js';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me';
const DEV_ORIGIN = process.env.DEV_ORIGIN || 'http://localhost:5173';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = resolve(__dirname, '../frontend');

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  await app.register(cors, {
    origin: DEV_ORIGIN,
    credentials: true,
  });

  await app.register(cookie, { secret: SESSION_SECRET });

  // Serve the front end from the same origin as the API (so the Electron app
  // and browser get cookies with no CORS dance). /api/* routes take precedence.
  await app.register(fastifyStatic, { root: FRONTEND_DIR, prefix: '/' });

  // Global error handler → clean JSON.
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'Validation failed', details: err.issues });
    }
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({ error: err.message });
    }
    if ((err as any).statusCode && (err as any).statusCode < 500) {
      return reply.code((err as any).statusCode).send({ error: err.message });
    }
    app.log.error(err);
    return reply.code(500).send({ error: 'Internal server error' });
  });

  app.get('/api/health', async () => ({ ok: true }));

  await app.register(authRoutes);
  await app.register(stateRoutes);
  await app.register(notesRoutes);
  await app.register(journalRoutes);
  await app.register(tasksRoutes);
  await app.register(chatRoutes);
  await app.register(twinRoutes);
  await app.register(lifeRoutes);
  await app.register(settingsRoutes);
  await app.register(calendarRoutes);
  await app.register(behaviorRoutes);
  await app.register(catalogRoutes);

  return app;
}

// Start when run directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
  const port = Number(process.env.PORT || 8787);
  const app = await buildServer();
  app
    .listen({ port, host: '0.0.0.0' })
    .then(() => app.log.info(`SLATE backend listening on :${port}`))
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}

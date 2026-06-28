import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireUser } from '../../auth/middleware.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Static catalogue content (library, stories, practice modes, home events,
 * quotes), served from data/catalog.json so it's editable without code changes.
 * Read once at boot and cached.
 */
let cache: unknown = null;

function loadCatalog(): unknown {
  if (cache) return cache;
  const path = resolve(__dirname, '../../../data/catalog.json');
  cache = JSON.parse(readFileSync(path, 'utf8'));
  return cache;
}

export async function catalogRoutes(app: FastifyInstance): Promise<void> {
  // Catalogue is the same for everyone, but we still require a session so the
  // whole /api surface is consistently authenticated.
  app.addHook('preHandler', requireUser);

  app.get('/api/catalog', async () => loadCatalog());
}

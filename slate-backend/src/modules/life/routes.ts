import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser, type AuthedRequest } from '../../auth/middleware.js';
import { badRequest, notFound } from '../../util/errors.js';
import * as repo from './repo.js';
import { updateSettings } from '../settings/repo.js';

export async function lifeRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  app.get('/api/life', async (req) => {
    const { user } = req as AuthedRequest;
    return repo.getLife(user.id);
  });

  // PUT selected must be registered before /:category to avoid being shadowed.
  app.put('/api/life/selected', async (req) => {
    const { user } = req as AuthedRequest;
    const { category } = z.object({ category: z.string().min(1) }).parse(req.body);
    if (!(repo.LIFE_CATEGORIES as readonly string[]).includes(category)) {
      throw badRequest('Unknown life category');
    }
    const settings = updateSettings(user.id, { lifeCat: category });
    return { lifeCat: settings.lifeCat };
  });

  // DELETE an item by its id (not category-scoped in the URL, per spec).
  app.delete('/api/life/items/:id', async (req) => {
    const { user } = req as AuthedRequest;
    const { id } = req.params as { id: string };
    if (!repo.removeItem(user.id, id)) throw notFound('Item not found');
    return { ok: true };
  });

  app.get('/api/life/:category', async (req) => {
    const { user } = req as AuthedRequest;
    const { category } = req.params as { category: string };
    const board = repo.getBoard(user.id, category);
    if (!board) throw notFound('Board not found');
    return board;
  });

  app.patch('/api/life/:category', async (req) => {
    const { user } = req as AuthedRequest;
    const { category } = req.params as { category: string };
    const data = z.object({ question: z.string().optional(), note: z.string().optional() }).parse(req.body);
    return repo.updateBoard(user.id, category, data);
  });

  app.post('/api/life/:category/items', async (req, reply) => {
    const { user } = req as AuthedRequest;
    const { category } = req.params as { category: string };
    const { side, label } = z
      .object({ side: z.enum(['pro', 'con']), label: z.string().min(1) })
      .parse(req.body);
    reply.code(201);
    return repo.addItem(user.id, category, side, label);
  });
}

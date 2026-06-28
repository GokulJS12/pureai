import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser, type AuthedRequest } from '../../auth/middleware.js';
import { notFound } from '../../util/errors.js';
import * as repo from './repo.js';

const profileSchema = z.object({
  name: z.string().optional(),
  about: z.string().optional(),
  learning: z.string().optional(),
  comm: z.string().optional(),
});

export async function twinRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  app.get('/api/twin', async (req) => {
    const { user } = req as AuthedRequest;
    return repo.getTwin(user.id);
  });

  app.patch('/api/twin', async (req) => {
    const { user } = req as AuthedRequest;
    const data = profileSchema.parse(req.body);
    return repo.updateProfile(user.id, data);
  });

  // interests
  app.post('/api/twin/interests', async (req, reply) => {
    const { user } = req as AuthedRequest;
    const { label } = z.object({ label: z.string().min(1) }).parse(req.body);
    reply.code(201);
    return repo.addInterest(user.id, label);
  });

  app.delete('/api/twin/interests/:id', async (req) => {
    const { user } = req as AuthedRequest;
    const { id } = req.params as { id: string };
    if (!repo.removeInterest(user.id, id)) throw notFound('Interest not found');
    return repo.getTwin(user.id);
  });

  // goals
  app.get('/api/twin/goals', async (req) => {
    const { user } = req as AuthedRequest;
    return repo.getTwin(user.id).goals;
  });

  app.post('/api/twin/goals', async (req, reply) => {
    const { user } = req as AuthedRequest;
    const { t, meta } = z.object({ t: z.string().min(1), meta: z.string().default('') }).parse(req.body);
    reply.code(201);
    return repo.addGoal(user.id, t, meta);
  });

  app.patch('/api/twin/goals/:id', async (req) => {
    const { user } = req as AuthedRequest;
    const { id } = req.params as { id: string };
    const data = z.object({ t: z.string().optional(), meta: z.string().optional() }).parse(req.body);
    const goal = repo.updateGoal(user.id, id, data);
    if (!goal) throw notFound('Goal not found');
    return goal;
  });

  app.delete('/api/twin/goals/:id', async (req) => {
    const { user } = req as AuthedRequest;
    const { id } = req.params as { id: string };
    if (!repo.removeGoal(user.id, id)) throw notFound('Goal not found');
    return { ok: true };
  });

  // memories
  app.get('/api/twin/memories', async (req) => {
    const { user } = req as AuthedRequest;
    return repo.listMemories(user.id);
  });

  app.post('/api/twin/memories', async (req, reply) => {
    const { user } = req as AuthedRequest;
    const { t, when } = z
      .object({ t: z.string().min(1), when: z.string().default('Just now') })
      .parse(req.body);
    reply.code(201);
    return repo.addMemory(user.id, t, when);
  });
}

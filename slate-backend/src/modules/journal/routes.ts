import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser, type AuthedRequest } from '../../auth/middleware.js';
import { notFound } from '../../util/errors.js';
import * as repo from './repo.js';

const createSchema = z.object({
  period: z.enum(['Morning', 'Afternoon', 'Evening', 'Free writing']).default('Free writing'),
  mood: z.string().default('calm'),
  body: z.string().min(1),
});

export async function journalRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  app.get('/api/journal', async (req) => {
    const { user } = req as AuthedRequest;
    return repo.listJournal(user.id);
  });

  app.post('/api/journal', async (req, reply) => {
    const { user } = req as AuthedRequest;
    const data = createSchema.parse(req.body);
    reply.code(201);
    return repo.createJournal(user.id, data);
  });

  app.delete('/api/journal/:id', async (req) => {
    const { user } = req as AuthedRequest;
    const { id } = req.params as { id: string };
    if (!repo.deleteJournal(user.id, id)) throw notFound('Journal entry not found');
    return { ok: true };
  });
}

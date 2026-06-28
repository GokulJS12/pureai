import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser, type AuthedRequest } from '../../auth/middleware.js';
import { notFound } from '../../util/errors.js';
import * as repo from './repo.js';

const createSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  tag: z.string().optional(),
  pinned: z.boolean().optional(),
});

const updateSchema = createSchema;

export async function notesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  app.get('/api/notes', async (req) => {
    const { user } = req as AuthedRequest;
    return repo.listNotes(user.id);
  });

  app.post('/api/notes', async (req, reply) => {
    const { user } = req as AuthedRequest;
    const data = createSchema.parse(req.body);
    reply.code(201);
    return repo.createNote(user.id, data);
  });

  app.patch('/api/notes/:id', async (req) => {
    const { user } = req as AuthedRequest;
    const { id } = req.params as { id: string };
    const data = updateSchema.parse(req.body);
    const note = repo.updateNote(user.id, id, data);
    if (!note) throw notFound('Note not found');
    return note;
  });

  app.post('/api/notes/:id/pin', async (req) => {
    const { user } = req as AuthedRequest;
    const { id } = req.params as { id: string };
    const note = repo.togglePin(user.id, id);
    if (!note) throw notFound('Note not found');
    return note;
  });

  app.delete('/api/notes/:id', async (req) => {
    const { user } = req as AuthedRequest;
    const { id } = req.params as { id: string };
    const ok = repo.deleteNote(user.id, id);
    if (!ok) throw notFound('Note not found');
    return { ok: true };
  });
}

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser, type AuthedRequest } from '../../auth/middleware.js';
import { notFound } from '../../util/errors.js';
import * as repo from './repo.js';

const priority = z.enum(['high', 'med', 'low']);

const createSchema = z.object({
  title: z.string().min(1),
  priority: priority.optional(),
  due: z.string().optional(),
  done: z.boolean().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  priority: priority.optional(),
  due: z.string().optional(),
  done: z.boolean().optional(),
});

export async function tasksRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  app.get('/api/tasks', async (req) => {
    const { user } = req as AuthedRequest;
    return repo.listTasks(user.id);
  });

  app.post('/api/tasks', async (req, reply) => {
    const { user } = req as AuthedRequest;
    const data = createSchema.parse(req.body);
    reply.code(201);
    return repo.createTask(user.id, data);
  });

  app.patch('/api/tasks/:id', async (req) => {
    const { user } = req as AuthedRequest;
    const { id } = req.params as { id: string };
    const data = updateSchema.parse(req.body);
    const task = repo.updateTask(user.id, id, data);
    if (!task) throw notFound('Task not found');
    return task;
  });

  app.delete('/api/tasks/:id', async (req) => {
    const { user } = req as AuthedRequest;
    const { id } = req.params as { id: string };
    if (!repo.deleteTask(user.id, id)) throw notFound('Task not found');
    return { ok: true };
  });
}

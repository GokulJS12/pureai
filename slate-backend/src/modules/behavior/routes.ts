import type { FastifyInstance } from 'fastify';
import { requireUser, type AuthedRequest } from '../../auth/middleware.js';
import { computeBehavior } from '../../ai/behavior.js';

export async function behaviorRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  app.get('/api/behavior', async (req) => {
    const { user } = req as AuthedRequest;
    return computeBehavior(user.id);
  });
}

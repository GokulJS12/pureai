import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser, type AuthedRequest } from '../../auth/middleware.js';
import * as repo from './repo.js';

const patchSchema = z.object({
  screen: z.string().optional(),
  companionOpen: z.boolean().optional(),
  voiceOn: z.boolean().optional(),
  cameraOn: z.boolean().optional(),
  ambient: z.string().nullable().optional(),
  ambientVol: z.number().min(0).max(1).optional(),
  mood: z.string().nullable().optional(),
  activeNoteId: z.string().nullable().optional(),
  lifeCat: z.string().optional(),
});

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  app.get('/api/settings', async (req) => {
    const { user } = req as AuthedRequest;
    return repo.getSettings(user.id);
  });

  app.patch('/api/settings', async (req) => {
    const { user } = req as AuthedRequest;
    const patch = patchSchema.parse(req.body);
    return repo.updateSettings(user.id, patch);
  });
}

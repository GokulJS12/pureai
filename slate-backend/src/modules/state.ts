import type { FastifyInstance } from 'fastify';
import { requireUser, type AuthedRequest } from '../auth/middleware.js';
import { listNotes } from './notes/repo.js';
import { listJournal } from './journal/repo.js';
import { listTasks } from './tasks/repo.js';
import { listChat } from './chat/repo.js';
import { getTwin } from './twin/repo.js';
import { getLife } from './life/repo.js';
import { getSettings } from './settings/repo.js';
import { parseStatePayload, replaceState } from './stateRepo.js';

/**
 * GET /api/state — the entire `slate-state-v1`-shaped object for the user, so
 * the front end can hydrate in one call, exactly replacing
 * JSON.parse(localStorage.getItem('slate-state-v1')).
 */
export async function stateRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  app.get('/api/state', async (req) => {
    const { user } = req as AuthedRequest;
    const settings = getSettings(user.id);
    return {
      // content
      notes: listNotes(user.id),
      activeNoteId: settings.activeNoteId,
      journal: listJournal(user.id),
      tasks: listTasks(user.id),
      chat: listChat(user.id),
      twin: getTwin(user.id),
      life: getLife(user.id),
      lifeCat: settings.lifeCat,
      // session UI / settings (mirrors the PERSIST whitelist)
      screen: settings.screen,
      companionOpen: settings.companionOpen,
      voiceOn: settings.voiceOn,
      cameraOn: settings.cameraOn,
      ambient: settings.ambient,
      ambientVol: settings.ambientVol,
      mood: settings.mood,
    };
  });

  // PUT /api/state — bulk replace the user's state from a client snapshot
  // (debounced mirror). Chat is excluded; it's owned by POST /api/chat.
  app.put('/api/state', async (req) => {
    const { user } = req as AuthedRequest;
    const payload = parseStatePayload(req.body);
    replaceState(user.id, payload);
    return { ok: true };
  });
}

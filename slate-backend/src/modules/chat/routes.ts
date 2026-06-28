import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser, type AuthedRequest } from '../../auth/middleware.js';
import { engine, type ReplyContext } from '../../ai/engine.js';
import { listNotes } from '../notes/repo.js';
import { listJournal } from '../journal/repo.js';
import * as repo from './repo.js';

const sendSchema = z.object({ text: z.string().min(1) });

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  app.get('/api/chat', async (req) => {
    const { user } = req as AuthedRequest;
    return repo.listChat(user.id);
  });

  // Saves the user message, runs the rule engine, saves the assistant message,
  // and returns BOTH persisted messages. The ~1.6s "thinking" pause lives on
  // the client; the server responds immediately.
  app.post('/api/chat', async (req, reply) => {
    const { user } = req as AuthedRequest;
    const { text } = sendSchema.parse(req.body);

    const userMessage = repo.addMessage(user.id, 'user', text);

    // Context is unused in Phase 1 (parity with the front end) but assembled
    // here so Phase 2 can lean on it without route changes.
    const ctx: ReplyContext = {
      recentNotes: listNotes(user.id).slice(0, 5).map((n) => ({ title: n.title, body: n.body })),
      recentJournal: listJournal(user.id)
        .slice(0, 5)
        .map((j) => ({ period: j.period, mood: j.mood, body: j.body })),
    };
    const replyText = await engine.generateReply(text, ctx);
    const slateMessage = repo.addMessage(user.id, 'slate', replyText);

    reply.code(201);
    return { user: userMessage, slate: slateMessage };
  });

  app.delete('/api/chat', async (req) => {
    const { user } = req as AuthedRequest;
    repo.clearChat(user.id);
    return { ok: true };
  });
}

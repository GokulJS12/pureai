import { ASK, CALM, DECIDE, PLAN_REPLY, GRATITUDE_REPLY, NOTES_REPLY } from './responses.js';

/**
 * Context passed to the engine. Phase 1 ignores it (parity with the front end),
 * but the field exists so Phase 2 can use recent notes/journal for smarter,
 * still-rule-based or model-backed replies with zero route changes.
 */
export interface ReplyContext {
  recentNotes?: { title: string; body: string }[];
  recentJournal?: { period: string; mood: string; body: string }[];
}

/** The single seam Phase 2 swaps a real model behind. */
export interface ReplyEngine {
  generateReply(text: string, ctx?: ReplyContext): Promise<string>;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * RuleBasedEngine — a faithful port of the front end's replyTo(text).
 * Keyword router, matched in this exact order, with randomised variants.
 * No external API, fully deterministic in behaviour.
 */
export class RuleBasedEngine implements ReplyEngine {
  async generateReply(text: string, _ctx?: ReplyContext): Promise<string> {
    const t = (text || '').toLowerCase();

    if (/(anx|stress|worried|scared|afraid|tired|overwhelm|sad|lonely|fail|lost|hard)/.test(t)) {
      // calm set + one "ask" variant, matching the front end exactly.
      return pick(CALM.concat([ASK[0]]));
    }
    if (/(should|decide|decision|choose|whether|move|change)/.test(t)) {
      return pick(DECIDE);
    }
    if (/(plan|tomorrow|today|schedule|focus)/.test(t)) {
      return PLAN_REPLY;
    }
    if (/(thank|thanks)/.test(t)) {
      return GRATITUDE_REPLY;
    }
    if (/(summar|notes)/.test(t)) {
      return NOTES_REPLY;
    }
    return pick(ASK);
  }
}

/** The engine the app uses today. Swap this binding in Phase 2. */
export const engine: ReplyEngine = new RuleBasedEngine();

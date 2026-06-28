import { nanoid } from 'nanoid';

/**
 * Server-side id generation. The front end historically minted ids like
 * `n1`, `t<timestamp>`, `g1`. We keep ids as opaque strings but generate
 * them here so the client stops creating its own. Prefixes keep them
 * human-scannable in the DB.
 */
export function makeId(prefix: string): string {
  return `${prefix}_${nanoid(12)}`;
}

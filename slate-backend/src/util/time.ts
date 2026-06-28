/** Current time in epoch milliseconds — the unit the front end uses everywhere. */
export function nowMs(): number {
  return Date.now();
}

/** Milliseconds in one day. */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the day (local) for a given ms timestamp. */
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

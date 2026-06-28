import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser, type AuthedRequest } from '../../auth/middleware.js';
import { getDb } from '../../db/client.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Cell {
  n: number | '';
  empty: boolean;
  today: boolean;
  event: boolean; // has journal activity that day
}

/**
 * Build the month grid server-side and mark days that have real journal
 * activity for the user. Tasks use human-readable due strings ('Today',
 * 'Tomorrow') rather than dates, so only journal rows are mapped to days.
 */
function buildCalendar(userId: string, year: number, month0: number) {
  const db = getDb();
  const monthStart = new Date(year, month0, 1).getTime();
  const monthEnd = new Date(year, month0 + 1, 1).getTime();

  const rows = db
    .prepare('SELECT created FROM journal_entries WHERE user_id = ? AND created >= ? AND created < ?')
    .all(userId, monthStart, monthEnd) as { created: number }[];
  const activeDays = new Set(rows.map((r) => new Date(r.created).getDate()));

  const firstDay = new Date(year, month0, 1).getDay();
  const dim = new Date(year, month0 + 1, 0).getDate();

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month0;
  const today = now.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(
      cells.slice(i, i + 7).map((n) => ({
        n: n ?? '',
        empty: n == null,
        today: isCurrentMonth && n === today,
        event: n != null && activeDays.has(n),
      })),
    );
  }

  const monthLabel = new Date(year, month0, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return { monthLabel, weekdays: WEEKDAYS, weeks, activeDays: [...activeDays] };
}

export async function calendarRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  app.get('/api/calendar', async (req) => {
    const { user } = req as AuthedRequest;
    const { month } = z
      .object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() })
      .parse(req.query);

    let year: number, month0: number;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      year = y;
      month0 = m - 1;
    } else {
      const now = new Date();
      year = now.getFullYear();
      month0 = now.getMonth();
    }
    return buildCalendar(user.id, year, month0);
  });
}

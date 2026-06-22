import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, paginated, parsePagination } from '@/lib/response';
import { ValidationError, NotFoundError } from '@/lib/errors';

/** Query parameter schema for the trips listing endpoint */
const tripsQuerySchema = z.object({
  cardId: z.string().min(1, 'cardId is required'),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  from: z.string().datetime({ message: 'from must be a valid ISO date' }).optional(),
  to: z.string().datetime({ message: 'to must be a valid ISO date' }).optional(),
});

/**
 * GET /api/trips?cardId=xxx&page=1&limit=20&from=...&to=...
 *
 * Returns a paginated list of trips for a given card.
 * Supports optional date-range filtering via `from` / `to` (ISO 8601).
 */
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(request.url);

    // ── Validate query parameters ──────────────────────────────────────
    const parsed = tripsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { cardId, from, to } = parsed.data;
    const { page, limit, skip } = parsePagination(searchParams);

    // ── Verify card exists ────────────────────────────────────────────
    const card = await db.card.findUnique({ where: { id: cardId }, select: { id: true } });
    if (!card) {
      throw new NotFoundError('Card');
    }

    // ── Build where clause with optional date filters ─────────────────
    const where: Record<string, unknown> = { cardId };

    if (from) {
      where.timestamp = { ...(where.timestamp as object ?? {}), gte: new Date(from) };
    }
    if (to) {
      where.timestamp = { ...(where.timestamp as object ?? {}), lte: new Date(to) };
    }

    // ── Fetch trips + total count in parallel ─────────────────────────
    const [trips, total] = await Promise.all([
      db.trip.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      db.trip.count({ where }),
    ]);

    // ── Return paginated response ────────────────────────────────────
    const items = trips.map((trip) => ({
      id: trip.id,
      cardId: trip.cardId,
      route: trip.route,
      routeId: trip.routeId,
      fromStop: trip.fromStop,
      toStop: trip.toStop,
      fare: trip.fare,
      ticketId: trip.ticketId,
      timestamp: trip.timestamp.toISOString(),
    }));

    return paginated(items, total, page, limit);
  });
}

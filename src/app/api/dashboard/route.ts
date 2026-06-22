import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, success } from '@/lib/response';
import { ValidationError, NotFoundError } from '@/lib/errors';

/** Query parameter schema for the dashboard endpoint */
const dashboardQuerySchema = z.object({
  cardId: z.string().min(1, 'cardId is required'),
});

/**
 * GET /api/dashboard?cardId=xxx
 *
 * Returns the card owner's dashboard data including:
 * - Card info (with user)
 * - Recent trips (last 5)
 * - Active tickets
 * - Total spending & trip count aggregates
 *
 * Automatically expires any weekly tickets whose expiresAt has passed
 * before returning dashboard data.
 */
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(request.url);

    // ── Validate query parameters ──────────────────────────────────────
    const parsed = dashboardQuerySchema.safeParse({
      cardId: searchParams.get('cardId') ?? '',
    });

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { cardId } = parsed.data;

    // ── Auto-expire weekly tickets whose expiresAt < now ──────────────
    await db.ticket.updateMany({
      where: {
        cardId,
        status: 'active',
        type: 'weekly',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    });

    // ── Fetch card (include user) ─────────────────────────────────────
    const card = await db.card.findUnique({
      where: { id: cardId },
      include: { user: true },
    });

    if (!card) {
      throw new NotFoundError('Card');
    }

    // ── Fetch dashboard data in parallel ──────────────────────────────
    const [recentTrips, activeTickets, tripAggregation] = await Promise.all([
      // Last 5 trips, most recent first
      db.trip.findMany({
        where: { cardId },
        orderBy: { timestamp: 'desc' },
        take: 5,
      }),
      // All currently active tickets
      db.ticket.findMany({
        where: { cardId, status: 'active' },
        orderBy: { createdAt: 'desc' },
      }),
      // Aggregate totals across all trips
      db.trip.aggregate({
        where: { cardId },
        _sum: { fare: true },
        _count: true,
      }),
    ]);

    // ── Build & return response ──────────────────────────────────────
    return success({
      card: {
        id: card.id,
        cardNumber: card.cardNumber,
        balance: card.balance,
        status: card.status,
        type: card.type,
        user: {
          id: card.user.id,
          fullName: card.user.fullName,
          email: card.user.email,
        },
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString(),
      },
      recentTrips: recentTrips.map((trip) => ({
        id: trip.id,
        route: trip.route,
        fromStop: trip.fromStop,
        toStop: trip.toStop,
        fare: trip.fare,
        timestamp: trip.timestamp.toISOString(),
      })),
      activeTickets: activeTickets.map((ticket) => ({
        id: ticket.id,
        type: ticket.type,
        tripsRemaining: ticket.tripsRemaining,
        price: ticket.price,
        status: ticket.status,
        expiresAt: ticket.expiresAt?.toISOString() ?? null,
        createdAt: ticket.createdAt.toISOString(),
      })),
      totalSpent: tripAggregation._sum.fare ?? 0,
      totalTrips: tripAggregation._count ?? 0,
    });
  });
}

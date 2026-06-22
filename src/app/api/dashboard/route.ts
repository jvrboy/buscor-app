import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const dashboardSchema = z.object({
  cardId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = dashboardSchema.safeParse({
      cardId: searchParams.get('cardId') ?? '',
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'cardId query parameter is required' },
        { status: 400 }
      );
    }

    const { cardId } = parsed.data;

    const card = await db.card.findUnique({
      where: { id: cardId },
      include: { user: true },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const [recentTrips, activeTickets, tripAggregation] = await Promise.all([
      db.trip.findMany({
        where: { cardId },
        orderBy: { timestamp: 'desc' },
        take: 5,
      }),
      db.ticket.findMany({
        where: {
          cardId,
          status: 'active',
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.trip.aggregate({
        where: { cardId },
        _sum: { fare: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      card: {
        id: card.id,
        cardNumber: card.cardNumber,
        balance: card.balance,
        status: card.status,
        type: card.type,
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
        createdAt: ticket.createdAt.toISOString(),
      })),
      totalSpent: tripAggregation._sum.fare ?? 0,
      totalTrips: tripAggregation._count ?? 0,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

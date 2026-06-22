import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const tripsSchema = z.object({
  cardId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = tripsSchema.safeParse({
      cardId: searchParams.get('cardId') ?? '',
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'cardId query parameter is required' },
        { status: 400 }
      );
    }

    const { cardId } = parsed.data;

    const trips = await db.trip.findMany({
      where: { cardId },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json(
      trips.map((trip) => ({
        id: trip.id,
        cardId: trip.cardId,
        route: trip.route,
        fromStop: trip.fromStop,
        toStop: trip.toStop,
        fare: trip.fare,
        ticketId: trip.ticketId,
        timestamp: trip.timestamp.toISOString(),
      }))
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

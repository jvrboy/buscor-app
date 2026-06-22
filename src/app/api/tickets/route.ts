import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const ticketsSchema = z.object({
  cardId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = ticketsSchema.safeParse({
      cardId: searchParams.get('cardId') ?? '',
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'cardId query parameter is required' },
        { status: 400 }
      );
    }

    const { cardId } = parsed.data;

    const tickets = await db.ticket.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      tickets.map((ticket) => ({
        id: ticket.id,
        type: ticket.type,
        tripsRemaining: ticket.tripsRemaining,
        price: ticket.price,
        status: ticket.status,
        cardId: ticket.cardId,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      }))
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

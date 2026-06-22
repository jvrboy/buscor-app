import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const buyTicketSchema = z.object({
  cardId: z.string().min(1),
  type: z.enum(['single', 'multi_ride', 'weekly']),
});

const TICKET_PRICES: Record<string, number> = {
  single: 12.0,
  multi_ride: 100.0,
  weekly: 200.0,
};

const TICKET_TRIPS: Record<string, number> = {
  single: 1,
  multi_ride: 10,
  weekly: 999, // "unlimited" — treated as a large number
};

const TICKET_LABELS: Record<string, string> = {
  single: 'Single Ride',
  multi_ride: 'Multi-Ride (10 trips)',
  weekly: 'Weekly Pass (7 days)',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = buyTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { cardId, type } = parsed.data;
    const price = TICKET_PRICES[type];
    const tripsCount = TICKET_TRIPS[type];

    const card = await db.card.findUnique({ where: { id: cardId } });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (card.status !== 'active') {
      return NextResponse.json(
        { error: 'Card is not active' },
        { status: 400 }
      );
    }

    if (card.balance < price) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          required: price,
          available: card.balance,
        },
        { status: 400 }
      );
    }

    const ticket = await db.$transaction(async (tx) => {
      const updatedCard = await tx.card.update({
        where: { id: cardId },
        data: { balance: { decrement: price } },
      });

      const newTicket = await tx.ticket.create({
        data: {
          type,
          tripsRemaining: tripsCount,
          price,
          status: 'active',
          cardId,
        },
      });

      await tx.transaction.create({
        data: {
          userId: updatedCard.userId,
          type: 'purchase',
          amount: -price,
          description: `Purchased ${TICKET_LABELS[type]} ticket`,
        },
      });

      return newTicket;
    });

    return NextResponse.json(
      {
        id: ticket.id,
        type: ticket.type,
        tripsRemaining: ticket.tripsRemaining,
        price: ticket.price,
        status: ticket.status,
        cardId: ticket.cardId,
        createdAt: ticket.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

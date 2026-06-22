import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateTapToken } from '@/lib/auth';
import { z } from 'zod';

const generateSchema = z.object({
  cardId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { cardId } = parsed.data;

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

    // Find an eligible ticket: active single ticket or active multi-ride with trips remaining
    const singleTicket = await db.ticket.findFirst({
      where: {
        cardId,
        type: 'single',
        status: 'active',
      },
      orderBy: { createdAt: 'asc' },
    });

    const multiRideTicket = await db.ticket.findFirst({
      where: {
        cardId,
        type: 'multi_ride',
        status: 'active',
        tripsRemaining: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' },
    });

    const ticket = singleTicket ?? multiRideTicket;

    if (!ticket) {
      return NextResponse.json(
        { error: 'No active ticket available. Please purchase a ticket first.' },
        { status: 400 }
      );
    }

    const token = generateTapToken();
    const expiresAt = new Date(Date.now() + 90 * 1000); // 90 seconds from now

    const tapToken = await db.$transaction(async (tx) => {
      const createdToken = await tx.tapToken.create({
        data: {
          token,
          cardId,
          expiresAt,
        },
      });

      if (ticket.type === 'single') {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { status: 'used' },
        });
      } else {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { tripsRemaining: { decrement: 1 } },
        });
        // If no trips remaining, mark as used
        const updated = await tx.ticket.findUnique({ where: { id: ticket.id } });
        if (updated && updated.tripsRemaining <= 0) {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: { status: 'used' },
          });
        }
      }

      return createdToken;
    });

    return NextResponse.json({
      token: tapToken.token,
      expiresAt: tapToken.expiresAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

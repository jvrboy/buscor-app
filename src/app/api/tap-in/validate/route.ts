import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const validateSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = validateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    const tapToken = await db.tapToken.findUnique({
      where: { token },
      include: { card: true },
    });

    if (!tapToken) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid tap token',
      });
    }

    if (tapToken.usedAt) {
      return NextResponse.json({
        valid: false,
        error: 'Token has already been used',
      });
    }

    if (tapToken.expiresAt < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'Token has expired',
      });
    }

    // Mark token as used and create a trip record
    const updatedToken = await db.$transaction(async (tx) => {
      const markedToken = await tx.tapToken.update({
        where: { id: tapToken.id },
        data: { usedAt: new Date() },
      });

      // Determine the fare based on the ticket type
      const activeTicket = await tx.ticket.findFirst({
        where: {
          cardId: tapToken.cardId,
          status: { in: ['active', 'used'] },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const fare = activeTicket?.type === 'multi_ride' ? 10.0 : 12.0;

      const trip = await tx.trip.create({
        data: {
          cardId: tapToken.cardId,
          fare,
          ticketId: activeTicket?.id ?? null,
        },
      });

      return { markedToken, trip };
    });

    return NextResponse.json({
      valid: true,
      trip: {
        id: updatedToken.trip.id,
        cardId: updatedToken.trip.cardId,
        route: updatedToken.trip.route,
        fromStop: updatedToken.trip.fromStop,
        toStop: updatedToken.trip.toStop,
        fare: updatedToken.trip.fare,
        timestamp: updatedToken.trip.timestamp.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

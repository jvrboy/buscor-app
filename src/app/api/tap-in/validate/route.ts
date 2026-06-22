import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, success } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { TICKET_CONFIG, type TicketType } from '@/lib/constants';

const validateSchema = z.object({
  token: z.string().min(1, 'token is required'),
});

/** Map ticket type to its fare price from TICKET_CONFIG */
function getFareForTicketType(type: string): number {
  const config = TICKET_CONFIG[type as TicketType];
  return config?.price ?? 12.0;
}

export function POST(request: NextRequest) {
  return apiHandler(async () => {
    const body = await request.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const { token } = parsed.data;

    // Look up the tap token with card info
    const tapToken = await db.tapToken.findUnique({
      where: { token },
      include: { card: true },
    });

    if (!tapToken) {
      throw new ValidationError('Invalid tap token');
    }

    if (tapToken.usedAt) {
      throw new ValidationError('Token has already been used');
    }

    if (tapToken.expiresAt < new Date()) {
      throw new ValidationError('Token has expired');
    }

    // Mark token as used and create trip record in a transaction
    const result = await db.$transaction(async (tx) => {
      // Mark token as used
      await tx.tapToken.update({
        where: { id: tapToken.id },
        data: { usedAt: new Date() },
      });

      // Find the most recently used/updated ticket for this card to determine fare
      const activeTicket = await tx.ticket.findFirst({
        where: {
          cardId: tapToken.cardId,
          status: { in: ['active', 'used'] },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const fare = activeTicket
        ? getFareForTicketType(activeTicket.type)
        : 12.0;

      const trip = await tx.trip.create({
        data: {
          cardId: tapToken.cardId,
          fare,
          ticketId: activeTicket?.id ?? null,
        },
      });

      return trip;
    });

    return success({ valid: true, trip: result });
  });
}
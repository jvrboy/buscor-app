import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { generateTapToken } from '@/lib/auth';
import { apiHandler, success } from '@/lib/response';
import {
  ValidationError,
  NotFoundError,
  CardBlockedError,
  CardExpiredError,
  NoTicketError,
} from '@/lib/errors';
import { SECURITY_CONFIG } from '@/lib/constants';

const generateSchema = z.object({
  cardId: z.string().min(1, 'cardId is required'),
});

export function POST(request: NextRequest) {
  return apiHandler(async () => {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const { cardId } = parsed.data;

    // Validate card
    const card = await db.card.findUnique({ where: { id: cardId } });

    if (!card) {
      throw new NotFoundError('Card');
    }

    if (card.status === 'blocked') {
      throw new CardBlockedError();
    }

    if (card.status === 'expired') {
      throw new CardExpiredError();
    }

    if (card.status !== 'active') {
      throw new ValidationError('Card is not active');
    }

    // Find an eligible ticket (priority: weekly > multi_ride > single)
    const now = new Date();

    // Weekly pass: active and not expired
    const weeklyTicket = await db.ticket.findFirst({
      where: {
        cardId,
        type: 'weekly',
        status: 'active',
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (weeklyTicket) {
      // Weekly pass — no trip deduction needed, just generate token
      const token = generateTapToken();
      const expiresAt = new Date(Date.now() + SECURITY_CONFIG.tapTokenExpirySeconds * 1000);

      const tapToken = await db.$transaction(async (tx) => {
        const created = await tx.tapToken.create({
          data: { token, cardId, expiresAt },
        });
        return created;
      });

      return success({
        token: tapToken.token,
        expiresAt: tapToken.expiresAt.toISOString(),
      });
    }

    // Single ride: active, not yet used
    const singleTicket = await db.ticket.findFirst({
      where: {
        cardId,
        type: 'single',
        status: 'active',
      },
      orderBy: { createdAt: 'asc' },
    });

    // Multi-ride: active with remaining trips
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
      throw new NoTicketError();
    }

    const token = generateTapToken();
    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.tapTokenExpirySeconds * 1000);

    const tapToken = await db.$transaction(async (tx) => {
      const created = await tx.tapToken.create({
        data: { token, cardId, expiresAt },
      });

      // Deduct trip from the ticket
      if (ticket.type === 'single') {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { status: 'used' },
        });
      } else if (ticket.type === 'multi_ride') {
        const updated = await tx.ticket.update({
          where: { id: ticket.id },
          data: { tripsRemaining: { decrement: 1 } },
        });
        // Mark as used if no trips remaining
        if (updated.tripsRemaining <= 0) {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: { status: 'used' },
          });
        }
      }

      return created;
    });

    return success({
      token: tapToken.token,
      expiresAt: tapToken.expiresAt.toISOString(),
    });
  });
}
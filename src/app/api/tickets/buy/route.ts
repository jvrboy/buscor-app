import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, success } from '@/lib/response';
import {
  ValidationError,
  NotFoundError,
  CardBlockedError,
  CardExpiredError,
  InsufficientBalanceError,
} from '@/lib/errors';
import { TICKET_CONFIG, type TicketType } from '@/lib/constants';

const buyTicketSchema = z.object({
  cardId: z.string().min(1, 'cardId is required'),
  type: z.enum(['single', 'multi_ride', 'weekly'], {
    errorMap: () => ({ message: 'Ticket type must be one of: single, multi_ride, weekly' }),
  }),
});

export function POST(request: NextRequest) {
  return apiHandler(async () => {
    const body = await request.json();
    const parsed = buyTicketSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const { cardId, type } = parsed.data;
    const ticketConfig = TICKET_CONFIG[type as TicketType];
    const { price, trips, label } = ticketConfig;

    // Check card exists and is active
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

    // Check balance
    if (card.balance < price) {
      throw new InsufficientBalanceError(price, card.balance);
    }

    // Execute purchase in a transaction
    const ticket = await db.$transaction(async (tx) => {
      // Deduct balance
      const updatedCard = await tx.card.update({
        where: { id: cardId },
        data: { balance: { decrement: price } },
      });

      // Build ticket data
      const ticketData: {
        type: string;
        tripsRemaining: number;
        price: number;
        status: string;
        cardId: string;
        expiresAt?: Date;
      } = {
        type,
        tripsRemaining: trips,
        price,
        status: 'active',
        cardId,
      };

      // For weekly tickets, set expiration
      if (type === 'weekly' && ticketConfig.durationDays) {
        ticketData.expiresAt = new Date(
          Date.now() + ticketConfig.durationDays * 24 * 60 * 60 * 1000,
        );
      }

      const newTicket = await tx.ticket.create({ data: ticketData });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: updatedCard.userId,
          type: 'purchase',
          amount: -price,
          description: `Purchased ${label} ticket`,
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          userId: updatedCard.userId,
          type: 'purchase',
          title: 'Ticket Purchased',
          message: `You purchased ${label} for R${price.toFixed(2)}`,
        },
      });

      return newTicket;
    });

    return success(ticket, 201);
  });
}
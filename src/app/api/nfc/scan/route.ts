import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, success } from '@/lib/response';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { audit } from '@/lib/logger';
import { TICKET_CONFIG, type TicketType } from '@/lib/constants';

const scanSchema = z.object({
  tagId: z.string().min(1),
  readerId: z.string().optional(),
  routeId: z.string().optional(),
  fromStop: z.string().optional(),
  toStop: z.string().optional(),
});

function getFareForTicketType(type: string): number {
  const config = TICKET_CONFIG[type as TicketType];
  return config?.price ?? 12.0;
}

export function POST(request: NextRequest) {
  return apiHandler(async () => {
    const body = await request.json();
    const parsed = scanSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const { tagId, readerId, routeId, fromStop, toStop } = parsed.data;

    // Look up the NFC tag
    const nfcTag = await db.nfcTag.findUnique({
      where: { tagId },
      include: { card: { include: { user: true } } },
    });

    if (!nfcTag) {
      throw new NotFoundError('NFC tag not linked to any account');
    }

    if (nfcTag.card.status !== 'active') {
      throw new ValidationError('Card is not active', undefined, 'CARD_INACTIVE');
    }

    // Find active ticket for fare calculation
    const activeTicket = await db.ticket.findFirst({
      where: {
        cardId: nfcTag.cardId,
        status: { in: ['active', 'used'] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const fare = activeTicket ? getFareForTicketType(activeTicket.type) : 12.0;

    // Create trip and update card in transaction
    const result = await db.$transaction(async (tx) => {
      // Deduct fare from card balance
      const updatedCard = await tx.card.update({
        where: { id: nfcTag.cardId },
        data: {
          balance: { decrement: fare },
        },
      });

      if (updatedCard.balance < 0) {
        throw new ValidationError('Insufficient balance', undefined, 'INSUFFICIENT_BALANCE');
      }

      // Create trip record
      const trip = await tx.trip.create({
        data: {
          cardId: nfcTag.cardId,
          route: routeId ?? 'NFC Tap',
          routeId,
          fromStop,
          toStop,
          fare,
          ticketId: activeTicket?.id ?? null,
        },
      });

      // If multi-ride ticket, decrement trips
      if (activeTicket && activeTicket.type === 'multi_ride' && activeTicket.tripsRemaining > 0) {
        const remaining = activeTicket.tripsRemaining - 1;
        await tx.ticket.update({
          where: { id: activeTicket.id },
          data: {
            tripsRemaining: remaining,
            status: remaining <= 0 ? 'used' : 'active',
          },
        });
      }

      // Update NFC tag scan stats
      await tx.nfcTag.update({
        where: { tagId },
        data: {
          lastScannedAt: new Date(),
          scanCount: { increment: 1 },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: nfcTag.userId,
          type: 'purchase',
          amount: fare,
          description: `NFC Tap: ${fromStop || 'Unknown'} → ${toStop || 'Unknown'}`,
        },
      });

      return { trip, balance: updatedCard.balance };
    });

    await audit(
      nfcTag.userId,
      'nfc.scan',
      'Trip',
      `NFC tap: fare R${fare.toFixed(2)}, balance R${result.balance.toFixed(2)}`,
      request
    );

    return success({
      valid: true,
      trip: result.trip,
      balance: result.balance,
      message: `Tap successful. Fare: R${fare.toFixed(2)}`,
    });
  });
}
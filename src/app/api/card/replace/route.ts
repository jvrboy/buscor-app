import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { generateCardNumber } from '@/lib/auth';
import { apiHandler, success } from '@/lib/response';
import { ValidationError, NotFoundError } from '@/lib/errors';

const replaceSchema = z.object({
  cardId: z.string().min(1, 'cardId is required'),
});

/** Generate a unique card number by retrying until one doesn't collide (outside transaction) */
async function generateUniqueCardNumber(): Promise<string> {
  const MAX_ATTEMPTS = 10;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateCardNumber();
    const existing = await db.card.findUnique({
      where: { cardNumber: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new Error('Failed to generate a unique card number after multiple attempts');
}

export function PUT(request: NextRequest) {
  return apiHandler(async () => {
    const body = await request.json();
    const parsed = replaceSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const { cardId } = parsed.data;

    // Fetch existing card with user info
    const existingCard = await db.card.findUnique({
      where: { id: cardId },
    });

    if (!existingCard) {
      throw new NotFoundError('Card');
    }

    // Generate unique card number before entering the transaction
    const newCardNumber = await generateUniqueCardNumber();

    const newCard = await db.$transaction(async (tx) => {
      // Mark old card as expired
      await tx.card.update({
        where: { id: cardId },
        data: { status: 'expired' },
      });

      // Invalidate all tap tokens on the old card
      await tx.tapToken.updateMany({
        where: {
          cardId,
          usedAt: null,
        },
        data: { expiresAt: new Date() },
      });

      // Create new card with transferred balance and same type
      const created = await tx.card.create({
        data: {
          cardNumber: newCardNumber,
          userId: existingCard.userId,
          balance: existingCard.balance,
          status: 'active',
          type: existingCard.type,
        },
      });

      // Create refund transaction record for the balance transfer
      await tx.transaction.create({
        data: {
          userId: existingCard.userId,
          type: 'refund',
          amount: existingCard.balance,
          description: `Card replaced. Balance transferred from ${existingCard.cardNumber} to ${newCardNumber}`,
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          userId: existingCard.userId,
          type: 'card_blocked',
          title: 'Card Replaced',
          message: `Your card has been replaced. New card number: ${newCardNumber}`,
        },
      });

      return created;
    });

    return success(newCard, 200);
  });
}
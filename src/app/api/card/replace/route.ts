import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateCardNumber } from '@/lib/auth';
import { z } from 'zod';

const replaceSchema = z.object({
  cardId: z.string().min(1),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = replaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { cardId } = parsed.data;

    const existingCard = await db.card.findUnique({ where: { id: cardId } });

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const newCard = await db.$transaction(async (tx) => {
      // Mark old card as expired
      await tx.card.update({
        where: { id: cardId },
        data: { status: 'expired' },
      });

      // Invalidate all active tap tokens on the old card
      await tx.tapToken.updateMany({
        where: {
          cardId,
          usedAt: null,
        },
        data: { expiresAt: new Date() },
      });

      // Generate new card number and create new card with transferred balance
      let newCardNumber = generateCardNumber();
      // Ensure uniqueness
      let existing = await tx.card.findUnique({
        where: { cardNumber: newCardNumber },
      });
      while (existing) {
        newCardNumber = generateCardNumber();
        existing = await tx.card.findUnique({
          where: { cardNumber: newCardNumber },
        });
      }

      const newCard = await tx.card.create({
        data: {
          cardNumber: newCardNumber,
          userId: existingCard.userId,
          balance: existingCard.balance,
          status: 'active',
          type: existingCard.type,
        },
      });

      // Create a transaction record for the replacement
      await tx.transaction.create({
        data: {
          userId: existingCard.userId,
          type: 'refund',
          amount: existingCard.balance,
          description: `Card replaced. Balance transferred from ${existingCard.cardNumber} to ${newCardNumber}`,
        },
      });

      return newCard;
    });

    return NextResponse.json({
      id: newCard.id,
      cardNumber: newCard.cardNumber,
      balance: newCard.balance,
      status: newCard.status,
      type: newCard.type,
      userId: newCard.userId,
      createdAt: newCard.createdAt.toISOString(),
      updatedAt: newCard.updatedAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

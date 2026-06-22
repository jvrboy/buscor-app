import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const topupSchema = z.object({
  userId: z.string().min(1),
  cardId: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = topupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, cardId, amount } = parsed.data;

    const card = await db.card.findUnique({ where: { id: cardId } });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (card.userId !== userId) {
      return NextResponse.json(
        { error: 'Card does not belong to this user' },
        { status: 403 }
      );
    }

    if (card.status !== 'active') {
      return NextResponse.json(
        { error: 'Cannot top up an inactive card' },
        { status: 400 }
      );
    }

    const updatedCard = await db.$transaction(async (tx) => {
      const updated = await tx.card.update({
        where: { id: cardId },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'top_up',
          amount,
          description: `Top up R${amount.toFixed(2)} to card ${card.cardNumber}`,
        },
      });

      return updated;
    });

    return NextResponse.json({
      id: updatedCard.id,
      cardNumber: updatedCard.cardNumber,
      balance: updatedCard.balance,
      status: updatedCard.status,
      type: updatedCard.type,
      userId: updatedCard.userId,
      createdAt: updatedCard.createdAt.toISOString(),
      updatedAt: updatedCard.updatedAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

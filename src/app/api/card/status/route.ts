import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateStatusSchema = z.object({
  cardId: z.string().min(1),
  status: z.enum(['active', 'blocked']),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { cardId, status } = parsed.data;

    const card = await db.card.findUnique({ where: { id: cardId } });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const updatedCard = await db.$transaction(async (tx) => {
      const updated = await tx.card.update({
        where: { id: cardId },
        data: { status },
      });

      // If blocking, invalidate all active tap tokens
      if (status === 'blocked') {
        await tx.tapToken.updateMany({
          where: {
            cardId,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { expiresAt: new Date() },
        });
      }

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

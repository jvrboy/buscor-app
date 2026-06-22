import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const cardSchema = z.object({
  cardId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = cardSchema.safeParse({
      cardId: searchParams.get('cardId') ?? '',
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'cardId query parameter is required' },
        { status: 400 }
      );
    }

    const { cardId } = parsed.data;

    const card = await db.card.findUnique({
      where: { id: cardId },
      include: { user: true },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: card.id,
      cardNumber: card.cardNumber,
      balance: card.balance,
      status: card.status,
      type: card.type,
      userId: card.userId,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
      user: {
        id: card.user.id,
        fullName: card.user.fullName,
        email: card.user.email,
        phone: card.user.phone,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

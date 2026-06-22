import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPin } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  cardNumber: z.string().min(1),
  pin: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { cardNumber, pin } = parsed.data;

    const card = await db.card.findUnique({
      where: { cardNumber },
      include: { user: true },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 401 });
    }

    if (hashPin(pin) !== card.user.pin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    if (card.status === 'blocked') {
      return NextResponse.json(
        { error: 'Card is blocked. Please contact support.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        id: card.user.id,
        fullName: card.user.fullName,
        email: card.user.email,
        phone: card.user.phone,
      },
      card: {
        id: card.id,
        cardNumber: card.cardNumber,
        balance: card.balance,
        status: card.status,
        type: card.type,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPin, generateCardNumber } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  pin: z.string().min(4, 'PIN must be at least 4 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fullName, email, phone, pin } = parsed.data;

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const user = await db.user.create({
      data: {
        fullName,
        email,
        phone: phone ?? null,
        pin: hashPin(pin),
      },
    });

    const cardNumber = generateCardNumber();
    const card = await db.card.create({
      data: {
        cardNumber,
        userId: user.id,
        balance: 0,
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
        },
        card: {
          id: card.id,
          cardNumber: card.cardNumber,
          balance: card.balance,
          status: card.status,
          type: card.type,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

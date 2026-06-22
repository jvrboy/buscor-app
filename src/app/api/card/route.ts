import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, success, parsePagination } from '@/lib/response';
import { ValidationError, NotFoundError } from '@/lib/errors';

const querySchema = z.object({
  cardId: z.string().min(1, 'cardId is required'),
});

export function GET(request: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(request.url);
    const raw = {
      cardId: searchParams.get('cardId') ?? '',
    };
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error.flatten());
    }

    const { cardId } = parsed.data;

    const card = await db.card.findUnique({
      where: { id: cardId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!card) {
      throw new NotFoundError('Card');
    }

    return success(card);
  });
}
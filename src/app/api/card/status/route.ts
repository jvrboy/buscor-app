import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, success } from '@/lib/response';
import { ValidationError, NotFoundError } from '@/lib/errors';

const updateStatusSchema = z.object({
  cardId: z.string().min(1, 'cardId is required'),
  status: z.enum(['active', 'blocked', 'expired'], {
    errorMap: () => ({ message: 'Status must be one of: active, blocked, expired' }),
  }),
});

export function PUT(request: NextRequest) {
  return apiHandler(async () => {
    const body = await request.json();
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const { cardId, status } = parsed.data;

    // Fetch card first with user info
    const card = await db.card.findUnique({
      where: { id: cardId },
      include: { user: { select: { id: true } } },
    });

    if (!card) {
      throw new NotFoundError('Card');
    }

    const updatedCard = await db.$transaction(async (tx) => {
      // Update card status
      const updated = await tx.card.update({
        where: { id: cardId },
        data: { status },
      });

      // When blocking: invalidate all active tap tokens
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

      // When unblocking: clear loginAttempts and lockedUntil on the user
      if (status === 'active') {
        await tx.user.update({
          where: { id: card.userId },
          data: {
            loginAttempts: 0,
            lockedUntil: null,
          },
        });
      }

      return updated;
    });

    return success(updatedCard);
  });
}
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, success } from '@/lib/response';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  CardBlockedError,
} from '@/lib/errors';
import { SECURITY_CONFIG } from '@/lib/constants';

/** Request body schema for the top-up endpoint */
const topupSchema = z
  .object({
    userId: z.string().min(1, 'userId is required'),
    cardId: z.string().min(1, 'cardId is required'),
    amount: z
      .number({ invalid_type_error: 'amount must be a number' })
      .positive('amount must be positive'),
  })
  .strict();

/**
 * POST /api/topup
 *
 * Adds funds to a user's card.
 *
 * Validation layers:
 *   1. Zod schema: userId/cardId non-empty strings, amount positive number
 *   2. Business rule: amount >= minTopUpAmount && <= maxTopUpAmount
 *   3. Ownership:   card must belong to the requesting user
 *   4. Card state:  card must be active (not blocked / expired)
 *
 * On success the response contains the updated card with the new balance.
 */
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    // ── Parse & validate body ─────────────────────────────────────────
    const body = await request.json();
    const parsed = topupSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0].message,
        parsed.error.flatten(),
      );
    }

    const { userId, cardId, amount } = parsed.data;

    // ── Business-level amount validation ──────────────────────────────
    if (amount < SECURITY_CONFIG.minTopUpAmount) {
      throw new ValidationError(
        `Minimum top-up amount is R${SECURITY_CONFIG.minTopUpAmount}`,
      );
    }
    if (amount > SECURITY_CONFIG.maxTopUpAmount) {
      throw new ValidationError(
        `Maximum top-up amount is R${SECURITY_CONFIG.maxTopUpAmount}`,
      );
    }

    // ── Look up card ──────────────────────────────────────────────────
    const card = await db.card.findUnique({ where: { id: cardId } });

    if (!card) {
      throw new NotFoundError('Card');
    }

    // ── Ownership check ──────────────────────────────────────────────
    if (card.userId !== userId) {
      throw new ForbiddenError('Card does not belong to this user');
    }

    // ── Card status check ────────────────────────────────────────────
    if (card.status === 'blocked') {
      throw new CardBlockedError();
    }
    if (card.status !== 'active') {
      throw new ValidationError('Cannot top up an inactive card');
    }

    // ── Perform top-up inside a transaction ────────────────────────────
    const updatedCard = await db.$transaction(async (tx) => {
      // Increment card balance
      const updated = await tx.card.update({
        where: { id: cardId },
        data: { balance: { increment: amount } },
      });

      // Record the transaction
      await tx.transaction.create({
        data: {
          userId,
          type: 'top_up',
          amount,
          description: `Top up R${amount.toFixed(2)} to card ${card.cardNumber}`,
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          userId,
          type: 'topup_success',
          title: 'Top Up Successful',
          message: `R${amount.toFixed(2)} added to your card`,
        },
      });

      return updated;
    });

    // ── Return updated card ──────────────────────────────────────────
    return success({
      id: updatedCard.id,
      cardNumber: updatedCard.cardNumber,
      balance: updatedCard.balance,
      status: updatedCard.status,
      type: updatedCard.type,
      userId: updatedCard.userId,
      createdAt: updatedCard.createdAt.toISOString(),
      updatedAt: updatedCard.updatedAt.toISOString(),
    });
  });
}

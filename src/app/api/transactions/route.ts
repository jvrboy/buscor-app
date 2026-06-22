import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, paginated, parsePagination } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { TRANSACTION_TYPES } from '@/lib/constants';

/** Valid transaction type values from constants */
const validTransactionTypes = TRANSACTION_TYPES as readonly string[];

/** Query parameter schema for the transactions listing endpoint */
const transactionsQuerySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  type: z.string().optional(),
});

/**
 * GET /api/transactions?userId=xxx&page=1&limit=20&type=top_up
 *
 * Returns a paginated list of transactions for a given user.
 * Supports optional filtering by transaction type (top_up, purchase, refund).
 */
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(request.url);

    // ── Validate query parameters ──────────────────────────────────────
    const parsed = transactionsQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { userId, type } = parsed.data;

    // ── Validate type filter if provided ──────────────────────────────
    if (type && !validTransactionTypes.includes(type)) {
      throw new ValidationError(
        `Invalid transaction type. Must be one of: ${validTransactionTypes.join(', ')}`,
      );
    }

    const { page, limit, skip } = parsePagination(searchParams);

    // ── Build where clause with optional type filter ───────────────────
    const where: Record<string, unknown> = { userId };
    if (type) {
      where.type = type;
    }

    // ── Fetch transactions + total count in parallel ─────────────────
    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.transaction.count({ where }),
    ]);

    // ── Return paginated response ────────────────────────────────────
    const items = transactions.map((tx) => ({
      id: tx.id,
      userId: tx.userId,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      createdAt: tx.createdAt.toISOString(),
    }));

    return paginated(items, total, page, limit);
  });
}

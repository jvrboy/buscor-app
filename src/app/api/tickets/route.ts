import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, paginated, parsePagination } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { API_DEFAULTS } from '@/lib/constants';

const querySchema = z.object({
  cardId: z.string().min(1, 'cardId is required'),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export function GET(request: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(request.url);
    const raw = {
      cardId: searchParams.get('cardId') ?? '',
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error.flatten());
    }

    const { cardId } = parsed.data;
    const { page, limit, skip } = parsePagination(searchParams, {
      page: 1,
      limit: API_DEFAULTS.paginationLimit,
      maxLimit: API_DEFAULTS.maxPaginationLimit,
    });

    const [tickets, total] = await Promise.all([
      db.ticket.findMany({
        where: { cardId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.ticket.count({
        where: { cardId },
      }),
    ]);

    return paginated(tickets, total, page, limit);
  });
}
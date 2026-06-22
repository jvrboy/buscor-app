import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, success, parsePagination, paginated } from '@/lib/response';
import { audit } from '@/lib/logger';

const querySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  page: z.coerce.number().min(1).optional(),
});

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(request.url);
    const params = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!params.success) {
      return success([]);
    }

    const filters = params.data;
    const { page, limit, skip } = parsePagination(searchParams);

    const where: Record<string, unknown> = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;

    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    await audit(filters.userId ?? null, 'audit.read', 'AuditLog', `page=${page}, limit=${limit}`, request);

    return paginated(items, total, page, limit);
  });
}
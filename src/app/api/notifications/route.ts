import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { success, apiHandler, paginated, parsePagination } from '@/lib/response';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { API_DEFAULTS } from '@/lib/constants';

// ---------------------------------------------------------------------------
// GET /api/notifications — paginated list with optional unread-only filter
// ---------------------------------------------------------------------------

const getQuerySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

const putSingleSchema = z.object({
  notificationId: z.string().min(1, 'notificationId is required'),
});

const putMarkAllSchema = z.object({
  markAllRead: z.literal(true),
  userId: z.string().min(1, 'userId is required'),
});

const putBodySchema = z.union([putSingleSchema, putMarkAllSchema]);

export function GET(request: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(request.url);

    const parsed = getQuerySchema.safeParse({
      userId: searchParams.get('userId') ?? '',
    });

    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error.flatten());
    }

    const { userId } = parsed.data;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const { page, limit, skip } = parsePagination(searchParams, {
      page: 1,
      limit: API_DEFAULTS.paginationLimit,
      maxLimit: API_DEFAULTS.maxPaginationLimit,
    });

    const where = {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.notification.count({ where }),
    ]);

    return paginated(notifications, total, page, limit);
  });
}

// ---------------------------------------------------------------------------
// PUT /api/notifications — mark single notification or all as read
// ---------------------------------------------------------------------------

export function PUT(request: NextRequest) {
  return apiHandler(async () => {
    const body = await request.json();

    const parsed = putBodySchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const data = parsed.data;

    // --- Mark single notification as read -----------------------------------
    if ('notificationId' in data) {
      const notification = await db.notification.findUnique({
        where: { id: data.notificationId },
      });

      if (!notification) {
        throw new NotFoundError('Notification');
      }

      const updated = await db.notification.update({
        where: { id: data.notificationId },
        data: { read: true },
      });

      return success(updated);
    }

    // --- Mark all notifications as read -------------------------------------
    const { count } = await db.notification.updateMany({
      where: {
        userId: data.userId,
        read: false,
      },
      data: { read: true },
    });

    return success({ count });
  });
}
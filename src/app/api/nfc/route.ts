import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, success } from '@/lib/response';

const querySchema = z.object({
  userId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return success([]);
    }

    const { userId } = parsed.data;

    const tags = await db.nfcTag.findMany({
      where: { userId },
      orderBy: { linkedAt: 'desc' },
    });

    return success(tags);
  });
}
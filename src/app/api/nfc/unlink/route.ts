import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, success } from '@/lib/response';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { audit } from '@/lib/logger';

const unlinkSchema = z.object({
  tagId: z.string().min(1),
  userId: z.string().min(1),
});

export function POST(request: NextRequest) {
  return apiHandler(async () => {
    const body = await request.json();
    const parsed = unlinkSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const { tagId, userId } = parsed.data;

    const tag = await db.nfcTag.findUnique({ where: { tagId } });
    if (!tag) {
      throw new NotFoundError('NFC tag not found');
    }

    if (tag.userId !== userId) {
      throw new ValidationError('This tag does not belong to your account');
    }

    await db.nfcTag.delete({ where: { tagId } });

    await audit(userId, 'nfc.unlink', 'NfcTag', `Unlinked tag ${tagId}`, request);

    return success({ unlinked: true });
  });
}
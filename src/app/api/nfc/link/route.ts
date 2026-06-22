import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, success } from '@/lib/response';
import { ValidationError, ConflictError } from '@/lib/errors';
import { sanitize } from '@/lib/sanitize';
import { audit } from '@/lib/logger';

const linkSchema = z.object({
  tagId: z.string().min(1).max(255),
  cardId: z.string().min(1),
  userId: z.string().min(1),
});

export function POST(request: NextRequest) {
  return apiHandler(async () => {
    const body = await request.json();
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const { tagId, cardId, userId } = parsed.data;
    const cleanTagId = sanitize(tagId);

    // Verify card belongs to user
    const card = await db.card.findFirst({
      where: { id: cardId, userId },
    });
    if (!card) {
      throw new ValidationError('Card not found or does not belong to this user');
    }

    // Check if tag is already linked
    const existing = await db.nfcTag.findUnique({ where: { tagId: cleanTagId } });
    if (existing) {
      if (existing.userId === userId) {
        throw new ConflictError('This NFC tag is already linked to your account');
      }
      throw new ConflictError('This NFC tag is already linked to another account');
    }

    // Create NFC tag link
    const nfcTag = await db.nfcTag.create({
      data: {
        tagId: cleanTagId,
        cardId,
        userId,
      },
    });

    await audit(userId, 'nfc.link', 'NfcTag', `Linked tag ${cleanTagId} to card ${cardId}`, request);

    return success(nfcTag, 201);
  });
}
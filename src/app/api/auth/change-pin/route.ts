import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPin } from '@/lib/auth';
import { success, apiHandler } from '@/lib/response';
import { sanitizePin } from '@/lib/sanitize';
import { SECURITY_CONFIG } from '@/lib/constants';
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
} from '@/lib/errors';

const changePinSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  currentPin: z
    .string()
    .length(
      SECURITY_CONFIG.pinLength,
      `Current PIN must be exactly ${SECURITY_CONFIG.pinLength} digits`,
    ),
  newPin: z
    .string()
    .length(
      SECURITY_CONFIG.pinLength,
      `New PIN must be exactly ${SECURITY_CONFIG.pinLength} digits`,
    ),
  confirmPin: z
    .string()
    .length(
      SECURITY_CONFIG.pinLength,
      `Confirm PIN must be exactly ${SECURITY_CONFIG.pinLength} digits`,
    ),
});

export function PUT(request: NextRequest) {
  return apiHandler(async () => {
    const body = await request.json();

    // --- Sanitize PINs before validation ------------------------------------
    const rawCurrentPin = String(body.currentPin ?? '');
    const rawNewPin = String(body.newPin ?? '');
    const rawConfirmPin = String(body.confirmPin ?? '');

    const sanitizedCurrentPin = sanitizePin(rawCurrentPin);
    const sanitizedNewPin = sanitizePin(rawNewPin);
    const sanitizedConfirmPin = sanitizePin(rawConfirmPin);

    // --- Validate with Zod --------------------------------------------------
    const parsed = changePinSchema.safeParse({
      userId: body.userId,
      currentPin: sanitizedCurrentPin,
      newPin: sanitizedNewPin,
      confirmPin: sanitizedConfirmPin,
    });

    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const { userId, currentPin, newPin, confirmPin } = parsed.data;

    // --- Business validations ------------------------------------------------
    if (newPin !== confirmPin) {
      throw new ValidationError('New PIN and confirmation PIN do not match');
    }

    if (newPin === currentPin) {
      throw new ValidationError('New PIN must be different from current PIN');
    }

    // --- Lookup user ---------------------------------------------------------
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // --- Verify current PIN --------------------------------------------------
    if (hashPin(currentPin) !== user.pin) {
      throw new UnauthorizedError('Current PIN is incorrect');
    }

    // --- Update PIN ----------------------------------------------------------
    const hashedNewPin = hashPin(newPin);

    await db.user.update({
      where: { id: userId },
      data: { pin: hashedNewPin },
    });

    // --- Create notification -------------------------------------------------
    try {
      await db.notification.create({
        data: {
          userId,
          type: 'card_blocked',
          title: 'PIN Changed',
          message: 'Your card PIN was changed successfully.',
          read: false,
        },
      });
    } catch {
      // Notification creation is non-critical – swallow errors silently
    }

    return success({ message: 'PIN changed successfully' });
  });
}
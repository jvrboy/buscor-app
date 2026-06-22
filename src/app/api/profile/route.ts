import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, success } from '@/lib/response';
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors';

/** Request body schema for the profile update endpoint */
const profileSchema = z
  .object({
    userId: z.string().min(1, 'userId is required'),
    fullName: z.string().min(1, 'fullName must not be empty').optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().nullable().optional(),
  })
  .strict();

/**
 * POST /api/profile
 *
 * Updates a user's profile fields.
 *
 * - Input sanitisation: trims fullName, lowercases email, strips
 *   non-digit characters from phone numbers.
 * - Email uniqueness: if the email is being changed, verifies no other
 *   user already owns it (excludes the current user).
 */
export async function PUT(request: NextRequest) {
  return apiHandler(async () => {
    // ── Parse & validate body ─────────────────────────────────────────
    const body = await request.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0].message,
        parsed.error.flatten(),
      );
    }

    const { userId, fullName, email, phone } = parsed.data;

    // ── Look up user ─────────────────────────────────────────────────
    const existingUser = await db.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // ── Sanitise inputs ──────────────────────────────────────────────
    const sanitizedFullName = fullName?.trim();
    const sanitizedEmail = email?.toLowerCase().trim();
    const sanitizedPhone = phone ? phone.replace(/\D/g, '') : null;

    // ── Email uniqueness check (exclude current user) ────────────────
    if (sanitizedEmail && sanitizedEmail !== existingUser.email) {
      const emailTaken = await db.user.findUnique({
        where: { email: sanitizedEmail },
      });
      if (emailTaken) {
        throw new ConflictError('A user with this email already exists');
      }
    }

    // ── Build update payload (only include provided fields) ──────────
    const updateData: Record<string, string | null> = {};
    if (sanitizedFullName !== undefined) updateData.fullName = sanitizedFullName;
    if (sanitizedEmail !== undefined) updateData.email = sanitizedEmail;
    if (phone !== undefined) updateData.phone = sanitizedPhone;

    // ── Persist changes ──────────────────────────────────────────────
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    // ── Return updated user ──────────────────────────────────────────
    return success({
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    });
  });
}

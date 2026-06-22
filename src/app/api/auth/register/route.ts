import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPin, generateCardNumber } from '@/lib/auth';
import { success, apiHandler, getClientIp } from '@/lib/response';
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizePin,
} from '@/lib/sanitize';
import { SECURITY_CONFIG } from '@/lib/constants';
import {
  handleApiError,
  ValidationError,
  ConflictError,
} from '@/lib/errors';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// Zod schema – validate AFTER sanitization
// ---------------------------------------------------------------------------
const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters'),
  email: z
    .string()
    .email('Invalid email address'),
  phone: z
    .string()
    .min(8, 'Phone number must be at least 8 characters')
    .max(15, 'Phone number must be at most 15 characters')
    .optional()
    .or(z.literal('')),
  pin: z
    .string()
    .length(SECURITY_CONFIG.pinLength, `PIN must be exactly ${SECURITY_CONFIG.pinLength} digits`),
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const clientIp = getClientIp(request);

    // --- Rate‑limit check ---------------------------------------------------
    const rateLimitResult = checkRateLimit(clientIp, 'register');
    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult, false);
      return NextResponse.json(
        {
          success: false,
          error: `Too many registration attempts. Try again in ${rateLimitResult.retryAfter} seconds.`,
          code: 'RATE_LIMITED',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': String(rateLimitResult.retryAfter),
          },
        },
      );
    }

    // --- Parse & sanitize body ---------------------------------------------
    const body = await request.json();

    const rawFullName = String(body.fullName ?? '');
    const rawEmail = String(body.email ?? '');
    const rawPhone = body.phone !== undefined && body.phone !== null ? String(body.phone) : '';
    const rawPin = String(body.pin ?? '');

    const sanitizedFullName = sanitizeString(rawFullName);
    const sanitizedEmail = sanitizeEmail(rawEmail);
    const sanitizedPhone = sanitizePhone(rawPhone);
    const sanitizedPin = sanitizePin(rawPin);

    // --- Validate with Zod --------------------------------------------------
    const parsed = registerSchema.safeParse({
      fullName: sanitizedFullName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      pin: sanitizedPin,
    });

    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const { fullName, email, pin } = parsed.data;
    // Empty string phone → store as null
    const phone = parsed.data.phone || null;

    // --- Check email uniqueness ---------------------------------------------
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    // --- Create user & card -------------------------------------------------
    const user = await db.user.create({
      data: {
        fullName,
        email,
        phone,
        pin: hashPin(pin),
        loginAttempts: 0,
      },
    });

    const cardNumber = generateCardNumber();
    const card = await db.card.create({
      data: {
        cardNumber,
        userId: user.id,
        balance: 0,
      },
    });

    // --- Welcome notification -----------------------------------------------
    try {
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'topup_success',
          title: 'Welcome to Buscor!',
          message: `Your card ${cardNumber} is ready. Top up to start riding!`,
          read: false,
        },
      });
    } catch {
      // Notification creation is non-critical – swallow errors silently
    }

    // --- Build response -----------------------------------------------------
    const responseData = {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      },
      card: {
        id: card.id,
        cardNumber: card.cardNumber,
        balance: card.balance,
        status: card.status,
        type: card.type,
      },
    };

    const rlHeaders = getRateLimitHeaders(rateLimitResult, true);

    return NextResponse.json(
      { success: true, data: responseData },
      {
        status: 201,
        headers: rlHeaders,
      },
    );
  });
}

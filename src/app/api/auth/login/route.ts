import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPin } from '@/lib/auth';
import { success, apiHandler, getClientIp } from '@/lib/response';
import { sanitizeCardNumber, sanitizePin } from '@/lib/sanitize';
import { SECURITY_CONFIG } from '@/lib/constants';
import {
  handleApiError,
  ValidationError,
  UnauthorizedError,
  CardBlockedError,
  AccountLockedError,
} from '@/lib/errors';
import { checkRateLimit, resetRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// Zod schema – validate AFTER sanitization
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  cardNumber: z
    .string()
    .length(SECURITY_CONFIG.cardNumberLength, `Card number must be exactly ${SECURITY_CONFIG.cardNumberLength} digits`),
  pin: z
    .string()
    .length(SECURITY_CONFIG.pinLength, `PIN must be exactly ${SECURITY_CONFIG.pinLength} digits`),
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const clientIp = getClientIp(request);

    // --- Rate‑limit check ---------------------------------------------------
    const rateLimitResult = checkRateLimit(clientIp, 'login');
    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult, false);
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Try again in ${rateLimitResult.retryAfter} seconds.`,
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

    const rawCardNumber = String(body.cardNumber ?? '');
    const rawPin = String(body.pin ?? '');

    const sanitizedCardNumber = sanitizeCardNumber(rawCardNumber);
    const sanitizedPin = sanitizePin(rawPin);

    // --- Validate with Zod --------------------------------------------------
    const parsed = loginSchema.safeParse({
      cardNumber: sanitizedCardNumber,
      pin: sanitizedPin,
    });

    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const { cardNumber, pin } = parsed.data;

    // --- Lookup card & user -------------------------------------------------
    const card = await db.card.findUnique({
      where: { cardNumber },
      include: { user: true },
    });

    if (!card) {
      throw new UnauthorizedError('Invalid card number or PIN');
    }

    const user = card.user;

    // --- Card blocked -------------------------------------------------------
    if (card.status === 'blocked') {
      throw new CardBlockedError();
    }

    // --- Account lockout check ---------------------------------------------
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMs = new Date(user.lockedUntil).getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60_000);
      throw new AccountLockedError(remainingMinutes);
    }

    // --- PIN verification ---------------------------------------------------
    if (hashPin(pin) !== user.pin) {
      // Increment failed attempts
      const updatedAttempts = (user.loginAttempts ?? 0) + 1;

      if (updatedAttempts >= SECURITY_CONFIG.maxLoginAttempts) {
        // Lock the account
        const lockedUntil = new Date(
          Date.now() + SECURITY_CONFIG.lockoutMinutes * 60 * 1000,
        );
        await db.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: updatedAttempts,
            lockedUntil,
          },
        });
        throw new AccountLockedError(SECURITY_CONFIG.lockoutMinutes);
      }

      // Just increment attempts, no lock yet
      await db.user.update({
        where: { id: user.id },
        data: { loginAttempts: updatedAttempts },
      });

      throw new UnauthorizedError('Invalid card number or PIN');
    }

    // --- Successful login ----------------------------------------------------
    const now = new Date();

    await db.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
      },
    });

    // Reset rate limit for this IP on successful login
    resetRateLimit(clientIp, 'login');

    // --- Low-balance notification -------------------------------------------
    if (card.balance < 50) {
      try {
        await db.notification.create({
          data: {
            userId: user.id,
            type: 'low_balance',
            title: 'Low Balance Alert',
            message: `Your card balance is R${card.balance.toFixed(2)}. Consider topping up.`,
            read: false,
          },
        });
      } catch {
        // Notification creation is non-critical – swallow errors silently
      }
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
        status: 200,
        headers: rlHeaders,
      },
    );
  });
}

/**
 * Custom application error classes for consistent error handling
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super(
      `Too many requests. Please try again in ${retryAfter} seconds.`,
      429,
      'RATE_LIMITED',
    );
    this.retryAfter = retryAfter;
  }
}

export class InsufficientBalanceError extends AppError {
  public readonly required: number;
  public readonly available: number;

  constructor(required: number, available: number) {
    super(
      `Insufficient balance. Required: R${required.toFixed(2)}, Available: R${available.toFixed(2)}`,
      400,
      'INSUFFICIENT_BALANCE',
      { required, available },
    );
    this.required = required;
    this.available = available;
  }
}

export class CardBlockedError extends AppError {
  constructor(message: string = 'Card is blocked. Please contact support.') {
    super(message, 403, 'CARD_BLOCKED');
  }
}

export class CardExpiredError extends AppError {
  constructor() {
    super('Card has expired. Please request a replacement.', 400, 'CARD_EXPIRED');
  }
}

export class NoTicketError extends AppError {
  constructor() {
    super(
      'No active ticket available. Please purchase a ticket first.',
      400,
      'NO_TICKET',
    );
  }
}

export class AccountLockedError extends AppError {
  public readonly lockoutUntil: Date;

  constructor(lockoutMinutes: number = 15) {
    const lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
    super(
      `Account is locked due to too many failed attempts. Try again after ${lockoutMinutes} minutes.`,
      423,
      'ACCOUNT_LOCKED',
      { lockoutUntil: lockoutUntil.toISOString() },
    );
    this.lockoutUntil = lockoutUntil;
  }
}

/**
 * Safely handle errors in API routes
 */
export function handleApiError(error: unknown): {
  statusCode: number;
  body: Record<string, unknown>;
} {
  if (error instanceof AppError) {
    const body: Record<string, unknown> = {
      error: error.message,
      code: error.code,
    };
    if (error.details) body.details = error.details;
    if (error instanceof RateLimitError) body.retryAfter = error.retryAfter;
    return { statusCode: error.statusCode, body };
  }

  if (error instanceof Error) {
    // Log unexpected errors for debugging
    console.error('[API Error]', error.message, error.stack);
    return {
      statusCode: 500,
      body: {
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
    };
  }

  console.error('[Unknown Error]', error);
  return {
    statusCode: 500,
    body: {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    },
  };
}
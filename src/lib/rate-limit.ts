/**
 * In-memory rate limiter for API endpoints
 * Uses sliding window counter algorithm
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 5, windowSeconds: 60 }, // 5 auth requests per minute
  login: { maxRequests: 5, windowSeconds: 300 }, // 5 login attempts per 5 min
  register: { maxRequests: 3, windowSeconds: 300 }, // 3 registrations per 5 min
  topup: { maxRequests: 10, windowSeconds: 60 }, // 10 top-ups per minute
  ticket: { maxRequests: 10, windowSeconds: 60 }, // 10 ticket ops per minute
  tap: { maxRequests: 20, windowSeconds: 60 }, // 20 tap-ins per minute
  general: { maxRequests: 60, windowSeconds: 60 }, // 60 general requests per minute
};

// Store rate limit data per identifier (IP, cardId, etc.)
const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks (every 5 minutes)
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Check and increment rate limit for a given identifier
 * @returns { allowed: boolean, retryAfter: number, remaining: number }
 */
export function checkRateLimit(
  identifier: string,
  category: string = 'general',
): { allowed: boolean; retryAfter: number; remaining: number; limit: number } {
  startCleanup();

  const config = DEFAULT_CONFIGS[category] || DEFAULT_CONFIGS.general;
  const key = `${category}:${identifier}`;
  const now = Date.now();

  const entry = store.get(key);

  // No entry or window has expired - create fresh
  if (!entry || entry.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });
    return {
      allowed: true,
      retryAfter: 0,
      remaining: config.maxRequests - 1,
      limit: config.maxRequests,
    };
  }

  // Window is still active - check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      remaining: 0,
      limit: config.maxRequests,
    };
  }

  // Increment and allow
  entry.count += 1;
  return {
    allowed: true,
    retryAfter: 0,
    remaining: config.maxRequests - entry.count,
    limit: config.maxRequests,
  };
}

/**
 * Reset rate limit for an identifier (e.g., after successful login)
 */
export function resetRateLimit(identifier: string, category: string = 'general') {
  const key = `${category}:${identifier}`;
  store.delete(key);
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  result: { remaining: number; limit: number; retryAfter: number },
  allowed: boolean,
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Limit': String(result.limit),
  };
  if (!allowed) {
    headers['Retry-After'] = String(result.retryAfter);
  }
  return headers;
}
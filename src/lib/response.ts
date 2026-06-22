/**
 * Consistent API response helpers
 */

import { NextResponse } from 'next/server';
import { handleApiError, AppError } from './errors';

/**
 * Create a success response
 */
export function success(data: unknown, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status },
  );
}

/**
 * Create a success response with meta (pagination, etc.)
 */
export function successWithMeta(
  data: unknown,
  meta: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasMore?: boolean;
  },
  status: number = 200,
) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta,
    },
    { status },
  );
}

/**
 * Create an error response
 */
export function error(message: string, status: number = 400, code?: string, details?: unknown) {
  const body: Record<string, unknown> = {
    success: false,
    error: message,
  };
  if (code) body.code = code;
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}

/**
 * Create a paginated list response
 */
export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
) {
  const totalPages = Math.ceil(total / limit);
  return successWithMeta(items, {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  });
}

/**
 * Wrapper for API route handlers with consistent error handling
 */
export type ApiHandler = () => Promise<NextResponse>;

/**
 * Execute an API handler with automatic error catching
 */
export async function apiHandler(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    const { statusCode, body } = handleApiError(err);
    return NextResponse.json(body, { status: statusCode });
  }
}

/**
 * Get client IP from request headers (works behind proxies)
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/**
 * Parse pagination params from URL search params
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || defaults.page || 1);
  const maxLimit = defaults.maxLimit || 100;
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || defaults.limit || 20),
    maxLimit,
  );
  return { page, limit, skip: (page - 1) * limit };
}
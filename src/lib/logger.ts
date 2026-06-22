/**
 * Structured logging utility for production
 * Logs to console with structured format and optionally to database
 */

import { db } from './db';
import type { NextRequest } from 'next/server';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};

const RESET = '\x1b[0m';

function formatLog(entry: LogEntry): string {
  const { timestamp, level, message, context, ...rest } = entry;
  const ctx = context ? ` ${JSON.stringify(context)}` : '';
  const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}${ctx}${extra} - ${message}`;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  const formatted = formatLog(entry);
  const color = COLORS[level];

  switch (level) {
    case 'debug':
      console.debug(color + formatted + RESET);
      break;
    case 'info':
      console.info(color + formatted + RESET);
      break;
    case 'warn':
      console.warn(color + formatted + RESET);
      break;
    case 'error':
      console.error(color + formatted + RESET);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
};

/**
 * Write an audit log entry to the database (async, non-blocking)
 */
export async function audit(
  userId: string | null | undefined,
  action: string,
  resource: string,
  details?: string,
  request?: NextRequest,
) {
  // Log to console
  logger.info(`AUDIT: ${action} on ${resource}`, { userId, details });

  // Write to DB (fire and forget, don't block the response)
  db.auditLog
    .create({
      data: {
        userId: userId ?? null,
        action,
        resource,
        details: details ?? null,
        ipAddress: request ? getClientIp(request) : null,
        userAgent: request?.headers.get('user-agent') ?? null,
      },
    })
    .catch(() => {
      // Silently fail audit log writes - they should never block business logic
    });
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/**
 * Security headers for all API responses
 */
export function getSecurityHeaders(): HeadersInit {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'",
  };
}
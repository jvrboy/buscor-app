/**
 * Application constants
 */

// Ticket configuration
export const TICKET_CONFIG = {
  single: {
    price: 12.0,
    trips: 1,
    label: 'Single Ride',
    description: 'Perfect for occasional riders',
  },
  multi_ride: {
    price: 100.0,
    trips: 10,
    label: 'Multi-Ride Bundle',
    description: 'Best value for daily commuters - 10 trips',
  },
  weekly: {
    price: 200.0,
    trips: 999, // "unlimited"
    label: 'Weekly Pass',
    description: 'Unlimited rides for 7 days',
    durationDays: 7,
  },
} as const;

export type TicketType = keyof typeof TICKET_CONFIG;

// Fare configuration per route
export const ROUTE_FARES: Record<string, { name: string; from: string; to: string; fare: number }> = {
  'route-101': {
    name: 'Route 101 - Sandton to CBD',
    from: 'Sandton City',
    to: 'Park Station',
    fare: 12.0,
  },
  'route-202': {
    name: 'Route 202 - Midrand Express',
    from: 'Midrand',
    to: 'Marlboro',
    fare: 15.0,
  },
  'route-303': {
    name: 'Route 303 - Soweto Link',
    from: 'Bara',
    to: 'Vilakazi',
    fare: 10.0,
  },
  'route-404': {
    name: 'Route 404 - Pretoria Express',
    from: 'Pretoria CBD',
    to: 'Centurion',
    fare: 18.0,
  },
  'route-505': {
    name: 'Route 505 - East Rand Connector',
    from: 'Boksburg',
    to: 'Germiston',
    fare: 11.0,
  },
  'route-606': {
    name: 'Route 606 - West Rand Loop',
    from: 'Roodepoort',
    to: 'Randburg',
    fare: 13.0,
  },
  'route-707': {
    name: 'Route 707 - Airport Shuttle',
    from: 'Sandton',
    to: 'OR Tambo Airport',
    fare: 25.0,
  },
} as const;

// Security configuration
export const SECURITY_CONFIG = {
  /** Max login attempts before lockout */
  maxLoginAttempts: 5,
  /** Lockout duration in minutes */
  lockoutMinutes: 15,
  /** PIN min/max length */
  pinLength: 4,
  /** Card number length */
  cardNumberLength: 16,
  /** Max top-up amount */
  maxTopUpAmount: 5000,
  /** Min top-up amount */
  minTopUpAmount: 10,
  /** Daily spending limit */
  dailySpendingLimit: 500,
  /** Monthly spending limit */
  monthlySpendingLimit: 5000,
  /** Tap token expiration in seconds */
  tapTokenExpirySeconds: 90,
} as const;

// Card types
export const CARD_TYPES = {
  standard: { label: 'Standard', discount: 0 },
  premium: { label: 'Premium', discount: 0.1 }, // 10% discount
  student: { label: 'Student', discount: 0.15 }, // 15% discount
} as const;

// Card statuses
export const CARD_STATUSES = ['active', 'blocked', 'expired'] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

// Transaction types
export const TRANSACTION_TYPES = ['top_up', 'purchase', 'refund'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

// API defaults
export const API_DEFAULTS = {
  paginationLimit: 20,
  maxPaginationLimit: 100,
} as const;
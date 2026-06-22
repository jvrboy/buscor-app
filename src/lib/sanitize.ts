/**
 * Input sanitization utilities
 */

/**
 * Trim and collapse multiple spaces in a string
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitize a phone number to keep only digits, +, -, (, ), and spaces
 */
export function sanitizePhone(phone: string): string {
  return phone.trim().replace(/[^\d+\-() ]/g, '');
}

/**
 * Sanitize card number to keep only digits
 */
export function sanitizeCardNumber(cardNumber: string): string {
  return cardNumber.replace(/\D/g, '');
}

/**
 * Sanitize PIN to keep only digits
 */
export function sanitizePin(pin: string): string {
  return pin.replace(/\D/g, '');
}

/**
 * Validate and sanitize email (lowercase, trim)
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validate South African phone number format
 */
export function isSaPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  // Accept: 10 digits starting with 0, or 11 digits starting with 27
  return /^0\d{9}$/.test(cleaned) || /^27\d{9}$/.test(cleaned);
}

/**
 * Validate that an amount is within acceptable range
 */
export function isValidAmount(amount: number, min: number = 1, max: number = 10000): boolean {
  return typeof amount === 'number' && !isNaN(amount) && amount >= min && amount <= max;
}

/**
 * Validate that a string is a valid CUID (from Prisma)
 */
export function isValidId(id: string): boolean {
  return /^[a-z0-9]{20,}$/.test(id);
}
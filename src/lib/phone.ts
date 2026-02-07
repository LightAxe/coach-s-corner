/**
 * US phone number utilities.
 * Normalizes various US phone formats to E.164 (+1XXXXXXXXXX).
 */

const PHONE_DIGITS_REGEX = /\D/g;

/** Strip all non-digit characters */
function stripToDigits(value: string): string {
  return value.replace(PHONE_DIGITS_REGEX, '');
}

/**
 * Try to normalize a string as a US phone number.
 * Returns E.164 format (+1XXXXXXXXXX) or null if not a valid US number.
 */
export function normalizeUSPhone(value: string): string | null {
  const digits = stripToDigits(value);
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

/** Returns true if value looks like it could be a phone number (contains mostly digits) */
export function looksLikePhone(value: string): boolean {
  const stripped = value.trim();
  // If it starts with + or ( or a digit, and has at least 10 digits, treat as phone
  const digits = stripToDigits(stripped);
  return digits.length >= 10 && /^[\d\s\-\(\)\+]+$/.test(stripped);
}

/** Returns true if value is a valid email */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Detect whether a value is an email or phone.
 * Returns { method, identifier } or null if neither.
 */
export function detectIdentifierType(value: string): { method: 'email' | 'sms'; identifier: string } | null {
  const trimmed = value.trim();
  if (isEmail(trimmed)) {
    return { method: 'email', identifier: trimmed };
  }
  const phone = normalizeUSPhone(trimmed);
  if (phone) {
    return { method: 'sms', identifier: phone };
  }
  return null;
}

/** Mask a phone number: (•••) •••-7890 */
export function maskPhone(e164: string): string {
  const last4 = e164.slice(-4);
  return `(•••) •••-${last4}`;
}

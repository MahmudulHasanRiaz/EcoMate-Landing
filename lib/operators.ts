/**
 * Input parsing shared by the operator-management routes.
 *
 * Field-by-field allowlisting rather than `{ ...body }`: a request body is
 * attacker-controlled, and spreading it into a Drizzle `.set()` would expose every column
 * this module never meant to accept.
 */
import { isAdminRole, type AdminRole } from '@/lib/roles';

/**
 * Deliberately conservative: one `@`, a dot in the domain, no whitespace, bounded length.
 * Full RFC 5322 validation is not worth the regex; the authoritative check is that the
 * address is unique in `admin_users`.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
}

export function parseAdminRole(value: unknown): AdminRole | null {
  return isAdminRole(value) ? value : null;
}

export function readPassword(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

import { z } from 'zod';
import { ADMIN_ROLES } from '@/lib/roles';
import { MIN_PASSWORD_LENGTH } from '@/lib/password';

// Normalized before validation (trim + lowercase), preserving the existing tolerance for
// an admin who pastes an address with a trailing space. The DB uniqueness check then sees
// the same canonical form every caller produced.
const normalizedEmail = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.email().max(254),
);

export const operatorCreate = z.strictObject({
  email: normalizedEmail,
  password: z.string().min(MIN_PASSWORD_LENGTH).max(256),
  role: z.enum(ADMIN_ROLES).optional(),
});

export const operatorUpdate = z.strictObject({
  role: z.enum(ADMIN_ROLES).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(256).optional(),
});

export const setupCreate = z.strictObject({
  token: z.string().min(1).max(512),
  email: normalizedEmail,
  password: z.string().min(MIN_PASSWORD_LENGTH).max(256),
});

export const totpAction = z.strictObject({
  action: z.enum(['enroll', 'verify']),
  code: z.string().regex(/^\d{6}$/).optional(),
});

export const setupTotp = z.strictObject({
  token: z.string().min(1).max(512),
  email: normalizedEmail,
  reissue: z.boolean().optional(),
  code: z.string().max(32).optional(),
});

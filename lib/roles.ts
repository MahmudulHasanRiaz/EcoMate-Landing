/**
 * RBAC vocabulary shared by `auth.ts`, the module augmentation and the admin routes.
 *
 * Kept dependency-free on purpose: `next-auth.d.ts` and `lib/authz.ts` both need these
 * types, and importing `lib/authz.ts` from `auth.ts` would close an import cycle
 * (`auth` → `authz` → `auth`).
 */

export type AdminRole = 'superadmin' | 'admin' | 'editor';

export const ADMIN_ROLES: readonly AdminRole[] = ['superadmin', 'admin', 'editor'];

export function isAdminRole(value: unknown): value is AdminRole {
  return value === 'superadmin' || value === 'admin' || value === 'editor';
}

/** Never trust an unrecognised role string: anything unknown degrades to least privilege. */
export function normalizeRole(value: unknown): AdminRole {
  return isAdminRole(value) ? value : 'editor';
}

/** Content authors and above may write; editors are read-only. */
export function canWriteContent(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'admin';
}

/** Only a superadmin may manage operators (create, deactivate, re-role, reset). */
export function canManageUsers(role: AdminRole): boolean {
  return role === 'superadmin';
}

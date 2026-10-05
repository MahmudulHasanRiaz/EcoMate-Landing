/**
 * Authorization helpers for admin surfaces.
 *
 * `proxy.ts` only answers "is there a session?" — it runs before the route handler and
 * sees nothing but the cookie. Role enforcement is a separate, authoritative check that
 * each admin handler performs itself by reading the live session. Never trust a
 * client-supplied role, and never rely on the proxy for privilege boundaries.
 */
import type { Session } from 'next-auth';
import { auth } from '@/auth';
import { fail, logServerError } from '@/lib/json';
import { type AdminRole, normalizeRole } from '@/lib/roles';

export { ADMIN_ROLES, canManageUsers, canWriteContent, isAdminRole, normalizeRole } from '@/lib/roles';
export type { AdminRole } from '@/lib/roles';

/** The session's role, or `null` when there is no session. */
export function roleOf(session: Session | null): AdminRole | null {
  return session?.user ? normalizeRole(session.user.role) : null;
}

/** Numeric `admin_users.id` for audit rows, or `null` when the id is missing/not numeric. */
export function actorIdOf(session: Session | null): number | null {
  const id = Number(session?.user?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export type AdminGuard =
  | { ok: true; session: Session; role: AdminRole; actorId: number | null }
  | { ok: false; response: Response };

/**
 * Resolve the caller's session and assert it holds one of `allowed` roles.
 *
 * Fails closed: a session lookup that throws (database unreachable, bad AUTH_SECRET) is a
 * 503, never an accidental "allowed".
 */
export async function requireAdminRole(allowed: readonly AdminRole[]): Promise<AdminGuard> {
  let session: Session | null;
  try {
    session = await auth();
  } catch (error) {
    logServerError('authz.session', error);
    return { ok: false, response: fail('Authentication is temporarily unavailable', 503) };
  }

  const role = roleOf(session);
  if (!session?.user || !role) {
    return { ok: false, response: fail('Authentication required', 401) };
  }
  if (!allowed.includes(role)) {
    return { ok: false, response: fail('Forbidden', 403) };
  }
  return { ok: true, session, role, actorId: actorIdOf(session) };
}

/**
 * Admin audit trail: logins, lockouts and every operator-management mutation.
 *
 * Every write here is best-effort on purpose — an audit insert must never turn a successful
 * login into a 500 — but it is never silent: failures go to the Worker log so a broken
 * trail is visible operationally.
 */
import { getDb } from '@/db/client';
import { adminAuditLogsTable } from '@/db/schema';

export interface AuditEntry {
  /** `admin_users.id`, or `null` for events with no authenticated actor (failed logins). */
  actorId: number | null;
  /** LOGIN_OK | LOGIN_FAIL | LOGIN_LOCKED | SETUP_SUPERADMIN | USER_CREATE | USER_UPDATE | USER_DEACTIVATE | PASSWORD_RESET | ROLE_CHANGE | SESSION_REVOKE */
  action: string;
  target?: string;
  ip?: string;
}

/** Use outside a transaction. Inside one, write to `tx` directly so it commits atomically. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await getDb()
      .insert(adminAuditLogsTable)
      .values({
        actorId: entry.actorId,
        action: entry.action,
        target: entry.target ?? '',
        ip: entry.ip ?? '',
      });
  } catch (error) {
    console.error(`[audit] write failed: ${entry.action}`, error);
  }
}

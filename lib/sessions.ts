/**
 * Session registry access.
 *
 * `auth.ts` mints an opaque 256-bit token at sign-in and stores it in the `sessions` table.
 * The token itself is a bearer credential, so it is **never** returned over the API: the
 * admin session views expose a SHA-256-derived public id instead, and revocation maps that
 * id back to the row server-side.
 */
import { and, eq, gt } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { sessionsTable } from '@/db/schema';

export interface ActiveSession {
  /** Public, non-bearer identifier: first 32 hex chars of SHA-256(sessionToken). */
  id: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  expires: string;
}

export async function sessionIdHash(sessionToken: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sessionToken));
  let hex = '';
  for (const byte of new Uint8Array(digest)) hex += byte.toString(16).padStart(2, '0');
  return hex.slice(0, 32);
}

/** Active (non-expired) sessions for an operator, newest first. */
export async function listActiveSessions(adminUserId: number): Promise<ActiveSession[]> {
  const rows = await getDb()
    .select({
      sessionToken: sessionsTable.sessionToken,
      ip: sessionsTable.ip,
      userAgent: sessionsTable.userAgent,
      createdAt: sessionsTable.createdAt,
      expires: sessionsTable.expires,
    })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, String(adminUserId)), gt(sessionsTable.expires, new Date())));

  const sessions: ActiveSession[] = [];
  for (const row of rows) {
    sessions.push({
      id: await sessionIdHash(row.sessionToken),
      ip: row.ip,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
      expires: row.expires.toISOString(),
    });
  }
  return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Revoke one session of one operator. Returns false when no matching live session exists. */
export async function revokeSession(adminUserId: number, publicSessionId: string): Promise<boolean> {
  const sessions = await listActiveSessions(adminUserId);
  if (!sessions.some((s) => s.id === publicSessionId)) return false;

  const rows = await getDb()
    .select({ sessionToken: sessionsTable.sessionToken })
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, String(adminUserId)));

  for (const row of rows) {
    if ((await sessionIdHash(row.sessionToken)) === publicSessionId) {
      await getDb().delete(sessionsTable).where(eq(sessionsTable.sessionToken, row.sessionToken));
      return true;
    }
  }
  return false;
}

/**
 * Revoke every session belonging to an operator.
 *
 * Called on deactivate, role change and password reset: a privilege change must not leave a
 * live session holding the old privileges, and a password reset that leaves old sessions
 * alive has not actually recovered the account.
 */
export async function revokeAllSessions(adminUserId: number): Promise<number> {
  const removed = await getDb()
    .delete(sessionsTable)
    .where(eq(sessionsTable.userId, String(adminUserId)))
    .returning({ sessionToken: sessionsTable.sessionToken });
  return removed.length;
}

/** Auth.js identity row id for an operator (`users.id` mirrors `admin_users.id`). */
export function authUserId(adminUserId: number): string {
  return String(adminUserId);
}

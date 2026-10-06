/**
 * Peer-superadmin management of another operator's TOTP (Task 14 §6).
 *
 * `POST { action: 'reset' }` — default — issues a *new* pending secret, disables the old
 * factor immediately and revokes the target's live sessions. This is the documented
 * recovery path when an operator loses their device: the resetting superadmin receives the
 * `otpauth://` material once and hands it to the operator out of band.
 * `POST { action: 'verify', code }` confirms the pending secret from the same peer (the
 * operator may read the six-digit code to the peer), which re-enables login.
 *
 * A superadmin cannot manage their own factor here — self-lockout and session-riding are
 * exactly what the peer rule prevents.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { adminAuditLogsTable, adminUsersTable, sessionsTable } from '@/db/schema';
import { requireAdminRole } from '@/lib/authz';
import { asObject, errorMessage, fail, logServerError, ok, parseId, readString } from '@/lib/json';
import { clientIp } from '@/lib/request';
import { createTotpEnrollment, storedTotpMatches } from '@/lib/totp';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdminRole(['superadmin']);
  if (!guard.ok) return guard.response;
  const actorId = guard.actorId;
  if (actorId === null) return fail('Session is missing an operator id', 401);

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid operator id', 400);
    if (id === actorId) {
      return fail(
        "A peer superadmin must manage your second factor. Use /api/admin/totp to enrol, or ask another superadmin to reset it.",
        403,
      );
    }

    const db = getDb();
    const [target] = await db
      .select({
        email: adminUsersTable.email,
        role: adminUsersTable.role,
        totpSecret: adminUsersTable.totpSecret,
        totpEnabled: adminUsersTable.totpEnabled,
      })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, id))
      .limit(1);
    if (!target) return fail('Operator not found', 404);

    const body = asObject(await request.json().catch(() => null));
    const action = readString(body.action, 'reset');
    const ip = clientIp(request);

    if (action === 'reset') {
      const enrollment = await createTotpEnrollment(target.email);
      const revoked = await db.transaction(async (tx) => {
        await tx
          .update(adminUsersTable)
          .set({ totpSecret: enrollment.encrypted, totpEnabled: false, updatedAt: new Date() })
          .where(eq(adminUsersTable.id, id));
        const removed = await tx
          .delete(sessionsTable)
          .where(eq(sessionsTable.userId, String(id)))
          .returning({ sessionToken: sessionsTable.sessionToken });
        await tx.insert(adminAuditLogsTable).values({
          actorId,
          action: 'TOTP_RESET',
          target: target.email,
          ip,
        });
        return removed.length;
      });
      return ok({
        success: true,
        sessionsRevoked: revoked,
        uri: enrollment.uri,
        secret: enrollment.secret,
        qrDataUrl: enrollment.qrDataUrl,
      });
    }

    if (action === 'verify') {
      if (target.totpEnabled) {
        return fail('That operator already has two-factor authentication enabled.', 409);
      }
      const code = readString(body.code).trim();
      if (!(await storedTotpMatches(target.totpSecret, code))) {
        return fail('That code is not valid. Check the device clock and try again.', 400);
      }
      await db.transaction(async (tx) => {
        await tx
          .update(adminUsersTable)
          .set({ totpEnabled: true, updatedAt: new Date() })
          .where(eq(adminUsersTable.id, id));
        await tx.insert(adminAuditLogsTable).values({
          actorId,
          action: 'TOTP_ENROLL',
          target: target.email,
          ip,
        });
      });
      return ok({ success: true, totpEnabled: true });
    }

    return fail("action must be 'reset' or 'verify'", 400);
  } catch (error) {
    logServerError('admin.users.totp', error);
    return fail(errorMessage(error));
  }
}

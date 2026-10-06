/**
 * Self-service TOTP enrolment for the signed-in operator (Task 14 §6).
 *
 * `POST { action: 'enroll' }` issues a fresh secret and returns the `otpauth://` material
 * (`qrDataUrl`, `secret`, `uri`) exactly once. `POST { action: 'verify', code }` confirms
 * the pending secret and flips `totp_enabled`, after which every login requires a code.
 *
 * Superadmins cannot rotate their own second factor through this route: by the time they
 * hold a session they are already enrolled, and a compromised session must not be able to
 * replace the factor. Rotation and lockout recovery go through a peer superadmin
 * (`/api/admin/users/[id]/totp`), which is audited.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { adminAuditLogsTable, adminUsersTable } from '@/db/schema';
import { requireAdminRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok, readString } from '@/lib/json';
import { totpAction } from '@/lib/validation';
import { clientIp } from '@/lib/request';
import { createTotpEnrollment, storedTotpMatches } from '@/lib/totp';

export async function POST(request: Request): Promise<Response> {
  const guard = await requireAdminRole(['superadmin', 'admin', 'editor']);
  if (!guard.ok) return guard.response;
  const actorId = guard.actorId;
  if (actorId === null) return fail('Session is missing an operator id', 401);

  try {
    const parsed = totpAction.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail('Validation failed', 400, { issues: parsed.error.issues });
    const { action } = parsed.data;

    const db = getDb();
    const [operator] = await db
      .select({
        email: adminUsersTable.email,
        totpSecret: adminUsersTable.totpSecret,
        totpEnabled: adminUsersTable.totpEnabled,
      })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, actorId))
      .limit(1);
    if (!operator) return fail('Operator not found', 404);

    if (action === 'enroll') {
      if (operator.totpEnabled) {
        return fail(
          'Two-factor authentication is already enabled. Ask a peer superadmin to reset it.',
          409,
        );
      }
      const enrollment = await createTotpEnrollment(operator.email);
      await db
        .update(adminUsersTable)
        .set({ totpSecret: enrollment.encrypted, totpEnabled: false, updatedAt: new Date() })
        .where(eq(adminUsersTable.id, actorId));
      return ok({
        uri: enrollment.uri,
        secret: enrollment.secret,
        qrDataUrl: enrollment.qrDataUrl,
      });
    }

    if (action === 'verify') {
      if (operator.totpEnabled) {
        return fail('Two-factor authentication is already enabled.', 409);
      }
      const code = parsed.data.code ?? '';
      if (!(await storedTotpMatches(operator.totpSecret, code))) {
        return fail('That code is not valid. Check your device clock and try again.', 400);
      }
      await db.transaction(async (tx) => {
        await tx
          .update(adminUsersTable)
          .set({ totpEnabled: true, updatedAt: new Date() })
          .where(eq(adminUsersTable.id, actorId));
        await tx.insert(adminAuditLogsTable).values({
          actorId,
          action: 'TOTP_ENROLL',
          target: operator.email,
          ip: clientIp(request),
        });
      });
      return ok({ success: true, totpEnabled: true });
    }

    return fail("action must be 'enroll' or 'verify'", 400);
  } catch (error) {
    logServerError('admin.totp.self', error);
    return fail(errorMessage(error));
  }
}

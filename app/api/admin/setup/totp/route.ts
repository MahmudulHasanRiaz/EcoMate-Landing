/**
 * Second half of the one-time bootstrap flow: completing the first superadmin's TOTP
 * enrolment (Task 14 §6).
 *
 * `auth.ts` refuses to sign a superadmin in while `totp_enabled` is false, and the enrolment
 * material is only handed out by `POST /api/admin/setup` (account creation) or by this
 * route. Both are gated by the same `SETUP_TOKEN` Worker secret, so an operator who created
 * the account and then closed the tab — or lost the printed secret — can recover without a
 * database console:
 *
 *   POST { token, email, reissue: true }  → new enrolment material (invalidates the old)
 *   POST { token, email, code }           → confirm the pending secret and enable it
 *
 * Once enrolment is confirmed the token should be deleted from the Worker secrets; until
 * then possession of it is bootstrap-admin authority, hence the constant-time comparison,
 * the audit entries and the same "no session required" exemption in `authorized` as the
 * setup route itself.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { adminAuditLogsTable, adminUsersTable } from '@/db/schema';
import { envString } from '@/lib/env';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { timingSafeStringEqual } from '@/lib/password';
import { clientIp } from '@/lib/request';
import { createTotpEnrollment, storedTotpMatches } from '@/lib/totp';
import { setupTotp } from '@/lib/validation';

export async function POST(request: Request): Promise<Response> {
  try {
    const configuredToken = envString('SETUP_TOKEN');
    if (configuredToken === '') {
      return fail('Setup is not enabled on this deployment', 503);
    }

    const parsed = setupTotp.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }

    // Constant-time: a fast `===` here leaks the token prefix byte by byte.
    if (!timingSafeStringEqual(parsed.data.token, configuredToken)) {
      return fail('Invalid setup token', 403);
    }

    const email = parsed.data.email;

    const db = getDb();
    const [admin] = await db
      .select({
        id: adminUsersTable.id,
        role: adminUsersTable.role,
        totpSecret: adminUsersTable.totpSecret,
        totpEnabled: adminUsersTable.totpEnabled,
      })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.email, email))
      .limit(1);
    if (!admin || admin.role !== 'superadmin') return fail('No superadmin with that email', 404);
    if (admin.totpEnabled) {
      return fail('Two-factor authentication is already enabled for this account', 409);
    }

    const ip = clientIp(request);

    if (parsed.data.reissue === true) {
      const enrollment = await createTotpEnrollment(email);
      await db.transaction(async (tx) => {
        await tx
          .update(adminUsersTable)
          .set({ totpSecret: enrollment.encrypted, totpEnabled: false, updatedAt: new Date() })
          .where(eq(adminUsersTable.id, admin.id));
        await tx.insert(adminAuditLogsTable).values({
          actorId: admin.id,
          action: 'TOTP_RESET',
          target: email,
          ip,
        });
      });
      return ok({
        success: true,
        uri: enrollment.uri,
        secret: enrollment.secret,
        qrDataUrl: enrollment.qrDataUrl,
      });
    }

    const code = (parsed.data.code ?? '').trim();
    if (!(await storedTotpMatches(admin.totpSecret, code))) {
      return fail('That code is not valid. Check your device clock and try again.', 400);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(adminUsersTable)
        .set({ totpEnabled: true, updatedAt: new Date() })
        .where(eq(adminUsersTable.id, admin.id));
      await tx.insert(adminAuditLogsTable).values({
        actorId: admin.id,
        action: 'TOTP_ENROLL',
        target: email,
        ip,
      });
    });

    return ok({ success: true, totpEnabled: true });
  } catch (error) {
    logServerError('admin.setup.totp', error);
    return fail(errorMessage(error));
  }
}

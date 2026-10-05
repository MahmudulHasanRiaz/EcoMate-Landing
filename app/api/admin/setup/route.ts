/**
 * One-time first-superadmin bootstrap.
 *
 * Two independent conditions must hold: the `SETUP_TOKEN` Worker secret must match, and
 * `admin_users` must be empty. The token is compared in constant time and is meant to be
 * rotated/deleted after the first operator exists — once the table is non-empty this
 * endpoint can never create anything again, whatever the token is.
 */
import { count, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { adminAuditLogsTable, adminUsersTable } from '@/db/schema';
import { envString } from '@/lib/env';
import { asObject, errorMessage, fail, logServerError, ok, readString } from '@/lib/json';
import { isValidEmail, normalizeEmail, readPassword } from '@/lib/operators';
import { hashPassword, passwordPolicyError, timingSafeStringEqual } from '@/lib/password';
import { clientIp } from '@/lib/request';

export async function POST(request: Request): Promise<Response> {
  try {
    const configuredToken = envString('SETUP_TOKEN');
    if (configuredToken === '') {
      return fail('Setup is not enabled on this deployment', 503);
    }

    const body = asObject(await request.json().catch(() => null));
    const token = readString(body.token);
    const email = normalizeEmail(body.email);
    const password = readPassword(body.password);

    // Constant-time: a fast `===` here leaks the token prefix byte by byte.
    if (!timingSafeStringEqual(token, configuredToken)) {
      return fail('Invalid setup token', 403);
    }
    if (!isValidEmail(email)) return fail('A valid email address is required', 400);
    const policyError = passwordPolicyError(password);
    if (policyError) return fail(policyError, 400);

    const passwordHash = await hashPassword(password);
    const ip = clientIp(request);
    const db = getDb();

    const outcome = await db.transaction(async (tx) => {
      // Serialize concurrent bootstrap attempts: without the table lock two requests that
      // both read "0 operators" would both insert a superadmin.
      await tx.execute(sql`LOCK TABLE "admin_users" IN EXCLUSIVE MODE`);

      const [existing] = await tx.select({ total: count() }).from(adminUsersTable);
      if ((existing?.total ?? 0) > 0) return { created: false as const };

      const [created] = await tx
        .insert(adminUsersTable)
        .values({ email, passwordHash, role: 'superadmin', isActive: true })
        .returning({
          id: adminUsersTable.id,
          email: adminUsersTable.email,
          role: adminUsersTable.role,
        });

      await tx.insert(adminAuditLogsTable).values({
        actorId: created.id,
        action: 'SETUP_SUPERADMIN',
        target: email,
        ip,
      });

      return { created: true as const, user: created };
    });

    if (!outcome.created) {
      return fail('Setup has already been completed', 410);
    }
    return ok({ success: true, user: outcome.user }, 201);
  } catch (error) {
    logServerError('admin.setup', error);
    return fail(errorMessage(error));
  }
}

/** Lets the setup page decide between the form and "already configured" without POSTing. */
export async function GET(): Promise<Response> {
  try {
    const configuredToken = envString('SETUP_TOKEN');
    const [existing] = await getDb().select({ total: count() }).from(adminUsersTable);
    return ok({
      setupEnabled: configuredToken !== '',
      alreadyCompleted: (existing?.total ?? 0) > 0,
    });
  } catch (error) {
    logServerError('admin.setup.status', error);
    return fail('Setup status is unavailable', 503);
  }
}

/**
 * Single-operator management (superadmin only).
 *
 * `PUT` changes role / active flag / password; `DELETE` deactivates. Nothing here
 * hard-deletes an operator: the audit trail references them, and a deactivated row is
 * reversible while a deleted one is not.
 *
 * Two invariants this module enforces:
 *  - the last active superadmin can never be demoted or disabled (a permanent lockout), and
 *  - a privilege change or password reset revokes **every** live session for that operator,
 *    because a session that keeps working after a role change is a privilege-escalation bug.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { adminAuditLogsTable, adminUsersTable, sessionsTable } from '@/db/schema';
import { requireAdminRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok, parseId } from '@/lib/json';
import { assertNotLastSuperadmin, assertNotSelfDeactivate } from '@/lib/guard';
import { hashPassword, passwordPolicyError } from '@/lib/password';
import { clientIp } from '@/lib/request';
import { operatorUpdate, stripUnknownKeys } from '@/lib/validation';

const OPERATOR_COLUMNS = {
  id: adminUsersTable.id,
  email: adminUsersTable.email,
  role: adminUsersTable.role,
  isActive: adminUsersTable.isActive,
  // Whether 2FA is active — never the encrypted secret itself (Task 14 §6).
  totpEnabled: adminUsersTable.totpEnabled,
  lastLoginAt: adminUsersTable.lastLoginAt,
  createdAt: adminUsersTable.createdAt,
  updatedAt: adminUsersTable.updatedAt,
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdminRole(['superadmin']);
  if (!guard.ok) return guard.response;

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid operator id', 400);

    const db = getDb();
    const [target] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, id)).limit(1);
    if (!target) return fail('Operator not found', 404);

    const parsed = operatorUpdate.safeParse(stripUnknownKeys(operatorUpdate, await request.json().catch(() => null)));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    const { role: nextRole, isActive: nextActive, password: nextPassword } = parsed.data;

    if (nextRole === undefined && nextActive === undefined && nextPassword === undefined) {
      return fail('No supported fields supplied', 400);
    }
    if (nextPassword !== undefined) {
      const policyError = passwordPolicyError(nextPassword);
      if (policyError) return fail(policyError, 400);
    }

    const roleChanged = nextRole !== undefined && nextRole !== target.role;
    const deactivating = nextActive === false && target.isActive;
    const activating = nextActive === true && !target.isActive;
    const passwordReset = nextPassword !== undefined;

    const losingSuperadmin =
      target.role === 'superadmin' &&
      target.isActive &&
      ((roleChanged && nextRole !== 'superadmin') || deactivating);
    if (losingSuperadmin) {
      const lastGuard = await assertNotLastSuperadmin(target.id);
      if (!lastGuard.ok) return fail(lastGuard.reason, 409);
    }
    if (deactivating) {
      // An admin cannot lock themselves out mid-session by deactivating their own account.
      const selfGuard = assertNotSelfDeactivate(guard.actorId, target.id);
      if (!selfGuard.ok) return fail(selfGuard.reason, 409);
    }

    const actions: string[] = [];
    if (roleChanged) actions.push('ROLE_CHANGE');
    if (deactivating) actions.push('USER_DEACTIVATE');
    if (activating) actions.push('USER_ACTIVATE');
    if (passwordReset) actions.push('PASSWORD_RESET');
    const revokeSessions = roleChanged || deactivating || passwordReset;

    const passwordHash = nextPassword === undefined ? null : await hashPassword(nextPassword);
    const ip = clientIp(request);
    const actorId = guard.actorId;

    const user = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(adminUsersTable)
        .set({
          role: nextRole ?? target.role,
          isActive: nextActive ?? target.isActive,
          passwordHash: passwordHash ?? target.passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(adminUsersTable.id, target.id))
        .returning(OPERATOR_COLUMNS);

      if (revokeSessions) {
        await tx.delete(sessionsTable).where(eq(sessionsTable.userId, String(target.id)));
      }
      for (const action of actions) {
        await tx.insert(adminAuditLogsTable).values({
          actorId,
          action,
          target: target.email,
          ip,
        });
      }
      return row;
    });

    return ok({ user, sessionsRevoked: revokeSessions });
  } catch (error) {
    logServerError('admin.users.update', error);
    return fail(errorMessage(error));
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdminRole(['superadmin']);
  if (!guard.ok) return guard.response;

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid operator id', 400);

    const db = getDb();
    const [target] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, id)).limit(1);
    if (!target) return fail('Operator not found', 404);

    if (target.isActive && target.role === 'superadmin') {
      const lastGuard = await assertNotLastSuperadmin(target.id);
      if (!lastGuard.ok) return fail(lastGuard.reason, 409);
    }
    const selfGuard = assertNotSelfDeactivate(guard.actorId, target.id);
    if (!selfGuard.ok) return fail(selfGuard.reason, 409);

    const ip = clientIp(request);
    const actorId = guard.actorId;

    const revoked = await db.transaction(async (tx) => {
      await tx
        .update(adminUsersTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(adminUsersTable.id, target.id));

      const removed = await tx
        .delete(sessionsTable)
        .where(eq(sessionsTable.userId, String(target.id)))
        .returning({ sessionToken: sessionsTable.sessionToken });

      await tx.insert(adminAuditLogsTable).values({
        actorId,
        action: 'USER_DEACTIVATE',
        target: target.email,
        ip,
      });
      return removed.length;
    });

    return ok({ success: true, deactivated: true, sessionsRevoked: revoked });
  } catch (error) {
    logServerError('admin.users.deactivate', error);
    return fail(errorMessage(error));
  }
}

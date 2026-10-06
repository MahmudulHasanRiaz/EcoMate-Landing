/**
 * Operator management (superadmin only).
 *
 * `GET` lists operators, `POST` creates one. The list deliberately never selects
 * `password_hash` — a hash in a JSON response is a credential leak with extra steps.
 */
import { asc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { adminAuditLogsTable, adminUsersTable } from '@/db/schema';
import { requireAdminRole } from '@/lib/authz';
import { asObject, errorMessage, fail, isUniqueViolation, logServerError, ok } from '@/lib/json';
import { isValidEmail, normalizeEmail, parseAdminRole, readPassword } from '@/lib/operators';
import { hashPassword, passwordPolicyError } from '@/lib/password';
import { clientIp } from '@/lib/request';

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

export async function GET(): Promise<Response> {
  const guard = await requireAdminRole(['superadmin']);
  if (!guard.ok) return guard.response;

  try {
    const users = await getDb()
      .select(OPERATOR_COLUMNS)
      .from(adminUsersTable)
      .orderBy(asc(adminUsersTable.id));
    return ok({ users });
  } catch (error) {
    logServerError('admin.users.list', error);
    return fail(errorMessage(error));
  }
}

export async function POST(request: Request): Promise<Response> {
  const guard = await requireAdminRole(['superadmin']);
  if (!guard.ok) return guard.response;

  try {
    const body = asObject(await request.json().catch(() => null));
    const email = normalizeEmail(body.email);
    const password = readPassword(body.password);
    const role = parseAdminRole(body.role ?? 'editor');

    if (!isValidEmail(email)) return fail('A valid email address is required', 400);
    if (role === null) return fail('role must be one of superadmin, admin, editor', 400);
    const policyError = passwordPolicyError(password);
    if (policyError) return fail(policyError, 400);

    const passwordHash = await hashPassword(password);
    const ip = clientIp(request);
    const actorId = guard.actorId;

    const user = await getDb().transaction(async (tx) => {
      const [created] = await tx
        .insert(adminUsersTable)
        .values({ email, passwordHash, role, isActive: true })
        .returning(OPERATOR_COLUMNS);
      await tx.insert(adminAuditLogsTable).values({
        actorId,
        action: 'USER_CREATE',
        target: email,
        ip,
      });
      return created;
    });

    return ok({ user }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) return fail('An operator with that email already exists', 409);
    logServerError('admin.users.create', error);
    return fail(errorMessage(error));
  }
}

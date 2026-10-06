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
import { errorMessage, fail, isUniqueViolation, logServerError, ok } from '@/lib/json';
import { normalizeEmail } from '@/lib/operators';
import { hashPassword, passwordPolicyError } from '@/lib/password';
import { clientIp } from '@/lib/request';
import { operatorCreate } from '@/lib/validation';

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
    const parsed = operatorCreate.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    // Normalized after validation: the length/shape bounds already held on the raw input.
    const email = normalizeEmail(parsed.data.email);
    const role = parsed.data.role ?? 'editor';

    const policyError = passwordPolicyError(parsed.data.password);
    if (policyError) return fail(policyError, 400);

    const passwordHash = await hashPassword(parsed.data.password);
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

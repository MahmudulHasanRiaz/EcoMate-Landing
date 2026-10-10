/**
 * GET /api/admin/operators — assignable operator roster for the lead drawer.
 *
 * The full roster (`/api/admin/users`) is superadmin-only because it carries
 * roles and security state — but that left the drawer's assignment select
 * with a single "Unassigned" option for every admin and editor, a control
 * that renders yet can never do anything. This endpoint exposes exactly what
 * assignment needs (active operators' id + email, nothing sensitive) under
 * the editor-allowed content roles, so the drawer works for every operator
 * who may triage leads.
 */
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { adminUsersTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { requestId } from '@/lib/request';

export async function GET(req: Request) {
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const rows = await getDb()
      .select({ id: adminUsersTable.id, email: adminUsersTable.email })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.isActive, true))
      .orderBy(asc(adminUsersTable.email));
    return ok(rows);
  } catch (e) {
    logServerError('GET /api/admin/operators', e, requestId(req));
    return fail(errorMessage(e));
  }
}

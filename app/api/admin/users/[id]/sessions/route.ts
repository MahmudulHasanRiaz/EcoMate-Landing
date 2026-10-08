/**
 * Active sessions for one operator.
 *
 * `GET` lists them (superadmin, or the operator themselves), `DELETE` signs that operator
 * out everywhere. Session tokens are bearer credentials and are **never** returned — the
 * list exposes a SHA-256-derived public id instead (see `lib/sessions.ts`).
 */
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { adminAuditLogsTable, adminUsersTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok, parseId } from '@/lib/json';
import { clientIp } from '@/lib/request';
import { listActiveSessions, revokeAllSessions } from '@/lib/sessions';

/** Superadmins manage anyone; everyone else may only see/revoke their own sessions. */
function mayManage(role: string, actorId: number | null, targetId: number): boolean {
  return role === 'superadmin' || actorId === targetId;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid operator id', 400);
    if (!mayManage(guard.role, guard.actorId, id)) return fail('Forbidden', 403);

    const sessions = await listActiveSessions(id);
    return ok({ sessions });
  } catch (error) {
    logServerError('admin.sessions.list', error);
    return fail(errorMessage(error));
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid operator id', 400);
    if (!mayManage(guard.role, guard.actorId, id)) return fail('Forbidden', 403);

    const [target] = await getDb()
      .select({ email: adminUsersTable.email })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, id))
      .limit(1);
    if (!target) return fail('Operator not found', 404);

    const revoked = await revokeAllSessions(id);
    await getDb().insert(adminAuditLogsTable).values({
      actorId: guard.actorId,
      action: 'SESSION_REVOKE',
      target: target.email,
      ip: clientIp(request),
    });

    return ok({ success: true, sessionsRevoked: revoked });
  } catch (error) {
    logServerError('admin.sessions.revokeAll', error);
    return fail(errorMessage(error));
  }
}

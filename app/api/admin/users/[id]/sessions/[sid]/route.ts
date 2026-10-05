/**
 * Revoke a single session.
 *
 * `sid` is the public, SHA-256-derived session id returned by the session list — not the
 * bearer token. `revokeSession` maps it back to the row server-side.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { adminAuditLogsTable, adminUsersTable } from '@/db/schema';
import { requireAdminRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok, parseId } from '@/lib/json';
import { clientIp } from '@/lib/request';
import { revokeSession } from '@/lib/sessions';

const PUBLIC_SESSION_ID = /^[0-9a-f]{32}$/;

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; sid: string }> },
): Promise<Response> {
  const guard = await requireAdminRole(['superadmin', 'admin', 'editor']);
  if (!guard.ok) return guard.response;

  try {
    const { id: rawId, sid } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid operator id', 400);
    if (!PUBLIC_SESSION_ID.test(sid)) return fail('Invalid session id', 400);

    const isSelf = guard.actorId === id;
    if (guard.role !== 'superadmin' && !isSelf) return fail('Forbidden', 403);

    const [target] = await getDb()
      .select({ email: adminUsersTable.email })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, id))
      .limit(1);
    if (!target) return fail('Operator not found', 404);

    const revoked = await revokeSession(id, sid);
    if (!revoked) return fail('Session not found or already expired', 404);

    await getDb().insert(adminAuditLogsTable).values({
      actorId: guard.actorId,
      action: 'SESSION_REVOKE',
      target: target.email,
      ip: clientIp(request),
    });

    return ok({ success: true });
  } catch (error) {
    logServerError('admin.sessions.revoke', error);
    return fail(errorMessage(error));
  }
}

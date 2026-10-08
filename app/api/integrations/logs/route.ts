import { desc, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { integrationLogsTable } from '@/db/schema';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, failWithRequestId, logServerError, ok } from '@/lib/json';
import { paginate } from '@/lib/paginate';
import { requestId } from '@/lib/request';

/** Newest first. Paginated because this table grows by a row per dispatch, without bound. */
export async function GET(req: Request) {
  const reqId = requestId(req);
  // CR-1: dispatch payloads carry lead PII (name, phone, email, UTM). Session-only
  // gating is not enough — this is an admin-only surface.
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;
  try {
    const page = await paginate(
      req.url,
      (limit, offset) =>
        getDb()
          .select()
          .from(integrationLogsTable)
          .orderBy(desc(integrationLogsTable.createdAt), desc(integrationLogsTable.id))
          .limit(limit)
          .offset(offset),
      async () => {
        const [row] = await getDb()
          .select({ count: sql<number>`count(*)` })
          .from(integrationLogsTable);
        return { count: Number(row?.count ?? 0) };
      },
    );
    return ok(page);
  } catch (e) {
    logServerError('GET /api/integrations/logs', e, reqId);
    return failWithRequestId(errorMessage(e), reqId);
  }
}

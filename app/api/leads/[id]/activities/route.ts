/**
 * GET /api/leads/[id]/activities — one lead's timeline, newest first (Task 16 §1).
 *
 * Read-gated the same way as the lead list: a `requireAdminRole` guard rather than relying on
 * `proxy.ts`, which only answers "is there a session". The timeline is the operator's view of
 * who touched a customer record and when — arguably the most sensitive lead data in the app,
 * since it is an audit trail of internal actions on a named person.
 */
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { leadActivitiesTable, leadsTable } from '@/db/schema';
import { requireAdminRole } from '@/lib/authz';
import {
  errorMessage,
  fail,
  failWithRequestId,
  logServerError,
  ok,
  parseId,
} from '@/lib/json';
import { paginate } from '@/lib/paginate';
import { requestId } from '@/lib/request';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const reqId = requestId(req);
  // Read-gated the same way as the lead list (Decision 1: editors view leads).
  const guard = await requireAdminRole(['superadmin', 'admin', 'editor']);
  if (!guard.ok) return guard.response;

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid lead id', 400);

    // 404 rather than an empty timeline: "no activities" and "no such lead" are different
    // answers, and conflating them would hide a bad id in the admin drawer.
    const [lead] = await getDb()
      .select({ id: leadsTable.id })
      .from(leadsTable)
      .where(eq(leadsTable.id, id))
      .limit(1);
    if (!lead) return fail('Lead not found', 404);

    const page = await paginate(
      req.url,
      (limit, offset) =>
        getDb()
          .select({
            id: leadActivitiesTable.id,
            actorId: leadActivitiesTable.actorId,
            fromStatus: leadActivitiesTable.fromStatus,
            toStatus: leadActivitiesTable.toStatus,
            note: leadActivitiesTable.note,
            createdAt: leadActivitiesTable.createdAt,
          })
          .from(leadActivitiesTable)
          .where(eq(leadActivitiesTable.leadId, id))
          // `id` tiebreaker for the same reason as the lead list: a stable page boundary.
          .orderBy(sql`${leadActivitiesTable.createdAt} DESC, ${leadActivitiesTable.id} DESC`)
          .limit(limit)
          .offset(offset),
      async () => {
        const [row] = await getDb()
          .select({ count: sql<number>`count(*)` })
          .from(leadActivitiesTable)
          .where(eq(leadActivitiesTable.leadId, id));
        return { count: Number(row?.count ?? 0) };
      },
    );

    return ok(page);
  } catch (e) {
    logServerError('GET /api/leads/[id]/activities', e, reqId);
    return failWithRequestId(errorMessage(e), reqId);
  }
}
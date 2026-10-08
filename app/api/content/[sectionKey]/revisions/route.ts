/**
 * GET /api/content/[sectionKey]/revisions?locale=en|bn — one key's forward-only history.
 *
 * Admin-only (rollback is an operator action): the publish/restore buttons and the
 * conflict diagnosis in the CMS editor read this. Newest first, capped at 20 — history
 * is append-only, so a key edited daily for a year still pages cheaply.
 */
import { getDb } from '@/db/client';
import { and, desc, eq } from 'drizzle-orm';
import { contentRevisionsTable } from '@/db/schema';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { landingContentKey } from '@/lib/revisions';

interface RouteContext {
  params: Promise<{ sectionKey: string }>;
}

export async function GET(req: Request, { params }: RouteContext) {
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const sectionKey = (await params).sectionKey;
    const requested = new URL(req.url).searchParams.get('locale');
    if (requested !== 'en' && requested !== 'bn') {
      return fail('Query param locale must be en or bn', 400);
    }
    const rows = await getDb()
      .select({
        version: contentRevisionsTable.version,
        status: contentRevisionsTable.status,
        actorId: contentRevisionsTable.actorId,
        note: contentRevisionsTable.note,
        createdAt: contentRevisionsTable.createdAt,
      })
      .from(contentRevisionsTable)
      .where(and(
        eq(contentRevisionsTable.entity, 'landing_content'),
        eq(contentRevisionsTable.entityKey, landingContentKey(sectionKey, requested)),
      ))
      .orderBy(desc(contentRevisionsTable.version))
      .limit(20);
    return ok(rows);
  } catch (e) {
    logServerError('GET /api/content/[sectionKey]/revisions', e);
    return fail(errorMessage(e));
  }
}

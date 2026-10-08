/**
 * GET /api/admin/case-studies — full case-study list for the CMS (H-20).
 *
 * The public `GET /api/case-studies` serves published rows only (M-5); the admin
 * console needs drafts too. Separate admin path — rather than a query flag on the
 * public route — so the public read stays unconditionally filtered.
 */
import { desc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { caseStudiesTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { countTable, paginate } from '@/lib/paginate';
import { requestId } from '@/lib/request';

export async function GET(req: Request) {
  // Decision 1: case studies are CMS content — editor-allowed.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const page = await paginate(
      req.url,
      (limit, offset) =>
        getDb()
          .select()
          .from(caseStudiesTable)
          .orderBy(desc(caseStudiesTable.id))
          .limit(limit)
          .offset(offset),
      () => countTable(caseStudiesTable),
    );
    return ok(page);
  } catch (e) {
    logServerError('GET /api/admin/case-studies', e, requestId(req));
    return fail(errorMessage(e));
  }
}

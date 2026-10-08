/**
 * GET /api/admin/testimonials — full testimonial list for the CMS (H-19).
 *
 * The public `GET /api/testimonials` serves published rows only (M-4); the admin
 * console needs drafts and unpublished rows too (otherwise a freshly created draft
 * would vanish from the list it was created in). Separate admin path — rather than a
 * query flag on the public route — so the public read stays unconditionally filtered.
 */
import { desc, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { testimonialsTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { countTable, paginate } from '@/lib/paginate';
import { requestId } from '@/lib/request';

export async function GET(req: Request) {
  // Decision 1: testimonials are CMS content — editor-allowed.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    // Soft-deleted rows stay excluded (a delete the operator just made must read as
    // gone); everything else — published or draft — is listed newest-first for triage.
    const page = await paginate(
      req.url,
      (limit, offset) =>
        getDb()
          .select()
          .from(testimonialsTable)
          .where(isNull(testimonialsTable.deletedAt))
          .orderBy(desc(testimonialsTable.id))
          .limit(limit)
          .offset(offset),
      () => countTable(testimonialsTable),
    );
    return ok(page);
  } catch (e) {
    logServerError('GET /api/admin/testimonials', e, requestId(req));
    return fail(errorMessage(e));
  }
}

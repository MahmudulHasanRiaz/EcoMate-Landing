/**
 * GET /api/admin/blog — full post list for the CMS.
 *
 * The public `GET /api/blog` serves published rows only; the admin console
 * needs drafts, scheduled and archived rows too (otherwise a freshly created
 * draft would vanish from the list it was created in, and an archived post
 * could never be restored). Separate admin path — rather than a query flag
 * on the public route — so the public read stays unconditionally filtered.
 */
import { desc, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { blogPostsTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { countTable, paginate } from '@/lib/paginate';
import { requestId } from '@/lib/request';

export async function GET(req: Request) {
  // Decision 1: blog posts are CMS content — editor-allowed.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    // Soft-deleted rows stay excluded (a delete the operator just made must read as
    // gone); every other status is listed newest-first for triage.
    const page = await paginate(
      req.url,
      (limit, offset) =>
        getDb()
          .select()
          .from(blogPostsTable)
          .where(isNull(blogPostsTable.deletedAt))
          .orderBy(desc(blogPostsTable.id))
          .limit(limit)
          .offset(offset),
      () => countTable(blogPostsTable),
    );
    return ok(page);
  } catch (e) {
    logServerError('GET /api/admin/blog', e, requestId(req));
    return fail(errorMessage(e));
  }
}

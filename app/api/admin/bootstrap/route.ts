/**
 * GET /api/admin/bootstrap — dashboard bootstrap (B3/F3, fix/perf-overhaul).
 *
 * Bundles the ~5-12 dashboard reads (blog total, leads total, media total,
 * categories, tags + setup status) into ONE response with ONE Promise.all tick on the
 * server, so the Control Center pays 1 HTTP round-trip + 1 DB handshake instead of ~12
 * sequential bursts. Individual endpoints stay intact (no caller is forced onto this).
 *
 * Auth: any signed-in operator (CONTENT_EDITOR_ROLES). Response is `no-store` via
 * `next.config.ts` headers (`/api/admin/:path*`).
 */
import { sql } from 'drizzle-orm';
import { getDbHttp } from '@/db/client';
import {
  blogCategoriesTable,
  blogPostsTable,
  blogTagsTable,
  leadsTable,
  mediaAssetsTable,
} from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { requestId } from '@/lib/request';
import { timed } from '@/lib/slowlog';
import { withTimeout } from '@/lib/withTimeout';

export async function GET(req: Request): Promise<Response> {
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;
  const rid = requestId(req);
  try {
    const db = getDbHttp();
    const [blogRow, leadsRow, mediaRow, catRows, tagRows] = await timed(
      Promise.all([
        withTimeout(
          db
            .select({ count: sql<number>`count(*)` })
            .from(blogPostsTable),
          'bootstrap:blog',
        ),
        withTimeout(
          db
            .select({ count: sql<number>`count(*)` })
            .from(leadsTable),
          'bootstrap:leads',
        ),
        withTimeout(
          db
            .select({ count: sql<number>`count(*)` })
            .from(mediaAssetsTable),
          'bootstrap:media',
        ),
        withTimeout(
          db.select({ id: blogCategoriesTable.id }).from(blogCategoriesTable),
          'bootstrap:categories',
        ),
        withTimeout(db.select({ id: blogTagsTable.id }).from(blogTagsTable), 'bootstrap:tags'),
      ]),
      'bootstrap:all',
      10_000,
      { rid },
    );

    return ok({
      metrics: {
        postsTotal: Number(blogRow[0]?.count ?? 0),
        leadsTotal: Number(leadsRow[0]?.count ?? 0),
        mediaTotal: Number(mediaRow[0]?.count ?? 0),
        categoriesTotal: catRows.length,
        tagsTotal: tagRows.length,
      },
      role: guard.role,
    });
  } catch (e) {
    logServerError('GET /api/admin/bootstrap', e, rid);
    return fail(errorMessage(e));
  }
}

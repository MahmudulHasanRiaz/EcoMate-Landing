import { asc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { caseStudiesTable } from '@/db/schema';
import { errorMessage, fail, failWithRequestId, logServerError, ok } from '@/lib/json';
import { paginate } from '@/lib/paginate';
import { requestId } from '@/lib/request';

/**
 * Paginated (Task 16 §4).
 *
 * `case_studies` has no ordering column and no soft-delete column, so the list is the whole
 * live set. It is ordered by `id` explicitly rather than left unordered: an `OFFSET` scan over
 * a query with no `ORDER BY` has no stable order, which means row 20 of page 1 and row 20 of
 * page 2 can be the same row — a duplicate with something silently dropped. `id` is the
 * primary key, so its existing index serves the scan; **no new index is needed here**, unlike
 * the other list routes which sort on an unindexed column.
 *
 * Only `isPublished` rows are served (M-5) — unpublished bodies stay behind the
 * admin-gated preview endpoint. Mirrors `lib/content.ts:getCaseStudies`.
 */
export async function GET(req: Request) {
  try {
    const page = await paginate(
      req.url,
      (limit, offset) =>
        getDb()
          .select()
          .from(caseStudiesTable)
          .where(eq(caseStudiesTable.isPublished, true))
          .orderBy(asc(caseStudiesTable.id))
          .limit(limit)
          .offset(offset),
      async () => {
        const [row] = await getDb()
          .select({ count: sql<number>`count(*)` })
          .from(caseStudiesTable)
          .where(eq(caseStudiesTable.isPublished, true));
        return { count: Number(row?.count ?? 0) };
      },
    );
    return ok(page);
  } catch (e) {
    logServerError('GET /api/case-studies', e, requestId(req));
    return failWithRequestId(errorMessage(e), requestId(req));
  }
}

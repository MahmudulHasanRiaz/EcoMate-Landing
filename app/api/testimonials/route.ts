import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { testimonialsTable } from '@/db/schema';
import { errorMessage, fail, failWithRequestId, logServerError, ok } from '@/lib/json';
import { paginate } from '@/lib/paginate';
import { requestId } from '@/lib/request';

/** Paginated (Task 16 §4). Public: the landing page's customer-proof section reads this.
 * Only `isPublished` rows are served (M-4) — unpublished client quotes/names stay behind
 * the admin-gated preview endpoint. Mirrors `lib/content.ts:getTestimonials`. */
export async function GET(req: Request) {
  try {
    // Soft-deleted rows are gone from every public read: `is_published` controls
    // visibility within the live set, `deleted_at` removes a row from the set entirely.
    const page = await paginate(
      req.url,
      (limit, offset) =>
        getDb()
          .select()
          .from(testimonialsTable)
          .where(and(eq(testimonialsTable.isPublished, true), isNull(testimonialsTable.deletedAt)))
          // `id` tiebreaks ties in `sort_order` so a page boundary is stable between requests.
          .orderBy(asc(testimonialsTable.sortOrder), asc(testimonialsTable.id))
          .limit(limit)
          .offset(offset),
      async () => {
        const [row] = await getDb()
          .select({ count: sql<number>`count(*)` })
          .from(testimonialsTable)
          .where(and(eq(testimonialsTable.isPublished, true), isNull(testimonialsTable.deletedAt)));
        return { count: Number(row?.count ?? 0) };
      },
    );
    return ok(page);
  } catch (e) {
    logServerError('GET /api/testimonials', e, requestId(req));
    return failWithRequestId(errorMessage(e), requestId(req));
  }
}

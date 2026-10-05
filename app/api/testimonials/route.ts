import { asc, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { testimonialsTable } from '@/db/schema';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';

export async function GET() {
  try {
    // Soft-deleted rows are gone from every public read: `is_published` controls
    // visibility within the live set, `deleted_at` removes a row from the set entirely.
    const rows = await getDb()
      .select()
      .from(testimonialsTable)
      .where(isNull(testimonialsTable.deletedAt))
      .orderBy(asc(testimonialsTable.sortOrder));
    return ok(rows);
  } catch (e) {
    logServerError('GET /api/testimonials', e);
    return fail(errorMessage(e));
  }
}

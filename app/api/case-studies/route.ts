import { getDb } from '@/db/client';
import { caseStudiesTable } from '@/db/schema';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';

export async function GET() {
  try {
    // `case_studies` has no ordering column and no soft-delete column; the list is the
    // whole live set.
    const rows = await getDb().select().from(caseStudiesTable);
    return ok(rows);
  } catch (e) {
    logServerError('GET /api/case-studies', e);
    return fail(errorMessage(e));
  }
}

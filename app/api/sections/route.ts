import { asc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { landingSectionsTable } from '@/db/schema';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';

export async function GET() {
  try {
    const rows = await getDb()
      .select()
      .from(landingSectionsTable)
      .orderBy(asc(landingSectionsTable.sortOrder));
    return ok(rows);
  } catch (e) {
    logServerError('GET /api/sections', e);
    return fail(errorMessage(e));
  }
}

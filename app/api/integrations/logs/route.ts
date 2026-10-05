import { desc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { integrationLogsTable } from '@/db/schema';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';

export async function GET() {
  try {
    const rows = await getDb()
      .select()
      .from(integrationLogsTable)
      .orderBy(desc(integrationLogsTable.createdAt));
    return ok(rows);
  } catch (e) {
    logServerError('GET /api/integrations/logs', e);
    return fail(errorMessage(e));
  }
}

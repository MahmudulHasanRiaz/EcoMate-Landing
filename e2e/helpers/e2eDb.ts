import { config } from 'dotenv';
import { getDb } from '@/db/client';
import { leadActivitiesTable, leadsTable } from '@/db/schema';
import { eq, like } from 'drizzle-orm';

config({ path: '.env.local' });

// The database the preview server reads: explicit override first (local E2E
// cluster), otherwise the shared throwaway test DB. Never the live database.
const E2E_DB_URL = process.env.E2E_DB_URL ?? process.env.DIRECT_URL_TEST ?? '';
if (E2E_DB_URL !== '') {
  process.env.DIRECT_URL = E2E_DB_URL;
} else {
  console.warn('[e2e] no E2E_DB_URL or DIRECT_URL_TEST — DB-backed helpers will fail');
}

/** Non-empty E2E token that exercises the `isLocalE2eBypass` path. */
export const E2E_TOKEN = 'e2e-test-token';

export function probePhone(): string {
  const rand = String(Math.floor(10000000 + Math.random() * 89999999));
  return `+8801${rand}`;
}

/** Delete every lead whose phone starts with the prefix, activities first. */
export async function deleteLeadsByPhonePrefix(prefix: string): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ id: leadsTable.id })
    .from(leadsTable)
    .where(like(leadsTable.phone, `${prefix}%`));
  for (const row of rows) {
    await db.delete(leadActivitiesTable).where(eq(leadActivitiesTable.leadId, row.id));
    await db.delete(leadsTable).where(eq(leadsTable.id, row.id));
  }
}

export async function countLeadsByPhonePrefix(prefix: string): Promise<number> {
  const rows = await getDb()
    .select({ id: leadsTable.id })
    .from(leadsTable)
    .where(like(leadsTable.phone, `${prefix}%`));
  return rows.length;
}

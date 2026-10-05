import { eq, not } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { siteSettingsTable } from '@/db/schema';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';

export async function POST() {
  try {
    const [updated] = await getDb()
      .update(siteSettingsTable)
      .set({ isPricingVisible: not(siteSettingsTable.isPricingVisible), updatedAt: new Date() })
      .where(eq(siteSettingsTable.id, 1))
      .returning();
    if (!updated) return fail('Settings not seeded', 404);
    return ok({ isPricingVisible: updated.isPricingVisible });
  } catch (e) {
    logServerError('POST /api/pricing/toggle-mode', e);
    return fail(errorMessage(e));
  }
}

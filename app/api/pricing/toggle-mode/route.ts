import { eq, not } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { siteSettingsTable } from '@/db/schema';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { invalidateDomains } from '@/lib/revalidate';

export async function POST() {
  // H-5: site-wide pricing visibility flip (Decision 1) — editors cannot toggle it.
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;
  try {
    const [updated] = await getDb()
      .update(siteSettingsTable)
      .set({ isPricingVisible: not(siteSettingsTable.isPricingVisible), updatedAt: new Date() })
      .where(eq(siteSettingsTable.id, 1))
      .returning();
    if (!updated) return fail('Settings not seeded', 404);
    // The pricing section renders one of two completely different layouts off this one flag,
    // so a stale cache here is a visitor seeing a "Contact Sales" block over published tiered
    // pricing (or the reverse) with no way to reconcile it.
    invalidateDomains('pricing');
    return ok({ isPricingVisible: updated.isPricingVisible });
  } catch (e) {
    logServerError('POST /api/pricing/toggle-mode', e);
    return fail(errorMessage(e));
  }
}

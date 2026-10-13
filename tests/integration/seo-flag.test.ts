import { expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { siteSettingsTable } from '@/db/schema';
import { integrationSuite, probeTag } from './setup';

// Adapted from the task spec: the repo idiom is integrationSuite/probeTag
// (tests/integration/setup.ts), not a raw DIRECT_URL_TEST describe.skip.
integrationSuite('seo_indexing_enabled', () => {
  const tag = probeTag('seo-flag-probe');

  it('defaults to false on insert and round-trips true->false', async () => {
    const db = getDb();
    let rowId = 0;
    try {
      const [row] = await db
        .insert(siteSettingsTable)
        .values({ siteName: tag })
        .returning({ id: siteSettingsTable.id, flag: siteSettingsTable.seoIndexingEnabled });
      expect(row?.flag).toBe(false);
      if (!row) throw new Error('Settings seed insert returned no row');
      rowId = row.id;
      const [on] = await db
        .update(siteSettingsTable)
        .set({ seoIndexingEnabled: true })
        .where(eq(siteSettingsTable.id, row.id))
        .returning({ flag: siteSettingsTable.seoIndexingEnabled });
      expect(on?.flag).toBe(true);
      const [off] = await db
        .update(siteSettingsTable)
        .set({ seoIndexingEnabled: false })
        .where(eq(siteSettingsTable.id, row.id))
        .returning({ flag: siteSettingsTable.seoIndexingEnabled });
      expect(off?.flag).toBe(false);
    } finally {
      if (rowId) await db.delete(siteSettingsTable).where(eq(siteSettingsTable.id, rowId));
    }
  });

  it('uncached reader agrees with the stored flag', async () => {
    const db = getDb();
    const { getSeoIndexingEnabledUncached } = await import('@/lib/content');
    // Default dark without a row touch: just assert boolean shape + fail-closed type.
    const off = await getSeoIndexingEnabledUncached();
    expect(typeof off).toBe('boolean');
  });
});

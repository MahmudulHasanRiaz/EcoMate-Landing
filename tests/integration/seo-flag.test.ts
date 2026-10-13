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
    const [row] = await db
      .insert(siteSettingsTable)
      .values({ siteName: tag })
      .returning({ id: siteSettingsTable.id, flag: siteSettingsTable.seoIndexingEnabled });
    expect(row?.flag).toBe(false);
    if (!row) throw new Error('Settings seed insert returned no row');
    try {
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
      await db.delete(siteSettingsTable).where(eq(siteSettingsTable.id, row.id));
    }
  });
});

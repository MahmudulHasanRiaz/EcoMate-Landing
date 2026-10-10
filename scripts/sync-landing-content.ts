/**
 * Upsert the static `landingContent` fallback (both locales) into
 * `landing_content` as published rows.
 *
 * Purpose: after a copy redesign (e.g. fix/landing-redesign-v3), existing
 * databases still hold the previous copy — the page would render new layout
 * with stale words. Fresh databases are covered by `db/seed.ts`
 * (`ON CONFLICT DO NOTHING`); this script covers databases that already have
 * rows, by overwriting them with the current static copy.
 *
 * WARNING: this overwrites admin edits in the target database. Run against
 * local dev freely; run against production only when the redesign copy is
 * approved to go live.
 *
 * Run with the direct (port 5432) connection string, never Hyperdrive:
 *   DIRECT_URL="postgresql://..." npx tsx scripts/sync-landing-content.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, isNull, sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../db/schema';
import { landingContent } from '../src/data/landingContent';

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';

if (!url) {
  console.error('[sync] DIRECT_URL (or DATABASE_URL) must be set.');
  process.exit(1);
}

const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

async function main() {
  let upserted = 0;
  await db.transaction(async (tx) => {
    for (const locale of ['en', 'bn'] as const) {
      const sections = landingContent[locale] as unknown as Record<string, unknown>;
      for (const [sectionKey, content] of Object.entries(sections)) {
        const existing = await tx
          .select({ id: schema.landingContentTable.id, version: schema.landingContentTable.version })
          .from(schema.landingContentTable)
          .where(and(
            eq(schema.landingContentTable.sectionKey, sectionKey),
            eq(schema.landingContentTable.locale, locale),
            isNull(schema.landingContentTable.deletedAt),
          ))
          .limit(1);
        if (existing.length > 0 && existing[0]) {
          await tx
            .update(schema.landingContentTable)
            .set({ content, status: 'published', version: existing[0].version + 1, updatedAt: new Date() })
            .where(eq(schema.landingContentTable.id, existing[0].id));
        } else {
          await tx
            .insert(schema.landingContentTable)
            .values({ sectionKey, locale, content, status: 'published', version: 1 })
            .onConflictDoNothing();
        }
        upserted += 1;
      }
    }
  });

  // The public page reads through `unstable_cache` tagged `content:<locale>`.
  // A running dev server holds the stale copy until revalidation — restart it
  // (or publish any section in /admin) to see the synced copy immediately.
  console.log(`[sync] upserted ${upserted} landing_content rows.`);
}

main()
  .catch((error: unknown) => {
    console.error('[sync] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });

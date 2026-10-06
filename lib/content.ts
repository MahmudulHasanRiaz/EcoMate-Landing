/**
 * The single cached public read for landing content (Task 12 §4, Task 22 §1).
 *
 * `'use cache'` lives here and nowhere else: one file to audit for tags, lifetimes and
 * build-time behaviour. Components never call the DB directly.
 *
 * Build-time behaviour is the important part. With `cacheComponents: true` the build
 * prerenders this function once, with no request and therefore no Hyperdrive binding
 * (`db/client.ts` then falls back to `DIRECT_URL`). When neither is available — a laptop
 * with an empty `.env.local`, or a DB outage — the read must not throw: an exception here
 * fails the whole prerender, which would take the marketing page down with the database.
 * It returns `null` instead and the page renders the static `landingContent` fallback.
 */
import { cacheLife, cacheTag } from 'next/cache';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { landingContentTable } from '@/db/schema';
import { errorMessage } from '@/lib/json';
import type { ContentSection } from '@/lib/merge';
import type { Locale } from '@/src/types/landing';

/** 5 min stale / 1 h revalidate / 1 day expire — content edits are rare, visitors are not. */
const CONTENT_CACHE_PROFILE = { stale: 300, revalidate: 3600, expire: 86400 } as const;

/** Short profile for the failure path, so a transient outage is not cached for an hour. */
const CONTENT_FAILURE_PROFILE = { stale: 0, revalidate: 60, expire: 300 } as const;

export async function getLandingContent(locale: Locale): Promise<ContentSection[] | null> {
  'use cache';
  cacheTag(`content:${locale}`);
  try {
    const rows = await getDb()
      .select({
        sectionKey: landingContentTable.sectionKey,
        content: landingContentTable.content,
      })
      .from(landingContentTable)
      .where(and(
        eq(landingContentTable.locale, locale),
        eq(landingContentTable.status, 'published'),
        isNull(landingContentTable.deletedAt),
      ))
      .orderBy(asc(landingContentTable.sectionKey));
    cacheLife(CONTENT_CACHE_PROFILE);
    return rows;
  } catch (e) {
    // Task 20 §3 outage behaviour: serve the static copy, log server-side, never alert the
    // visitor. `isPostgresConfigured()` is deliberately not called here — it is a
    // request/binding probe, not content, and must stay out of a cached scope.
    console.error(
      `[content] landing content read failed for locale "${locale}", serving static fallback:`,
      errorMessage(e),
    );
    cacheLife(CONTENT_FAILURE_PROFILE);
    return null;
  }
}

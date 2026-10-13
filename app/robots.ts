import type { MetadataRoute } from 'next';
import { getSeoIndexingEnabled } from '@/lib/content';
import { SITE_URL } from '@/lib/seo';

/**
 * Indexing kill-switch: while `site_settings.seo_indexing_enabled` is false
 * (the default), every crawler is disallowed and no sitemap is advertised.
 * Fail-closed — a read error serves the dark branch.
 *
 * When enabled, everything public is crawlable. `/admin` and `/api` are excluded
 * from indexing by the `robots` metadata on the admin layout and by being
 * non-content routes, but they are disallowed here too so a crawler does not
 * spend budget on session-gated URLs that only ever answer with a redirect.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const enabled = await getSeoIndexingEnabled().catch(() => false);
  if (!enabled) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    // L-37: no `host` directive — only Yandex supports it, and Next warns on it.
  };
}

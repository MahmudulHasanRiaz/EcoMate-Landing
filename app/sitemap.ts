import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * Static entries ship first so the sitemap never 500s when the database is unreachable or
 * unseeded (see the build-time fallback in `db/client.ts`). Published blog and case-study
 * slugs are appended from the database in the change that ships their page routes.
 *
 * NOTE: `/blog` is listed per the migration plan's Task 10 block, but no `app/blog` page
 * route exists yet — only the `/api/blog` handlers from Task 6. Until that page ships this
 * one entry resolves to 404, so it must be reconciled (either the page lands, or the entry
 * is removed) before the site is submitted to Search Console.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'daily', priority: 0.8 },
  ];
}

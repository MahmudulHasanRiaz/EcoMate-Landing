import type { MetadataRoute } from 'next';
import { getCaseStudies, getPublishedBlogPosts } from '@/lib/content';
import { LOCALES } from '@/lib/locales';
import { localeHomePath, localeRoutePrefix, SITE_URL } from '@/lib/seo';

/**
 * Sitemap with both locale sets and every published URL.
 *
 * ## Why the static entries come first
 *
 * `sitemap.xml` is a crawler entry point: a 500 here hides the whole site. The DB-backed
 * append therefore cannot be allowed to throw — `getPublishedBlogPosts` and `getCaseStudies`
 * already return `null` on failure (their `'use cache'` scopes log and degrade), and this
 * function degrades again on top of that. An unseeded or unreachable database still yields a
 * valid sitemap containing the static pages.
 *
 * ## Last-modified
 *
 * `lastmod` is only emitted for rows that carry a real timestamp (`published_at`/`updated_at`
 * for posts, `created_at` for case studies). A sitemap that claims a `lastmod` it invented is
 * worse than one that omits the field: crawlers trust it to decide what to re-fetch.
 *
 * ## Blog slugs in both locales
 *
 * `blog_posts` has no `locale` column yet, so a slug resolves under `/en/blog/<slug>` and
 * `/bn/blog/<slug>`. Both URLs are listed because both resolve, and each carries its own
 * canonical + hreflang set. Per-post Bangla bodies arrive with the content-locale split.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // `/` is the canonical English URL; `/en` is its explicit-locale alias. Listing both keeps
  // a crawler that only ever sees the prefixed form able to discover the canonical one.
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}${localeHomePath('en')}`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}${localeHomePath('bn')}`, changeFrequency: 'weekly', priority: 1 },
    // `/en` is the explicit-locale alias of the canonical `/`. Listed so a crawler that only
    // ever encounters the prefixed form can still discover the canonical URL.
    { url: `${SITE_URL}/en`, changeFrequency: 'weekly', priority: 1 },
  ];

  const [posts, caseStudies] = await Promise.all([
    getPublishedBlogPosts().catch(() => null),
    getCaseStudies().catch(() => null),
  ]);

  const entries: MetadataRoute.Sitemap = [...staticEntries];

  // Legal pages (Task 20 §6): static routes under every locale, always listed —
  // they render from the static fallback even when the DB is unreachable.
  for (const locale of LOCALES) {
    const prefix = localeRoutePrefix(locale);
    for (const page of ['privacy', 'terms'] as const) {
      entries.push({
        url: `${SITE_URL}${prefix}/${page}`,
        changeFrequency: 'yearly',
        priority: 0.3,
      });
    }
  }

  for (const locale of LOCALES) {
    // The *route* prefix, not the canonical home path: `/blog/<slug>` is not a route in this
    // app (only `/en/blog/<slug>` and `/bn/blog/<slug>` are), so building sub-page entries
    // from `localeHomePath` would publish a sitemap of 404s for the default locale.
    const prefix = localeRoutePrefix(locale);

    for (const post of posts ?? []) {
      const path = `${prefix}/blog/${post.slug}`;
      entries.push({
        url: `${SITE_URL}${path}`,
        lastModified: new Date(post.lastModified),
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }

    for (const study of caseStudies ?? []) {
      const path = `${prefix}/case-studies/${study.slug}`;
      entries.push({
        url: `${SITE_URL}${path}`,
        lastModified: new Date(study.lastModified),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  }

  return entries;
}
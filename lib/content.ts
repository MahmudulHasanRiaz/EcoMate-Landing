/**
 * The single cached public read layer (Task 12 §4, Task 22 §1; classic pipeline since 2026-10-09).
 *
 * `unstable_cache` lives here and nowhere else: one file to audit for tags, lifetimes and
 * build-time behaviour. Components never call the DB directly.
 *
 * Why `unstable_cache` and not `'use cache'`: Cache Components (`cacheComponents: true`)
 * hangs every cached route on the Cloudflare Workers runtime (Error 1101 — the Workers
 * `setTimeout` implementation never fires the timers the cache-component machinery depends
 * on, so even the `withTimeout` safety nets cannot rescue the request; see
 * `docs/muse/cache-components-off-directive.md`). The classic `unstable_cache` + R2
 * incremental cache + DO sharded tag cache pipeline is battle-tested on Workers and is
 * what runs here now. `updateTag`/`revalidateTag` invalidation (`lib/revalidate.ts`) is
 * unchanged — those do not require the flag.
 *
 * Wrappers are created per call (not hoisted) because tags depend on arguments
 * (`content:${locale}`, `menus:${key}:${locale}`, `blog:${slug}`): the cache key still
 * derives from `keyParts` + serialized args, so per-call creation costs one closure and
 * changes nothing about hit rates.
 *
 * Build-time behaviour is the important part. The build prerenders cached functions once,
 * with no request and therefore no Hyperdrive binding (`db/client.ts` then falls back to
 * `DIRECT_URL`). When neither is available — a laptop with an empty `.env.local`, or a
 * DB outage — the read must not throw: an exception here fails the whole prerender, which
 * would take the marketing page down with the database. It returns `null` instead and the
 * page renders the static `landingContent` fallback.
 */
import { unstable_cache } from 'next/cache';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  blogPostsTable,
  caseStudiesTable,
  landingContentTable,
  menuItemsTable,
  menusTable,
  pricingPlansTable,
  siteSettingsTable,
  socialLinksTable,
  testimonialsTable,
} from '@/db/schema';
import { errorMessage, logOnce } from '@/lib/json';
import type { ContentSection } from '@/lib/merge';
import type { Locale } from '@/src/types/landing';
import { withTimeout } from '@/lib/withTimeout';

/**
 * Revalidation windows (docs/CACHE.md; previously `cacheLife` profiles):
 * - standard: 1 h (`revalidate: 3600`)
 * - long (single bodies): 1 d (`revalidate: 86400`)
 *
 * Trade-off vs the old 30s failure profile: a failure `null` is cached for the normal
 * window instead of expiring in a minute. A DB outage therefore serves the static
 * fallback for up to an hour per entry (until an admin write fires the tag or the window
 * lapses) rather than retrying the database every minute. Availability-first: the page
 * stays up; freshness of the *fallback* is what waits.
 */
const REVALIDATE_STANDARD = 3600;
const REVALIDATE_LONG = 86400;

async function _getLandingContent(locale: Locale): Promise<ContentSection[] | null> {
  try {
    const rows = await withTimeout(getDb()
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
      .orderBy(asc(landingContentTable.sectionKey)), 'getLandingContent');
    return rows;
  } catch (e) {
    // Task 20 §3 outage behaviour: serve the static copy, log server-side, never alert the
    // visitor. `isPostgresConfigured()` is deliberately not called here — it is a
    // request/binding probe, not content, and must stay out of a cached scope.
    logOnce('warn', 'content:landing', `[content] landing content read failed for locale "${locale}", serving static fallback:`, errorMessage(e));
    return null;
  }
}

export function getLandingContent(locale: Locale): Promise<ContentSection[] | null> {
  return unstable_cache(_getLandingContent, ['landing-content', locale], {
    tags: [`content:${locale}`],
    revalidate: REVALIDATE_STANDARD,
  })(locale);
}

// --- Remaining public domains (Task 15 §5) --------------------------------------------
//
// Each read below follows `getLandingContent` exactly: one cached scope, one domain tag
// (or two for single bodies), the shared revalidation window, and a catch that degrades
// to `null` rather than throwing. Throwing here would fail the whole prerender, so a
// database outage would take the marketing page, the blog and the sitemap down together
// instead of serving static copy. Every reader therefore has a defined "empty" answer
// that the caller renders instead of an exception.

/** A navigation entry, as the header/footer render it. */
export interface MenuItem {
  label: string;
  href: string;
}

export type MenuKey = 'main' | 'footer';

/**
 * The items of one menu in one locale, or `null` when the menu has no visible rows.
 *
 * `null` is the load-bearing part: the header and footer fall back to the hardcoded
 * `landing_content.header.nav` when it comes back `null`, so an unseeded `menu_items` table
 * costs the site its DB-managed navigation and nothing else. An empty *array* would mean "the
 * admin removed every link", which is a different decision and must not be collapsed into the
 * same value.
 *
 * Only top-level items (`parentId IS NULL`) are returned. A child row is a dropdown grouping
 * hint the header does not render yet; emitting it as a sibling link would produce a
 * duplicate entry in the nav bar.
 */
async function _getMenu(key: MenuKey, locale: Locale): Promise<MenuItem[] | null> {
  try {
    // Two queries rather than one `innerJoin`: the join buys one round trip out of a read
    // that runs at most once per hour per locale, so it is not worth the fragility.
    const db = getDb();
    const [menu] = await db
      .select({ id: menusTable.id })
      .from(menusTable)
      .where(and(eq(menusTable.key, key), eq(menusTable.locale, locale)))
      .limit(1);
    if (!menu) {
      return null;
    }

    const rows = await db
      .select({ label: menuItemsTable.label, href: menuItemsTable.href })
      .from(menuItemsTable)
      .where(and(
        eq(menuItemsTable.menuId, menu.id),
        eq(menuItemsTable.isVisible, true),
        isNull(menuItemsTable.parentId),
      ))
      // `sortOrder` then `id` so two items sharing an order keep a stable relative position
      // across reads; otherwise the nav reshuffles on every save.
      .orderBy(asc(menuItemsTable.sortOrder), asc(menuItemsTable.id));
    return rows.length > 0 ? rows : null;
  } catch (e) {
    logOnce('warn', 'content:menu', `[content] menu "${key}" read failed for locale "${locale}", using hardcoded nav:`, errorMessage(e));
    return null;
  }
}

export function getMenu(key: MenuKey, locale: Locale): Promise<MenuItem[] | null> {
  return unstable_cache(_getMenu, ['menu', key, locale], {
    tags: [`menus:${key}:${locale}`],
    revalidate: REVALIDATE_STANDARD,
  })(key, locale);
}

/** A published blog post, shaped for the page. `null` when absent or not published. */
export interface BlogPostSummary {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  tags: string[];
  featuredImageUrl: string;
  readTime: string;
  seoTitle: string;
  seoDescription: string;
  /** ISO 8601, for `<time>` and the Article node. Falls back to `createdAt` when a post was
   *  published without stamping `published_at`. */
  publishedAt: string;
  lastModified: string;
}

const BLOG_SELECT = {
  slug: blogPostsTable.slug,
  title: blogPostsTable.title,
  excerpt: blogPostsTable.excerpt,
  author: blogPostsTable.author,
  category: blogPostsTable.category,
  tags: blogPostsTable.tags,
  featuredImageUrl: blogPostsTable.featuredImageUrl,
  readTime: blogPostsTable.readTime,
  seoTitle: blogPostsTable.seoTitle,
  seoDescription: blogPostsTable.seoDescription,
  publishedAt: blogPostsTable.publishedAt,
  updatedAt: blogPostsTable.updatedAt,
  createdAt: blogPostsTable.createdAt,
} as const;

/** Only published, non-soft-deleted rows ever reach a visitor or the sitemap. */
const BLOG_PUBLIC = and(
  eq(blogPostsTable.status, 'published'),
  isNull(blogPostsTable.deletedAt),
);

function toBlogSummary(row: {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  tags: unknown;
  featuredImageUrl: string | null;
  readTime: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
}): BlogPostSummary {
  // `tags` is jsonb with no schema guarantee — anything that is not an array of strings is
  // dropped rather than rendered, because it ends up inside a JSON-LD `keywords` field.
  const tags = Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [];
  const published = row.publishedAt ?? row.createdAt;
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    author: row.author,
    category: row.category,
    tags,
    featuredImageUrl: row.featuredImageUrl ?? '',
    readTime: row.readTime ?? '',
    seoTitle: row.seoTitle ?? '',
    seoDescription: row.seoDescription ?? '',
    publishedAt: published.toISOString(),
    lastModified: row.updatedAt.toISOString(),
  };
}

/**
 * Every published post, newest first — the sitemap and the blog index read the same list.
 *
 * The `updatedAt`-then-`publishedAt` order matters for a *stable* sitemap: two posts with the
 * same publish instant must not swap positions between crawls, or the sitemap churns for no
 * reason.
 */
async function _getPublishedBlogPosts(): Promise<BlogPostSummary[] | null> {
  try {
    const rows = await withTimeout(getDb()
      .select(BLOG_SELECT)
      .from(blogPostsTable)
      .where(BLOG_PUBLIC)
      .orderBy(desc(blogPostsTable.publishedAt), desc(blogPostsTable.updatedAt)), 'getPublishedBlogPosts');
    return rows.map(toBlogSummary);
  } catch (e) {
    logOnce('warn', 'content:blog-index', '[content] blog index read failed, serving static sitemap only:', errorMessage(e));
    return null;
  }
}

export function getPublishedBlogPosts(): Promise<BlogPostSummary[] | null> {
  return unstable_cache(_getPublishedBlogPosts, ['blog-posts'], {
    tags: ['blog'],
    revalidate: REVALIDATE_STANDARD,
  })();
}

/** One published post by slug, with its body. `null` when absent, draft or soft-deleted. */
async function _getBlogPost(slug: string): Promise<BlogPostSummary & { content: string } | null> {
  try {
    const [row] = await withTimeout(getDb()
      .select({ ...BLOG_SELECT, content: blogPostsTable.content })
      .from(blogPostsTable)
      .where(and(eq(blogPostsTable.slug, slug), BLOG_PUBLIC))
      .limit(1), 'getBlogPost');
    // Body uses the long window: a single document changes rarely, the index stays short.
    // A MISS is cached for the same window now (no short failure profile — see note on
    // REVALIDATE_* above); publishing the slug later clears the entry via the `blog` tag.
    if (!row) {
      return null;
    }
    return { ...toBlogSummary(row), content: row.content };
  } catch (e) {
    logOnce('warn', 'content:blog-post', `[content] blog post "${slug}" read failed, rendering not-found:`, errorMessage(e));
    return null;
  }
}

export function getBlogPost(slug: string): Promise<BlogPostSummary & { content: string } | null> {
  return unstable_cache(_getBlogPost, ['blog-post', slug], {
    tags: ['blog', `blog:${slug}`],
    revalidate: REVALIDATE_LONG,
  })(slug);
}

/** The canonical slug for a published post id, or `null` — backs the ID→slug 301. */
async function _getBlogSlugById(id: number): Promise<string | null> {
  try {
    const [row] = await withTimeout(getDb()
      .select({ slug: blogPostsTable.slug })
      .from(blogPostsTable)
      .where(and(eq(blogPostsTable.id, id), BLOG_PUBLIC))
      .limit(1), 'getBlogSlugById');
    // A miss (draft/nonexistent id) is cached for the standard window — same reasoning
    // as `getBlogPost` above.
    if (!row) {
      return null;
    }
    return row.slug;
  } catch (e) {
    logOnce('warn', 'content:blog-id', `[content] blog id "${id}" lookup failed:`, errorMessage(e));
    return null;
  }
}

export function getBlogSlugById(id: number): Promise<string | null> {
  return unstable_cache(_getBlogSlugById, ['blog-slug-by-id', String(id)], {
    tags: ['blog'],
    revalidate: REVALIDATE_STANDARD,
  })(id);
}

/**
 * Edge-context ID→slug lookup for the proxy 301 fast-path. Deliberately uncached (no
 * cache wrapper at all): `proxy.ts` runs outside any cache store, so the cached variants
 * cannot serve there. Numeric-URL hits are vanishingly rare (slugs are never numeric), so
 * an uncached bounded read is the right price for a real edge 301. Same row contract as
 * the cached variants above: published-only, `null` otherwise.
 */
export async function getSlugByIdUncached(
  kind: 'blog' | 'case-studies',
  id: number,
): Promise<string | null> {
  try {
    if (kind === 'blog') {
      const [row] = await withTimeout(getDb()
        .select({ slug: blogPostsTable.slug })
        .from(blogPostsTable)
        .where(and(eq(blogPostsTable.id, id), BLOG_PUBLIC))
        .limit(1), 'getSlugByIdUncached:blog');
      return row?.slug ?? null;
    }
    const [row] = await withTimeout(getDb()
      .select({ slug: caseStudiesTable.slug })
      .from(caseStudiesTable)
      .where(and(eq(caseStudiesTable.id, id), eq(caseStudiesTable.isPublished, true)))
      .limit(1), 'getSlugByIdUncached:case-studies');
    return row?.slug ?? null;
  } catch (e) {
    logOnce('warn', 'content:id-uncached', `[content] uncached id lookup "${kind}:${id}" failed:`, errorMessage(e));
    return null;
  }
}

/** Active pricing plans, cheapest first, plus the global visibility toggle. */
async function _getPricingPlans(): Promise<{
  isPricingVisible: boolean;
  plans: {
    slug: string;
    nameEn: string;
    nameBn: string;
    monthlyPrice: number;
    annualPrice: number;
    currency: string;
    orderVolume: string;
    usersIncluded: string;
    showroomsIncluded: string;
    featuresEn: string[];
    featuresBn: string[];
    popular: boolean;
  }[];
} | null> {
  try {
    const rows = await withTimeout(getDb()
      .select({
        slug: pricingPlansTable.slug,
        nameEn: pricingPlansTable.nameEn,
        nameBn: pricingPlansTable.nameBn,
        monthlyPrice: pricingPlansTable.monthlyPrice,
        annualPrice: pricingPlansTable.annualPrice,
        currency: pricingPlansTable.currency,
        orderVolume: pricingPlansTable.orderVolume,
        usersIncluded: pricingPlansTable.usersIncluded,
        showroomsIncluded: pricingPlansTable.showroomsIncluded,
        featuresEn: pricingPlansTable.featuresEn,
        featuresBn: pricingPlansTable.featuresBn,
        isPopular: pricingPlansTable.isPopular,
        sortOrder: pricingPlansTable.sortOrder,
        isActive: pricingPlansTable.isActive,
      })
      .from(pricingPlansTable)
      .orderBy(asc(pricingPlansTable.sortOrder), asc(pricingPlansTable.monthlyPrice)), 'getPricingPlans');

    // `is_pricing_visible` lives on the settings row. Reading it here keeps the pricing
    // domain self-contained: one tag invalidates the plans *and* the mode switch together,
    // so the two can never drift out of sync in a cached page.
    const [settings] = await withTimeout(getDb()
      .select({ isPricingVisible: siteSettingsTable.isPricingVisible })
      .from(siteSettingsTable)
      .limit(1), 'getPricingPlans');

    return {
      isPricingVisible: settings?.isPricingVisible ?? true,
      plans: rows
        .filter((row) => row.isActive)
        .map((row) => ({
          slug: row.slug,
          nameEn: row.nameEn,
          nameBn: row.nameBn,
          monthlyPrice: row.monthlyPrice,
          annualPrice: row.annualPrice,
          currency: row.currency,
          orderVolume: row.orderVolume,
          usersIncluded: row.usersIncluded,
          showroomsIncluded: row.showroomsIncluded,
          featuresEn: asStringArray(row.featuresEn),
          featuresBn: asStringArray(row.featuresBn),
          popular: row.isPopular,
        })),
    };
  } catch (e) {
    logOnce('warn', 'content:pricing', '[content] pricing read failed, serving static pricing copy:', errorMessage(e));
    return null;
  }
}

export function getPricingPlans(): Promise<Awaited<ReturnType<typeof _getPricingPlans>>> {
  return unstable_cache(_getPricingPlans, ['pricing-plans'], {
    tags: ['pricing'],
    revalidate: REVALIDATE_STANDARD,
  })();
}

/** Visible social links in display order. `null` when none are configured. */
async function _getSocialLinks(): Promise<{ platform: string; url: string }[] | null> {
  try {
    const rows = await withTimeout(getDb()
      .select({ platform: socialLinksTable.platform, url: socialLinksTable.url })
      .from(socialLinksTable)
      .where(eq(socialLinksTable.isVisible, true))
      .orderBy(asc(socialLinksTable.sortOrder), asc(socialLinksTable.platform)), 'getSocialLinks');
    return rows.length > 0 ? rows : null;
  } catch (e) {
    logOnce('warn', 'content:social', '[content] social links read failed, rendering without them:', errorMessage(e));
    return null;
  }
}

export function getSocialLinks(): Promise<{ platform: string; url: string }[] | null> {
  return unstable_cache(_getSocialLinks, ['social-links'], {
    tags: ['social'],
    revalidate: REVALIDATE_STANDARD,
  })();
}

/** One published testimonial for public rendering (2c: seeded into the landing shell). */
export interface PublicTestimonial {
  id: number;
  clientName: string;
  clientRole: string;
  companyName: string;
  quoteEn: string;
  quoteBn: string;
  logoUrl: string | null;
  videoUrl: string | null;
  videoDuration: string | null;
  videoProvider: string;
  imageUrl: string | null;
  rating: number | null;
  format: string;
  metrics: unknown;
}

/** Published testimonials, in display order. */
async function _getTestimonials(): Promise<PublicTestimonial[] | null> {
  try {
    const rows = await withTimeout(getDb()
      .select({
        id: testimonialsTable.id,
        clientName: testimonialsTable.clientName,
        clientRole: testimonialsTable.clientRole,
        companyName: testimonialsTable.companyName,
        quoteEn: testimonialsTable.quoteEn,
        quoteBn: testimonialsTable.quoteBn,
        logoUrl: testimonialsTable.logoUrl,
        videoUrl: testimonialsTable.videoUrl,
        videoDuration: testimonialsTable.videoDuration,
        videoProvider: testimonialsTable.videoProvider,
        imageUrl: testimonialsTable.imageUrl,
        rating: testimonialsTable.rating,
        format: testimonialsTable.format,
        metrics: testimonialsTable.metrics,
      })
      .from(testimonialsTable)
      .where(and(eq(testimonialsTable.isPublished, true), isNull(testimonialsTable.deletedAt)))
      .orderBy(asc(testimonialsTable.sortOrder), asc(testimonialsTable.id)), 'getTestimonials');
    return rows.length > 0 ? rows : null;
  } catch (e) {
    logOnce('warn', 'content:testimonials', '[content] testimonials read failed, serving static proof copy:', errorMessage(e));
    return null;
  }
}

export function getTestimonials(): Promise<PublicTestimonial[] | null> {
  return unstable_cache(_getTestimonials, ['testimonials'], {
    tags: ['testimonials'],
    revalidate: REVALIDATE_STANDARD,
  })();
}

/** Published case studies — the source for the case-study sitemap entries. */
async function _getCaseStudies(): Promise<{
  slug: string;
  title: string;
  client: string;
  seoDescription: string;
  featuredImageUrl: string;
  /**
   * ISO 8601 for the sitemap's `lastModified`.
   *
   * `case_studies` has no `updated_at` column — only `created_at` — so `lastModified` is
   * derived from creation rather than faked from a field that does not exist.
   */
  lastModified: string;
}[] | null> {
  try {
    const rows = await withTimeout(getDb()
      .select({
        slug: caseStudiesTable.slug,
        title: caseStudiesTable.title,
        client: caseStudiesTable.client,
        seoDescription: caseStudiesTable.seoDescription,
        featuredImageUrl: caseStudiesTable.featuredImageUrl,
        createdAt: caseStudiesTable.createdAt,
      })
      .from(caseStudiesTable)
      .where(eq(caseStudiesTable.isPublished, true))
      .orderBy(desc(caseStudiesTable.createdAt)), 'getCaseStudies');
    return rows.length > 0
      ? rows.map((row) => ({
          slug: row.slug,
          title: row.title,
          client: row.client,
          seoDescription: row.seoDescription ?? '',
          featuredImageUrl: row.featuredImageUrl ?? '',
          lastModified: row.createdAt.toISOString(),
        }))
      : null;
  } catch (e) {
    logOnce('warn', 'content:case-studies', '[content] case studies read failed, serving static sitemap only:', errorMessage(e));
    return null;
  }
}

export function getCaseStudies(): Promise<Awaited<ReturnType<typeof _getCaseStudies>>> {
  return unstable_cache(_getCaseStudies, ['case-studies'], {
    tags: ['casestudies'],
    revalidate: REVALIDATE_STANDARD,
  })();
}

/** Site branding for the header logo + favicon. `null` keeps the built-in marks. */
export interface SiteBranding {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
}

async function _getSiteBranding(): Promise<SiteBranding | null> {
  try {
    const [row] = await withTimeout(getDb()
      .select({
        siteName: siteSettingsTable.siteName,
        logoUrl: siteSettingsTable.logoUrl,
        faviconUrl: siteSettingsTable.faviconUrl,
      })
      .from(siteSettingsTable)
      .limit(1), 'getSiteBranding');
    if (!row) {
      return null;
    }
    return {
      siteName: row.siteName,
      logoUrl: row.logoUrl ?? '',
      faviconUrl: row.faviconUrl ?? '',
    };
  } catch (e) {
    logOnce('warn', 'content:branding', '[content] branding read failed, using built-in marks:', errorMessage(e));
    return null;
  }
}

export function getSiteBranding(): Promise<SiteBranding | null> {
  return unstable_cache(_getSiteBranding, ['site-branding'], {
    tags: ['branding'],
    revalidate: REVALIDATE_STANDARD,
  })();
}

/** jsonb arrays pass through `unknown`; anything that is not a string array is treated as empty. */
function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** One published case study, with its body. `null` when absent or unpublished. */
async function _getCaseStudy(slug: string): Promise<{
  slug: string;
  title: string;
  client: string;
  businessType: string;
  problemOverview: string;
  solutionImplemented: string;
  quantifiedOutcome: string;
  metrics: unknown;
  featuredImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  lastModified: string;
} | null> {
  try {
    const [row] = await withTimeout(getDb()
      .select({
        slug: caseStudiesTable.slug,
        title: caseStudiesTable.title,
        client: caseStudiesTable.client,
        businessType: caseStudiesTable.businessType,
        problemOverview: caseStudiesTable.problemOverview,
        solutionImplemented: caseStudiesTable.solutionImplemented,
        quantifiedOutcome: caseStudiesTable.quantifiedOutcome,
        metrics: caseStudiesTable.metrics,
        featuredImageUrl: caseStudiesTable.featuredImageUrl,
        seoTitle: caseStudiesTable.seoTitle,
        seoDescription: caseStudiesTable.seoDescription,
        createdAt: caseStudiesTable.createdAt,
      })
      .from(caseStudiesTable)
      .where(and(eq(caseStudiesTable.slug, slug), eq(caseStudiesTable.isPublished, true)))
      .limit(1), 'getCaseStudy');
    // Body uses the long window, same reasoning as `getBlogPost`: one document, rare edits.
    // A miss is cached for the same window now (see note on REVALIDATE_* above).
    if (!row) {
      return null;
    }
    return {
      slug: row.slug,
      title: row.title,
      client: row.client,
      businessType: row.businessType,
      problemOverview: row.problemOverview,
      solutionImplemented: row.solutionImplemented,
      quantifiedOutcome: row.quantifiedOutcome,
      metrics: row.metrics,
      featuredImageUrl: row.featuredImageUrl ?? '',
      seoTitle: row.seoTitle ?? '',
      seoDescription: row.seoDescription ?? '',
      lastModified: row.createdAt.toISOString(),
    };
  } catch (e) {
    logOnce('warn', 'content:case-study', `[content] case study "${slug}" read failed, rendering not-found:`, errorMessage(e));
    return null;
  }
}

export function getCaseStudy(slug: string): Promise<Awaited<ReturnType<typeof _getCaseStudy>>> {
  return unstable_cache(_getCaseStudy, ['case-study', slug], {
    tags: ['casestudies', `casestudies:${slug}`],
    revalidate: REVALIDATE_LONG,
  })(slug);
}

/** The canonical slug for a published case-study id, or `null` — backs the ID→slug 301. */
async function _getCaseStudySlugById(id: number): Promise<string | null> {
  try {
    const [row] = await withTimeout(getDb()
      .select({ slug: caseStudiesTable.slug })
      .from(caseStudiesTable)
      .where(and(eq(caseStudiesTable.id, id), eq(caseStudiesTable.isPublished, true)))
      .limit(1), 'getCaseStudySlugById');
    // A miss (draft/nonexistent id) is cached for the standard window — same reasoning
    // as `getBlogPost`.
    if (!row) {
      return null;
    }
    return row.slug;
  } catch (e) {
    logOnce('warn', 'content:case-study-id', `[content] case study id "${id}" lookup failed:`, errorMessage(e));
    return null;
  }
}

export function getCaseStudySlugById(id: number): Promise<string | null> {
  return unstable_cache(_getCaseStudySlugById, ['case-study-slug-by-id', String(id)], {
    tags: ['casestudies'],
    revalidate: REVALIDATE_STANDARD,
  })(id);
}

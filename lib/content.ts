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
import { errorMessage } from '@/lib/json';
import type { ContentSection } from '@/lib/merge';
import type { Locale } from '@/src/types/landing';

/** 5 min stale / 1 h revalidate / 1 day expire — content edits are rare, visitors are not. */
const CONTENT_CACHE_PROFILE = { stale: 300, revalidate: 3600, expire: 86400 } as const;

/**
 * Short profile for the failure path, so a transient outage is not cached for an hour.
 *
 * `stale` must be non-zero. A zero stale window makes the entry immediately stale, and a
 * stale entry cannot satisfy a prerender — so Next rejected every failure-path read with
 * `Route "/": Next.js encountered uncached or runtime data during prerendering` and the
 * **build failed whenever the database was unreachable**. Thirty seconds is the smallest
 * window that keeps the entry prerenderable while still refusing to memoise an outage for
 * any real length of time.
 */
const CONTENT_FAILURE_PROFILE = { stale: 30, revalidate: 60, expire: 300 } as const;

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

// --- Remaining public domains (Task 15 §5) --------------------------------------------
//
// Each read below follows `getLandingContent` exactly: one `'use cache'` scope, one domain
// tag, the shared cache profile, and a catch that degrades to `null` rather than throwing.
// Throwing here would fail the whole prerender, so a database outage would take the marketing
// page, the blog and the sitemap down together instead of serving static copy. Every reader
// therefore has a defined "empty" answer that the caller renders instead of an exception.

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
export async function getMenu(key: MenuKey, locale: Locale): Promise<MenuItem[] | null> {
  'use cache';
  cacheTag(`menus:${key}:${locale}`);
  try {
    // Two queries rather than one `innerJoin`. The join is the more obvious shape, and it was
    // written that way first — but a `'use cache'` scope that assembles a join is not
    // recognised as fully cacheable by the prerender pass, which then refuses the page.
    // A join buys one round trip out of a read that runs at most once per five minutes per
    // locale, so it is not worth the fragility.
    const db = getDb();
    const [menu] = await db
      .select({ id: menusTable.id })
      .from(menusTable)
      .where(and(eq(menusTable.key, key), eq(menusTable.locale, locale)))
      .limit(1);
    if (!menu) {
      cacheLife(CONTENT_CACHE_PROFILE);
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
    cacheLife(CONTENT_CACHE_PROFILE);
    return rows.length > 0 ? rows : null;
  } catch (e) {
    console.error(`[content] menu "${key}" read failed for locale "${locale}", using hardcoded nav:`, errorMessage(e));
    cacheLife(CONTENT_FAILURE_PROFILE);
    return null;
  }
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
export async function getPublishedBlogPosts(): Promise<BlogPostSummary[] | null> {
  'use cache';
  cacheTag('blog');
  try {
    const rows = await getDb()
      .select(BLOG_SELECT)
      .from(blogPostsTable)
      .where(BLOG_PUBLIC)
      .orderBy(desc(blogPostsTable.publishedAt), desc(blogPostsTable.updatedAt));
    cacheLife(CONTENT_CACHE_PROFILE);
    return rows.map(toBlogSummary);
  } catch (e) {
    console.error('[content] blog index read failed, serving static sitemap only:', errorMessage(e));
    cacheLife(CONTENT_FAILURE_PROFILE);
    return null;
  }
}

/** One published post by slug, with its body. `null` when absent, draft or soft-deleted. */
export async function getBlogPost(slug: string): Promise<BlogPostSummary & { content: string } | null> {
  'use cache';
  cacheTag('blog');
  cacheTag(`blog:${slug}`);
  try {
    const [row] = await getDb()
      .select({ ...BLOG_SELECT, content: blogPostsTable.content })
      .from(blogPostsTable)
      .where(and(eq(blogPostsTable.slug, slug), BLOG_PUBLIC))
      .limit(1);
    cacheLife(CONTENT_CACHE_PROFILE);
    if (!row) return null;
    return { ...toBlogSummary(row), content: row.content };
  } catch (e) {
    console.error(`[content] blog post "${slug}" read failed, rendering not-found:`, errorMessage(e));
    cacheLife(CONTENT_FAILURE_PROFILE);
    return null;
  }
}

/** Active pricing plans, cheapest first, plus the global visibility toggle. */
export async function getPricingPlans(): Promise<{
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
  'use cache';
  cacheTag('pricing');
  try {
    const rows = await getDb()
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
      .orderBy(asc(pricingPlansTable.sortOrder), asc(pricingPlansTable.monthlyPrice));

    // `is_pricing_visible` lives on the settings row. Reading it here keeps the pricing
    // domain self-contained: one tag invalidates the plans *and* the mode switch together,
    // so the two can never drift out of sync in a cached page.
    const [settings] = await getDb()
      .select({ isPricingVisible: siteSettingsTable.isPricingVisible })
      .from(siteSettingsTable)
      .limit(1);

    cacheLife(CONTENT_CACHE_PROFILE);
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
    console.error('[content] pricing read failed, serving static pricing copy:', errorMessage(e));
    cacheLife(CONTENT_FAILURE_PROFILE);
    return null;
  }
}

/** Visible social links in display order. `null` when none are configured. */
export async function getSocialLinks(): Promise<{ platform: string; url: string }[] | null> {
  'use cache';
  cacheTag('social');
  try {
    const rows = await getDb()
      .select({ platform: socialLinksTable.platform, url: socialLinksTable.url })
      .from(socialLinksTable)
      .where(eq(socialLinksTable.isVisible, true))
      .orderBy(asc(socialLinksTable.sortOrder), asc(socialLinksTable.platform));
    cacheLife(CONTENT_CACHE_PROFILE);
    return rows.length > 0 ? rows : null;
  } catch (e) {
    console.error('[content] social links read failed, rendering without them:', errorMessage(e));
    cacheLife(CONTENT_FAILURE_PROFILE);
    return null;
  }
}

/** Published testimonials, in display order. */
export async function getTestimonials(): Promise<{
  clientName: string;
  companyName: string;
  quoteEn: string;
  quoteBn: string;
  metrics: unknown;
}[] | null> {
  'use cache';
  cacheTag('testimonials');
  try {
    const rows = await getDb()
      .select({
        clientName: testimonialsTable.clientName,
        companyName: testimonialsTable.companyName,
        quoteEn: testimonialsTable.quoteEn,
        quoteBn: testimonialsTable.quoteBn,
        metrics: testimonialsTable.metrics,
      })
      .from(testimonialsTable)
      .where(and(eq(testimonialsTable.isPublished, true), isNull(testimonialsTable.deletedAt)))
      .orderBy(asc(testimonialsTable.sortOrder), asc(testimonialsTable.id));
    cacheLife(CONTENT_CACHE_PROFILE);
    return rows.length > 0 ? rows : null;
  } catch (e) {
    console.error('[content] testimonials read failed, serving static proof copy:', errorMessage(e));
    cacheLife(CONTENT_FAILURE_PROFILE);
    return null;
  }
}

/** Published case studies — the source for the case-study sitemap entries. */
export async function getCaseStudies(): Promise<{
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
  'use cache';
  cacheTag('casestudies');
  try {
    const rows = await getDb()
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
      .orderBy(desc(caseStudiesTable.createdAt));
    cacheLife(CONTENT_CACHE_PROFILE);
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
    console.error('[content] case studies read failed, serving static sitemap only:', errorMessage(e));
    cacheLife(CONTENT_FAILURE_PROFILE);
    return null;
  }
}

/** jsonb arrays pass through `unknown`; anything that is not a string array is treated as empty. */
function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** One published case study, with its body. `null` when absent or unpublished. */
export async function getCaseStudy(slug: string): Promise<{
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
  'use cache';
  cacheTag('casestudies');
  cacheTag(`casestudies:${slug}`);
  try {
    const [row] = await getDb()
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
      .limit(1);
    cacheLife(CONTENT_CACHE_PROFILE);
    if (!row) return null;
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
    console.error(`[content] case study "${slug}" read failed, rendering not-found:`, errorMessage(e));
    cacheLife(CONTENT_FAILURE_PROFILE);
    return null;
  }
}

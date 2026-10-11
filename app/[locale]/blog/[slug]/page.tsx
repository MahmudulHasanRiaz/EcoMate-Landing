/**
 * `/{locale}/blog/{slug}` — the public article page (Task 15 §2, §4).
 *
 * Reads the same `blog_posts` rows as `GET /api/blog/[idOrSlug]`, through the cached
 * `getBlogPost` helper rather than a raw query, so the page and the API cannot disagree
 * about what counts as published.
 *
 * ## Why the post body is not translated
 *
 * `blog_posts` has no `locale` column. This task ships the `/en/...` and `/bn/...` URL space
 * and the hreflang/canonical set for it, but a post's body is one stored document, so a Bangla
 * URL currently serves the English body. That is honest — the sitemap advertises both because
 * both resolve — and it is not silently papered over with a wrong `inLanguage`. Per-post
 * translation arrives with the content-locale split; until then `articleJsonLd` only claims a
 * language for the article body when the stored post actually has one.
 *
 * ## `generateStaticParams` (Task 15 addition)
 *
 * The slug list comes from the database, and under Cache Components a dynamic route that
 * cannot be enumerated at build has no shell to prerender — Next refuses it outright rather
 * than degrading. So the list is enumerated here, one entry per (locale, slug) pair.
 *
 * When the database is unreachable there is no list to enumerate, and an empty result is
 * *not* a degradation the build tolerates: Cache Components rejects a zero-entry
 * `generateStaticParams` outright, because an unenumerated dynamic route has no shell it can
 * validate. (An earlier version of this comment claimed the empty list "still works" and left
 * the pages to render on demand. It does not — the build fails.) So the empty case emits one
 * probe entry per locale instead; see `lib/prerender-probe.ts` for the full rationale and for
 * why `instant = false` was rejected.
 *
 * Recovery still costs nothing: the probe is the only prerendered path, `dynamicParams` stays
 * at its default (`true`), and the first request for a real slug renders it on demand and then
 * holds it under the `getBlogPost` cache profile — the same degradation every other read in
 * `lib/content.ts` makes.
 */
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { blogPostsTable } from '@/db/schema';
import { BlogContent } from '@/components/BlogContent';
import {
  getBlogPost,
  getBlogSlugById,
  getLandingContent,
  getPublishedBlogPosts,
  type BlogPostSummary,
} from '@/lib/content';
import { assembleLandingContent } from '@/lib/merge';
import { blogGalleryUrls, blogVideoEmbed } from '@/lib/blogMedia';
import { formatDate } from '@/lib/format';
import { LOCALES, isLocale } from '@/lib/locales';
import type { Locale } from '@/src/types/landing';
import { PRERENDER_PROBE_SLUG } from '@/lib/prerender-probe';
import {
  absoluteUrl,
  articleJsonLd,
  breadcrumbJsonLd,
  localeAlternates,
  localeHomePath,
  localeUrl,
  ogImageUrl,
  ogLocale,
  serializeJsonLd,
} from '@/lib/seo';
import { GalleryLightbox, ShareButtons } from '@/src/components/blog/BlogWidgets';
import { BlogVideoPlayer } from '@/src/components/blog/BlogVideoPlayer';
import { MkDock, MkFooter, MkHeader } from '@/src/components/v3/Chrome';

interface BlogPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

/**
 * Caching note (classic pipeline since 2026-10-09): this route stays prerendered.
 *
 * `await connection()` was tried and REVERTED: it makes every render dynamic, so the
 * static ancestor shells stream a 200 before the page's `notFound()` fires — permanently,
 * on every request. Without it, unknown slugs still serve the not-found UI with a 200
 * on a cold hit, but the result is cacheable and crawlers are kept out by the
 * `noindex` metadata below (returned for every missing post), so nothing junk is ever
 * indexed.
 *
 * Junk-cache bounding: a missing slug is cached for the standard window (no short
 * failure profile under `unstable_cache` — see docs/CACHE.md), and publishing any post
 * fires `updateTag('blog')`, which clears those entries — so a slug published later
 * appears on the next navigation regardless.
 */

const CRUMBS = { en: { home: 'Home' }, bn: { home: 'হোম' } } as const;

export async function generateStaticParams() {
  // `null` means the read failed (database unreachable); an empty array means nothing is
  // published. Both collapse to "no entries", which the build rejects — see the file header.
  const posts = (await getPublishedBlogPosts().catch(() => null)) ?? [];
  const entries = LOCALES.flatMap((locale) => posts.map((post) => ({ locale, slug: post.slug })));
  return entries.length > 0
    ? entries
    : LOCALES.map((locale) => ({ locale, slug: PRERENDER_PROBE_SLUG }));
}

async function resolvePost(slug: string): Promise<(BlogPostSummary & { content: string; contentBn?: string }) | null> {
  const cached = await getBlogPost(slug).catch(() => null);
  if (cached) return cached;

  // Direct DB fallback if cache holds transient null or has not revalidated
  try {
    const [row] = await getDb()
      .select()
      .from(blogPostsTable)
      .where(
        and(
          eq(blogPostsTable.slug, slug),
          eq(blogPostsTable.status, 'published'),
          isNull(blogPostsTable.deletedAt),
        ),
      )
      .limit(1);
    if (!row) return null;
    const tags = Array.isArray(row.tags)
      ? row.tags.filter((t): t is string => typeof t === 'string')
      : [];
    const galleryUrls = Array.isArray(row.galleryUrls)
      ? row.galleryUrls.filter((g): g is string => typeof g === 'string')
      : [];
    const pub = row.publishedAt
      ? new Date(row.publishedAt).toISOString()
      : row.createdAt
        ? new Date(row.createdAt).toISOString()
        : new Date().toISOString();
    const mod = row.updatedAt ? new Date(row.updatedAt).toISOString() : pub;
    return {
      slug: row.slug,
      title: row.title,
      titleBn: row.titleBn ?? '',
      excerpt: row.excerpt,
      excerptBn: row.excerptBn ?? '',
      content: row.content,
      contentBn: row.contentBn ?? '',
      author: row.author,
      category: row.category,
      tags,
      featuredImageUrl: row.featuredImageUrl ?? '',
      videoUrl: row.videoUrl ?? '',
      galleryUrls,
      readTime: row.readTime ?? '',
      seoTitle: row.seoTitle ?? '',
      seoTitleBn: row.seoTitleBn ?? '',
      seoDescription: row.seoDescription ?? '',
      seoDescriptionBn: row.seoDescriptionBn ?? '',
      publishedAt: pub,
      lastModified: mod,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const post = await resolvePost(slug);
  if (!post) {
    // A missing post must not advertise hreflang alternates for a URL that 404s.
    return { robots: { index: false, follow: true } };
  }

  const isBn = locale === 'bn';
  const displayTitle = (isBn && post.titleBn?.trim()) ? post.titleBn : post.title;
  const displayExcerpt = (isBn && post.excerptBn?.trim()) ? post.excerptBn : post.excerpt;
  const displaySeoTitle = (isBn && post.seoTitleBn?.trim()) ? post.seoTitleBn : post.seoTitle;
  const displaySeoDesc = (isBn && post.seoDescriptionBn?.trim()) ? post.seoDescriptionBn : post.seoDescription;

  const title = displaySeoTitle || displayTitle;
  const description = displaySeoDesc || displayExcerpt;
  const image = ogImageUrl(post.featuredImageUrl);
  const path = `blog/${post.slug}`;

  return {
    title,
    description,
    alternates: localeAlternates(locale, path),
    openGraph: {
      type: 'article',
      url: localeUrl(locale, path),
      title,
      description,
      locale: ogLocale(locale),
      publishedTime: post.publishedAt,
      modifiedTime: post.lastModified,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  // The prerender probe exists only to keep this route buildable when the database gave us no
  // slugs, so it is a 404 unconditionally — checked before the read so the outcome cannot
  // depend on database state or on an admin having typed the same string as a slug.
  if (slug === PRERENDER_PROBE_SLUG) notFound();

  // Post-name permalink (§1.5): the slug is canonical. A numeric segment that matches
  // no slug is a legacy ID URL — a published post with that id 301s to its slug.
  // Checked after the slug read so an admin-typed numeric slug keeps resolving by slug.
  let post = await resolvePost(slug);
  if (!post && /^\d+$/.test(slug)) {
    const canonical = await getBlogSlugById(Number(slug)).catch(() => null);
    // `as never`: `typedRoutes` cannot prove a computed dynamic route (same tradeoff as
    // the `homeHref` literals below, which are impossible here — the slug is dynamic).
    // The URL is built by `localeUrl`, so it is internal by construction.
    if (canonical) permanentRedirect(localeUrl(locale, `blog/${canonical}`) as never);
  }
  // A draft, a soft-deleted post and a slug that never existed are the same response to a
  // visitor: 404. Distinguishing them would leak unpublished content to anyone who guesses a
  // draft slug.
  if (!post) notFound();

  // L-41: one helper, not a re-typed ternary — flipping DEFAULT_LOCALE must not misroute.
  const homeHref = localeHomePath(locale);
  const image = ogImageUrl(post.featuredImageUrl);
  const url = localeUrl(locale, `blog/${post.slug}`);

  const isBn = locale === 'bn';
  const displayTitle = (isBn && post.titleBn?.trim()) ? post.titleBn : post.title;
  const displayExcerpt = (isBn && post.excerptBn?.trim()) ? post.excerptBn : post.excerpt;
  const displayContent = (isBn && post.contentBn?.trim()) ? post.contentBn : post.content;

  // MEDIA RULES (documented in `lib/blogMedia.ts`):
  // - Hero: `featuredImageUrl` always (gradient placeholder when empty).
  // - Video: High-quality, noise-free responsive BlogVideoPlayer directly below the hero.
  // - Gallery: grid AFTER the body, with a dependency-free lightbox.
  // - `featuredImageUrl` stays THE hero/OG image in every combination.
  const gallery = blogGalleryUrls(post.galleryUrls);

  // Detail chrome copy (`blogDetail` + `blogArchive` CMS keys, static fallback
  // when the DB is out). The Blog breadcrumb label reuses the archive eyebrow
  // so it stays CMS-driven instead of hardcoded per locale.
  const detailSections = await getLandingContent(locale).catch(() => null);
  const detailContent = assembleLandingContent(locale, detailSections);
  const detail = detailContent.blogDetail;
  const blogCrumb = detailContent.blogArchive.eyebrow;

  // Related: same category, newest first, never the current post, max 3.
  const allPosts = (await getPublishedBlogPosts().catch(() => null)) ?? [];
  const related = allPosts
    .filter((entry) => entry.slug !== post.slug && entry.category === post.category)
    .slice(0, 3);

  return (
    <div className={`mk-page min-h-screen ${locale === 'bn' ? 'font-bangla' : ''}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            articleJsonLd({
              title: displayTitle,
              description: (isBn && post.seoDescriptionBn?.trim()) ? post.seoDescriptionBn : (post.seoDescription || displayExcerpt),
              url,
              author: post.author,
              datePublished: post.publishedAt,
              dateModified: post.lastModified,
              ...(image ? { imageUrl: image } : {}),
              ...(post.videoUrl ? { videoUrl: post.videoUrl } : {}),
              galleryUrls: gallery,
              section: post.category,
              tags: post.tags,
              locale: locale as unknown as Locale,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            // Three levels now: the `/[locale]/blog` index exists, so the Blog
            // crumb resolves instead of 404ing.
            breadcrumbJsonLd(locale, [
              { name: CRUMBS[locale].home, path: '' },
              { name: blogCrumb, path: 'blog' },
              { name: displayTitle, path: `blog/${post.slug}` },
            ]),
          ),
        }}
      />

      <MkHeader />
      <main className="mk-w" style={{ paddingTop: 40, paddingBottom: 72 }}>
        <nav aria-label="Breadcrumb" className="mk-strip" style={{ marginTop: 0 }}>
          <Link href={homeHref} style={{ color: 'inherit' }}>
            {CRUMBS[locale].home}
          </Link>
          {' / '}
          <a href={localeUrl(locale, 'blog')} style={{ color: 'inherit' }}>
            {blogCrumb}
          </a>
          {' / '}
          <span aria-current="page">{displayTitle}</span>
        </nav>

        <article style={{ marginTop: 20 }}>
          <p className="mk-eyebrow">{post.category}</p>
          <h1 className="mk-h1" style={{ textAlign: 'left', margin: 0 }}>
            {displayTitle}
          </h1>
          <p className="mk-sb" style={{ maxWidth: 720 }}>
            {displayExcerpt}
          </p>

          <div
            className="mk-row"
            style={{ marginTop: 16, fontFamily: 'inherit', fontSize: 13, flexWrap: 'wrap' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <strong style={{ color: 'var(--mk-tx)' }}>{post.author}</strong>
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
              {post.readTime ? (
                <span className="inline-flex items-center gap-1">
                  <Clock size={13} aria-hidden="true" />
                  {post.readTime}
                </span>
              ) : null}
            </span>
            <ShareButtons url={url} title={displayTitle} shareLabel={detail.shareLabel} copiedLabel={detail.copiedLabel} />
          </div>

          {/* Media Presentation:
              - If featuredImageUrl: Hero image always.
              - If videoUrl: Ultra-clean, noise-free responsive BlogVideoPlayer.
              - If neither: Subtle clean gradient placeholder. */}
          {post.featuredImageUrl ? (
            // A plain `img` rather than `next/image`: the URL is an arbitrary admin-entered
            // R2 host that `images.remotePatterns` does not enumerate, and a misconfigured
            // host would throw at render time instead of degrading to a broken card.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={absoluteUrl(post.featuredImageUrl)}
              alt={displayTitle}
              loading="eager"
              style={{
                marginTop: 20,
                width: '100%',
                aspectRatio: '16/8',
                objectFit: 'cover',
                borderRadius: 6,
                border: '1px solid var(--mk-bd)',
              }}
            />
          ) : !post.videoUrl ? (
            <div
              aria-hidden="true"
              style={{
                marginTop: 20,
                width: '100%',
                aspectRatio: '16/8',
                borderRadius: 6,
                border: '1px solid var(--mk-bd)',
                background: 'linear-gradient(135deg, var(--mk-s2), var(--mk-bg))',
              }}
            />
          ) : null}

          {post.videoUrl && (
            <section aria-label={detail.videoLabel} style={{ marginTop: 20 }}>
              <BlogVideoPlayer
                videoUrl={post.videoUrl}
                title={displayTitle}
                poster={post.featuredImageUrl}
                ariaLabel={detail.videoLabel}
              />
            </section>
          )}

          <BlogContent html={displayContent} className="mk-prose" />

          {post.tags && post.tags.length > 0 && (
            <div className="mk-strip" style={{ marginTop: 24, gap: 8, flexWrap: 'wrap' }}>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                    border: '1px solid var(--mk-bd)',
                    background: 'var(--mk-s1)',
                    color: 'var(--mk-mu)',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <GalleryLightbox images={gallery} label={detail.galleryLabel} />

          <section
            aria-label={detail.authorLabel}
            className="mk-pn"
            style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: 'var(--mk-ac)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 18,
                flex: 'none',
              }}
            >
              {post.author.trim().charAt(0).toUpperCase() || 'E'}
            </span>
            <span>
              <span className="mk-pt" style={{ margin: 0 }}>
                {detail.authorLabel}
              </span>
              <span className="block font-bold" style={{ color: 'var(--mk-tx)' }}>
                {post.author}
              </span>
            </span>
          </section>

          {related.length > 0 && (
            <section aria-label={detail.relatedLabel} style={{ marginTop: 32 }}>
              <p className="mk-eyebrow">{detail.relatedLabel}</p>
              <div className="mk-g mk-c3" style={{ marginTop: 12 }}>
                {related.map((entry) => {
                  const entryTitle = (isBn && entry.titleBn?.trim()) ? entry.titleBn : entry.title;
                  return (
                    <a
                      key={entry.slug}
                      href={localeUrl(locale, `blog/${entry.slug}`)}
                      className="mk-pn block"
                      style={{ textDecoration: 'none' }}
                    >
                      <span className="mk-pt" style={{ margin: 0 }}>
                        {entry.category}
                      </span>
                      <span className="block font-bold" style={{ color: 'var(--mk-tx)', marginTop: 6 }}>
                        {entryTitle}
                      </span>
                      <span className="mk-strip" style={{ marginTop: 8 }}>
                        <time dateTime={entry.publishedAt}>{formatDate(entry.publishedAt, locale)}</time>
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          <div style={{ marginTop: 28 }}>
            <a href={localeUrl(locale, 'blog')} className="mk-btn">
              <ArrowLeft size={15} aria-hidden="true" />
              {detail.backLabel}
            </a>
          </div>
        </article>
      </main>
      <MkFooter />
      <MkDock />
    </div>
  );
}
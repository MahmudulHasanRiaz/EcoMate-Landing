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
import { BlogContent } from '@/components/BlogContent';
import { getBlogPost, getBlogSlugById, getPublishedBlogPosts } from '@/lib/content';
import { formatDate } from '@/lib/format';
import { LOCALES, isLocale } from '@/lib/locales';
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

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const post = await getBlogPost(slug);
  if (!post) {
    // A missing post must not advertise hreflang alternates for a URL that 404s.
    return { robots: { index: false, follow: true } };
  }

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
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
  const post = await getBlogPost(slug);
  if (!post && /^\d+$/.test(slug)) {
    const canonical = await getBlogSlugById(Number(slug));
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

  return (
    <div className="min-h-screen bg-[#F2F3F9] text-slate-900 dark:bg-[#07080E] dark:text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            articleJsonLd({
              title: post.title,
              description: post.seoDescription || post.excerpt,
              url,
              author: post.author,
              datePublished: post.publishedAt,
              dateModified: post.lastModified,
              ...(image ? { imageUrl: image } : {}),
              section: post.category,
              tags: post.tags,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            // Two levels, not three: there is no `/[locale]/blog` index route, so a "Blog"
            // crumb would carry an `item` that 404s — which is exactly what Google flags as a
            // broken breadcrumb. The section is still conveyed, by `articleSection` on the
            // Article node above.
            breadcrumbJsonLd(locale, [
              { name: CRUMBS[locale].home, path: '' },
              { name: post.title, path: `blog/${post.slug}` },
            ]),
          ),
        }}
      />

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        {/* `localeHomePath` returns a literal union (`'/' | '/en' | '/bn'`), not a bare
            `string`, so `typedRoutes` proves it against the route manifest. */}
        <Link
          href={homeHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {locale === 'bn' ? 'হোম' : 'Home'}
        </Link>

        <article className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            {post.category}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">{post.excerpt}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-slate-200 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-200">{post.author}</span>
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
            {post.readTime ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.readTime}
              </span>
            ) : null}
          </div>

          {post.featuredImageUrl ? (
            // A plain `img` rather than `next/image`: the URL is an arbitrary admin-entered
            // R2 host that `images.remotePatterns` does not enumerate, and a misconfigured
            // host would throw at render time instead of degrading to a broken card.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={absoluteUrl(post.featuredImageUrl)}
              alt={post.title}
              className="mt-6 w-full rounded-2xl border border-slate-200 dark:border-white/10"
              loading="eager"
            />
          ) : null}

          <BlogContent html={post.content} className="prose prose-slate mt-8 max-w-none dark:prose-invert" />
        </article>
      </main>
    </div>
  );
}
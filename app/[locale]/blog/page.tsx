/**
 * `/{locale}/blog` — the public article index (PART A3).
 *
 * Server-rendered and prerendered per locale: the post list comes through the
 * cached `getPublishedBlogPosts` helper (same rows as the sitemap), the copy
 * through the `blogArchive` CMS key with the static fallback when the DB is
 * unreachable. Filtering and load-more are client state inside
 * `BlogArchive` — no refetch. Publishing any post fires `updateTag('blog')`,
 * which refreshes this page, the detail pages and the sitemap together.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLandingContent, getPublishedBlogPosts } from '@/lib/content';
import { assembleLandingContent } from '@/lib/merge';
import { isLocale } from '@/lib/locales';
import { localeAlternates, localeUrl, ogLocale } from '@/lib/seo';
import { BlogArchive } from '@/src/components/blog/BlogArchive';
import { MkDock, MkFooter, MkHeader } from '@/src/components/v3/Chrome';
import { SectionHead } from '@/src/components/v3/SectionHead';

interface BlogIndexProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: BlogIndexProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const sections = await getLandingContent(locale).catch(() => null);
  const copy = assembleLandingContent(locale, sections).blogArchive;
  const title = `${copy.eyebrow} — ${copy.heading}`;
  return {
    title,
    description: copy.subheading,
    alternates: localeAlternates(locale, 'blog'),
    openGraph: {
      type: 'website',
      url: localeUrl(locale, 'blog'),
      title,
      description: copy.subheading,
      locale: ogLocale(locale),
    },
    twitter: { card: 'summary_large_image', title, description: copy.subheading },
  };
}

export default async function BlogIndexPage({ params }: BlogIndexProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const sections = await getLandingContent(locale).catch(() => null);
  const copy = assembleLandingContent(locale, sections).blogArchive;
  const posts = (await getPublishedBlogPosts().catch(() => null)) ?? [];

  return (
    <div className={`mk-page min-h-screen ${locale === 'bn' ? 'font-bangla' : ''}`}>
      <MkHeader />
      <main className="mk-w" style={{ paddingTop: 48, paddingBottom: 72 }}>
        <SectionHead eyebrow={copy.eyebrow} title={copy.heading} sub={copy.subheading} />
        <BlogArchive posts={posts} copy={copy} locale={locale} />
      </main>
      <MkFooter />
      <MkDock />
    </div>
  );
}

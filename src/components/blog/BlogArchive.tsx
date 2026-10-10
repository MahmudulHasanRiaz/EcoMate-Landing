'use client';

/**
 * Blog archive island: featured post + category chips + card grid + load more.
 *
 * Filtering and paging are pure client state over the server-fetched post
 * list — no refetch, no backend. Every string arrives via props from the CMS
 * `blogArchive` key; categories derive from the posts themselves.
 */
import { useMemo, useState } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import type { BlogPostSummary } from '@/lib/content';
import { formatDate } from '@/lib/format';
import type { LandingContent, Locale } from '@/src/types/landing';
import { absoluteUrl } from '@/lib/seo';

const PAGE_SIZE = 6;

type Copy = LandingContent['blogArchive'];

function PostImage({ post, large }: { post: BlogPostSummary; large?: boolean }) {
  if (!post.featuredImageUrl) {
    return (
      <div
        aria-hidden="true"
        className={`w-full ${large ? 'aspect-[16/8]' : 'aspect-[16/9]'} rounded-t-md bg-gradient-to-br from-indigo-600/40 via-purple-600/25 to-transparent`}
      />
    );
  }
  // Plain `img`: admin-entered R2 hosts are not enumerated in
  // `images.remotePatterns`, and a misconfigured host must degrade to a
  // broken card, never throw at render time.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={absoluteUrl(post.featuredImageUrl)}
      alt=""
      loading="lazy"
      className={`w-full ${large ? 'aspect-[16/8]' : 'aspect-[16/9]'} rounded-t-md object-cover`}
    />
  );
}

function Meta({ post, locale }: { post: BlogPostSummary; locale: Locale }) {
  return (
    <p className="mk-strip" style={{ marginTop: 8 }}>
      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
      {post.readTime ? (
        <span className="inline-flex items-center gap-1" style={{ marginLeft: 12 }}>
          <Clock size={12} aria-hidden="true" />
          {post.readTime}
        </span>
      ) : null}
    </p>
  );
}

export function BlogArchive({
  posts,
  copy,
  locale,
}: {
  posts: BlogPostSummary[];
  copy: Copy;
  locale: Locale;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const post of posts) {
      const key = post.category.trim() || '—';
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return [...seen.keys()].sort();
  }, [posts]);

  const filtered = category ? posts.filter((post) => post.category === category) : posts;
  const [featured, ...rest] = filtered;
  const shown = rest.slice(0, visible);
  const base = `/${locale}/blog`;

  return (
    <div>
      {featured && (
        <a
          href={`${base}/${featured.slug}`}
          className="mk-pn mk-pn-hl block overflow-hidden p-0 no-underline"
          style={{ textDecoration: 'none', padding: 0 }}
        >
          <PostImage post={featured} large />
          <span className="block p-5">
            <span className="mk-eyebrow">
              {copy.featuredLabel} · {featured.category}
            </span>
            <span className="mk-h2 block" style={{ fontSize: 24 }}>
              {featured.title}
            </span>
            <span className="mk-sb block">{featured.excerpt}</span>
            <Meta post={featured} locale={locale} />
          </span>
        </a>
      )}

      {categories.length > 1 && (
        <div className="mk-tabs" role="group" aria-label={copy.allLabel} style={{ margin: '20px 0 4px' }}>
          <button
            type="button"
            data-on={category === null}
            className="mk-tab"
            aria-pressed={category === null}
            onClick={() => {
              setCategory(null);
              setVisible(PAGE_SIZE);
            }}
          >
            {copy.allLabel}
          </button>
          {categories.map((entry) => (
            <button
              key={entry}
              type="button"
              data-on={category === entry}
              className="mk-tab"
              aria-pressed={category === entry}
              onClick={() => {
                setCategory(entry);
                setVisible(PAGE_SIZE);
              }}
            >
              {entry}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p style={{ marginTop: 20, color: 'var(--mk-mu)' }}>
          {copy.emptyLabel}
        </p>
      ) : (
        <div className="mk-g mk-c3" style={{ marginTop: 16 }}>
          {shown.map((post) => (
            <a
              key={post.slug}
              href={`${base}/${post.slug}`}
              className="mk-pn block overflow-hidden"
              style={{ textDecoration: 'none', padding: 0 }}
            >
              <PostImage post={post} />
              <span className="block p-4">
                <span className="mk-eyebrow">{post.category}</span>
                <span className="block font-bold" style={{ color: 'var(--mk-tx)', marginTop: 6 }}>
                  {post.title}
                </span>
                <span className="block text-sm" style={{ marginTop: 6, color: 'var(--mk-mu)' }}>
                  {post.excerpt}
                </span>
                <Meta post={post} locale={locale} />
              </span>
            </a>
          ))}
        </div>
      )}

      {rest.length > visible && (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button type="button" className="mk-btn" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
            {copy.loadMoreLabel}
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

/**
 * Blog archive island: featured post + category chips + search filter + card grid + load more.
 *
 * Filtering and paging are pure client state over the server-fetched post
 * list — no refetch, no backend. Every string arrives via props from the CMS
 * `blogArchive` key; categories derive from the posts themselves.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock, Search, Video, FileText } from 'lucide-react';
import type { BlogPostSummary } from '@/lib/content';
import { formatDate } from '@/lib/format';
import type { LandingContent, Locale } from '@/src/types/landing';
import { absoluteUrl } from '@/lib/seo';

const PAGE_SIZE = 6;

type Copy = LandingContent['blogArchive'];

function PostImage({ post, large }: { post: BlogPostSummary; large?: boolean }) {
  const hasVideo = Boolean(post.videoUrl && post.videoUrl.trim());

  if (!post.featuredImageUrl) {
    if (hasVideo) {
      return (
        <div
          aria-hidden="true"
          className={`relative w-full ${large ? 'aspect-[16/8]' : 'aspect-[16/9]'} rounded-t-md bg-gradient-to-br from-indigo-950 via-slate-900 to-black flex items-center justify-center border-b border-[var(--mk-bd)]`}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xs text-white text-xs font-semibold">
            <Video size={14} className="text-red-400" />
            <span>Video Article</span>
          </div>
        </div>
      );
    }

    return (
      <div
        aria-hidden="true"
        className={`w-full ${large ? 'aspect-[16/8]' : 'aspect-[16/9]'} rounded-t-md bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-transparent border-b border-[var(--mk-bd)]`}
      />
    );
  }

  return (
    <div className="relative w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={absoluteUrl(post.featuredImageUrl)}
        alt=""
        loading="lazy"
        className={`w-full ${large ? 'aspect-[16/8]' : 'aspect-[16/9]'} rounded-t-md object-cover transition-transform duration-300 hover:scale-[1.02]`}
      />
      {hasVideo && (
        <span
          className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-white shadow-xs"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <Video size={12} className="text-red-400" />
          <span>Video</span>
        </span>
      )}
    </div>
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
  posts: initialPosts,
  copy,
  locale,
}: {
  posts: BlogPostSummary[];
  copy: Copy;
  locale: Locale;
}) {
  const [posts, setPosts] = useState<BlogPostSummary[]>(initialPosts);
  const [category, setCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    if (initialPosts && initialPosts.length > 0) {
      setPosts(initialPosts);
      return;
    }

    let cancelled = false;
    fetch('/api/blog')
      .then((res) => (res.ok ? res.json() : null))
      .then((body: unknown) => {
        if (cancelled || typeof body !== 'object' || body === null) return;
        const candidate = body as { data?: unknown };
        const rawList = Array.isArray(candidate.data)
          ? candidate.data
          : Array.isArray(body)
            ? (body as unknown[])
            : [];
        if (rawList.length > 0) {
          const mapped: BlogPostSummary[] = rawList
            .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
            .map((item) => {
              const tags = Array.isArray(item.tags)
                ? item.tags.filter((t): t is string => typeof t === 'string')
                : [];
              const galleryUrls = Array.isArray(item.galleryUrls)
                ? item.galleryUrls.filter((g): g is string => typeof g === 'string')
                : [];
              const pub =
                typeof item.publishedAt === 'string'
                  ? item.publishedAt
                  : typeof item.createdAt === 'string'
                    ? item.createdAt
                    : new Date().toISOString();
              const mod =
                typeof item.updatedAt === 'string'
                  ? item.updatedAt
                  : pub;
              return {
                slug: String(item.slug || ''),
                title: String(item.title || ''),
                titleBn: typeof item.titleBn === 'string' ? item.titleBn : '',
                excerpt: String(item.excerpt || ''),
                excerptBn: typeof item.excerptBn === 'string' ? item.excerptBn : '',
                author: String(item.author || 'EcoMate Operations Research'),
                category: String(item.category || 'Operations & Fulfillment'),
                tags,
                featuredImageUrl: typeof item.featuredImageUrl === 'string' ? item.featuredImageUrl : '',
                videoUrl: typeof item.videoUrl === 'string' ? item.videoUrl : '',
                galleryUrls,
                readTime: typeof item.readTime === 'string' ? item.readTime : '',
                seoTitle: typeof item.seoTitle === 'string' ? item.seoTitle : '',
                seoDescription: typeof item.seoDescription === 'string' ? item.seoDescription : '',
                publishedAt: pub,
                lastModified: mod,
              };
            });
          setPosts(mapped);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [initialPosts]);

  const getPostTitle = (p: BlogPostSummary) => (locale === 'bn' && p.titleBn?.trim()) ? p.titleBn : p.title;
  const getPostExcerpt = (p: BlogPostSummary) => (locale === 'bn' && p.excerptBn?.trim()) ? p.excerptBn : p.excerpt;

  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const post of posts) {
      const key = post.category.trim() || '—';
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return [...seen.keys()].sort();
  }, [posts]);

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      const matchesCat = !category || post.category === category;
      const q = searchQuery.trim().toLowerCase();
      const pTitle = getPostTitle(post).toLowerCase();
      const pExcerpt = getPostExcerpt(post).toLowerCase();
      const matchesQuery =
        !q ||
        pTitle.includes(q) ||
        post.title.toLowerCase().includes(q) ||
        pExcerpt.includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q) ||
        (post.tags && post.tags.some((t) => t.toLowerCase().includes(q)));
      return matchesCat && matchesQuery;
    });
  }, [posts, category, searchQuery, locale]);

  const [featured, ...rest] = filtered;
  const shown = rest.slice(0, visible);
  const base = `/${locale}/blog`;

  const searchPlaceholder =
    locale === 'bn' ? 'আর্টিকেল খুঁজুন (শিরোনাম বা বিষয়)…' : 'Search problem-solving guides…';

  return (
    <div>
      {/* Search Bar & Category Controls */}
      <div style={{ marginTop: 24, marginBottom: 20 }}>
        <div
          style={{
            position: 'relative',
            maxWidth: 480,
            marginBottom: 16,
          }}
        >
          <Search
            size={15}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--mk-mu)',
            }}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder={searchPlaceholder}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: 8,
              border: '1px solid var(--mk-bd)',
              background: 'var(--mk-s1)',
              color: 'var(--mk-tx)',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {categories.length > 1 && (
          <div className="mk-tabs" role="group" aria-label={copy.allLabel} style={{ margin: 0 }}>
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
      </div>

      {filtered.length === 0 ? (
        <div
          className="mk-pn"
          style={{
            marginTop: 32,
            padding: '48px 24px',
            textAlign: 'center',
            borderRadius: 8,
            border: '1px dashed var(--mk-bd)',
          }}
        >
          <FileText size={32} style={{ margin: '0 auto 12px', color: 'var(--mk-mu)' }} />
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--mk-tx)' }}>
            {copy.emptyLabel}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mk-btn"
              style={{ marginTop: 16 }}
            >
              {locale === 'bn' ? 'ফিল্টার মুছুন' : 'Clear search'}
            </button>
          )}
        </div>
      ) : (
        <>
          {featured && (
            <a
              href={`${base}/${featured.slug}`}
              className="mk-pn mk-pn-hl block overflow-hidden p-0 no-underline"
              style={{ textDecoration: 'none', padding: 0 }}
            >
              <PostImage post={featured} large />
              <span className="block p-5 sm:p-6">
                <span className="mk-eyebrow">
                  {copy.featuredLabel} · {featured.category}
                </span>
                <span className="mk-h2 block" style={{ fontSize: 24, marginTop: 4 }}>
                  {getPostTitle(featured)}
                </span>
                <span className="mk-sb block" style={{ marginTop: 8 }}>
                  {getPostExcerpt(featured)}
                </span>

                {featured.tags && featured.tags.length > 0 && (
                  <span className="mk-strip" style={{ marginTop: 12, gap: 6 }}>
                    {featured.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 11,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'var(--mk-s2)',
                          color: 'var(--mk-mu)',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </span>
                )}

                <Meta post={featured} locale={locale} />
              </span>
            </a>
          )}

          {shown.length > 0 && (
            <div className="mk-g mk-c3" style={{ marginTop: 24 }}>
              {shown.map((post) => (
                <a
                  key={post.slug}
                  href={`${base}/${post.slug}`}
                  className="mk-pn block overflow-hidden"
                  style={{ textDecoration: 'none', padding: 0 }}
                >
                  <PostImage post={post} />
                  <span className="block p-4 sm:p-5">
                    <span className="mk-eyebrow">{post.category}</span>
                    <span
                      className="block font-bold"
                      style={{ color: 'var(--mk-tx)', marginTop: 6, fontSize: 16, lineHeight: 1.35 }}
                    >
                      {getPostTitle(post)}
                    </span>
                    <span className="block text-sm" style={{ marginTop: 8, color: 'var(--mk-mu)', lineHeight: 1.5 }}>
                      {getPostExcerpt(post)}
                    </span>

                    {post.tags && post.tags.length > 0 && (
                      <span className="mk-strip" style={{ marginTop: 10, gap: 4 }}>
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: 10,
                              padding: '2px 5px',
                              borderRadius: 3,
                              background: 'var(--mk-s2)',
                              color: 'var(--mk-mu)',
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </span>
                    )}

                    <Meta post={post} locale={locale} />
                  </span>
                </a>
              ))}
            </div>
          )}

          {rest.length > visible && (
            <div style={{ marginTop: 32, textAlign: 'center' }}>
              <button
                type="button"
                className="mk-btn"
                onClick={() => setVisible((count) => count + PAGE_SIZE)}
              >
                {copy.loadMoreLabel}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

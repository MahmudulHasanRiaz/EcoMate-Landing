import { describe, expect, it } from 'vitest';
import {
  absoluteMediaUrl,
  blogGalleryUrls,
  blogMediaLayout,
  blogVideoEmbed,
  moveGalleryItem,
} from '@/lib/blogMedia';
import {
  articleJsonLd,
  breadcrumbJsonLd,
  localeAlternates,
} from '@/lib/seo';

/**
 * Blog media rules (PART A2): hero always featured image, video below hero,
 * gallery after body, video-first ordering, featured stays the OG image.
 */
describe('blog media rules (lib/blogMedia.ts)', () => {
  it('embeds YouTube links as nocookie URLs, rejects everything else', () => {
    expect(blogVideoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
    );
    expect(blogVideoEmbed('')).toBeNull();
    expect(blogVideoEmbed('https://example.com/video.mp4')).toBeNull();
  });

  it('cleans gallery lists: drops blanks, dedupes, keeps order', () => {
    expect(blogGalleryUrls(['  ', '/media/a.webp', '/media/a.webp', 'https://x/y.png'])).toEqual([
      '/media/a.webp',
      'https://x/y.png',
    ]);
    expect(blogGalleryUrls([])).toEqual([]);
  });

  it('resolves absolute URLs same-origin for relative media paths', () => {
    expect(absoluteMediaUrl('/media/a.webp', 'https://ecomate.bd')).toBe(
      'https://ecomate.bd/media/a.webp',
    );
    expect(absoluteMediaUrl('https://cdn.x/a.png', 'https://ecomate.bd')).toBe('https://cdn.x/a.png');
    expect(absoluteMediaUrl('', 'https://ecomate.bd')).toBe('');
  });

  it('layout: video below hero, gallery after body, both together', () => {
    expect(blogMediaLayout({ videoUrl: '', galleryUrls: [] })).toEqual({ hasVideo: false, gallery: [] });
    const both = blogMediaLayout({
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      galleryUrls: ['/media/a.webp'],
    });
    expect(both.hasVideo).toBe(true);
    expect(both.gallery).toEqual(['/media/a.webp']);
  });

  it('reorders gallery entries, ignores out-of-range moves', () => {
    expect(moveGalleryItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveGalleryItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveGalleryItem(['a'], 0, 1)).toEqual(['a']);
    expect(moveGalleryItem(['a', 'b'], 5, -1)).toEqual(['a', 'b']);
  });
});

/**
 * Blog SEO contract (PART A4): article node, three-level breadcrumbs with a
 * resolvable Blog crumb, and per-locale alternates for the index.
 */
describe('blog SEO (lib/seo.ts)', () => {
  it('article node carries headline, image, dates and author', () => {
    const node = articleJsonLd({
      title: 'T',
      description: 'D',
      url: 'https://ecomate.bd/en/blog/slug',
      author: 'A',
      datePublished: '2026-01-01T00:00:00.000Z',
      dateModified: '2026-01-02T00:00:00.000Z',
      imageUrl: 'https://ecomate.bd/media/hero.webp',
      section: 'Ops',
      tags: ['a'],
    });
    expect(node['@type']).toBe('Article');
    expect(node.headline).toBe('T');
    expect(node.image).toEqual(['https://ecomate.bd/media/hero.webp']);
    expect(node.author).toMatchObject({ name: 'A' });
  });

  it('breadcrumbs include the resolvable Blog index crumb', () => {
    const crumbs = breadcrumbJsonLd('en', [
      { name: 'Home', path: '' },
      { name: 'Blog', path: 'blog' },
      { name: 'Post', path: 'blog/slug' },
    ]);
    const items = crumbs.itemListElement as { position: number; name: string; item: string }[];
    expect(items).toHaveLength(3);
    expect(items[1]).toMatchObject({ position: 2, name: 'Blog' });
    expect(items[1]?.item).toContain('/en/blog');
  });

  it('alternates advertise the blog index per locale', () => {
    const alt = localeAlternates('bn', 'blog');
    expect(alt.canonical).toContain('/bn/blog');
    expect(alt.languages.bn).toContain('/bn/blog');
    expect(alt.languages.en).toContain('/en/blog');
  });
});

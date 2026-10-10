import { z } from 'zod';
import { BLOG_STATUSES } from '@/lib/blog';

const slug = z.string().regex(/^[a-z0-9-]{2,60}$/);

/**
 * Absolute URLs (`https://…`) or same-origin media paths (`/media/…`).
 * Gallery/video inputs come from the media library, whose URLs are relative,
 * so a bare `z.url()` would reject every library pick.
 */
const mediaUrlOrEmpty = z.union([z.url(), z.literal(''), z.string().regex(/^\/[^\s]*$/)]);

const base = {
  title: z.string().min(1).max(200),
  slug,
  excerpt: z.string().max(500),
  content: z.string().max(100_000),
  author: z.string().max(120),
  category: z.string().max(80),
  tags: z.array(z.string().max(60)).max(20),
  featuredImageUrl: z.union([z.url(), z.literal('')]),
  /** Optional YouTube link — rendered as a nocookie embed below the hero. */
  videoUrl: mediaUrlOrEmpty,
  /** Optional gallery image URLs — rendered as a grid after the body. */
  galleryUrls: z.array(z.string().min(1).max(500)).max(24),
  readTime: z.string().max(40),
  status: z.enum(BLOG_STATUSES),
  seoTitle: z.string().max(70),
  seoDescription: z.string().max(200),
  canonicalUrl: z.union([z.url(), z.literal('')]),
  ogImageUrl: z.union([z.url(), z.literal('')]),
  publishedAt: z.iso.datetime(),
};

export const blogPostCreate = z.strictObject({
  title: base.title,
  // Optional: omitted when the admin leaves slug generation to the route, which derives
  // it from the title (post-name permalink, §1.5) + numeric suffix on collision.
  slug: base.slug.optional(),
  content: z.string().min(1).max(100_000),
  excerpt: base.excerpt.optional(),
  author: base.author.optional(),
  category: base.category.optional(),
  tags: base.tags.optional(),
  featuredImageUrl: base.featuredImageUrl.optional(),
  videoUrl: base.videoUrl.optional(),
  galleryUrls: base.galleryUrls.optional(),
  readTime: base.readTime.optional(),
  status: base.status.optional(),
  seoTitle: base.seoTitle.optional(),
  seoDescription: base.seoDescription.optional(),
  canonicalUrl: base.canonicalUrl.optional(),
  ogImageUrl: base.ogImageUrl.optional(),
  publishedAt: base.publishedAt.optional(),
});

export const blogPostUpdate = z.strictObject({
  title: base.title.optional(),
  excerpt: base.excerpt.optional(),
  content: z.string().min(1).max(100_000).optional(),
  author: base.author.optional(),
  category: base.category.optional(),
  tags: base.tags.optional(),
  featuredImageUrl: base.featuredImageUrl.optional(),
  videoUrl: base.videoUrl.optional(),
  galleryUrls: base.galleryUrls.optional(),
  readTime: base.readTime.optional(),
  status: base.status.optional(),
  seoTitle: base.seoTitle.optional(),
  seoDescription: base.seoDescription.optional(),
  canonicalUrl: base.canonicalUrl.optional(),
  ogImageUrl: base.ogImageUrl.optional(),
  // `null` keeps the existing "never silently re-dated" contract: only an explicit ISO
  // string touches the column, anything else leaves it alone.
  publishedAt: z.union([base.publishedAt, z.null()]).optional(),
});

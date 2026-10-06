/**
 * Allowlisted input mapping for blog posts.
 *
 * Same contract as `lib/pricing.ts`: the create and the update handler both map the
 * request body through here, so the field list has exactly one home and a body can never
 * be spread straight into `.values()` / `.set()`. A spread would let a caller overwrite
 * any column this API never intended to expose (`id`, `created_at`, `deleted_at`, ...).
 *
 * `slug` is creatable but not updatable: it is the stable, indexed, SEO-visible
 * identifier. Task 17 replaces these hand-written allowlists with declarative Zod schemas.
 */
import type { JsonObject } from '@/lib/json';
import { optionalString, readIsoDate, readString, readStringArray } from '@/lib/json';

/** The only statuses the DB CHECK constraint (`blog_posts_status_valid`) accepts. */
export const BLOG_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export function normalizeBlogStatus(value: unknown, fallback: BlogStatus): BlogStatus {
  return typeof value === 'string' && (BLOG_STATUSES as readonly string[]).includes(value)
    ? (value as BlogStatus)
    : fallback;
}

export function readBlogPostCreate(body: JsonObject) {
  const status = normalizeBlogStatus(body.status, 'draft');
  const publishedAt = readIsoDate(body.publishedAt);
  return {
    slug: readString(body.slug).trim(),
    title: readString(body.title).trim(),
    excerpt: readString(body.excerpt).trim(),
    content: readString(body.content).trim(),
    author: readString(body.author, 'EcoMate Engineering Team').trim(),
    category: readString(body.category, 'Operations & Fulfillment').trim(),
    tags: readStringArray(body.tags),
    featuredImageUrl: readString(body.featuredImageUrl).trim(),
    readTime: readString(body.readTime, '5 min read').trim(),
    status,
    seoTitle: readString(body.seoTitle).trim(),
    seoDescription: readString(body.seoDescription).trim(),
    canonicalUrl: readString(body.canonicalUrl).trim(),
    // A post published without a date would sort nowhere and never appear in the sitemap;
    // stamp it at the moment it goes live.
    publishedAt: publishedAt ?? (status === 'published' ? new Date() : undefined),
  };
}

/** Partial update: every field is optional and only present keys are written. */
export function readBlogPostPatch(body: JsonObject) {
  return {
    title: optionalString(body.title),
    excerpt: optionalString(body.excerpt),
    content: optionalString(body.content),
    author: optionalString(body.author),
    category: optionalString(body.category),
    tags: body.tags === undefined ? undefined : readStringArray(body.tags),
    featuredImageUrl: optionalString(body.featuredImageUrl),
    readTime: optionalString(body.readTime),
    status: body.status === undefined ? undefined : normalizeBlogStatus(body.status, 'draft'),
    seoTitle: optionalString(body.seoTitle),
    seoDescription: optionalString(body.seoDescription),
    canonicalUrl: optionalString(body.canonicalUrl),
    // Only touched when the caller sends one explicitly — never silently re-dated.
    publishedAt: readIsoDate(body.publishedAt),
    updatedAt: new Date(),
  };
}

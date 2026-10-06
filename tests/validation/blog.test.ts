import { describe, expect, it } from 'vitest';
import { blogPostCreate, blogPostUpdate } from '@/lib/validation';

const valid = {
  title: 'How to reconcile COD at scale',
  slug: 'cod-reconciliation-guide',
  excerpt: 'A practical guide to courier reconciliation.',
  content: '<p>Count every parcel.</p>',
  author: 'EcoMate Engineering Team',
  category: 'Operations & Fulfillment',
  tags: ['courier', 'cod'],
  featuredImageUrl: 'https://media.ecomate.app/media/2026/01/cod.png',
  readTime: '5 min read',
  status: 'published',
  seoTitle: 'COD reconciliation',
  seoDescription: 'Reconcile COD without spreadsheets.',
  canonicalUrl: '',
  publishedAt: '2026-10-01T00:00:00.000Z',
} as const;

describe('blogPostCreate', () => {
  it('accepts a fully-valid representative payload', () => {
    expect(blogPostCreate.safeParse({ ...valid }).success).toBe(true);
  });

  it('rejects an unknown key (strictObject proof)', () => {
    expect(blogPostCreate.safeParse({ ...valid, id: 1 }).success).toBe(false);
    expect(blogPostCreate.safeParse({ ...valid, deletedAt: null }).success).toBe(false);
  });

  it('rejects oversized / out-of-range / malformed values', () => {
    expect(blogPostCreate.safeParse({ slug: 'x', title: 't', content: 'c' }).success).toBe(false);
    expect(blogPostCreate.safeParse({ ...valid, slug: 'UPPER' }).success).toBe(false);
    expect(blogPostCreate.safeParse({ ...valid, title: '' }).success).toBe(false);
    expect(blogPostCreate.safeParse({ ...valid, title: 'x'.repeat(201) }).success).toBe(false);
    expect(blogPostCreate.safeParse({ ...valid, content: '' }).success).toBe(false);
    expect(blogPostCreate.safeParse({ ...valid, content: 'x'.repeat(100_001) }).success).toBe(false);
    expect(blogPostCreate.safeParse({ ...valid, status: 'viral' }).success).toBe(false);
    expect(blogPostCreate.safeParse({ ...valid, tags: Array(21).fill('x') }).success).toBe(false);
    expect(blogPostCreate.safeParse({ ...valid, publishedAt: 'tomorrow' }).success).toBe(false);
  });

  it('requires title, slug and content', () => {
    expect(blogPostCreate.safeParse({ title: 't', slug: 'ok-slug' }).success).toBe(false);
    expect(blogPostCreate.safeParse({ title: 't', content: 'c' }).success).toBe(false);
    expect(blogPostCreate.safeParse({ slug: 'ok-slug', content: 'c' }).success).toBe(false);
  });
});

describe('blogPostUpdate', () => {
  it('accepts an all-optional partial and rejects slug writes', () => {
    expect(blogPostUpdate.safeParse({}).success).toBe(true);
    expect(blogPostUpdate.safeParse({ title: 'New title' }).success).toBe(true);
    expect(blogPostUpdate.safeParse({ slug: 'new-slug' }).success).toBe(false);
  });
});

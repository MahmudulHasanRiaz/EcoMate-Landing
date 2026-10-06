import { describe, expect, it } from 'vitest';
import { contentUpsert } from '@/lib/validation';

const valid = {
  sectionKey: 'hero',
  locale: 'en',
  content: { headline: 'Run your entire operation', cta: 'Book a demo' },
  status: 'published',
} as const;

describe('contentUpsert', () => {
  it('accepts a fully-valid representative payload', () => {
    expect(contentUpsert.safeParse({ ...valid }).success).toBe(true);
  });

  it('rejects an unknown key (strictObject proof)', () => {
    expect(contentUpsert.safeParse({ ...valid, version: 99 }).success).toBe(false);
    expect(contentUpsert.safeParse({ ...valid, deletedAt: null }).success).toBe(false);
  });

  it('rejects malformed section keys, locales, content and status', () => {
    expect(contentUpsert.safeParse({ ...valid, sectionKey: 'Hero!' }).success).toBe(false);
    expect(contentUpsert.safeParse({ ...valid, sectionKey: '' }).success).toBe(false);
    expect(contentUpsert.safeParse({ ...valid, locale: 'fr' }).success).toBe(false);
    expect(contentUpsert.safeParse({ ...valid, content: ['not', 'an', 'object'] }).success).toBe(false);
    expect(contentUpsert.safeParse({ ...valid, content: 'headline' }).success).toBe(false);
    expect(contentUpsert.safeParse({ ...valid, status: 'archived' }).success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { mediaCreate, mediaUpdate, mediaUploadMeta } from '@/lib/validation';

const valid = {
  key: 'media/2026/01/hero-abc123.jpg',
  title: 'Homepage hero',
  url: 'https://media.ecomate.app/media/2026/01/hero-abc123.jpg',
  altText: 'Warehouse team scanning parcels',
  category: 'hero',
} as const;

describe('mediaCreate', () => {
  it('accepts a fully-valid representative payload', () => {
    expect(mediaCreate.safeParse({ ...valid }).success).toBe(true);
  });

  it('rejects an unknown key (strictObject proof)', () => {
    expect(mediaCreate.safeParse({ ...valid, deletedAt: null }).success).toBe(false);
  });

  it('refuses publish without altText', () => {
    expect(mediaCreate.safeParse({ ...valid, altText: '' }).success).toBe(false);
    const { altText: _a, ...noAlt } = valid;
    void _a;
    expect(mediaCreate.safeParse(noAlt).success).toBe(false);
  });

  it('rejects unknown categories and malformed urls', () => {
    expect(mediaCreate.safeParse({ ...valid, category: 'meme' }).success).toBe(false);
    expect(mediaCreate.safeParse({ ...valid, url: 'not a url' }).success).toBe(false);
  });
});

describe('mediaUpdate', () => {
  it('accepts partial patches but never an emptied altText', () => {
    expect(mediaUpdate.safeParse({ title: 'New title' }).success).toBe(true);
    expect(mediaUpdate.safeParse({ altText: '' }).success).toBe(false);
    expect(mediaUpdate.safeParse({ deletedAt: null }).success).toBe(false);
  });
});

describe('mediaUploadMeta', () => {
  it('accepts absent meta and rejects malformed present meta', () => {
    expect(mediaUploadMeta.safeParse({}).success).toBe(true);
    expect(mediaUploadMeta.safeParse({ category: 'hero' }).success).toBe(true);
    expect(mediaUploadMeta.safeParse({ category: 'meme' }).success).toBe(false);
    expect(mediaUploadMeta.safeParse({ file: 'x' }).success).toBe(false);
  });
});

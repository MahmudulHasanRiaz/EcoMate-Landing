import { describe, expect, it } from 'vitest';
import { mediaConfirmRequest, mediaCreate, mediaSignRequest, mediaUpdate, mediaUploadMeta } from '@/lib/validation';

const valid = {
  key: 'media/2026/01/hero-abc123.jpg',
  title: 'Homepage hero',
  url: 'https://media.ecomate.bd/media/2026/01/hero-abc123.jpg',
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

describe('mediaSignRequest', () => {
  const sign = {
    filename: 'hero.jpg',
    contentType: 'image/jpeg',
    size: 1024,
    title: 'Homepage hero',
    altText: 'Warehouse team scanning parcels',
    category: 'hero',
  } as const;

  it('accepts an allowlisted image declaration', () => {
    expect(mediaSignRequest.safeParse({ ...sign }).success).toBe(true);
    expect(mediaSignRequest.safeParse({ filename: 'a.png', contentType: 'image/png', size: 1 }).success).toBe(true);
  });

  it('rejects non-image types, oversize and unknown keys', () => {
    // SVG/HTML must never be presigned (stored-XSS on the media origin).
    expect(mediaSignRequest.safeParse({ ...sign, contentType: 'image/svg+xml' }).success).toBe(false);
    expect(mediaSignRequest.safeParse({ ...sign, contentType: 'text/html' }).success).toBe(false);
    expect(mediaSignRequest.safeParse({ ...sign, size: 6 * 1024 * 1024 }).success).toBe(false);
    expect(mediaSignRequest.safeParse({ ...sign, size: 0 }).success).toBe(false);
    expect(mediaSignRequest.safeParse({ ...sign, key: 'x' }).success).toBe(false);
  });
});

describe('mediaConfirmRequest', () => {
  it('accepts backend-minted keys and rejects client-invented ones', () => {
    const base = { title: 'Homepage hero', altText: 'Warehouse team scanning parcels' };
    expect(mediaConfirmRequest.safeParse({ ...base, key: 'media/2026/01/hero-abc123.jpg' }).success).toBe(true);
    expect(mediaConfirmRequest.safeParse({ ...base, key: '../../etc/passwd' }).success).toBe(false);
    expect(mediaConfirmRequest.safeParse({ ...base, key: 'media/2026/01/evil.svg' }).success).toBe(false);
    expect(mediaConfirmRequest.safeParse({ ...base, key: 'media/2026/01/noext' }).success).toBe(false);
    // Title/alt are required: the row must never be unlabelled.
    expect(mediaConfirmRequest.safeParse({ key: 'media/2026/01/hero-abc123.jpg', title: 't' }).success).toBe(false);
  });
});

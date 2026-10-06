import { describe, expect, it } from 'vitest';
import { slugify, slugWithSuffix } from '@/lib/slug';

describe('slug generation (lib/slug.ts)', () => {
  it('produces stable ASCII slugs for Bangla titles', () => {
    const first = slugify('মন কম');
    expect(first).toBe('mn-km');
    expect(first).toMatch(/^[a-z0-9-]+$/);
    expect(slugify('মন কম')).toBe(first);
  });

  it('transliterates the common Bangla letters and drops the rest', () => {
    expect(slugify('কম')).toBe('km');
    // 'ঢ' has no mapping, 'া' maps to 'a': unmapped letters vanish, mapped stay.
    expect(slugify('ঢাকা')).toBe('aka');
  });

  it('slugifies English titles conventionally', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('  Packed   Orders 101 ')).toBe('packed-orders-101');
  });

  it('falls back deterministically for empty or unusable input', () => {
    expect(slugify('')).toBe('post');
    expect(slugify('!!! ???')).toBe('post');
    expect(slugify('!!! ???')).toBe(slugify(''));
  });

  it('suffixes duplicates: attempt 1 is the bare slug', () => {
    expect(slugWithSuffix('hero', 1)).toBe('hero');
    expect(slugWithSuffix('hero', 2)).toBe('hero-2');
    expect(slugWithSuffix('hero', 3)).toBe('hero-3');
  });
});

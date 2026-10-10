import { describe, expect, it } from 'vitest';
import { ALL_CONTENT_KEYS, CONTENT_KEY_GROUPS } from '@/lib/contentKeys';
import { landingContent } from '@/src/data/landingContent';

/**
 * CMS hygiene: every top-level key of the static fallback appears in exactly
 * one admin browser group. Adding a key without grouping it fails here, so
 * new copy cannot become unreachable from Admin → Content.
 */
describe('content key groups (lib/contentKeys.ts)', () => {
  it('covers every static fallback key exactly once', () => {
    const staticKeys = new Set<string>();
    for (const locale of ['en', 'bn'] as const) {
      for (const key of Object.keys(landingContent[locale] as unknown as Record<string, unknown>)) {
        staticKeys.add(key);
      }
    }
    // `legal.*` live under a dotted key in the DB, not in the static object.
    const expected = new Set([...staticKeys, 'legal.privacy', 'legal.terms']);
    const grouped = new Set(ALL_CONTENT_KEYS);

    for (const key of expected) {
      expect(grouped.has(key), `ungrouped CMS key: ${key}`).toBe(true);
    }
    for (const key of grouped) {
      expect(expected.has(key), `grouped key with no static fallback: ${key}`).toBe(true);
    }
    expect(ALL_CONTENT_KEYS.length).toBe(grouped.size);
  });

  it('groups are non-empty and page-ordered', () => {
    expect(CONTENT_KEY_GROUPS.length).toBeGreaterThan(0);
    for (const group of CONTENT_KEY_GROUPS) {
      expect(group.title.trim().length).toBeGreaterThan(0);
      expect(group.keys.length).toBeGreaterThan(0);
    }
    expect(CONTENT_KEY_GROUPS[0]?.title).toBe('Header & hero');
  });
});

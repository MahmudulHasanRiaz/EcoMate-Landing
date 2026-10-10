import { describe, expect, it } from 'vitest';
import { landingContent } from '@/src/data/landingContent';
import { assembleLandingContent } from '@/lib/merge';
import type { Locale } from '@/src/types/landing';

/**
 * Redesign v2 CMS coverage: every new section key exists in BOTH locales with
 * non-empty copy, and the DB-merge path preserves them. A component rendering
 * one of these sections can therefore never read `undefined` — the worst case
 * is the static fallback, never a blank.
 */
const LOCALES: Locale[] = ['en', 'bn'];

function nonEmpty(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

describe('landing v2 CMS coverage (src/data/landingContent.ts)', () => {
  it.each(LOCALES)('locale "%s" carries all v2 section keys', (locale) => {
    const content = landingContent[locale];
    for (const key of [
      'statsBar',
      'trustedBy',
      'packingWorkspace',
      'revenueProtection',
      'logisticsAutomation',
      'adBudgetDefense',
      'storeSwitches',
      'gettingStarted',
    ] as const) {
      expect(content[key], `missing section: ${key}`).toBeDefined();
    }
  });

  it.each(LOCALES)('locale "%s" has no empty v2 headlines or demo labels', (locale) => {
    const content = landingContent[locale];
    expect(nonEmpty(content.packingWorkspace.heading)).toBe(true);
    expect(nonEmpty(content.packingWorkspace.scanButton)).toBe(true);
    expect(nonEmpty(content.packingWorkspace.successHeading)).toBe(true);
    expect(content.packingWorkspace.items.length).toBeGreaterThan(0);
    expect(content.revenueProtection.policies.length).toBeGreaterThan(0);
    for (const policy of content.revenueProtection.policies) {
      expect(nonEmpty(policy.title)).toBe(true);
      expect(nonEmpty(policy.monthlySavings)).toBe(true);
    }
    expect(content.logisticsAutomation.couriers.length).toBeGreaterThan(0);
    expect(content.adBudgetDefense.modes.length).toBeGreaterThan(0);
    expect(content.storeSwitches.stores.length).toBeGreaterThan(0);
    expect(content.gettingStarted.steps.length).toBe(3);
    expect(content.statsBar.items.length).toBeGreaterThan(0);
    expect(content.trustedBy.brands.length).toBeGreaterThan(0);
  });

  it('assembled content keeps v2 sections with no DB rows (static fallback)', () => {
    for (const locale of LOCALES) {
      const assembled = assembleLandingContent(locale, null);
      expect(assembled.gettingStarted.steps.length).toBe(3);
      expect(nonEmpty(assembled.packingWorkspace.heading)).toBe(true);
    }
  });

  it('a DB row overrides one v2 key while the rest fall back', () => {
    const assembled = assembleLandingContent('en', [
      { sectionKey: 'gettingStarted', content: { heading: 'DB heading' } },
    ]);
    expect(assembled.gettingStarted.heading).toBe('DB heading');
    expect(nonEmpty(assembled.gettingStarted.subheading)).toBe(true);
    expect(nonEmpty(assembled.packingWorkspace.heading)).toBe(true);
  });

  it('unknown DB section keys never leak into the page payload', () => {
    const assembled = assembleLandingContent('en', [
      { sectionKey: 'typo-sectoin', content: { heading: 'oops' } },
    ]);
    expect('typo-sectoin' in assembled).toBe(false);
  });
});

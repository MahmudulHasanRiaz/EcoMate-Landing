import { describe, expect, it } from 'vitest';
import { landingContent } from '@/src/data/landingContent';
import { assembleLandingContent } from '@/lib/merge';
import type { Locale } from '@/src/types/landing';

/**
 * Redesign v3 CMS coverage: every mockup section key exists in BOTH locales
 * with non-empty copy, volume tiers resolve positionally to a real plan, and
 * the DB-merge path preserves them. Components read these keys exclusively —
 * no hardcoded marketing copy.
 */
const LOCALES: Locale[] = ['en', 'bn'];

function nonEmpty(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
}

describe('landing v3 CMS coverage (src/data/landingContent.ts)', () => {
  it.each(LOCALES)('locale "%s" carries all v3 section keys', (locale) => {
    const content = landingContent[locale];
    for (const key of [
      'heroTabs',
      'fragmented',
      'packingTerminal',
      'revenueLedger',
      'logistics',
      'adDefense',
      'storefront',
      'omnichannel',
      'profitClarity',
      'teamOps',
      'infraTrack',
      'volumeTiers',
      'dock',
      'walkthrough',
      'videoSection',
    ] as const) {
      expect(content[key], `missing section: ${key}`).toBeDefined();
    }
  });

  it.each(LOCALES)('locale "%s" has no empty v3 headlines or demo labels', (locale) => {
    const content = landingContent[locale];
    expect(content.header.nav.length).toBeGreaterThan(0);
    expect(nonEmpty(content.header.signInLabel)).toBe(true);
    expect(nonEmpty(content.hero.headlinePart1)).toBe(true);
    expect(content.heroTabs.tabs.length).toBe(4);
    expect(content.heroTabs.brands.length).toBeGreaterThan(0);
    expect(content.fragmented.beforeItems.length).toBeGreaterThan(0);
    expect(content.fragmented.afterItems.length).toBeGreaterThan(0);
    expect(content.packingTerminal.items.length).toBeGreaterThan(0);
    expect(content.packingTerminal.features.length).toBeGreaterThan(0);
    expect(content.revenueLedger.couriers.length).toBeGreaterThan(0);
    expect(content.revenueLedger.policies.length).toBeGreaterThan(0);
    expect(content.logistics.couriers.length).toBeGreaterThan(0);
    expect(content.logistics.streamRows.length).toBeGreaterThan(0);
    expect(content.adDefense.modes.filter((m) => m.recommended).length).toBe(1);
    expect(content.storefront.stores.length).toBeGreaterThan(0);
    expect(content.omnichannel.warehousePath.length).toBeGreaterThan(1);
    expect(content.profitClarity.rows.length).toBeGreaterThan(0);
    expect(content.teamOps.timeline.length).toBeGreaterThan(0);
    expect(nonEmpty(content.infraTrack.statusValue)).toBe(true);
    expect(content.gettingStarted.steps.length).toBe(3);
    expect(content.proof.caseStudies.length).toBeGreaterThan(0);
    expect(content.pricing.visiblePricing.plans.length).toBeGreaterThan(0);
    expect(content.faq.items.length).toBeGreaterThan(0);
    expect(content.leadForm.volumeOptions.length).toBeGreaterThan(0);
    expect(nonEmpty(content.dock.whatsapp)).toBe(true);
    expect(nonEmpty(content.dock.callNumber)).toBe(true);
    expect(nonEmpty(content.dock.messengerUrl)).toBe(true);
    expect(nonEmpty(content.dock.fabLabel)).toBe(true);
    expect(content.walkthrough.bullets.length).toBeGreaterThan(0);
    expect(nonEmpty(content.walkthrough.trustNote)).toBe(true);
    expect('youtubeUrl' in content.videoSection).toBe(true);
  });

  it('volume tiers resolve positionally to a real fallback plan', () => {
    for (const locale of LOCALES) {
      const content = landingContent[locale];
      const planCount = content.pricing.visiblePricing.plans.length;
      for (const tier of content.volumeTiers.tiers) {
        expect(tier.planIndex).toBeGreaterThanOrEqual(0);
        expect(tier.planIndex).toBeLessThan(planCount);
      }
    }
  });

  it('assembled content keeps v3 sections with no DB rows (static fallback)', () => {
    for (const locale of LOCALES) {
      const assembled = assembleLandingContent(locale, null);
      expect(nonEmpty(assembled.fragmented.heading)).toBe(true);
      expect(assembled.packingTerminal.items.length).toBeGreaterThan(0);
    }
  });

  it('a DB row overrides one v3 key while the rest fall back', () => {
    const assembled = assembleLandingContent('en', [
      { sectionKey: 'fragmented', content: { heading: 'DB heading' } },
    ]);
    expect(assembled.fragmented.heading).toBe('DB heading');
    expect(assembled.fragmented.beforeItems.length).toBeGreaterThan(0);
    expect(nonEmpty(assembled.packingTerminal.heading)).toBe(true);
  });
});

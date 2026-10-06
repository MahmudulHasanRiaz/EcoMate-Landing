import { describe, expect, it } from 'vitest';
import { pricingPlanCreate, pricingPlanUpdate } from '@/lib/validation';

const valid = {
  slug: 'standard',
  nameEn: 'Standard Operation',
  nameBn: 'স্ট্যান্ডার্ড অপারেশন',
  tierSubtitleEn: 'For established brands',
  tierSubtitleBn: 'প্রতিষ্ঠিত ব্র্যান্ডের জন্য',
  monthlyPrice: 12500,
  annualPrice: 10000,
  currency: '৳',
  orderVolume: 'Up to 9,000 orders/mo',
  usersIncluded: '6 Staff Accounts',
  showroomsIncluded: '1 Showroom POS',
  featuresEn: ['Central Order Control'],
  featuresBn: ['সেন্ট্রাল অর্ডার'],
  excludedFeaturesEn: [],
  ctaLabelEn: 'Choose Standard',
  ctaLabelBn: 'স্ট্যান্ডার্ড নিন',
  isPopular: false,
  sortOrder: 0,
  isActive: true,
};

describe('pricingPlanCreate', () => {
  it('accepts a fully-valid representative payload', () => {
    expect(pricingPlanCreate.safeParse({ ...valid }).success).toBe(true);
  });

  it('rejects an unknown key (strictObject proof)', () => {
    expect(pricingPlanCreate.safeParse({ ...valid, id: 1 }).success).toBe(false);
  });

  it('rejects oversized / out-of-range / malformed values', () => {
    expect(pricingPlanCreate.safeParse({ slug: 'UPPER', nameEn: 'x' }).success).toBe(false);
    expect(pricingPlanCreate.safeParse({ slug: 'a', nameEn: 'x' }).success).toBe(false);
    expect(pricingPlanCreate.safeParse({ slug: 'ok-slug', nameEn: '' }).success).toBe(false);
    expect(pricingPlanCreate.safeParse({ ...valid, monthlyPrice: -1 }).success).toBe(false);
    expect(pricingPlanCreate.safeParse({ ...valid, monthlyPrice: 10_000_001 }).success).toBe(false);
    expect(pricingPlanCreate.safeParse({ ...valid, monthlyPrice: 12.5 }).success).toBe(false);
    expect(
      pricingPlanCreate.safeParse({ ...valid, featuresEn: Array(41).fill('x') }).success,
    ).toBe(false);
  });

  it('requires slug and nameEn', () => {
    expect(pricingPlanCreate.safeParse({ nameEn: 'x' }).success).toBe(false);
    expect(pricingPlanCreate.safeParse({ slug: 'ok-slug' }).success).toBe(false);
  });
});

describe('pricingPlanUpdate', () => {
  it('accepts a partial patch and rejects slug writes', () => {
    expect(pricingPlanUpdate.safeParse({ monthlyPrice: 99 }).success).toBe(true);
    // `slug` is creatable but not updatable: rejected, not silently dropped.
    expect(pricingPlanUpdate.safeParse({ slug: 'new-slug' }).success).toBe(false);
  });

  it('rejects an unknown key (strictObject proof)', () => {
    expect(pricingPlanUpdate.safeParse({ createdAt: 'now' }).success).toBe(false);
  });
});

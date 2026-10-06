import { z } from 'zod';

const slug = z.string().regex(/^[a-z0-9-]{2,60}$/);
const stringArray = (maxLen: number, maxItems: number) =>
  z.array(z.string().max(maxLen)).max(maxItems);

const base = {
  slug,
  nameEn: z.string().min(1).max(120),
  nameBn: z.string().min(1).max(120),
  tierSubtitleEn: z.string().max(300),
  tierSubtitleBn: z.string().max(300),
  monthlyPrice: z.number().int().min(0).max(10_000_000),
  annualPrice: z.number().int().min(0).max(10_000_000),
  currency: z.string().min(1).max(8),
  orderVolume: z.string().max(200),
  usersIncluded: z.string().max(200),
  showroomsIncluded: z.string().max(200),
  featuresEn: stringArray(200, 40),
  featuresBn: stringArray(200, 40),
  excludedFeaturesEn: stringArray(200, 40),
  ctaLabelEn: z.string().min(1).max(120),
  ctaLabelBn: z.string().min(1).max(120),
  isPopular: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
};

export const pricingPlanCreate = z.strictObject({
  slug: base.slug,
  nameEn: base.nameEn,
  nameBn: base.nameBn.optional(),
  tierSubtitleEn: base.tierSubtitleEn.optional(),
  tierSubtitleBn: base.tierSubtitleBn.optional(),
  monthlyPrice: base.monthlyPrice.optional(),
  annualPrice: base.annualPrice.optional(),
  currency: base.currency.optional(),
  orderVolume: base.orderVolume.optional(),
  usersIncluded: base.usersIncluded.optional(),
  showroomsIncluded: base.showroomsIncluded.optional(),
  featuresEn: base.featuresEn.optional(),
  featuresBn: base.featuresBn.optional(),
  excludedFeaturesEn: base.excludedFeaturesEn.optional(),
  ctaLabelEn: base.ctaLabelEn.optional(),
  ctaLabelBn: base.ctaLabelBn.optional(),
  isPopular: base.isPopular.optional(),
  isActive: base.isActive.optional(),
  sortOrder: base.sortOrder.optional(),
});

export const pricingPlanUpdate = z.strictObject({
  nameEn: base.nameEn.optional(),
  nameBn: base.nameBn.optional(),
  tierSubtitleEn: base.tierSubtitleEn.optional(),
  tierSubtitleBn: base.tierSubtitleBn.optional(),
  monthlyPrice: base.monthlyPrice.optional(),
  annualPrice: base.annualPrice.optional(),
  currency: base.currency.optional(),
  orderVolume: base.orderVolume.optional(),
  usersIncluded: base.usersIncluded.optional(),
  showroomsIncluded: base.showroomsIncluded.optional(),
  featuresEn: base.featuresEn.optional(),
  featuresBn: base.featuresBn.optional(),
  excludedFeaturesEn: base.excludedFeaturesEn.optional(),
  ctaLabelEn: base.ctaLabelEn.optional(),
  ctaLabelBn: base.ctaLabelBn.optional(),
  isPopular: base.isPopular.optional(),
  isActive: base.isActive.optional(),
  sortOrder: base.sortOrder.optional(),
});

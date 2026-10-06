/**
 * Allowlisted input mapping for pricing plans.
 *
 * Both the create and the update handler map request bodies through here, so the field
 * list has exactly one home and a request body can never be spread straight into
 * `.values()` / `.set()` (mass assignment: a caller could otherwise set `id`,
 * `created_at`, or any column this API never intended to expose).
 *
 * `slug` is creatable but not updatable: it is the stable identifier.
 */
import { optionalBoolean, optionalString, readBoolean, readNumber, readString, readStringArray } from '@/lib/json';
import type { JsonObject } from '@/lib/json';

export function readPricingPlanCreate(body: JsonObject) {
  return {
    slug: readString(body.slug).trim(),
    nameEn: readString(body.nameEn).trim(),
    nameBn: readString(body.nameBn).trim(),
    tierSubtitleEn: readString(body.tierSubtitleEn).trim(),
    tierSubtitleBn: readString(body.tierSubtitleBn).trim(),
    monthlyPrice: readNumber(body.monthlyPrice, 0),
    annualPrice: readNumber(body.annualPrice, 0),
    currency: readString(body.currency, '৳'),
    orderVolume: readString(body.orderVolume).trim(),
    usersIncluded: readString(body.usersIncluded).trim(),
    showroomsIncluded: readString(body.showroomsIncluded).trim(),
    featuresEn: readStringArray(body.featuresEn),
    featuresBn: readStringArray(body.featuresBn),
    ctaLabelEn: readString(body.ctaLabelEn, 'Start with this tier'),
    ctaLabelBn: readString(body.ctaLabelBn, 'এই প্ল্যানে শুরু করুন'),
    isPopular: readBoolean(body.isPopular, false),
    sortOrder: readNumber(body.sortOrder, 0),
    isActive: readBoolean(body.isActive, true),
  };
}

/** Partial update: every field is optional and only present keys are written. */
export function readPricingPlanPatch(body: JsonObject) {
  return {
    nameEn: optionalString(body.nameEn),
    nameBn: optionalString(body.nameBn),
    tierSubtitleEn: optionalString(body.tierSubtitleEn),
    tierSubtitleBn: optionalString(body.tierSubtitleBn),
    monthlyPrice: body.monthlyPrice === undefined ? undefined : readNumber(body.monthlyPrice, 0),
    annualPrice: body.annualPrice === undefined ? undefined : readNumber(body.annualPrice, 0),
    currency: optionalString(body.currency),
    orderVolume: optionalString(body.orderVolume),
    usersIncluded: optionalString(body.usersIncluded),
    showroomsIncluded: optionalString(body.showroomsIncluded),
    featuresEn: body.featuresEn === undefined ? undefined : readStringArray(body.featuresEn),
    featuresBn: body.featuresBn === undefined ? undefined : readStringArray(body.featuresBn),
    excludedFeaturesEn:
      body.excludedFeaturesEn === undefined ? undefined : readStringArray(body.excludedFeaturesEn),
    ctaLabelEn: optionalString(body.ctaLabelEn),
    ctaLabelBn: optionalString(body.ctaLabelBn),
    isPopular: optionalBoolean(body.isPopular),
    sortOrder: body.sortOrder === undefined ? undefined : readNumber(body.sortOrder, 0),
    isActive: optionalBoolean(body.isActive),
  };
}

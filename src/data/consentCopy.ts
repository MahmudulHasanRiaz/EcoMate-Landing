import type { LandingContent, Locale } from '../types/landing';

/**
 * Tracking-consent banner copy, per locale (H-18, M-26).
 *
 * This is the ONLY marketing-copy module the client banner imports. The full
 * `landingContent` seed (~100 KB, both locales) stays server-side (plus the admin
 * chunk); importing it here would drag both locales into the marketing client
 * bundle. `src/data/landingContent.ts` embeds these same objects as its `consent`
 * sections, so the CMS merge path and the banner can never disagree.
 */
export const consentCopy: Record<Locale, LandingContent['consent']> = {
  en: {
    title: 'We value your privacy',
    descriptionPrefix:
      'We use essential cookies to run the site, and — only with your permission — Meta Pixel + Conversions API to measure ad performance. Read our ',
    privacyPolicyLabel: 'Privacy Policy',
    descriptionSuffix: '.',
    acceptAll: 'Accept all',
    essentialOnly: 'Essential only',
  },
  bn: {
    title: 'আপনার গোপনীয়তাকে আমরা মূল্য দিই',
    descriptionPrefix:
      'সাইট চালাতে আমরা অপরিহার্য কুকি ব্যবহার করি, এবং — শুধু আপনার অনুমতিতে — বিজ্ঞাপনের কার্যকারিতা মাপতে Meta Pixel + Conversions API। আমাদের ',
    privacyPolicyLabel: 'গোপনীয়তা নীতি',
    descriptionSuffix: ' পড়ুন।',
    acceptAll: 'সব গ্রহণ করুন',
    essentialOnly: 'শুধু অপরিহার্য',
  },
};

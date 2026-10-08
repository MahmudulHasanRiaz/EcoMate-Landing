/**
 * Cache invalidation — currently NO-OPs (2026-10-07).
 *
 * Cache Components is off (no incremental-cache backend: opennext falls back to a Dummy
 * cache whose `.set()` throws inside page renders). Every read in `lib/content.ts` is
 * therefore uncached and dynamic, so there is nothing to invalidate — these functions
 * keep their signatures so all call sites compile unchanged, and re-enabling the cache
 * means restoring bodies here (see docs/CACHE.md), not touching callers.
 *
 * ## Fail direction (unchanged)
 *
 * Invalidating must never turn a successful write into an error.
 */
import { logServerError } from '@/lib/json';

/** The public cached domains. One entry per `'use cache'` scope in `lib/content.ts`. */
export const CONTENT_DOMAIN = 'content' as const;
export const MENUS_DOMAIN = 'menus' as const;
export const BLOG_DOMAIN = 'blog' as const;
export const PRICING_DOMAIN = 'pricing' as const;
export const SOCIAL_DOMAIN = 'social' as const;
export const TESTIMONIALS_DOMAIN = 'testimonials' as const;
export const CASE_STUDIES_DOMAIN = 'casestudies' as const;

type Domain =
  | typeof CONTENT_DOMAIN
  | typeof MENUS_DOMAIN
  | typeof BLOG_DOMAIN
  | typeof PRICING_DOMAIN
  | typeof SOCIAL_DOMAIN
  | typeof TESTIMONIALS_DOMAIN
  | typeof CASE_STUDIES_DOMAIN;

/**
 * Content is tagged per locale (`content:en`, `content:bn`), so an edit to one language must
 * not invalidate the other. Everything else is locale-independent. Case studies carry an
 * additional per-slug tag (`casestudies:{slug}`) so the study page invalidates precisely —
 * pass the slug when the write names one (H-20 closes the "no writer" gap for both tags).
 */
function tagsFor(domain: Domain, locale: string, slug?: string): string[] {
  if (domain === CONTENT_DOMAIN) return [`content:${locale}`];
  if (domain === CASE_STUDIES_DOMAIN && slug) return [domain, `${domain}:${slug}`];
  return [domain];
}

/** Menu keys matching the `menus` table contract (`lib/validation.ts` → `MENU_KEYS`). */
export type InvalidatableMenuKey = 'main' | 'footer';

/**
 * Invalidate one menu in one locale from inside the request that performed the write.
 *
 * Menus are tagged per key *and* per locale (`menus:main:en`) in `lib/content.ts`, so the
 * generic `invalidateDomains` path (domain-only tags) cannot address them. Same-request
 * `updateTag`, same fail direction as above: a missing tag store logs and swallows.
 */
export function invalidateMenus(_key: InvalidatableMenuKey, _locale = 'en'): void {
  // No-op while Cache Components is off (see file header): reads are uncached,
  // so there is nothing to invalidate. Signature kept for callers.
}

/**
 * Invalidate one menu from a background path (cron, retry queue). Stale-while-revalidate.
 */
export function invalidateMenusInBackground(_key: InvalidatableMenuKey, _locale = 'en'): void {
  // No-op while Cache Components is off (see file header): reads are uncached,
  // so there is nothing to invalidate. Signature kept for callers.
}

/**
 * Invalidate one or more domains from inside the request that performed the write.
 *
 * `locale` is required because a content write is locale-scoped; passing it for every domain
 * is simpler and more honest than making callers remember which ones care. `slug` addresses
 * the per-slug tag (`casestudies:{slug}`) when the write names a slug.
 */
export function invalidateDomains(
  _domain: Domain | readonly Domain[],
  _locale = 'en',
  _slug?: string,
): void {
  // No-op while Cache Components is off (see file header): reads are uncached,
  // so there is nothing to invalidate. Signature kept for callers.
}

/**
 * Invalidate from a background path (cron, a retry queue). Stale-while-revalidate: the next
 * reader may briefly see the previous value.
 *
 * Next 16 requires the second argument — a `cacheLife` profile name or an expiry override.
 * `{ expire: 0 }` is the explicit "expire now" form; anything longer would leave the tag
 * serving the old value for as long as the profile allows, which defeats the purpose of
 * calling this from a background job in the first place.
 */
export function invalidateDomainsInBackground(
  _domain: Domain | readonly Domain[],
  _locale = 'en',
): void {
  // No-op while Cache Components is off (see file header).
}
/**
 * The one place an admin mutation declares which cached domains it just invalidated
 * (Task 15 §5).
 *
 * ## Why `updateTag` and not `revalidateTag`
 *
 * Cache Components splits invalidation by *who is waiting*:
 *
 *  - `updateTag(tag)` — synchronous. The tag is refreshed within the request that performed
 *    the write, so the admin who clicked Save sees their own edit on the very next navigation
 *    and never has to know that a cache exists. Every handler that writes inside a request
 *    uses this.
 *  - `revalidateTag(tag)` — background. Stale-while-revalidate: the next visitor may get the
 *    old value once, then the new one. This belongs to cron/background paths, which do not
 *    exist for these domains yet.
 *
 * `'use cache'` itself lives only in `lib/content.ts`, and this module is the mirror of that
 * file: a tag declared there must be invalidated here, so both are read together.
 *
 * ## Fail direction
 *
 * Invalidating must never turn a successful write into an error. A handler invoked outside
 * Next's request pipeline (unit tests, scripts) has no tag store and throws; the row has
 * already committed and the page revalidates on its own profile, so the error is logged and
 * swallowed rather than surfaced.
 */
import { revalidateTag, updateTag } from 'next/cache';
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
 * not invalidate the other. Everything else is locale-independent.
 */
function tagsFor(domain: Domain, locale: string): string[] {
  return domain === CONTENT_DOMAIN ? [`content:${locale}`] : [domain];
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
export function invalidateMenus(key: InvalidatableMenuKey, locale = 'en'): void {
  const tag = `menus:${key}:${locale}`;
  try {
    updateTag(tag);
  } catch (e) {
    logServerError(`revalidate (updateTag: ${tag})`, e);
  }
}

/**
 * Invalidate one menu from a background path (cron, retry queue). Stale-while-revalidate.
 */
export function invalidateMenusInBackground(key: InvalidatableMenuKey, locale = 'en'): void {
  const tag = `menus:${key}:${locale}`;
  try {
    revalidateTag(tag, { expire: 0 });
  } catch (e) {
    logServerError(`revalidate (revalidateTag: ${tag})`, e);
  }
}

/**
 * Invalidate one or more domains from inside the request that performed the write.
 *
 * `locale` is required because a content write is locale-scoped; passing it for every domain
 * is simpler and more honest than making callers remember which ones care.
 */
export function invalidateDomains(domain: Domain | readonly Domain[], locale = 'en'): void {
  const domains = Array.isArray(domain) ? domain : [domain as Domain];
  const tags = domains.flatMap((entry) => tagsFor(entry, locale));
  try {
    for (const tag of tags) updateTag(tag);
  } catch (e) {
    logServerError(`revalidate (updateTag: ${tags.join(', ')})`, e);
  }
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
  domain: Domain | readonly Domain[],
  locale = 'en',
): void {
  const domains = Array.isArray(domain) ? domain : [domain as Domain];
  const tags = domains.flatMap((entry) => tagsFor(entry, locale));
  try {
    for (const tag of tags) revalidateTag(tag, { expire: 0 });
  } catch (e) {
    logServerError(`revalidate (revalidateTag: ${tags.join(', ')})`, e);
  }
}
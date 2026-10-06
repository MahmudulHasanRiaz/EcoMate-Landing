/**
 * The stand-in `generateStaticParams` entry that keeps a DB-driven dynamic route prerenderable.
 *
 * ## Why this exists
 *
 * With `cacheComponents: true`, `next build` rejects any `generateStaticParams` that returns
 * zero entries:
 *
 *     Error: When using Cache Components, all `generateStaticParams` functions must return at
 *     least one result. This is to ensure that we can perform build-time validation that there
 *     is no other dynamic accesses that would cause a runtime error.
 *
 * The rule exists because an unenumerated dynamic route has no prerenderable shell, so Next
 * cannot prove at build time that the route will not reach for uncached runtime data. Returning
 * `[]` is therefore *not* a graceful degradation — it fails the build outright.
 *
 * `blog/[slug]` and `case-studies/[slug]` both derive their entry list from the database via
 * `lib/content.ts`, which by design returns `null` when the database is unreachable rather than
 * throwing (an outage must not take the marketing site down). It also yields an empty list when
 * nothing is published — `getCaseStudies` returns `null` outright for zero published rows. Both
 * are correct for a *render*, where the page falls back to static copy; both are fatal for
 * `generateStaticParams`, which must name at least one path.
 *
 * So when the enumerated list is empty, these pages emit one probe entry per locale instead.
 *
 * ## What the probe is not
 *
 * It is not content and it is not a fallback page. Every consumer treats the probe slug as a
 * hard `notFound()`, it is never linked from anywhere, and it never reaches `app/sitemap.ts`
 * (which only ever lists slugs the database returned). The sole trace it leaves is a 404 on a URL
 * nothing publishes, and `generateMetadata` already answers an unknown slug with
 * `robots: { index: false }`, so it cannot be indexed even if a crawler guesses it.
 *
 * ## What was rejected, and why
 *
 * `export const instant = false` — the documented Next 16 escape hatch for routes that must
 * block on runtime data — also makes the build survive an outage. It was rejected because it
 * gives up static generation unconditionally: every published post and case study would stop
 * being prerendered even against a perfectly healthy database. Enumerating the real slugs and
 * probing only the empty case keeps the normal build exactly as static as it was before.
 */

/**
 * Reserved slug standing in for "the database gave us nothing to enumerate".
 *
 * Deliberately not a plausible slug: `slugify` emits only `[a-z0-9-]`, and the double-underscore
 * marker makes the value self-identifying in a route table or a 404 log. `blog_posts.slug` is a
 * plain `text` column an admin may override by hand, so collision is not impossible — which is
 * why the pages 404 on this value unconditionally instead of relying on it being absent.
 */
export const PRERENDER_PROBE_SLUG = '__prerender-probe__';
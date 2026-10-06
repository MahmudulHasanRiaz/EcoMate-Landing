# Cache map — Cache Components (`cacheComponents: true`)

One caching boundary: **`lib/content.ts`** is the only module that contains `'use cache'`.
One invalidation boundary: **`lib/revalidate.ts`** is the only module that calls
`updateTag` / `revalidateTag` (plus `app/api/menus/route.ts` before Task 22, now
centralised — see below). If you add a cached read anywhere else, you have broken this
contract: move it into `lib/content.ts`.

## Tag table

| Tag | Function (`lib/content.ts`) | Invalidated by which admin action | Method | `cacheLife` profile |
|---|---|---|---|---|
| `content:en` / `content:bn` | `getLandingContent(locale)` | `POST /api/content/[sectionKey]/publish`, `PATCH`/`PUT`/`DELETE /api/content/[sectionKey]` (published writes only), `POST …/restore`, `PUT /api/sections/[id]` (both locales), `PUT /api/settings` (default locale only — see concern 3) | `updateTag` via `invalidateDomains('content', locale)` — same request, admin sees own edit on next navigation | `300 / 3600 / 86400` (5m stale, 1h revalidate, 1d expire) |
| `menus:main:en`, `menus:main:bn`, `menus:footer:en`, `menus:footer:bn` | `getMenu(key, locale)` | `POST /api/menus`, `PUT /api/menus` | `updateTag` via `invalidateMenus(key, locale)` (Task 22: moved off a direct `updateTag` in the route so the tag string has one writer) | `300 / 3600 / 86400` |
| `blog` | `getPublishedBlogPosts()` (index, sitemap) | `POST /api/blog`, `PATCH`/`DELETE /api/blog/[idOrSlug]`, cron `GET /api/cron/publish` | admin: `updateTag` via `invalidateDomains('blog')`; cron: `revalidateTag(tag, { expire: 0 })` via `invalidateDomainsInBackground('blog')` (no request waits on it, stale-while-revalidate is correct) | `300 / 3600 / 86400` |
| `blog` + `blog:${slug}` | `getBlogPost(slug)` (body) | same three writers as the index — one `blog` tag covers index, body and sitemap together so they can never drift | same as index | **long: `3600 / 86400 / 604800`** (1h / 1d / 7d — a single document changes rarely; the index stays short) |
| `pricing` | `getPricingPlans()` (plans + `is_pricing_visible` toggle read together so they cannot drift) | `POST /api/pricing`, `PATCH`/`DELETE /api/pricing/[id]`, `POST /api/pricing/toggle-mode`, `PUT /api/settings` | `updateTag` via `invalidateDomains('pricing')` | `300 / 3600 / 86400` |
| `social` | `getSocialLinks()` | `POST`/`PUT`/`DELETE /api/social-links` | `updateTag` via `invalidateDomains('social')` | `300 / 3600 / 86400` |
| `testimonials` | `getTestimonials()` | ⚠️ **no writer** — `app/api/testimonials/route.ts` is GET-only; no mutation calls `invalidateDomains('testimonials')` (see concern 1) | — | `300 / 3600 / 86400` |
| `casestudies` | `getCaseStudies()` (index, sitemap) | ⚠️ **no writer** — `app/api/case-studies/route.ts` is GET-only (see concern 1) | — | `300 / 3600 / 86400` |
| `casestudies` + `casestudies:${slug}` | `getCaseStudy(slug)` (body) | ⚠️ **no writer** (same gap) | — | **long: `3600 / 86400 / 604800`** |

Failure path (all readers): on DB error the function logs server-side, calls
`cacheLife({ stale: 30, revalidate: 60, expire: 300 })` and returns `null`; the page
renders static fallback copy. See below for why `stale` must not be `0`.

`updateTag` = synchronous, same-request (every admin mutation). `revalidateTag` with
`{ expire: 0 }` = background (cron only — `app/api/cron/publish/route.ts`). There are no
other background writers. Invalidating never turns a successful write into an error: both
helpers catch a missing tag store (unit tests, scripts) and log-and-swallow, because the
row already committed and the profile revalidates on its own.

## Rule for new cached reads

1. Add the function to `lib/content.ts` with **both** an explicit `cacheTag` **and** an
   explicit `cacheLife` (every one of the nine readers has both — verified Task 22).
2. Register its tag in the table above.
3. Add the matching invalidation to the admin mutation via `lib/revalidate.ts`
   (`invalidateDomains` / `invalidateMenus`, never a direct `updateTag` in a route).
4. Otherwise the next content change never appears live: the write commits, the tag never
   fires, and the page serves the old value until the profile expires.

## Build-time requirement: `DIRECT_URL`

With `cacheComponents: true`, `next build` prerenders every `'use cache'` function once
with **no request and therefore no Hyperdrive binding**. `db/client.ts` falls back to
`DIRECT_URL` (then `DATABASE_URL`) in that context and throws `HYPERDRIVE_NOT_BOUND` when
neither is set. CI must expose `DIRECT_URL` to the build step, not just to migrations.

Task 22 verified: with `.env` / `.env.local` removed, `npm run build` still exits `0` —
every reader catches the failure, takes the 30s-stale failure profile (`1m / 5m` in the
route table), and the page prerenders static fallback copy. That is the intended outage
behaviour (Task 20 §3: an outage must not take the marketing page down), **not** a loud
failure — the plan's "expect `DB_UNAVAILABLE`" premise was wrong for this codebase, and no
code was changed to chase it. An untested fallback is a latent outage; this one is tested.

## Why `stale: 0` is prohibited on the failure path

`CONTENT_FAILURE_PROFILE` uses `stale: 30`, and that number is load-bearing. A zero stale
window makes the entry immediately stale, and a stale entry cannot satisfy a prerender —
Next rejects every failure-path read with `Route "/": Next.js encountered uncached or
runtime data during prerendering` and **the build fails whenever the database is
unreachable**. Thirty seconds is the smallest window that keeps the entry prerenderable
while refusing to memoise an outage for any real length of time. Do not change it back.

## Task 22 verification notes (2026-10-06)

- `tsc --noEmit`: exit `0`.
- Green `npm run build` (Next 16.3.8): `/` is `○ Static (1h / 1d)`; `/en`, `/bn`,
  `/en/privacy`, `/bn/privacy`, `/en/terms`, `/bn/terms` likewise; `/[locale]` shell and
  unenumerated `[slug]` paths are `◐ Partial Prerender`; one enumerated
  `/en/blog/<slug>` and `/en/case-studies/<slug>` are `○ Static (1d / 7d)` — the new long
  body profile, proving the profile is the one actually emitted. Admin/API routes are `ƒ`.
- Live `next start` (port 3101): `/` → 200 in ~0.1s with the DB hero headline;
  `/bn` → 200. `self.__next_f` flight markers present; no `<Suspense>` fallback markers —
  correct, because the landing has no dynamic holes to stream (all reads are cached, params
  are statically enumerated, consent/theme state is client-side).
- Stale proof (port 3102): probe headline written to `landing_content` (`hero`/`en`) via
  direct SQL → reload **without** invalidation still served the old headline (probe count
  `0`) → row reverted and DB re-verified (`"E-commerce Operation"`). A restart with the
  probe present (port 3103) still served `0` probe hits: the prerendered static shell +
  disk cache hold until the tag fires, which is exactly the firewall invalidation must
  breach.
- Live `updateTag` invalidation without rebuild was **not** completed end-to-end: firing a
  tag requires a Next request context and the admin mutations require a session, so there
  was no authenticated path available in this environment. Tag identity
  (`invalidateDomains('content','en')` → `updateTag('content:en')` ≡
  `cacheTag('content:en')` in `getLandingContent('en')`), per-locale scoping
  (`tagsFor` yields `content:en` only) and blog isolation (no content mutation touches the
  `blog` tag) were verified by code, not by HTTP. What would verify it: authenticated
  `POST /api/content/[sectionKey]/publish`, then reload `/` showing the probe with no
  rebuild and no restart.
- LHCI was not run: `lighthouserc.json` collects against `http://localhost:8787` (wrangler
  preview), and cached pages hang under local `wrangler dev` (Durable Object/R2 emulation
  issue — app code verified correct, `next start` serves `/` in ~0.1s). No LCP-affecting
  change was made (no Suspense reshuffle, no image/font/hero change), and the build route
  table shows the landing statically prerendered as before.

## Known limitation: dark-mode contrast (Task 11 scope)

Light mode passes axe WCAG 2AA zero-critical/serious. Dark mode has ~40
remaining contrast failures, all from mixed surfaces: some cards stay light
(`bg-white`, `bg-slate-50`) in dark mode while their text uses dark-optimized
colors, and vice versa. Examples: `text-slate-800 dark:text-slate-300` on a
white card (1.38:1), footer links without `dark:` base, badge text on
elevated dark surfaces.

These need element-by-element design judgment (which surface stays light vs
goes dark), not bulk class bumps — bulk bumps already fixed 200+ light-mode
cases but cannot resolve mixed-surface pairs without seeing each element.
Tracked for the Task 11 design-polish pass, which owns dark-mode refinement.

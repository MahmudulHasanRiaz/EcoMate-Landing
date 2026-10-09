# Cache map — CLASSIC MODEL since 2026-10-09 (Cache Components OFF)

> **Status: caching is on, via the classic pipeline.** `unstable_cache` in `lib/content.ts`
> + `updateTag` / `revalidateTag` invalidation in `lib/revalidate.ts`, backend = R2
> incremental cache (`NEXT_INC_CACHE_R2_BUCKET`) + DO sharded tag cache
> (`NEXT_TAG_CACHE_DO_SHARDED`) — see `open-next.config.ts` and `wrangler.toml`
> (buckets `ecomate-inc-cache` / `ecomate-inc-cache-prod`, created once per environment
> with `npx wrangler r2 bucket create <name>`).
>
> **Why the flag stays off:** `cacheComponents: true` was removed 2026-10-09 after it hung
> every cached route on Workers with Error 1101 (the Workers `setTimeout` implementation
> never fires the timers the cache-component machinery depends on — `withTimeout` safety
> nets could not help because their timers never fired either). Full diagnosis + the four
> corroborating upstream reports: `docs/muse/cache-components-off-directive.md`.
> Do NOT re-enable the flag (or `partialPrefetching`, which requires it — Next throws
> E1321) without re-proving every public route on a real Worker deployment.
>
> **Operator note:** a fresh Cloudflare account still needs the R2 buckets created
> (deploy does not create the inc-cache bucket; see DEPLOYMENT.md). Without the bucket,
> page renders fail the way 2026-10-07 did — Dummy cache `.set()` throws.

One caching boundary: **`lib/content.ts`** is the only module containing `unstable_cache`.
One invalidation boundary: **`lib/revalidate.ts`** is the only module that calls
`updateTag` / `revalidateTag`. If you add a cached read anywhere else, you have broken this
contract: move it into `lib/content.ts`.

## Tag table

| Tag | Function (`lib/content.ts`) | Invalidated by which admin action | Method | `revalidate` |
|---|---|---|---|---|
| `content:en` / `content:bn` | `getLandingContent(locale)` | `POST /api/content/[sectionKey]/publish`, `PATCH`/`PUT`/`DELETE /api/content/[sectionKey]` (published writes only), `POST …/restore`, `PUT /api/sections/[id]` (both locales), `PUT /api/settings` (default locale only — see concern 3) | `updateTag` via `invalidateDomains('content', locale)` — same request, admin sees own edit on next navigation | `3600` (1h) |
| `menus:main:en`, `menus:main:bn`, `menus:footer:en`, `menus:footer:bn` | `getMenu(key, locale)` | `POST /api/menus`, `PUT /api/menus` | `updateTag` via `invalidateMenus(key, locale)` (Task 22: moved off a direct `updateTag` in the route so the tag string has one writer) | `3600` |
| `blog` | `getPublishedBlogPosts()` (index, sitemap) | `POST /api/blog`, `PATCH`/`DELETE /api/blog/[idOrSlug]`, cron `GET /api/cron/publish` | admin: `updateTag` via `invalidateDomains('blog')`; cron: `revalidateTag(tag, { expire: 0 })` via `invalidateDomainsInBackground('blog')` (no request waits on it, stale-while-revalidate is correct) | `3600` |
| `blog` + `blog:${slug}` | `getBlogPost(slug)` (body) | same three writers as the index — one `blog` tag covers index, body and sitemap together so they can never drift | same as index | **long: `86400`** (1d — a single document changes rarely; the index stays short) |
| `pricing` | `getPricingPlans()` (plans + `is_pricing_visible` toggle read together so they cannot drift) | `POST /api/pricing`, `PATCH`/`DELETE /api/pricing/[id]`, `POST /api/pricing/toggle-mode`, `PUT /api/settings` | `updateTag` via `invalidateDomains('pricing')` | `3600` |
| `social` | `getSocialLinks()` | `POST`/`PUT`/`DELETE /api/social-links` | `updateTag` via `invalidateDomains('social')` | `3600` |
| `testimonials` | `getTestimonials()` | `POST /api/testimonials`, `PATCH`/`DELETE /api/testimonials/[id]` (Phase 2b H-19 closed the "no writer" gap) | `updateTag` via `invalidateDomains('testimonials')` | `3600` |
| `casestudies` | `getCaseStudies()` (index, sitemap) | `POST /api/case-studies`, `PATCH`/`DELETE /api/case-studies/[idOrSlug]` (Phase 2b H-20 closed the gap) | `updateTag` via `invalidateDomains('casestudies', locale, slug)` | `3600` |
| `casestudies` + `casestudies:${slug}` | `getCaseStudy(slug)` (body) | same writers as the index | same as index | **long: `86400`** |

Failure path (all readers): on DB error the function logs server-side and returns `null`;
the page renders static fallback copy. The `null` is cached for the normal window (there
is no short failure profile anymore — see trade-off below).

`updateTag` = synchronous, same-request (every admin mutation). `revalidateTag` with
`{ expire: 0 }` = background (cron only — `app/api/cron/publish/route.ts`). There are no
other background writers. Invalidating never turns a successful write into an error: both
helpers catch a missing tag store (unit tests, scripts) and log-and-swallow, because the
row already committed and the profile revalidates on its own.

## Failure-null trade-off (accepted 2026-10-09)

Under Cache Components a failure `null` was cached 30–60s (`CONTENT_FAILURE_PROFILE`);
with `unstable_cache` it is cached for the normal 1h/1d window. A DB outage therefore
serves the static fallback for up to an hour per entry (until an admin write fires the
tag or the window lapses) instead of retrying the database every minute.
Availability-first and deliberate: the page stays up either way; what waits is freshness
of the *fallback*, not the page. If per-minute outage recovery becomes a requirement,
split the failure path into its own short-`revalidate` wrapper — do not reintroduce
`cacheLife` for it.

## Rule for new cached reads

1. Add the function to `lib/content.ts` as an inner `_fn` plus an exported wrapper that
   calls `unstable_cache(_fn, keyParts, { tags, revalidate })` (every one of the eleven
   readers follows this shape). Tags that depend on arguments (`content:${locale}`,
   `menus:${key}:${locale}`, per-slug tags) are computed per call — the wrapper is
   created inside the exported function, not hoisted.
2. Register its tags in the table above.
3. Add the matching invalidation to the admin mutation via `lib/revalidate.ts`
   (`invalidateDomains` / `invalidateMenus`, never a direct `updateTag` in a route).
4. Otherwise the next content change never appears live: the write commits, the tag never
   fires, and the page serves the old value until the window expires.

## Build-time requirement: `DIRECT_URL`

`next build` prerenders every cached function once with **no request and therefore no
Hyperdrive binding**. `db/client.ts` falls back to `DIRECT_URL` (then `DATABASE_URL`) in
that context and throws `HYPERDRIVE_NOT_BOUND` when neither is set. CI must expose
`DIRECT_URL` to the build step, not just to migrations.

## Historical notes (Cache Components era, retired 2026-10-09)

Task 22 verified the `'use cache'` + `cacheTag` / `cacheLife` design on 2026-10-06; Phase 3a
(Item 16) re-enabled it on 2026-10-08 with the R2 + DO backends. It hung every public route
in production within a day (Error 1101) and was migrated to the classic model on this page.
The notes below are preserved for forensics, not as a re-enabling guide.

- Green `npm run build` (Next 16.3.8): `/` was `○ Static (1h / 1d)`; `/en`, `/bn`,
  `/en/privacy`, `/bn/privacy`, `/en/terms`, `/bn/terms` likewise; `/[locale]` shell and
  unenumerated `[slug]` paths were `◐ Partial Prerender`; one enumerated
  `/en/blog/<slug>` and `/en/case-studies/<slug>` were `○ Static (1d / 7d)` — the long
  body profile, proving the profile was the one actually emitted. Admin/API routes are `ƒ`.
- Live `next start` (port 3101): `/` → 200 in ~0.1s with the DB hero headline;
  `/bn` → 200. `self.__next_f` flight markers present; no `<Suspense>` fallback markers —
  correct, because the landing had no dynamic holes to stream (all reads were cached, params
  were statically enumerated, consent/theme state is client-side).
- Stale proof (port 3102): probe headline written to `landing_content` (`hero`/`en`) via
  direct SQL → reload **without** invalidation still served the old headline (probe count
  `0`) → row reverted and DB re-verified (`"E-commerce Operation"`). A restart with the
  probe present (port 3103) still served `0` probe hits: the prerendered static shell +
  disk cache held until the tag fired, which was exactly the firewall invalidation had to
  breach.
- Live `updateTag` invalidation without rebuild was **not** completed end-to-end: firing a
  tag requires a Next request context and the admin mutations require a session, so there
  was no authenticated path available in this environment. Tag identity
  (`invalidateDomains('content','en')` → `updateTag('content:en')` ≡ the tag on
  `getLandingContent('en')`), per-locale scoping (`tagsFor` yields `content:en` only) and
  blog isolation (no content mutation touches the `blog` tag) were verified by code, not
  by HTTP. What would verify it: authenticated `POST /api/content/[sectionKey]/publish`,
  then reload `/` showing the probe with no rebuild and no restart.
- The old `CONTENT_FAILURE_PROFILE` (`stale: 30`) number was load-bearing under Cache
  Components: a zero stale window made the entry immediately stale, and a stale entry could
  not satisfy a prerender — Next rejected every failure-path read and **the build failed
  whenever the database was unreachable**. That constraint does not exist under
  `unstable_cache`, which is why the failure profile was dropped rather than ported.

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

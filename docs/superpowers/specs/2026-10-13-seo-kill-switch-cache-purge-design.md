# Design: SEO kill-switch + Admin cache purge

Date: 2026-10-13
Status: approved (brainstorming), awaiting implementation plan
Scope: two Admin-gated operational controls. No public UI changes.

## 1. Problem

1. Site currently ships fully indexable: `app/robots.ts` allows `/`, `app/layout.tsx`
   `baseMetadata` sets `robots: { index: true, follow: true }`, sitemap lists every URL.
   There is no way to keep the site dark (staging / pre-launch) and flip it live later.
2. Content edits rely on per-domain tag invalidation. There is no single "nuke
   everything" button, so a stale-page incident needs N API calls or waiting up to
   1h (`REVALIDATE_STANDARD`) / 1d (`REVALIDATE_LONG`).

## 2. Goals / non-goals

Goals:
- G1: Default OFF — fresh DB, unseeded DB, DB error all render noindex.
- G2: One Admin toggle flips the whole site indexable (except `/admin`, `/api`
      which stay noindex forever).
- G3: 100% coverage across the four crawler surfaces: `robots.txt`, `sitemap.xml`,
      `<meta name="robots">`, `X-Robots-Tag` header.
- G4: One "Purge all" button clears every `unstable_cache` tag; one secondary
      "Landing only" button clears the landing shell subset.
- G5: Both controls restricted to admin + superadmin via the existing auth gate.

Non-goals:
- No Cloudflare CDN purge, no R2 bucket flush (explicitly rejected — Next tags only).
- No per-page / per-locale SEO toggles.
- No public-facing UI for either control.

## 3. Feature A — SEO indexing kill-switch

### 3.1 Data model

- New column `site_settings.seo_indexing_enabled boolean NOT NULL DEFAULT false`.
- Migration via `npm run db:generate`, committed under `drizzle/`.
- Seed sets `false`. Existing rows backfilled `false` in the same migration
  (`UPDATE site_settings SET seo_indexing_enabled = false WHERE ... IS NULL` if
  added nullable first, else default covers it).
- Fail-closed read: `null` row or DB exception → `false`.

### 3.2 Read path (single source of truth)

- `lib/content.ts`: `getSeoIndexingEnabled(): Promise<boolean>` following the file's
  `_fn` + `unstable_cache(_fn, keyParts, { tags, revalidate })` shape.
  Tags: `['seo']`, revalidate `3600` (standard window, same as branding).
- `lib/revalidate.ts`: add `SEO_DOMAIN = 'seo'`, extend the `Domain` union.
  `tagsFor('seo', ...)` returns `['seo']` via the generic fallthrough (no per-locale
  split — the flag is global, not per-locale).
- `docs/CACHE.md`: register the `seo` tag row (function, writers, method, window).

### 3.3 Enforcement (4 layers, OFF = dark, ON = current behaviour)

| Layer | File | OFF | ON |
|---|---|---|---|
| robots.txt | `app/robots.ts` | `{ userAgent: '*', disallow: '/' }`, no `sitemap` field | current allow + sitemap |
| sitemap | `app/sitemap.ts` | `return []` before any DB read | current entries |
| meta robots | `app/layout.tsx` `generateMetadata()` | `robots: { index: false, follow: false }` | `{ index: true, follow: true }` |
| header | `proxy.ts` (public GET/HEAD documents) | `X-Robots-Tag: noindex, nofollow` | header absent |

- `robots.ts` / `sitemap.ts` / `generateMetadata` read via `getSeoIndexingEnabled()`.
  On read failure they take the OFF branch (fail-closed).
- `proxy.ts` cannot do a cached DB read per request cheaply; it reads the flag via
  the same cached getter (closure-memoised per isolate, 1h window) — never a direct
  Drizzle query in the edge path. If the read throws, the header is SET (fail-closed).
- `/admin` layout keeps its own permanent `noindex, nofollow` regardless of the flag.
- Invalid-locale layout (`app/[locale]/layout.tsx`) keeps its existing
  `{ index: false }` refusal — orthogonal, unchanged.

### 3.4 Write path (Admin toggle)

- Validation `lib/validation/settings.ts`: `seoIndexingEnabled: z.boolean().optional()`.
- `PUT /api/settings/route.ts`: explicit field map for the new flag (no body spread —
  mass-assignment ban), transactional with existing settings write if multi-table,
  then `invalidateDomains('seo')` (same-request `updateTag`, log-and-swallow outside
  request context).
- UI `src/components/admin/AdminPanel.tsx` Settings section: toggle switch with
  warning copy ("ON করলে Google indexing শুরু হবে"), optimistic-disabled while
  saving, toast on success/failure.
- Permission: existing admin session gate; no new role. Both `admin` and
  `superadmin` may toggle (explicit user decision).

## 4. Feature B — Admin cache purge

### 4.1 Endpoint

- `POST /api/admin/cache/purge` with `z.object({ scope: z.enum(['all', 'landing']) })`.
- Auth: same admin gate as other `/api/admin/*` routes (401 otherwise).
- Behaviour:
  - `scope: 'all'` → invalidate every tag family:
    `content:en`, `content:bn`, `menus:main:en/bn`, `menus:footer:en/bn`, `blog`
    (covers `blog:${slug}` bodies since bodies also carry the `blog` tag),
    `pricing`, `social`, `testimonials`, `casestudies` (covers per-slug bodies),
    `branding`, `seo`.
  - `scope: 'landing'` → landing shell only:
    `content:en/bn`, `menus:*:en/bn`, `branding`, `pricing`, `seo`.
    Untouched: `blog`, `testimonials`, `social`, `casestudies`.
- Implementation via `lib/revalidate.ts` `invalidateDomains([...], locale)` — one
  `updateTag` + `revalidateTag(expire: 0)` per tag, per-tag try/catch so one missing
  tag store never fails the batch. Returns `{ ok: true, scope, invalidated: string[] }`.
- Rate limit: 10 req/min per session (same helper as other admin mutations, or a
  simple in-memory window if none exists — exact mechanism left to the plan).
- Audit: append one row to the existing audit/revision log (`lib/revisions.ts`
  `site_settings` actor entry, or the admin audit table if one exists) with
  actor + scope + timestamp. Never blocks success on audit failure.

### 4.2 UI

- Location: AdminPanel topbar (next to existing operational controls).
- Big button "Purge all cache" (destructive confirm dialog: "সব cache clear হবে —
  পরের ভিজিটে fresh DB read হবে").
- Secondary icon button (broom icon) inside/adjacent: "Landing only" tooltip,
  same confirm pattern, smaller emphasis.
- While pending: both buttons disabled + spinner. Result: success toast with count,
  error toast with message. No page reload required.

## 5. Error handling

- SEO reads fail closed (OFF) at every layer; errors `logOnce` server-side, never
  shown to visitors.
- Purge endpoint: per-tag failures collected, endpoint still 200 with
  `invalidated` listing successes; total failure (no tag store at all) still 200
  with empty list + warning log (mirrors `lib/revalidate.ts` fail direction:
  invalidation never turns a request into an error).
- Settings write: validation 400, unauthenticated 401, non-admin 403, DB error 500
  with `logServerError`; the toggle UI surfaces the message.

## 6. Testing

- Unit (`vitest`):
  - settings validation accepts/rejects `seoIndexingEnabled` (incl. non-boolean).
  - purge validation accepts `all`/`landing`, rejects others/empty.
  - `tagsFor('seo', …)` → `['seo']`.
- Integration (needs `DIRECT_URL_TEST`):
  - default `false` on fresh insert; toggle `false → true → false` round-trips.
- E2E (`playwright`, extend `e2e/seo.spec.ts`):
  - OFF: `/robots.txt` contains `Disallow: /`, no sitemap line; `/sitemap.xml` empty;
    `/` HTML contains `noindex`; response carries `X-Robots-Tag: noindex`.
  - ON (via `PUT /api/settings` as admin): robots allows, sitemap non-empty,
    meta `index`, no `X-Robots-Tag`.
  - Purge: seed change → purge `landing` → `/` reflects change without rebuild.
- Before commit: `npm run lint` (`tsc --noEmit`) clean; migration generated and
  committed; `npm run build` once (routing/config/rendering changed) with
  `.open-next/worker.js` existence check.

## 7. Rollout

1. Merge + migrate (default OFF everywhere).
2. Verify dark: `curl /robots.txt` (Disallow), `curl -I /` (`X-Robots-Tag`), view
   source (noindex), `/sitemap.xml` empty.
3. Admin → Settings → SEO indexing ON when launch-ready; re-verify the four
   surfaces flipped.
4. Purge buttons verified once on preview (change headline → purge → headline live).

## 8. Open items (none blocking)

- Rate-limit helper reuse vs new — plan decides after reading the current helper.
- Audit table target (`lib/revisions.ts` vs admin audit) — plan confirms.
- `proxy.ts` flag-read plumbing (cached getter import safety on the edge runtime)
  — plan verifies no Node-only import leaks into the proxy bundle.

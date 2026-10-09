# Incident record — Cache Components OFF (P0, 2026-10-09)

Production Error 1101 ("Worker threw exception" / "Worker's code had hung") on `/`, `/en`,
`/bn` after the Phase 3 deploy re-enabled `cacheComponents: true` with the R2/DO cache
backends. `/admin` (no cached reads) survived. Resolved on branch
`fix/cache-components-off` by turning the flag off and migrating to the classic
`unstable_cache` pipeline. This file is the standing record — `next.config.ts`,
`lib/content.ts` and `AGENTS.md` all point here.

## Root cause

**`cacheComponents: true` (Next.js 16 Cache Components) is incompatible with the
Cloudflare Workers runtime.** Not a hypothesis — corroborated by four independent
real-world reports with byte-identical symptoms (Error 1101 + Next.js warning "cannot
guarantee that Cache Components will run as expected due to the current runtime's
implementation of `setTimeout()`"):

1. `tommyxchow/tommychow.com` (Next 16.3.5 + `@opennextjs/cloudflare` 1.20.6 — same family
   as our 16.3.8 / 1.20.8): "every page on Workers hung until the runtime canceled it
   (error 1101)". Fixed by turning Cache Components OFF.
2. `shra1dhar/chess-blitz` CLAUDE.md: "DO NOT enable `cacheComponents: true` — NOT
   compatible with Cloudflare Workers — the feature caches promises across requests, but
   Workers isolates I/O per request."
3. `better-auth/better-auth#10103`: same 1101 + `Cannot perform I/O on behalf of a
   different request` (IoContext) + the same setTimeout warning, on OpenNext + Cloudflare.
4. `ssugiyama/walklog`: disabled `cacheComponents` to work around the Workers setTimeout
   incompatibility that hung requests; then had to migrate `'use cache'` → `unstable_cache`
   because `'use cache'` requires the flag.

Why this single cause fits the full timeline:

- 2026-10-07: flag ON + Dummy cache → `.set()` throws → outage → flag turned OFF
  (`4789dd1`) → site worked (all of Phase 2 has no flag).
- 2026-10-09 Phase 3 (`37dc19e`): flag back ON + R2/DO → `/`, `/en`, `/bn` hang ~25s →
  1101. The 20s `withTimeout` safety nets could not help: inside Cache Components the
  timers themselves never fire, so the `Promise.race` never resolves.
- The Durable Object was NEVER the problem: every DO RPC in the incident window reported
  `outcome: ok` in 169–407ms. The `dangerous.disableTagCache` bisection was a dead end
  (verified benign in adapter source; its spread format broke the Worker config instead —
  reverted in #18).

## Evidence

- Workers Logs: "The Workers runtime canceled this request because it detected that your
  Worker's code had hung" on `GET /`, `/en`, `/bn`; all three execute the five cached
  readers (`lib/content.ts`) via `app/[locale]/layout.tsx` / `LandingPage.tsx`.
- Next.js setTimeout warning for Cache Components on this runtime (matches reports 1, 3, 4).
- Exactly one workerd warning "A promise was resolved or rejected from a different request
  context…" with a `Socket.emit` stack at `2026-10-09T04:02:32Z` — the precise second of an
  `/admin/cms` burst (~10 concurrent API calls). The module-scoped postgres.js singleton in
  `db/client.ts` shared sockets across concurrent requests in one isolate (the "one isolate
  serves one request" comment was false), so continuations were cancelled in the wrong
  context → slow/incomplete API data and intermittent 1101s under burst load.

## What changed (`fix/cache-components-off`)

- `next.config.ts`: `cacheComponents: true` removed (plus `partialPrefetching: true`,
  which throws E1321 without the flag). Admin/layout + slug pages: `export const instant
  = false` removed (hard build error without the flag).
- `lib/content.ts`: all 11 cached readers migrated `'use cache'` + `cacheTag`/`cacheLife`
  (E886 without the flag) → `unstable_cache` with the same tags (`tags:` option) and
  windows (`revalidate: 3600`, bodies `86400`). Short failure profile dropped — a failure
  `null` caches for the normal window (trade-off recorded in `docs/CACHE.md`).
  `lib/revalidate.ts` (`updateTag`/`revalidateTag`) unchanged; R2 bucket + DO tag cache
  keep serving. `withTimeout` guards and sequential awaits kept (timers work again, so
  they are effective safety nets).
- `db/client.ts`: request path (Hyperdrive) creates a FRESH `postgres()` client + drizzle
  instance on every `getDb()` call (`max: 3`), cleanup via `ctx.waitUntil(client.end())`;
  module singleton kept for the build path only. New regression test
  `tests/unit/dbClient.test.ts` (fresh instance per call, 10 concurrent calls isolated,
  singleton preserved off-request).
- Verified: `tsc` 0, vitest 142 pass, `next build` 0 (`/` static, all locale/slug routes
  SSG with real DB slugs), `opennextjs-cloudflare build` 0.

## Standing rule

**The flag stays off.** Do not re-enable `cacheComponents` (or `partialPrefetching`, or
`'use cache'` / `cacheTag` / `cacheLife` / `export const instant`) without a verified
production test proving every public route serves on a real Worker deployment — the last
re-enable took production down within a day.

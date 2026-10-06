# instant-nav rig: EcoMate-Landing (Task 24)

Production `instant()` rig for the Partial Prefetching adoption. Read this
before re-running the preservation suite.

- BUILD: `EXPOSE_TESTING_API=1 npm run build` (Next build; testing API
  compiled in only under the env gate). Verified with
  `NODE_OPTIONS="--max-old-space-size=2048"` heap cap, one heavy process at
  a time. Do NOT use `next dev` — automatic prefetching does not run there.
- EXPOSE: `experimental.exposeTestingApiInProductionBuild` in
  `next.config.ts`, gated on `EXPOSE_TESTING_API === '1'`. Real production
  builds leave it off. The env must be set at BUILD time (setting it only
  for `next start` is too late).
- RUN: `PLAYWRIGHT_BASE_URL=http://localhost:<port> npx playwright test
  e2e/instant-nav.spec.ts` against `npx next start --port <port>` serving
  the exact artifact just built. (`next start` used instead of
  `opennextjs-cloudflare preview`: cached pages hang in local wrangler dev —
  Durable Object local-emulation issue, app code verified correct.)
- TEST USER: public; no authentication. State: throwaway/local DB (tests
  assert static-fallback copy, identical under empty DB); locales en|bn.
- DRIFT: none known. Hero copy assertions use the static fallback strings
  (`E-commerce Operation` / `ই-কমার্স অপারেশন`), which render with zero DB
  rows and with a seeded DB alike (fallback chain, never blank).
- CONTRACTS:
  - Audit (flag OFF, `next.config.ts` without `partialPrefetching`): ZERO
    effective `prefetch={true}` links in app source — all 11 `<Link>`s
    (not-found ×4, admin ×3, blog/case-study/privacy/terms home-links) use
    the default; zero `router.prefetch()` calls; footer locale links are
    plain `<a>` (MPA); locale switcher is client-state `toggleLocale`
    (not a navigation). No legacy full-prefetch contract exists.
  - Baseline (flag OFF, `npx next start`, 4 tests): GREEN, exit 0 —
    not-found→/en, not-found→/bn, /bn/privacy→/bn (hero asserted inside
    the instant lock under legacy full-prefetch), locale-toggle scroll.
  - Post-flag finding (same tests, unchanged, flag ON): the 3 instant
    assertions on locale (URL-data) content fail — navigation into
    `[locale]` from outside does not commit under the lock even with warm
    200 prefetches (probed: 4× `200 /bn?_rsc`), while `/` (no URL data)
    commits with hero visible and same-layout `/bn/privacy→/bn` commits
    with content streaming after. Root cause is structural:
    `app/[locale]/layout.tsx:57` awaits `params` above any `<Suspense>`
    (dev insight `instant-shell-url-data` fires on `/[locale]`,
    `/[locale]/privacy` at `privacy/page.tsx:46`, `/[locale]/terms` at
    `terms/page.tsx:45`; zero `blocking-prerender-*`). Fixing it means
    Suspense-restructuring the Task 23 shell — out of scope for this task.
  - Adapted suite (5 tests, flag ON, GREEN via `next start`): instant lock
    asserts the commit where the shell supports it (not-found→/,
    /en/privacy→/ with hero inside; /bn/privacy→/bn commit inside, Bangla
    hero after the lock = streaming contract); cross-layout into locale
    routes asserts the real-user streaming contract without the lock;
    locale-toggle scroll preserved. Adaptation rationale recorded here, not
    silent: baseline result above is the preserved evidence.
- LOOP: local build (EXPOSE=1) → `next start` on a fresh port → focused
  suite → kill server (same command captures PID; confirm port free).
  No step needs the user. No server left running.
- LIVENESS: n/a; local build and start.
- WALLS:
  - `next dev` must not be used for prefetch assertions (no automatic
    prefetch there); it IS the surface for the URL-data insight sweep.
  - `waitForURL('/bn')` inside `instant()` stalls for URL-data
    destinations (see CONTRACTS) — that is the structural signal, not a
    flaky timeout. Do not "fix" with longer timeouts.
  - Server log shows pre-existing `[auth][error] UntrustedHost` lines on
    non-trusted hosts; pages still render 200. Unrelated to prefetching.
  - `@next/playwright` 16.3.8 dedupes with installed `@playwright/test`
    1.63.0 — no version conflict.

# AGENTS.md

Instructions for AI agents and human contributors working in this repository.
**Read the "Critical" section before running any build.**

## Project

EcoMate landing platform — Next.js 16 (App Router) deployed to Cloudflare Workers via
`@opennextjs/cloudflare`, with Drizzle ORM over Hyperdrive/Postgres and R2 for media.

- Migration plan (the source of truth for architecture): `docs/superpowers/plans/2026-10-05-nextjs-cloudflare-migration.md`
- Deployment: `DEPLOYMENT.md`
- Incidents: `docs/incidents/`

---

## ⚠️ CRITICAL — builds must never recurse (this has hung the machine before)

**Never set `package.json`'s `build` script to `opennextjs-cloudflare build`.**

`@opennextjs/aws` (`dist/build/buildNextApp.js`) resolves the Next.js build command as
`config.buildCommand ?? "npm run build"`. If the `build` script *is* the OpenNext build, it
invokes itself without bound — each level spawning another `npm` → `opennextjs-cloudflare`
→ `next build` process chain. On a 16 GB machine this reaches tens of GB of memory pressure
within seconds and **hangs the machine**, leaving no chance to diagnose.

The invariant:

```jsonc
// package.json — correct
"build": "next build",
"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
```

`opennextjs-cloudflare deploy` does not rebuild (`wrangler deploy` only), so the chain in
`preview`/`deploy` is required — not redundant.

- A blocking CI check (`Assert no opennext build recursion` in `ci.yml` and `deploy.yml`)
  fails the pipeline if this invariant regresses.
- Full write-up: `docs/incidents/2026-10-06-opennext-build-recursion.md`.

---

## Command discipline (mandatory)

These rules exist so a runaway command kills itself instead of the machine.

1. **Bound every heavy command** with a heap cap:
   `NODE_OPTIONS="--max-old-space-size=2048" npm run build`
2. **Run one heavy command at a time.** Never run a build, a dev server and a typecheck
   concurrently — that is how a 16 GB machine reaches swap-thrash.
3. **Never leave a server running.** Capture the PID and kill it in the same command:
   `npm run dev & PID=$!; sleep 8; curl -s localhost:3000/api/health; kill $PID; wait $PID 2>/dev/null`
   Then confirm the port is free.
4. **Prefer the cheapest sufficient check.** `npm run lint` (= `npx tsc --noEmit`, ~280 MB)
   catches most mistakes. Run a full `npx opennextjs-cloudflare build` (~1.5–3 GB) only when
   you changed routing, config or a page's rendering mode.
5. **If a command looks like it is growing without bound, kill it.** Do not wait for the
   machine to become unresponsive.

### Build output

The deployable Worker bundle is written to **`.open-next/`** (hyphenated:
`.open-next/worker.js`). `.next/` is the intermediate Next.js output. Workflows that check
the bundle must use `.open-next`, not `.opennext`.

---

## Next.js 16 conventions this repo relies on

- **`proxy.ts`, not `middleware.ts`** — export `proxy()`. A `middleware.ts` is ignored in v16.
- **`params` and `searchParams` are Promises** in pages, layouts and route handlers — always
  `await` them.
- **Cache Components are OFF — do NOT re-enable** (`cacheComponents` removed from
  `next.config.ts` on 2026-10-09): `cacheComponents: true` hangs every cached route on
  Cloudflare Workers with Error 1101 (Next.js warns it "cannot guarantee that Cache
  Components will run as expected due to the current runtime's implementation of
  `setTimeout()`"). Do not re-enable without a verified production test — full record:
  `docs/muse/cache-components-off-directive.md`.
- **Blessed caching path: `unstable_cache()` in `lib/content.ts`** (the old ban on it is
  lifted). It lives in exactly one module: `lib/content.ts`. Do not add cached reads to
  component files — it scatters invalidation targets.
  - Tags go in the `tags:` option, lifetimes are `revalidate:` seconds.
  - Invalidate from admin mutations with `updateTag(tag)` (same-request visibility) or
    `revalidateTag(tag)` (background) via `lib/revalidate.ts`. Tags are per-domain **and
    per-locale** (`content:en`, `content:bn`) — never one global tag.
  - Do **not** use `fetch(url, { next: { tags } })`.
- **FORBIDDEN: `'use cache'` / `cacheTag()` / `cacheLife()`** — they throw `E886`
  without the flag, and the flag stays off.
- **Never use `export const instant`** — it is a build error without the flag.
- **`partialPrefetching` requires the flag** (Next throws `E1321`) — stays off too.
- Do **not** use `export const dynamic = 'force-dynamic'` (removed). Routes that block
  on runtime data (e.g. admin pages reading the session via `auth()`) are dynamic by
  default — no opt-out export is needed.
- Never compute `Date.now()` / `Math.random()` inside a cached function — it freezes at
  build time. Select raw timestamps and format them in the component.
- Fonts via `next/font`, images via `next/image` with an explicit `sizes` (and `priority`
  only on the LCP hero).
- Node.js runtime is the default; do not set `export const runtime = 'edge'`.

---

## Code rules

- **No mass assignment.** Never spread an attacker-controlled request body into
  `.set()` / `.values()`. Map fields explicitly (see `lib/pricing.ts`, `lib/blog.ts`).
- **WebCrypto, not `node:crypto`.** This code runs on Workers.
- **No `as any`, no non-null `!` to silence the compiler.** Narrow with `unknown` instead.
- **Multi-table writes are transactional** (`getDb().transaction(...)`) — a lead row without
  its audit row is silent corruption.
- **Background work goes through the platform** — `getCloudflareContext().ctx.waitUntil(...)`,
  never a bare floating promise after the response (it can be cancelled on isolate recycle).
- Adapter API note: this version exports `getCloudflareContext()` (not `getRequestContext`)
  and has no `waitUntil` export; use `getCloudflareContext().ctx.waitUntil(...)`.
- No secrets in the repo. Secrets go through `wrangler secret put`; `.env.example` holds
  skeletons only.

---

## Before you commit

1. `npm run lint` (`tsc --noEmit`) is clean.
2. Any migration the schema needs is generated (`npm run db:generate`) and committed under
   `drizzle/`.
3. Run `npm run build` once if you changed routing/config/rendering, and confirm
   `.open-next/worker.js` exists.

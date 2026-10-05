# EcoMate Next.js Full-Stack on Cloudflare — Design Spec

Date: 2026-10-05 | Approved approach: A (Next.js + Hyperdrive + Postgres + R2)

## 1. Goal
Migrate Vite+Express prototype to full-stack **Next.js 16** (App Router), deploy Cloudflare Workers via `@opennextjs/cloudflare`. DB = any Postgres (Supabase/Neon) via Drizzle. Files = R2. No separate backend framework. Node.js >= 24 everywhere.

## 2. Architecture
```
Browser → Cloudflare Worker (Next.js, opennext adapter)
  ├─ App Router RSC + Client Components (landing + AdminPanel port)
  ├─ Route Handlers `app/api/*` (settings, sections, pricing, leads, blog, media, health)
  ├─ Drizzle `postgres-js` + Hyperdrive → Postgres (Supabase/Neon, pooled 6543)
  └─ R2 binding (S3 API) → media uploads
```
`server.ts` + `pg Pool` deleted. `vite.config.ts` deleted. Wrangler deploys Worker, not static `dist`.

## 3. DB flow (Drizzle, flexible provider)
- Dialect: `postgresql` fixed. Provider flexible (Supabase/Neon/any PG) — only connection string changes.
- Runtime driver: `drizzle-orm/postgres-js` via Hyperdrive binding (`getRequestContext().env.HYPERDRIVE`). Never `drizzle-orm/node-postgres` (TCP fails on Workers).
- Schema: reuse `src/db/schema.ts` → move to `db/schema.ts`. No dialect change needed for PG↔PG.
- MySQL later = separate migration (dialect `mysql`, driver `planetscale-serverless`, schema rewrite). Out of scope now.
- Migrations: `drizzle-kit` with `DIRECT_URL` (direct 5432) from local/CI only. Runtime uses pooled Hyperdrive string, never DIRECT.
- Seed: current in-memory seeds (`src/db/index.ts` arrays) become SQL seed script run once per env.

## 4. R2 storage
- Binding `R2_BUCKET` in `wrangler.toml`. Access via `getRequestContext().env.R2_BUCKET`, S3-compatible API for uploads.
- `media_assets.url` stores R2 public URL / custom domain. Local dev uses wrangler remote or S3 compat keys.
- No problem expected. Only work: upload route + AdminPanel file input rewire.

## 5. ENV / secrets map (where each goes)
| Var | Where | Notes |
|---|---|---|
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub Secrets | CI deploy auth only |
| Hyperdrive connection string | Cloudflare Dashboard → Workers → Settings → Bindings (Hyperdrive) + `wrangler.toml` id | NOT plain env; pooled 6543 URL |
| `DIRECT_URL` | Local `.env` + GitHub Secret (migration job only) | Never in Worker runtime |
| R2 binding | `wrangler.toml` + Dashboard | Not a secret string |
| KV binding (`RATE_LIMIT_KV`) | `wrangler.toml` + Dashboard | Sliding-window rate limits (per-isolate Map is backstop only) |
| `LICENSE_PORTAL_*`, `GEMINI_API_KEY` | Worker secrets (`wrangler secret put` / Dashboard → Variables → Secrets) | Server-only, never `NEXT_PUBLIC_` |
| `AUTH_SECRET`, `SETUP_TOKEN` | Worker secrets | Auth.js + one-time bootstrap |
| `META_CAPI_TOKEN`, `META_TEST_EVENT_CODE`, `TURNSTILE_SECRET_KEY` | Worker secrets | Server-side tracking + bot protection |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE` | `wrangler.toml` `[vars]` + `.env.local` | Build-time public only |
| `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `wrangler.toml` `[vars]` | Public by design (browser must read them) |
| `SENTRY_DSN`, `RESEND_API_KEY` | Worker secrets (Sentry tunnel keeps DSN off client) | Observability + future lead notifications |

Never commit `.env*`. Never prefix secrets with `NEXT_PUBLIC_`.

## 6. Migration path (Vite → Next)
1. Scaffold Next.js App Router alongside, port `src/components/*`, `src/data/landingContent`, `AdminPanel`.
2. Replace `src/services/api.ts` fetches (relative `/api`) → same paths work via Route Handlers; swap to server actions later if wanted.
3. Move Express routes (`server.ts` sections 1–9) → `app/api/*/route.ts` one by one.
4. Swap `src/db/index.ts` Pool → Hyperdrive `postgres-js` singleton per-request. Delete in-memory repository after seed.
5. Add `open-next.config.ts`, update `wrangler.toml` (Worker + hyperdrive + r2 + compatibility_date), update `deploy.yml` to `opennextjs-cloudflare build + wrangler deploy`.
6. Verify: `npm run build`, `/api/health` returns `postgresConfigured:true`, AdminPanel shows Supabase rows.

## 7. Error handling
- DB down → Route Handlers return 500 JSON `{ error }`, AdminPanel shows existing error state (no silent fallback to seed in prod; seed only for local-without-DB).
- Hyperdrive misbound → `/api/health` reports `postgresConfigured:false`; deploy check fails fast.
- R2 misbound → upload route 500 with `R2_NOT_BOUND`, landing still renders.

## 8. Testing (enterprise grade — supersedes the prototype "manual verification" stance)
- Unit (Vitest): pure logic — password hashing, TOTP against RFC 6238 vectors, sanitizer, slug, pagination, content EN/BN merge, Meta CAPI payload (PII hashed, no raw values), rate limiter.
- Integration: real Postgres test DB — transaction atomicity, unique/partial indexes, CHECK constraints, soft delete, session expiry. Skips loudly (never silently green) when the test DB URL is absent.
- E2E (Playwright): lead submit → visible in admin; setup → login → edit hero → public reflects it without rebuild; self-deactivation blocked; non-superadmin 403 on user management; locale switch + fallback; sitemap excludes drafts.
- Accessibility (axe): landing light+dark, admin, login, lead form at 360px — zero critical/serious; keyboard traversal; reduced-motion honored.
- Performance (LHCI): LCP < 2.0s, CLS < 0.05, TBT < 300ms on mobile preset. Baseline first, then blocking, so real numbers are recorded before the gate bites.
- CI is a required check; branch protection blocks merge without it.

## 9. Out of scope
- MySQL support, Supabase Auth/Realtime, R2 image transformation (paid), multi-region failover.

## 10. Admin auth — Auth.js v5 (user-approved)
- Auth.js v5 Credentials provider + Drizzle adapter + database sessions (opaque tokens, no JWT). CSRF/cookies/expiry owned by library.
- `admin_users` (email, PBKDF2-SHA256 600k passwordHash, role, isActive) + `admin_audit_logs` tables; User Management module (superadmin only).
- Roles: superadmin (all incl. users), admin (content+leads), editor (content only). Public GET + lead POST open; all other mutations + `/admin` gated.
- Bootstrap via one-time `SETUP_TOKEN`; no default credentials. Secrets (`AUTH_SECRET`, `SETUP_TOKEN`) via `wrangler secret put`.

## 11. SEO architecture (added from prototype briefs)
- `app/sitemap.ts`, `app/robots.ts`, per-page metadata, JSON-LD (Organization + Article/Breadcrumb where relevant), semantic HTML kept from current components. No keyword stuffing.

## 12. Design-correction pass (added from prototype briefs, AFTER backend works)
- Remove unsupported precision metrics (e.g. "100% barcode verified", "<0.05% error", specific revenue/COD figures) unless verified — replace with demo-labelled or neutral values.
- Narrative stays problem → consequence → solution → proof → conversion; no feature dumps.
- Light mode gets real surface hierarchy (not color inversion); mobile-first QA at 360/390/430 + 1280/1440; tasteful mobile CTA bar kept.

## 13. Whole-site dynamic content (user requirement)
- Every landing section (hero, complexity, ecosystem, channels, fulfillment, lossPrevention, inventory, pos, marketing, team, analytics, proof, showcase, pricing, conversion, footer, header/nav) is DB-driven per locale. Static `landingContent.ts` stays only as dev fallback.
- Storage: new `landing_content` table (`sectionKey`, `locale`, `content jsonb`) — one row per section per locale, seeded from current `landingContent.ts` slices. Existing `landing_sections` keeps ordering/visibility; `landing_content` holds the payload.
- New `social_links` table (`platform`, `url`, `sortOrder`, `isVisible`) consumed by footer/contact.
- Contact numbers/WhatsApp/Messenger stay in `site_settings` (already exist); hero CTA labels live in `landing_content.hero`.

## 14. Bilingual parity EN/BN (user requirement)
- Every manageable string exists in both locales; `bn` missing → `en` fallback with admin-visible "missing translation" report (never blank, never Crash).
- Locale-aware URLs (`/bn/...`), `hreflang` (en/bn/x-default), per-locale sitemap + canonical + OG locale. Admin edits EN/BN side-by-side.
- Bangla copy natural for BD operators; no awkward literal translations (design-track concern, data model supports it).

## 15. Server-side tracking for leads (user requirement)
- Event bus `lib/events.ts`: providers plug in; **Meta CAPI ships now**, TikTok Events API + GA4 Measurement Protocol later without touching call sites.
- Lead POST captures `fbp`/`fbc` cookies + generates `event_id`; browser pixel fires same `event_id` → Meta dedupes. CAPI sends `Lead` (hashed PII, `action_source: website`) async after 201; result logged to `integration_logs`; admin can retry per lead like license sync.
- Pixel ID public (`NEXT_PUBLIC_`), CAPI token secret. Test event code supported for verification in Events Manager.

## 16. Enterprise-grade hardening (user requirement)
- Security: KV-backed sliding-window rate limits on all public mutations + Cloudflare WAF rate rules; Turnstile on lead form; security headers (CSP, HSTS, frame-deny, nosniff); R2 upload validation (size cap, MIME sniff, SVG rejected); blog HTML sanitized on render; TOTP 2FA for superadmin; session list + revoke in user mgmt; audit-log viewer in admin.
- Leads pro: status-history timeline (`lead_activities`), assign to admin users, duplicate-phone warning (not block), CSV export, follow-up due date, new-lead notification abstraction (Resend adapter interface; logs until wired).
- Content ops: scheduled-post publisher via Cron Trigger; on-demand revalidation on every admin mutation (edit → live, no redeploy); media picker reused in all editors; unique-slug helper; `menus` + `redirects` tables (header/footer 100% managed, SEO-safe URL changes).
- Ops: preview env + separate preview DB; `drizzle-kit migrate` (journal) in prod — never `push`; Supabase PITR backups noted; Sentry + structured request logs; `/api/ready` deep health; runbook `docs/RUNBOOK.md`; paginated list APIs (`limit`/`offset` caps).
- Performance budgets enforced in CI: LCP/INP/CLS targets, `next/image` with R2 loader, lazy below-fold, `llms.txt` + sitemap slugs for AI discoverability.

## 17. Validation & data integrity
- Every mutation endpoint validates with Zod `.strict()` (unknown keys rejected → mass assignment impossible). Hand-rolled allowlists in the early tasks are placeholders for this, not the end state.
- Multi-table writes run in one transaction (content + revision, lead + activity, settings + audit).
- Soft delete on all content; hard delete never removes a live URL. DB-level CHECK/unique constraints (partial unique index on slug where not deleted) are the guarantee, app validation is courtesy.
- Referential guards: last-superadmin protection, self-deactivation block, media-in-use block, slug availability.

## 18. Content lifecycle
- Draft → publish → rollback with full revision history (`content_revisions`); published edits never overwrite live copy until published.
- Optimistic locking via `version` column; conflicting save returns 409 with the current server payload.
- Scheduled publishing via Cron Trigger.

## 19. Failure modes
- Error boundaries per route + global; brand-styled 404 that offers contact.
- Uniform `{ error, requestId }` envelope with per-request UUID echoed to logs.
- DB outage: public landing serves static fallback silently, admin shows maintenance, lead POST fails visibly (never fake success), `/api/ready` reports 503.
- Dispatch retry queue (`dispatch_queue`) with exponential backoff so a 6-hour Meta/License outage loses zero leads.

## 20. Compliance & consent
- Consent banner gates pixel/CAPI; consent recorded per lead (`consentGiven`, `consentAt`, `consentText` = policy version).
- `/privacy` and `/terms` in EN + BN, CMS-editable; retention enforced by cron (default 180 days, anonymization not deletion for Won/Qualified).
- Bengali locale uses `Intl` formatting (dates, currency, numbers) — not string concatenation.

## 21. Production governance
- Wrangler environments (`production` / `preview`) with isolated Hyperdrive, R2 and KV per environment.
- CI supply-chain gates: gitleaks, `npm audit --audit-level=high`, osv-scanner, Dependabot, least-privilege `permissions`, schema-drift guard (uncommitted migrations fail CI).
- Preview deploy per PR with Playwright smoke + LHCI comment; branch protection + CODEOWNERS on `db/schema.ts`, `auth.ts`, `middleware.ts`, `wrangler.toml`, `.github/**`.
- External uptime monitoring on `/api/health` + `/api/ready`, alerting on lead-submit success rate (< 95% over 15 min = revenue incident).
- Runbook covers deploy/rollback, secret rotation, PITR restore drill (executed once, dated), plus `docs/SECURITY.md` with data-flow diagram and threat model.

## 22. Stack mandate (verified against the registry, 2026-10-06)
| Package | Pinned | Basis |
|---|---|---|
| `next` | `16.3.8` | `latest` tag; lowest 16.x that `@opennextjs/cloudflare` officially supports |
| `@opennextjs/cloudflare` | `^1.20.8` | peer `next: ">=15.5.27 <16 \|\| >=16.3.8"`, `wrangler ^4.125.0`, `rclone.js ^0.6.6` |
| `wrangler` | `^4.147.0` | satisfies adapter peer |
| `next-auth` | `5.0.0-beta.32` | peer range includes `^16` |
| `@auth/drizzle-adapter` | `^1.11.3` | requires hand-written tables passed as an explicit map |
| `drizzle-orm` / `drizzle-kit` | `^0.45.3` / `^0.31.11` | unchanged from repo |
| `postgres` | `^3.4.9` | only Postgres driver that works on Workers |
| `zod` | `^4` | v4 API: `z.strictObject`, `z.email`, `z.url` |
| `vitest` | `^5` | current major |
| Node.js | `>=24` | `.node-version`, `.nvmrc`, `engines`, CI floor assertion |

**v16 conventions mandatory across the codebase:** `proxy.ts` (renamed from `middleware.ts`, exports `proxy()`); `params`/`searchParams` are Promises; Cache Components (`cacheComponents: true`, `'use cache'` + `cacheTag`/`cacheLife`, `updateTag`/`revalidateTag`) instead of `experimental.ppr` / `dynamic = 'force-dynamic'` / `fetch(next.tags)` / `unstable_cache`; `next/font` and `next/image`; Node runtime by default; Tailwind v4 via `@tailwindcss/postcss`.

Known risk: Auth.js v5 is a beta and does not document Workers as a first-class target. It should work through `nodejs_compat`; `better-auth` is the recorded fallback if the adapter path breaks in preview.

## 23. Cache Components adoption
- `cacheComponents: true` (Task 1). PPR enabled so the marketing page ships a prerendered shell plus cached content, with only genuinely fresh parts streaming.
- **All `'use cache'` lives in `lib/content.ts`** — one tagged function per domain (`content:en`, `content:bn`, `blog`, `pricing`, `menus`, `social`, `testimonials`, `casestudies`). No component-level caching.
- **Build-time DB access is mandatory:** prerendering executes cached functions with no request context, so `db/client.ts` falls back to `DIRECT_URL` and CI exposes it to the build step. Without it the build fails with `DB_UNAVAILABLE`.
- Every uncached I/O must sit inside a `<Suspense>` boundary or the route silently loses PPR.
- `cookies()`/`headers()`/`searchParams` are illegal inside `'use cache'` — extract and pass as arguments; `use cache: private` is reserved for draft-preview and similar identity-dependent reads.
- `Date.now()` / `new Date()` / `Math.random()` freeze at build inside a cached scope — timestamps are selected raw and formatted in the component.
- Invalidation: `updateTag` for same-request admin visibility, `revalidateTag` from cron/background jobs. Route Handlers are unaffected by Cache Components.
- Adoption is audited in Task 22: single boundary enforced, Suspense coverage checked, nondeterminism scanned, invalidation proven on preview (including per-locale tag isolation), build-time fallback proven to fail loudly, and the PPR win measured with LHCI.

## 24. App Shell & instant navigation
- **App Shell is a real component, not a bare layout.** `Header`, `Footer` and `MobileStickyBar` render in `app/layout.tsx` around `{children}`; the 16 sections stay in `app/page.tsx`. Admin-only chrome (`PrototypeController`, `AdminPanel`) is excluded from the shell so it never prefetches.
- Locale, theme and resolved content live in one client context (`LocaleThemeProvider` / `useLanding`); locale/theme are interaction state (client), content is server-fetched data (`initialContent`). Sections read context instead of props, which lets purely presentational sections drop `'use client'` and shrink the prerendered shell.
- `partialPrefetching: true` alongside `cacheComponents: true` (Next >= 16.3). A default link then warms the shared App Shell; `<Link prefetch={true}>` additionally resolves cached URL-specific content for `params`/`searchParams` routes.
- Adoption is preservation-first: audit effective `prefetch={true}` links, write the `instant()` suite from `@next/playwright`, get it **green with the flag off** (production-mode rig — automatic prefetching does not run in `next dev`), adopt destinations via temporary `export const prefetch = 'partial'`, then enable the flag and strip the exports with the `remove-partial-prefetch` codemod. No test edits during adoption; failures are the work queue.
- Post-flag: sweep for URL-data insights in `next dev` (`params`/`searchParams` read above a Suspense boundary ties the shell to one URL) and for `blocking-prerender-*` errors that the build never exercised.
- Per-link prefetching is a separate decision and commit; every `TODO(per-link-prefetch)` marker is resolved with the user and none survives. `prefetch={false}` links are reviewed separately, since Partial Prefetching's `auto` default makes many opt-outs obsolete.
- On Workers, `opennextjs-cloudflare preview` (or a deployed preview URL) is the production-equivalent rig; there is no `next start`.


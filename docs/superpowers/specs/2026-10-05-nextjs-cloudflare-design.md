# EcoMate Next.js Full-Stack on Cloudflare — Design Spec

Date: 2026-10-05 | Approved approach: A (Next.js + Hyperdrive + Postgres + R2)

## 1. Goal
Migrate Vite+Express prototype to full-stack Next.js (App Router), deploy Cloudflare Workers via `@opennextjs/cloudflare`. DB = any Postgres (Supabase/Neon) via Drizzle. Files = R2. No separate backend framework.

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
| `LICENSE_PORTAL_*`, `GEMINI_API_KEY` | Worker secrets (`wrangler secret put` / Dashboard → Variables → Secrets) | Server-only, never `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE` | `wrangler.toml` `[vars]` + `.env.local` | Build-time public only |

Never commit `.env*`. Never prefix secrets with `NEXT_PUBLIC_`.

## 6. Migration path (Vite → Next)
1. Scaffold Next.js App Router alongside, port `src/components/*`, `src/data/landingContent`, `AdminPanel`.
2. Replace `src/services/api.ts` fetches (relative `/api`) → same paths work via Route Handlers; swap to server actions later if wanted.
3. Move Express routes (`server.ts` sections 1–9) → `app/api/*/route.ts` one by one.
4. Swap `src/db/index.ts` Pool → Hyperdrive `postgres-js` singleton per-request. Delete in-memory repository after seed.
5. Add `opennext.config.ts`, update `wrangler.toml` (Worker + hyperdrive + r2 + compatibility_date), update `deploy.yml` to `opennextjs-cloudflare build + wrangler deploy`.
6. Verify: `npm run build`, `/api/health` returns `postgresConfigured:true`, AdminPanel shows Supabase rows.

## 7. Error handling
- DB down → Route Handlers return 500 JSON `{ error }`, AdminPanel shows existing error state (no silent fallback to seed in prod; seed only for local-without-DB).
- Hyperdrive misbound → `/api/health` reports `postgresConfigured:false`; deploy check fails fast.
- R2 misbound → upload route 500 with `R2_NOT_BOUND`, landing still renders.

## 8. Testing
- `tsc --noEmit` + production build in CI (existing `ci.yml` kept).
- Smoke: `/api/health`, `/api/leads` GET, lead POST, R2 upload roundtrip on preview env before production promote.
- No new unit framework; reuse manual AdminPanel verification (prototype stage).

## 9. Out of scope
- MySQL support, Supabase Auth/Realtime, image optimization service, multi-env preview DB seeding.

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

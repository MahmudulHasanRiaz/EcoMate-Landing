# EcoMate — Deployment (Cloudflare Workers via OpenNext)

> Last reviewed: 2026-10-08 (Phase 3b Item 26 — rewritten to match reality).
> Companion: [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) (operations), [`docs/CACHE.md`](./docs/CACHE.md) (caching).

Deploy target: a **Cloudflare Worker** (`ecomate-landing`, production environment),
built from Next.js 16 (App Router) by `@opennextjs/cloudflare`. There is no Pages
project, no `dist/` SPA bundle, no preview environment (decommissioned, CR-3).

## 0. Read first: build hazard

**Never set `package.json`'s `build` script to `opennextjs-cloudflare build`.**
`@opennextjs/aws` resolves the Next build command as `config.buildCommand ?? "npm run build"`.
If the `build` script *is* the OpenNext build, it invokes itself without bound — each
level spawning another `npm → opennextjs-cloudflare → next build` chain until the machine
hangs. Invariant (CI-enforced in `ci.yml` + `deploy.yml`):

```jsonc
"build": "next build",
"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
```

- Contributor/agent rules: [`AGENTS.md`](./AGENTS.md) (heap caps, one heavy command at a time).
- Incident write-up: [`docs/incidents/2026-10-06-opennext-build-recursion.md`](./docs/incidents/2026-10-06-opennext-build-recursion.md).

**Artifact:** `.open-next/` (hyphenated — `.open-next/worker.js` + `assets/`), never `.next/`
alone and never `dist/`.

## 1. Pipeline (all manual — no auto-deploy anywhere)

```
push main ──► CI (ci.yml): lint + vitest + gitleaks + audits + opennext build ──► green check
                                                                          (deploys NOTHING)
Actions ──► "Production Deployment - Cloudflare Workers (Manual Trigger Only)"
            (deploy.yml, workflow_dispatch, production):
  1. lint + assert guards (no-recursion, no db:push) + vitest
  2. opennext build (DIRECT_URL exposed for prerender) → verify `.open-next/`
  3. db:migrate (DIRECT_URL) → db:seed (idempotent)
  4. ensure R2 buckets: ecomate-media-prod + ecomate-inc-cache-prod
  5. attach media.ecomate.bd custom domain (warns, never fails, when unset up)
  6. ensure + sync Hyperdrive ecomate-db-prod from DIRECT_URL (id patched in-runner only)
  7. push Worker secrets/config from GitHub Secrets (skip-if-unset, never wipe)
  8. opennext deploy --env production
  9. poll https://ecomate.bd/api/ready until 200 (~3 min timeout) — H-12 gate
```

Cron jobs (`retention`, `publish`, `dispatch-drain`) do NOT run on Workers triggers —
the Worker exports no `scheduled()` handler. They fire from `.github/workflows/cron.yml`
(HTTP + `CRON_SECRET`). Cloudflare dashboard: **no triggers, no auto-deploy**.

## 2. Disable dashboard auto-deploy

Workers & Pages → `ecomate-landing` → Settings → Builds & deployments → automatic
deployments **OFF**. Only GitHub Actions deploys. (Project name is `ecomate-landing`,
not `ecomate-platform`.)

## 3. Required GitHub Secrets (single source of truth)

Repo → Settings → Secrets and variables → Actions:

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Workers + R2 + Hyperdrive Read/Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID |
| `CLOUDFLARE_ZONE_ID` | Zone ID for `media.ecomate.bd` attach (warn-only when unset) |
| `DIRECT_URL` | Postgres session-pooler URL (`:5432`, migrations/seed/build) |
| `AUTH_SECRET` | Auth.js secret |
| `SETUP_TOKEN` | One-time bootstrap (rotate after first superadmin) |
| `TOTP_ENCRYPTION_KEY` | TOTP at-rest encryption (falls back to AUTH_SECRET) |
| `META_CAPI_TOKEN` | Meta Conversions API |
| `META_TEST_EVENT_CODE` | Events Manager test code (empty in prod) |
| `TURNSTILE_SECRET_KEY` | Turnstile server verification |
| `LICENSE_PORTAL_API_KEY` | License portal integration |
| `LICENSE_PORTAL_API_BASE_URL` | Portal base URL (plain config) |
| `RESEND_API_KEY` | Lead-notification email |
| `NOTIFY_FROM_EMAIL` | Resend sender (plain config) |
| `NOTIFY_TO_EMAIL` | Sales inbox (plain config) |
| `CRON_SECRET` | Guards `/api/cron/*` |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | **Auto-provisioned by deploy** (see §4) — do NOT create by hand |
| `R2_ACCOUNT_ID` / `R2_BUCKET_NAME` | **Auto-provisioned by deploy** (derived, see §4) |

`AUTH_TRUST_HOST`, `RETENTION_DAYS`, `NEXT_PUBLIC_*` stay in `wrangler.toml [vars]`
— they are deployment properties, not secrets. `CLOUDFLARE_PROJECT_NAME` is unused
(no Pages project). `GEMINI_API_KEY` / `SENTRY_DSN` were removed (dead config).

## 4. First-time / one-time setup (per environment)

1. `npx wrangler hyperdrive create ecomate-db-prod --connection-string="<DIRECT_URL>"`
   (or let deploy create it — the ensure step does).
2. `npx wrangler r2 bucket create ecomate-media-prod` (+ `ecomate-inc-cache-prod`;
   deploy ensures both, creation is idempotent).
3. DNS: CNAME `media` → R2 (dashboard), then the deploy attaches
   `media.ecomate.bd` via `r2 bucket domain add` (needs `CLOUDFLARE_ZONE_ID`).
4. Nothing for R2 uploads: credentials AND bucket CORS are both automatic (§4b).
5. `npx wrangler secret put` for each secret above (or set GitHub Secrets and deploy —
   CI pushes them; skip-if-unset never wipes).
6. Deploy via Actions; watch the `/api/ready` poll go green.

### 4b. R2 presign credentials are automatic (no manual setup)

The deploy workflow provisions everything itself from `CLOUDFLARE_API_TOKEN` +
`CLOUDFLARE_ACCOUNT_ID` — there is deliberately nothing to create by hand:

1. Skip-fast: if the Worker already holds `R2_ACCESS_KEY_ID`, nothing happens.
2. Otherwise `scripts/provision-r2-presign.py` lists API tokens for one named exactly
   `ecomate-media-presign`. A found token is DELETED first (its secret value is shown
   only once at creation — an orphaned token's secret is unrecoverable, and names are
   not unique, so it is replaced, never reused; a failed delete aborts instead of
   minting a duplicate).
3. It resolves the `Workers R2 Storage Bucket Item Write` permission-group ID **by
   name at runtime** (`GET /user/tokens/permission_groups` — no group ID is
   hardcoded), then creates the token scoped to
   `com.cloudflare.edge.r2.bucket.<ACCOUNT>_default_ecomate-media-prod` (Object
   Read & Write, media bucket only).
4. It derives `R2_ACCESS_KEY_ID = <token id>` and
   `R2_SECRET_ACCESS_KEY = hex(sha256(<token value>))`, masks them, and stores all
   four values (`+ R2_ACCOUNT_ID`, `+ R2_BUCKET_NAME`) via `wrangler secret put`.

Failure handling: if the deploy token lacks **API Tokens: Edit**, the step warns
(`::warning::` with the fix) and the deploy continues — the legacy
Worker-mediated upload keeps working, and re-running after granting the permission
provisions on the next deploy. Rotation = delete the Worker secret
(`wrangler secret delete R2_ACCESS_KEY_ID --env production`) and redeploy; the next
run mints a fresh token (the old API token should then be deleted in the dashboard,
as its secret no longer exists anywhere).

### 4c. Bucket CORS is automatic too (same step, every deploy)

Browser PUTs go cross-origin to `<account>.r2.cloudflarestorage.com`, so the media
bucket needs a CORS rule — also owned by the pipeline, no dashboard step:

- Rule applied: `AllowedOrigin https://ecomate.bd` (from `SITE_ORIGIN` in deploy.yml,
  comma-separated for more), `AllowedMethod PUT`, `AllowedHeader content-type`,
  `MaxAgeSeconds 86400`.
- Each deploy `GET`s `/?cors` with SigV4 headers derived from the DEPLOY token
  (the narrow media token is object-scoped and would 403 bucket calls). Already
  covered → log and no-op. Otherwise the desired rule is merge-appended onto any
  existing operator rules (never a blind replace) and `PUT`.
- Any failure warns and continues — deploy never fails over CORS, legacy upload is
  unaffected. The narrow media token stays presign-only by design.
- Verify by hand: sign any XML `GET https://<ACCOUNT>.r2.cloudflarestorage.com/
  ecomate-media-prod?cors` (or read the deploy log line "Bucket CORS already
  configured" / "Bucket CORS configured for …").

## 5. Rollback

`npx wrangler rollback --env production` (drill status: see RUNBOOK §15). Database
migrations are forward-only — rolling back code never rolls back schema; write a new
migration instead.

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
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Presigned direct uploads (unset = 503 + legacy fallback) |
| `R2_ACCOUNT_ID` / `R2_BUCKET_NAME` | Presign URL construction (plain config) |

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
4. R2 S3 API token (Object Read & Write on the media bucket) → the four `R2_*`
   secrets above; bucket CORS allowing `PUT` from `https://ecomate.bd`.
5. `npx wrangler secret put` for each secret above (or set GitHub Secrets and deploy —
   CI pushes them; skip-if-unset never wipes).
6. Deploy via Actions; watch the `/api/ready` poll go green.

## 5. Rollback

`npx wrangler rollback --env production` (drill status: see RUNBOOK §15). Database
migrations are forward-only — rolling back code never rolls back schema; write a new
migration instead.

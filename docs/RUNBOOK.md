# EcoMate Landing — Operations Runbook

Scope: the Cloudflare Worker (`ecomate-landing`), its Hyperdrive/Postgres database, the R2 media
bucket, and the KV namespace used for rate limiting.

**Read this before your first deploy, and read §2 before your first rollback.**

Every claim below is marked with its verification status:

| Mark | Meaning |
| --- | --- |
| ✅ **VERIFIED** | Run in this repository or against the live resources; output recorded in `docs/incidents/` or the task report. |
| ⚠️ **UNVERIFIED** | Written from the vendor documentation and the configuration in this repo, but **not** executed. Treat as a plan, not a result. |
| 🚧 **BLOCKED** | Cannot be done yet; the blocking dependency is named. |

Nothing is marked verified that was not actually run. Where the honest answer is "nobody has
tried this yet", it says so.

---

## 1. Deploy

### 1.1 Normal path (GitHub Actions)

⚠️ **UNVERIFIED — has never been run end to end.** The workflow is
`.github/workflows/deploy.yml`, `workflow_dispatch` only, no automatic deploy on push.

1. Open the repo → **Actions** → **Production Deployment** → **Run workflow**.
2. Choose `production` and write release notes in `deployment_notes` — these are printed at the
   end of the run and are the fastest way to answer "what is live?".
3. The pipeline is: `npm run lint` → opennext build → `.open-next` integrity check → artifact
   upload → `npm run db:migrate` → `opennextjs-cloudflare deploy`.

**Blocked at step 3's migration:** `npm run db:migrate` (`drizzle-kit migrate`) currently exits
1 silently in this repository and has not been diagnosed. This blocks deploys rather than
letting them ship against an out-of-date schema — the correct failure direction, but it does
mean **the workflow cannot currently complete**. See §9.

### 1.2 Local deploy

```bash
# Never set the `build` script to `opennextjs-cloudflare build` — it recurses until the
# machine hangs. See docs/incidents/2026-10-06-opennext-build-recursion.md.
NODE_OPTIONS="--max-old-space-size=2048" npm run deploy
```

`wrangler.toml` keeps `PASTE_*_HYPERDRIVE_ID` placeholders **by design**: CI injects
the real ids at deploy time (deploy.yml / preview.yml "Ensure Hyperdrive config"
steps — ensure by name, sync URL to the secret, patch the runner copy). No Hyperdrive
id ever lives in git. There is intentionally no KV binding (rate limiting runs on
WAF rules + in-memory backstop; see §13.3).

### 1.3 Command discipline

Non-negotiable on a 16 GB machine, per `AGENTS.md`:

- One heavy command at a time. Never a build + dev server + typecheck concurrently.
- Cap the heap: `NODE_OPTIONS="--max-old-space-size=2048"`.
- Never leave a server running — capture the PID and kill it in the same command.
- Kill anything that grows without bound rather than waiting for swap death.

### 1.4 Verifying a deploy landed

```bash
curl -sS https://ecomate.app/api/health | jq        # liveness: bindings exist
curl -sS -o /dev/null -w '%{http_code}\n' \
  https://ecomate.app/api/ready                    # 200 ready, 503 not ready
npx wrangler deployments list                      # version ids, needed for rollback
```

✅ **VERIFIED** — `/api/health` and `/api/ready` exist and `/api/ready` returns 503 on failure.
⚠️ **UNVERIFIED** — that these respond correctly on the *live* hostname; the host has not been
hit from this machine.

---

## 2. Rollback

### 2.1 Rolling back the Worker

⚠️ **UNVERIFIED** — no rollback has ever been performed.

```bash
npx wrangler deployments list                    # find the target version id
npx wrangler rollback <version-id>              # instant, previous version becomes live
```

`wrangler rollback` is the correct tool rather than a redeploy: it is one edge-side operation,
takes effect in seconds, and does not consume a build. **It does not touch the database.**

Roll forward instead with a fresh deploy once you know what broke; do not leave a rollback in
place while investigating.

### 2.2 Migration direction: roll forward, never down

**There are no down-migrations in this repository, and adding destructive ones is not the fix.**

The rule: **a database migration is rolled *forward*** — with a corrective migration — while
**code is rolled *back*.** These are separate decisions and can be made independently.

Why destructive down-migrations are wrong here specifically:

- `leads` holds real rows of personal data (name, phone, email, IP, user agent). A `DROP COLUMN`
  on a column a newer row depends on destroys customer records irreversibly. There is no git
  history for a table.
- Production data written *between* the migration and the rollback would itself be lost by a
  down-migration, even a well-written one.
- The retention job (Task 16 §6) has already anonymised rows. Un-anonymising is not possible.

Decision table:

| Situation | Action |
| --- | --- |
| Bad code, schema is fine | `wrangler rollback` |
| Bad code **and** new schema columns are unused | `wrangler rollback`. Leave the columns; they are additive and harmless. |
| A migration itself is wrong | Write a **new** migration that corrects it. Deploy the fix forward. |
| A migration dropped or corrupted a column | **Stop.** Restore from PITR (§7). Do not improvise. |

The only safe "down" is an *additive* one — dropping a column that was added in the same
release and that provably holds no data anyone needs. Everything else is forward-only by design.

### 2.3 Verifying the migrations table

`drizzle.__drizzle_migrations` holds one row per applied file: `hash` = sha256 of the `.sql`
file, `created_at` = the journal's `when` (as a string of milliseconds).

```bash
shasum -a 256 drizzle/*.sql     # compare against the stored hashes
```

If a row is missing for a file that has clearly been applied, `drizzle-kit migrate` will try to
re-run it. For an idempotent migration that is harmless; for a non-idempotent one it will
error — which is the correct outcome. Re-recording a row by hand is only safe for a migration
you have verified statement-by-statement against the live schema.

---

## 3. Secret rotation

Single source of truth is **GitHub Secrets**; the deploy workflow pushes them to the
Worker on every run ("Push Worker secrets" step, idempotent). Add a value once as a
GitHub Secret and CI carries it — no dashboard secret setup needed. `.env.local` and
`.env.example` hold skeletons only, never values. To rotate: update the GitHub Secret,
re-run deploy. Removing a GitHub Secret does NOT delete the Worker value (CI skips
unset ones) — deletion stays a manual `wrangler secret delete <NAME> --env production`.

| Secret | Blast radius of rotation |
| --- | --- |
| `AUTH_SECRET` | **Logs every operator out.** Signs/verifies session cookies and CSRF tokens. Unavoidable — there is no key ring. Rotate on compromise, not on a schedule. Re-login is the only cost; the setup bootstrap does **not** need re-running as long as `admin_users` still has rows. |
| `TOTP_ENCRYPTION_KEY` | **Invalidates every operator's TOTP enrolment.** Secrets are AES-256-GCM encrypted with it and cannot be re-encrypted without the old key. Everyone must re-enrol. Falls back to a domain-separated `AUTH_SECRET` when unset — so rotating `AUTH_SECRET` *also* breaks TOTP if `TOTP_ENCRYPTION_KEY` is empty. **Set `TOTP_ENCRYPTION_KEY` explicitly before rotating `AUTH_SECRET`.** |
| `SETUP_TOKEN` | One-time bootstrap token. Should already be deleted. If present it is a live path to superadmin creation while `admin_users` is empty. |
| `CRON_SECRET` | The retention cron stops working until the new value is also used by whatever invokes it. Fails closed (§4). |
| `META_CAPI_TOKEN` | Events Manager stops receiving server-side conversions. The pixel still fires, so events are under-counted until it is restored. |
| `TURNSTILE_SECRET_KEY` | `verifyTurnstile` fails — check `lib/turnstile.ts` for the failure direction; if it fails **closed**, the public lead form stops accepting submissions. |
| `LICENSE_PORTAL_API_KEY` | Dispatches fail with `licensePortalStatus = 'Failed'`; the lead row is still authoritative. Retry from the admin. |
| `RESEND_API_KEY` | Lead notifications revert to the `Log` provider: `integration_logs` rows go to `Pending` and no email is sent. Visible on `/api/ready` as `notificationProvider: "log_only"`. |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | CI-only (GitHub secrets, not Worker secrets). Rotation invalidates in-flight deploys. |

✅ **VERIFIED** — the `AUTH_SECRET` → `TOTP_ENCRYPTION_KEY` coupling is read directly from
`lib/totp.ts` (domain-separated fallback) and `cloudflare-env.d.ts`. ⚠️ **UNVERIFIED** — no
secret has been rotated in practice.

Suggested order if several are compromised: set `TOTP_ENCRYPTION_KEY` first, then rotate
`AUTH_SECRET`, then everything else.

---

## 4. Scheduled jobs

### 4.1 Lead retention

```toml
[triggers]
crons = ["17 3 * * *"]   # 03:17 UTC daily — deliberately off the :00 stampede
```

Route: `GET /api/cron/retention`. Window: `RETENTION_DAYS` (default 180, set in `[vars]`).

It: anonymises leads older than the window (`name` → `Withheld`; `phone`/`email`/`clientIp`/
`userAgent` → `''`; sets `anonymized_at`), and deletes expired Auth.js `sessions` rows (indexed
on `expires`).

It **never** anonymises a lead whose status is `Won` or `Qualified`. Those are live commercial
records the sales team owns; extending enforcement to them is a legal decision, not an
engineering one. The exclusion is applied in SQL, not just in JS.

**The authorisation caveat, stated plainly:** Cloudflare Cron Triggers call a URL with a plain
`GET` and cannot attach a custom header. The route accepts `CRON_SECRET` as an
`Authorization: Bearer` header, an `x-cron-secret` header, or a `?secret=` parameter, and it
**fails closed (503) when `CRON_SECRET` is unset**. So:

- ✅ **VERIFIED** — the route exists, fails closed, and does not anonymise protected statuses.
- ⚠️ **UNVERIFIED** — that the platform's own cron trigger can supply the secret at all. This
  is the single most important unverified item in this runbook. Confirm it before trusting the
  job to run unattended; if the trigger cannot carry the secret, the practical options are a
  scheduled external caller (GitHub Actions `schedule` with the secret) or a Cloudflare Access
  service token in front of the path.
- The run log must show `cron.retention.completed` with a non-zero `anonymizedLeads` or
  `deletedSessions` count. **"We ran it" is not evidence; a count is.**

---

## 5. WAF rule inventory

⚠️ **UNVERIFIED — none of these rules exist yet.** Cloudflare WAF rules are configured in the
dashboard, not in this repository, so nothing below is enforced by code. This section is the
inventory to build against, and the order to build it in.

| # | Rule | Scope | Rationale |
| --- | --- | --- | --- |
| 1 | Rate limit `POST /api/leads` — 5 req / 10 min / IP | Zone | First layer, ahead of the Worker. `app/api/leads` also has a KV limiter and a per-isolate backstop, but this is the one that costs the attacker nothing. |
| 2 | Rate limit `POST /api/auth/*` — 10 req / 5 min / IP | Zone | Credential stuffing. Per-account lockout exists in `auth.ts`; this is the per-IP layer above it. |
| 3 | Bot fight mode + JS detections | Zone | Cheap before Turnstile, which only guards the lead form. |
| 4 | Managed rules, sensitivity medium | Zone | OWASP core. **Start at medium and watch the false-positive rate before going high** — a high-sensitivity CSP rule on a marketing site blocks real visitors, and that outage is more expensive than the attack it prevents. |
| 5 | Block `/admin*` from non-BD/expected geographies | Zone, optional | Geography is a weak signal and this is a Bangladesh-facing product; treat as noise reduction, not a control. |
| 6 | Rate limit `/api/cron/*` — 5 req / min | Zone | The retention route has its own secret check; this caps guessing. |

Already enforced **in code**, independent of the WAF:

- `proxy.ts` → `auth.ts` `authorized`: any `/api/*` mutating method requires a session, except
  the public `POST /api/leads` and the two bootstrap endpoints (which require `SETUP_TOKEN` and
  an empty `admin_users`).
- `lib/authz.ts` `requireAdminRole`: per-route role enforcement, authoritative.
- `lib/securityHeaders.ts`: HSTS, `nosniff`, frame-deny, referrer policy, permissions policy
  and a CSP applied to every response that flows through the proxy. ✅ **VERIFIED** — this
  replaced a documented incident; see §9.
- Turnstile on the lead form; KV rate limiting on auth and lead endpoints.

---

## 6. KV and Hyperdrive rebinding

### 6.1 KV namespace (`RATE_LIMIT_KV`)

⚠️ **UNVERIFIED** — never rebound.

```bash
npx wrangler kv namespace list
```

KV was removed from `wrangler.toml` by operator decision (R2 is the storage;
rate limiting runs on WAF rules + in-memory backstop). No `kv namespace create`
is needed. Re-adding a `[[kv_namespaces]]` block any time restores distributed
counters with zero code change.

**Blast radius:** `lib/rateLimit.ts` **fails open** — an absent binding or a KV error allows the
request, logged as a warning. Losing KV therefore degrades rate limiting to the per-isolate
backstop in `app/api/leads/route.ts` and the per-account lockout in `auth.ts`. It does **not**
take the site down. That is deliberate: losing a rate limit is worse than losing a lead.

Counters are windowed by a TTL of two windows, so a rebind starts every visitor from zero —
expect a burst of `lead.notify`-adjacent 429s? No: expect nothing. But do expect the first
`/api/leads` submissions after a rebind to rely solely on the isolate-local backstop.

### 6.2 Hyperdrive (`HYPERDRIVE`)

⚠️ **UNVERIFIED** — never rebound.

```bash
npx wrangler hyperdrive list
npx wrangler hyperdrive create ecomate-db --connection-string="postgresql://…?pgbouncer=true"
```

Update `id` in `wrangler.toml` and redeploy.

**Blast radius:** every route that touches Postgres. `/api/health` reports
`postgresConfigured: false` (it never throws), `/api/ready` reports
`checks.database.status: "failed"` and returns **503** — that is the signal to watch.

`db/client.ts` caches the client per isolate and rebuilds it when the resolved URL changes, so
a rebind takes effect on the next isolate; there is no restart needed.

**Gotcha:** the connection string must be the **pooled** one (`:6543`, `pgbouncer=true`).
`db/client.ts` connects with `prepare: false` for exactly this reason — prepared statements do
not survive PgBouncer in transaction mode.

---

## 7. R2 restore and PITR

### 7.1 R2 (media bucket `ecomate-media`)

⚠️ **UNVERIFIED** — no restore has been performed.

R2 is **not** versioned by default, and object versioning is **not currently enabled** on this
bucket. That means a deleted or overwritten object is gone. This is the largest unmitigated
data-loss risk in the system and should be fixed before any high-value asset is uploaded:

```bash
npx wrangler r2 bucket versionings enable ecomate-media
```

⚠️ **UNVERIFIED** — confirm the exact command against the current Wrangler docs; the flag has
moved between releases.

Restore procedure:

```bash
# 1. Copy the bucket (the bucket is preserved during the copy; do not delete first).
npx wrangler r2 bucket copy ecomate-media ecomate-media-restore

# 2. Copy back the specific object from the restore bucket.
npx wrangler r2 object copy ecomate-media-restore/<key> ecomate-media/<key>

# 3. Rebind the custom domain if the bucket name changed, then verify:
curl -sSI https://media.ecomate.app/<key>
```

Also in the dashboard: **Object Lifecycle** rules for incomplete multipart uploads. Without them
an aborted upload leaves billable parts behind forever.

Media rows are soft-deleted (`media_assets.deleted_at`), and the R2 object is only purged when
unreferenced — so restoring the database row and the object independently is usually enough.

### 7.2 Postgres PITR

⚠️ **UNVERIFIED — PITR has not been confirmed enabled.** No dashboard note exists yet; this is
the outstanding action.

Supabase enables point-in-time recovery per project with a retention window set in the plan.
Confirm in the Supabase dashboard → **Settings** → **Database** → **Point-in-time recovery**,
and record the earliest restorable timestamp here once known:

> Earliest restorable point: _(unverified — fill in)_

**Restore drill — run this before you need it, not during:**

1. Provision a *separate* restore target (a new project, never the production one).
2. Restore to a timestamp immediately before a known migration.
3. Verify the schema is at the expected migration and the lead count is as expected.
4. Record the wall-clock time the whole drill took. That number is the real answer to "how long
   would we be down?", and it is almost always longer than anyone expects.

⚠️ **UNVERIFIED** — no drill has been run. Do not claim an RPO you have not measured.

---

## 8. Incident contacts

🚧 **BLOCKED — placeholders. Fill these in before the next on-call rotation.**

| Role | Who | Contact | Notes |
| --- | --- | --- | --- |
| Incident commander | _(fill in)_ | _(fill in)_ | Owns the decision to roll back. |
| Backend / Worker | _(fill in)_ | _(fill in)_ | `auth.ts`, route handlers, Drizzle. |
| Infrastructure (Cloudflare) | _(fill in)_ | _(fill in)_ | Bindings, WAF, DNS, deploys. |
| Database (Supabase) | _(fill in)_ | _(fill in)_ | Migrations, PITR, connection limits. |
| Business owner / sales | _(fill in)_ | _(fill in)_ | **Required for any data decision touching `Won`/`Qualified` leads.** |
| Legal / privacy | _(fill in)_ | _(fill in)_ | Retention windows, data-subject requests, `Won`/`Qualified` exclusion. |

Escalation: identify → mitigate (rollback is almost always faster than diagnosis) → diagnose →
follow up. Do not skip mitigation to reach a root cause first.

---

## 9. Known issues and open work

Ordered by how likely they are to bite during an incident.

1. **`npm run db:migrate` exits 1 silently. Deploys are blocked.** 🚧
   Highest priority. `drizzle-kit migrate` produces no output and a non-zero exit code. Capture
   its stderr (`npx drizzle-kit migrate 2>&1 | tee /tmp/migrate.log`) and determine whether it is
   the journal/`__drizzle_migrations` bookkeeping or the connection. Until this is fixed, every
   deploy workflow fails at the migration step. **Do not "fix" it by deleting the step or
   switching to `db:push`.** Migrations 0000–0006 have been applied successfully by executing
   the generated SQL statement-by-statement inside one transaction and recording the row
   (sha256 of the file, journal `when` as `created_at`) — a working stopgap, but not something to
   rely on in CI.

2. **The cron trigger cannot carry a header.** ⚠️ See §4.1. The single most important unverified
   claim in this document: whether the retention job actually runs unattended.

3. **R2 has no object versioning.** ⚠️ See §7.1. Deleted media is unrecoverable today.

4. **PITR not confirmed enabled.** ⚠️ See §7.2.

5. **Binding ids in `wrangler.toml` are placeholders — by design.** ⚠️
   CI injects the real Hyperdrive ids at deploy time (ensure-by-name + sync to the
   secret); KV was removed deliberately (see above). If a deploy ever reports a
   `PASTE_*` id literally, the inject step was skipped or failed — fix that step,
   not the committed file.

6. **Incident contacts are empty.** 🚧 §8.

7. **No Sentry.** Deliberate. Wiring `@sentry/nextjs` would add a dependency and SDK
   configuration that cannot be validated against a real Cloudflare deployment from this machine,
   and an unverifiable error reporter is worse than none. `SENTRY_DSN` is in the env surface but
   nothing reads it. **Error visibility today is `wrangler tail` plus the structured JSON logs**
   (§10). When it is wired, route it through a same-origin tunnel (`/api/monitoring`) — ad
   blockers drop third-party error beacons, which is how a production-only error class stays
   invisible for weeks.

8. **No tests.** `package.json` declares `vitest` and a `test` script, but there are no test
   files. The CSV escaping, `parsePage` clamping and phone normalisation in this task were
   verified with throwaway scripts in `tmp-scripts/` rather than a committed suite.

---

## 10. Observability

### Endpoints

| Endpoint | Meaning | Cached |
| --- | --- | --- |
| `GET /api/health` | Liveness. Reports whether bindings *exist*; never touches a dependency. | No |
| `GET /api/ready` | Readiness. `SELECT 1` + R2 `head` + KV `get`. **503 on DB failure** so the platform takes the instance out of rotation. | No (`no-store`) |

`/api/ready` is deliberately *not* a liveness signal. A readiness probe that answers 200 while
the database is unreachable is worse than no probe, because the edge keeps routing traffic to a
Worker that cannot serve it. Conversely, a **cached** readiness answer is the classic failure
mode: it reports the state at the moment it was cached, so an outage persists for the TTL and a
recovery is invisible for the same duration. Hence `Cache-Control: no-store` plus a fresh
`Date.now()` read on every call, and no `'use cache'` boundary to defeat.

Only the database is load-bearing for readiness. R2 and KV failures are reported as
`status: "degraded"` but still return 200 — a missing KV already fails *open* by design, and
taking an instance out of rotation for a degradation the app is built to survive would be
self-inflicted downtime.

### Logs

API errors are single-line JSON (Task 16 §7):

```json
{"level":"error","event":"api.error","op":"POST /api/leads","requestId":"8f3c…","message":"…","code":"23505"}
```

- `requestId` is Cloudflare's `cf-ray` when present, so a Worker log line joins to the dashboard
  and the edge access log. It is also returned in 500 response bodies, so an operator can quote
  it back.
- The id is **threaded explicitly**, never stored in a module-level "current request" variable:
  a Worker isolate interleaves requests at every `await`, so an ambient variable would attribute
  one handler's error to another request.
- `code` is the driver's machine-readable cause (SQLSTATE, HTTP status), found by walking the
  `cause` chain. Without it, "Postgres error" and "constraint 23505" are indistinguishable.

### Useful queries

```bash
npx wrangler tail ecomate-landing --format pretty     # live
npx wrangler tail ecomate-landing --search 'event:api.error'
```

Event names to alert on: `api.error`, `readiness.failed`, `cron.retention.denied`,
`cron.retention.completed`, `lead.export`, `lead.notify`.

---

## 11. Sentry (not wired)

`SENTRY_DSN` is declared in `lib/env.ts` and `cloudflare-env.d.ts` so the value is not lost, but
**no code reads it**. See §9 item 7 for the reasoning. When it is wired:

- Server-side DSN only. Never expose it through a `NEXT_PUBLIC_` variable.
- Route through a same-origin tunnel route (`/api/monitoring`) so ad blockers do not blind
  reporting — this is the specific failure mode that hides production-only errors for weeks.
- Keep `logServerError`'s JSON output regardless: Workers logs are the source that works during
  an incident even when a third-party service is the thing that is down.

---

## 12. Change log for this runbook

| Date | Change | Author |
| --- | --- | --- |
| 2026-10-06 | Created with Task 16: retention cron, readiness probe, secret rotation matrix, migration direction policy, WAF inventory, restore procedures. | Task 16 |
| 2026-10-06 | Task 21: environments (prod/preview), supply-chain CI gates, preview-per-PR, branch protection procedure, monitoring, PITR drill procedure, SECURITY.md pointer. Fixed the self-triggering db:push guard. | Task 21 |

---

## 13. Environments: production only (preview decommissioned — CR-3, 2026-10-08)

> **The `preview` environment was removed, not fixed.** It shared the production
> database, so `preview.yml` was deleted, the `preview` choice was removed from
> `deploy.yml`, and `[env.preview]` was removed from `wrangler.toml`. The table
> and checklists below are preserved for history; only the `[env.production]`
> column is live. PRs are validated by CI + local E2E instead of a preview deploy.

⚠️ **PARTIALLY UNVERIFIED** — the `[env.*]` blocks are committed and `tsc` +
both builds are green, but no `--env` deploy has ever run (binding ids are
still `PASTE_*` placeholders). The first real `--env preview` deploy is the
test; expect it to fail until §13.2 is done.

### 13.1 Binding map

| Binding | Dev (top-level) | `[env.preview]` | `[env.production]` |
| --- | --- | --- | --- |
| Hyperdrive (`HYPERDRIVE`) | placeholder (local emulation only) | `PASTE_PREVIEW_HYPERDRIVE_ID` → CI-injected `ecomate-db-preview` id | `PASTE_PROD_HYPERDRIVE_ID` → CI-injected `ecomate-db-prod` id |
| R2 (`R2_BUCKET`) | `ecomate-media` | `ecomate-media-preview` | `ecomate-media-prod` |
| KV (`RATE_LIMIT_KV`) | — removed by decision — | — | — |
| Site URL | `https://dev.ecomate.bd` | `https://preview.ecomate.app` (replace with the real hostname) | `https://dev.ecomate.bd` |
| Crons | yes (top-level) | **none — deliberate** (§13.3) | yes (`[env.production.triggers]`) |
| Workers Logs | — | — | `observability.enabled = true` |

### 13.2 Creating the preview/prod resources (operator checklist)

Run once per resource; each command prints the id to paste over the matching
`PASTE_*` placeholder in `wrangler.toml`:

```bash
# Hyperdrive + R2 are CI-managed (deploy.yml / preview.yml ensure steps): nothing
# below needs to run by hand unless CI is unavailable. Manual equivalents:
npx wrangler hyperdrive create ecomate-db-prod --connection-string="$DIRECT_URL"
npx wrangler hyperdrive create ecomate-db-preview --connection-string="$PREVIEW_DIRECT_URL"
npx wrangler r2 bucket create ecomate-media-prod
npx wrangler r2 bucket create ecomate-media-preview
npx wrangler r2 bucket domain ecomate-media-prod --custom-domain media.ecomate.app
# No KV commands: KV was removed by decision (WAF + in-memory backstop instead).
```

Preview needs its OWN Supabase project/branch (`PREVIEW_REF`): sharing the
prod database with a different Hyperdrive id is not isolation, it is a label.

### 13.3 Deploying per environment

```bash
npm run deploy:preview   # build + deploy --env preview
npm run deploy:prod      # build + deploy --env production
```

The bare `npm run deploy` and any `wrangler deploy` without `--env` use the
top-level **dev** bindings and must never be used for a real release. `deploy.yml`
passes `--env` from its `environment` input for the same reason. Preview runs
**no crons**: the retention sweep would anonymise fixture leads and the
publish scheduler could publish preview drafts — traffic only, never timers.

### 13.4 Per-environment secrets

Every secret exists twice (prod + preview), set independently — a preview
`AUTH_SECRET` equal to prod's would let a preview session-cookie bug become a
prod session forgery:

```bash
npx wrangler secret put AUTH_SECRET --env production
npx wrangler secret put AUTH_SECRET --env preview
# repeat for: TOTP_ENCRYPTION_KEY, SETUP_TOKEN, CRON_SECRET, META_CAPI_TOKEN,
# TURNSTILE_SECRET_KEY, LICENSE_PORTAL_API_KEY, RESEND_API_KEY
```

### 13.4.1 Plain config values pushed by deploy.yml (Decision 7)

Three non-secret values are pushed by the deploy workflow's "Push Worker secrets"
step (`put_config` — same `wrangler secret put` mechanism, so the single source of
truth stays GitHub Secrets) and documented here:

| Name | Meaning | Empty-safe default |
| --- | --- | --- |
| `NOTIFY_FROM_EMAIL` | Resend sender for new-lead sales notifications (`lib/notifyResend.ts`) | unset = notifications stay in log-only mode (`isNotificationProviderConfigured()` false) |
| `NOTIFY_TO_EMAIL` | Resend recipient (sales inbox) for new-lead notifications | unset = same log-only mode as above; both must be set with `RESEND_API_KEY` |
| `LICENSE_PORTAL_API_BASE_URL` | Future license-portal base URL (`lib/licensePortal.ts`); e.g. `https://license.ecomate.bd` | unset = portal dispatches queue locally as `Pending` — never a failure |

Set them once as GitHub Secrets and redeploy; an unset value keeps whatever the
Worker already has (the step never wipes). `.env.example` carries local/dev skeletons only.

Rotation blast radius per secret is unchanged from §3 (rotating `AUTH_SECRET`
logs everyone out on THAT env only). Order when several are compromised:
`TOTP_ENCRYPTION_KEY` first, then `AUTH_SECRET`, then the rest — per env.

---

## 14. CI supply-chain gates (Task 21)

All in `.github/workflows/ci.yml` (`Lint & Build Validation` + `Migration
drift guard` jobs) and `deploy.yml`. Least-privilege first: every workflow
declares `permissions: contents: read` — the default token scope is write-all.

### 14.1 What each gate does

| Gate | What | Why it is blocking |
| --- | --- | --- |
| Gitleaks (`gitleaks-action`) | full-history secret scan vs `.gitleaks.toml` | every secret goes through `wrangler secret put`; history is forever |
| `npm audit --audit-level=high` | registry advisories, whole tree | §14.3 — currently RED, honestly so |
| OSV scan (`osv-scanner-action`, `--lockfile`) | multi-DB advisories (GHSA+) on the lockfile | second opinion beyond the registry view |
| `NEXT_PUBLIC_` assertion | fails on `TOKEN\|SECRET\|PASSWORD\|PRIVATE_KEY\|API_KEY` behind the prefix (`*_SITE_KEY` allowlisted — public by design) | browser-bundled values are published, not configured |
| `db:push` assertion | fails on `npm run db:push` / `drizzle-kit push` in any workflow | reconciles prod by dropping columns; migrations only |
| Migration drift guard | `db:generate` must be a no-op diff vs committed `drizzle/` | uncommitted migrations are prod incidents |
| Dependabot (`npm` + `github-actions`, weekly) | proposes updates as PRs through the full gate | nothing auto-merges |

### 14.2 Pinned actions

Third-party actions are pinned by SHA with a `# vX` comment that Dependabot's
`github-actions` updater still reads. SHAs are the major-tag tips verified
2026-10-06 (`git ls-remote`): checkout `11d5960a`, setup-node `49933ea5`,
upload-artifact `ea165f8d`, download-artifact `d3f86a10`, github-script
`10b53a9e`, gitleaks `e0c47f4f` (v3.0.0), osv-scanner `a345acff` (v2.6.0).
Nothing is left unpinned. If Dependabot lags a security fix, bump the SHA by
hand — the comment says which tag it tracks.

### 14.3 `npm audit` is RED — the honest status

✅ **VERIFIED locally 2026-10-06:** `npm audit --audit-level=high` exits 1 with
**26 vulnerabilities (4 low, 9 moderate, 13 high)**. The highs cluster in
dev-only toolchains, not Worker runtime code: `@lhci/cli` (inquirer/tmp/uuid
chains), `puppeteer-core`/`@puppeteer/browsers` (extract-zip/proxy-agent),
`rclone.js` via `@opennextjs/cloudflare` (adm-zip/basic-ftp/get-uri). Fix
direction is targeted upgrades of those tools (e.g. the uuid note wants a
breaking `@lhci/cli` move), which is its own task — NOT a threshold raise and
NOT an `audit fix --force` in this one. Until then CI is red on this step by
design: a gate that cannot fail is decoration.

### 14.4 Fixed in passing: the self-triggering db:push guard

✅ **VERIFIED 2026-10-06:** the old pattern (`(^|[^a-z:])db:push…`) matched its
own comments and step names — checked against HEAD, it failed on the
pre-change tree, meaning **neither guard ever passed**. Replaced with
invocation patterns (`npm run db:push`, `drizzle-kit push`, `pu[s]h`
self-match-safe), verified green on the tree and catching a planted
invocation. If this regresses, CI fails on every PR — loud, not silent.

### 14.5 False-positive notes

- Gitleaks: the only allowlists are two public test fixtures (RFC 6238 vector,
  xkcd-style e2e password), each commented. Local `.dev.vars` holds a REAL dev
  `AUTH_SECRET` — it is gitignored/untracked and never enters history; if it
  is ever committed, the scan SHOULD scream. Gitignored build dirs
  (`.wrangler/tmp`, `.next`, `.open-next`) contain dev-session keys and are not
  scanned by the history gate.
- Drift guard: a drizzle-kit version bump can re-render snapshots with no
  schema change. Re-run `db:generate` locally, inspect, commit — do not delete
  the step.

---

## 15. Preview per PR + branch protection (Task 21) — DECOMMISSIONED (CR-3, 2026-10-08)

> `preview.yml` was deleted and `[env.preview]` removed: the preview worker shared
> the production database. This section is preserved for history only. PR validation
> is CI (typecheck, gitleaks, audits, drift guard, build) + local E2E.

### 15.1 `.github/workflows/preview.yml`

On every PR to `main`/`master`: lint → migrate + seed the **preview** DB →
build → `deploy --env preview` → Playwright smoke (`e2e/lead.spec.ts`,
`e2e/seo.spec.ts` — the revenue path + SEO shell) → LHCI (both locales,
`lighthouserc.json` assert preset) → comment URL + LHCI deltas on the PR.
Concurrency cancels superseded runs. Needs repo secrets: `PREVIEW_DIRECT_URL`
(direct 5432 preview URL — prod `DIRECT_URL` is never in scope here),
`PREVIEW_URL` (public preview hostname), `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`.

⚠️ **UNVERIFIED — no real PR has been opened.** YAML parses (ruby psych);
deploy/smoke/comment needs a live PR. Open a draft PR after merging this task
and watch it once end to end before trusting the check.

### 15.2 Branch protection — dashboard setting, applied via API

Protection is not a file; these are the exact settings to apply (Settings →
Branches → Add rule for `main`, or the API below):

- Require status checks, strict: `Lint & Build Validation`, `Migration drift
  guard` (the two remaining `name:` values — `Preview deploy + smoke` was removed
  with preview decommissioning, CR-3; drop it from the branch rule or the rule
  will wait forever on a check that never reports).
- Require 1 approving review; require CODEOWNERS review (`.github/CODEOWNERS`
  covers `db/schema.ts`, `auth.ts`, `proxy.ts`, `wrangler.toml`, `.github/**`,
  plus `lib/securityHeaders.ts`, `lib/rateLimit.ts`).
- Block direct pushes, block force-pushes, require linear history off (squash
  merges stay allowed).

```bash
OWNER=ecomate ORG…; REPO=EcoMate-Landing  # fill in
gh api repos/$OWNER/$REPO/branches/main/protection -X PUT \
  -F required_status_checks='{"strict":true,"contexts":["Lint & Build Validation","Migration drift guard","Preview deploy + smoke"]}' \
  -F enforce_admins=true \
  -F required_pull_request_reviews='{"required_approving_review_count":1,"require_code_owner_reviews":true,"dismiss_stale_reviews":true}' \
  -F restrictions=null \
  -F allow_force_pushes=false \
  -F allow_deletions=false \
  -F required_conversation_resolution=true
```

⚠️ **UNVERIFIED — not applied.** Applying needs admin on the repo; verify with
`gh api repos/$OWNER/$REPO/branches/main/protection`.

### 15.3 CODEOWNERS placeholder

`.github/CODEOWNERS` points at `@ecomate-owners`, which does not exist yet —
replace with the real team before it can request reviews. Until then the "1
approving review" rule is the backstop.

---

## 16. Monitoring + alerting (Task 21)

⚠️ **UNVERIFIED — configurations + docs, not verifiable locally.** Nothing
below exists until an operator clicks it into being; each item says exactly
what to create.

### 16.1 External uptime monitors (create two)

Provider-agnostic (UptimeRobot / Better Uptime / Cloudflare Health Checks —
any that supports keyword matching); interval **60s**, timeout 10s, retries 2:

| # | Name | Target | Healthy | Alert when |
| --- | --- | --- | --- | --- |
| 1 | `ecomate-prod-liveness` | `GET https://ecomate.app/api/health` | 200 + body contains `"status":"ok"` | 2 consecutive failures |
| 2 | `ecomate-prod-readiness` | `GET https://ecomate.app/api/ready` | 200 | **any non-200** (503 = DB unreachable, §10) |

Alert targets (fill in): on-call phone/SMS + `#ecomate-incidents` channel +
incident-commander mailbox. Monitor 2 pages; monitor 1 notifies (liveness
without readiness is "process alive, serving nothing" — useful context, not a
page). After creating them, probe-fail once (stop the route via a preview
deploy or expect the DB-down drill) and confirm the alert fires — an untested
monitor is a rumour.

### 16.2 Lead-submit success-rate alert (< 95% over 15 min = revenue incident)

Signal: structured Worker logs. Every `POST /api/leads` emits either
`lead.notify` (`status: Sent/Pending`) or `api.error` (`op: POST /api/leads`).
Success rate = `Sent / (Sent + Failed + api.error)` over a 15-minute window;
below 0.95 pages the business owner + backend roles (§8) — a silent lead form
is lost revenue, not a tech ticket.

Wiring: the intended path is a scheduled evaluator (15-min cron, external or
Workers) reading Workers Logs / Logpush and fanning out through the existing
`lib/notify.ts` provider abstraction (it already owns "announce important
things to operators"). That wiring is a **follow-up, not this task** — no
evaluator exists, no provider method was added, and claiming otherwise would be
fiction. Interim: add the Workers Logs query below as a saved dashboard query
and check it in the daily ops glance until the alert is wired:

```
event:lead.notify OR (event:api.error op:"POST /api/leads")   # last 15 min
# Sent ÷ total ≥ 0.95, else treat as a revenue incident per §8 escalation.
```

### 16.3 Workers Logs retention

`[env.production.observability] enabled = true` (§13) is the zero-config floor:
`wrangler tail` + dashboard Logs work with no further wiring. Retention length
is plan-dependent — confirm in Dash → Workers → ecomate-landing → Logs and
record the window here: _(unverified — fill in)_. If Logpush/Splunk-style
archiving is needed for the §16.2 audit trail, that is a separate decision
(cost + PII in long-term storage vs retention policy §4).

---

## 2.4 Rollback per environment (Task 21 addition to §2)

`wrangler rollback` is per-env — rolling back without `--env` answers a
different question than the one you asked in an incident:

```bash
npx wrangler deployments list --env production    # version ids live per env
npx wrangler rollback <version-id> --env production
```

Decision rule unchanged from §2.2 (code rolls back, migrations roll forward,
never destructive down-migrations on prod). Preview rollbacks are almost never
needed — redeploy the PR instead; preview has no uptime promise.

---

## 3.1 Rotating a secret per environment (Task 21 addition to §3)

Append `--env production` (or `--env preview`) to every `wrangler secret put`
in §3 — there is no global secret anymore. Rotate prod and preview
independently; preview first (it validates the procedure), prod second.
Restated because it bites: rotating `AUTH_SECRET` logs every operator out on
that env, and rotating it while `TOTP_ENCRYPTION_KEY` is unset breaks TOTP too
— set the latter explicitly first (§3 table).

---

## 5.1 Code-enforced controls behind the WAF inventory (Task 21 addition to §5)

The §5 rules are dashboard configuration (still ⚠️ UNVERIFIED). Independent of
them, enforced in code today:

- `proxy.ts` matcher + `auth.ts` `authorized`: every `/api/*` mutating method
  needs a session except public `POST /api/leads` and the two `SETUP_TOKEN`
  bootstrap endpoints (empty-`admin_users` only).
- `lib/authz.ts` `requireAdminRole`: per-route role enforcement (IDOR backstop
  alongside `docs/SECURITY.md` T4).
- `lib/securityHeaders.ts` via the proxy: HSTS, nosniff, frame-deny, referrer,
  permissions policy, CSP on every response including redirects.
- Turnstile on the lead form; KV limiters (`lib/rateLimit.ts`, fail-open by
  design) + per-isolate backstop on `/api/leads`; per-account lockout in
  `auth.ts` fed by `admin_audit_logs`.
- `GET /api/cron/*` fails closed (503) when `CRON_SECRET` is unset — the WAF
  rule 6 only caps guessing.

---

## 7.3 PITR restore drill — exact procedure (Task 21)

⚠️ **UNVERIFIED — never executed. Do NOT run against the live database. This
section is a plan, and it stays marked so until someone runs it and records the
wall-clock time.**

Preconditions: PITR confirmed enabled (§7.2 — still open); a RESTORE TARGET
Supabase project exists that is NOT production; on-call + business owner named
(§8 still has placeholders — a drill without the sales owner present cannot
decide about `Won`/`Qualified` rows).

```
1. Record NOW:  SELECT count(*) FROM leads;  SELECT * FROM drizzle.__drizzle_migrations ORDER BY id;
   (counts + hashes are the "as expected" against which the restore is judged.)
2. In the Supabase dashboard for the PRODUCTION project → Database → Backups →
   Point-in-time recovery → restore to the RESTORE TARGET project at timestamp
   T (pick T = just before the most recent migration in drizzle/).
3. Against the RESTORE TARGET only (DIRECT_URL pointed at it, never prod):
     - drizzle.__drizzle_migrations must show exactly the migrations ≤ T.
     - leads count must equal the count recorded for time T (binlogs/replica lag aside).
     - spot-check one anonymised row: name='Withheld' rows stay Withheld (retention is not undone by restore).
4. Point a preview worker at the restore target, smoke GET / and POST /api/leads with a fixture, confirm 200s.
5. Record wall-clock minutes from "decide to restore" to "preview serving the restore". THAT number is the RPO/RTO claim.
6. Destroy or isolate the restore target (it holds real PII the moment it exists — access-logged, access-limited).
```

Do NOT promote the restore target to production by re-pointing Hyperdrive in a
hurry: rows written to prod between T and now would be silently abandoned.
Forward-reconcile (export-then-merge the delta) or accept the loss explicitly
with the business owner — never neither.
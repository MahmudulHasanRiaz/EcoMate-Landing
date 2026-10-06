# EcoMate Landing — Security Notes

Scope: what data lives where, what threatens it, and where to report a hole.
Operational procedures (rotation, rollback, restore) live in `docs/RUNBOOK.md`;
this file is the *why* behind them. Written for Task 21; every table/column
reference is read from `db/schema.ts` at that revision.

## 1. Data flow (text diagram)

```
Visitor browser
  │  POST /api/leads (Turnstile token, _fbp/_fbc cookies, consent record)
  │  GET  public pages (no PII collected; locale + UTM params only)
  ▼
Cloudflare Worker (ecomate-landing)
  ├─ proxy.ts ── session gate + security headers on every response
  ├─ KV (RATE_LIMIT_KV) ── counters only (IP + window), no PII at rest
  ├─ R2 (ecomate-media) ── media bytes + admin-supplied titles/alt text
  ├─ Hyperdrive ── Postgres (all tables below)
  └─ outbound: License Portal API · Meta CAPI · Resend (notify provider)
        ▲
Operator browser (session cookie + TOTP)
  │  /admin/* (role-gated: superadmin | admin | editor)
```

Trust boundaries: (1) browser ↔ Worker — everything inbound is attacker-shaped
until Zod says otherwise; (2) Worker ↔ Postgres/Hyperdrive — trusted only via
the binding, never via a client-supplied connection string; (3) Worker ↔
third-party APIs — server-side keys only, responses treated as untrusted text.

## 2. PII inventory — what lives in which table/column

**`leads`** — the crown jewels. Direct PII: `name`, `phone`, `email`,
`client_ip`, `user_agent`, `note`, `internal_notes` (free text — assume it
contains anything an operator pasted), `fbp`/`fbc` (browser tracking ids),
`event_id`. Quasi-identifiers: `utm_source`, `utm_campaign`, `source`,
`daily_volume`. Protection: consent columns (`consent_given/at/text`,
check-constrained), retention cron anonymises `name → 'Withheld'` and blanks
`phone/email/client_ip/user_agent` after `RETENTION_DAYS` (180) except
`Won`/`Qualified` rows — see `docs/RUNBOOK.md` §4.

**`admin_users`** — `email`, `password_hash` (`pbkdf2$600000$…`, never plaintext),
`totp_secret` (AES-256-GCM `v1:iv:ciphertext`; undecryptable without
`TOTP_ENCRYPTION_KEY`). A dump without the runtime secrets yields no working
credential — that property is load-bearing, not incidental.

**`users` / `accounts` / `sessions`** (Auth.js) — `users.email`;
`accounts.*_token` (provider tokens); `sessions.sessionToken` (bearer — anyone
holding it IS the operator until `expires`), plus `sessions.ip/user_agent`.
Protection: retention cron deletes expired `sessions` rows; admin can revoke
per-session from `/api/admin/users/[id]/sessions`.

**`admin_audit_logs`** — `ip`, `target` (usually an email). Kept deliberately:
login-failure forensics needs the very fields privacy wants deleted. No
retention sweep covers this table — a legal decision, flagged, not silently made.

**`integration_logs`** — `response.leadName` + `dailyVolume` (triage context for
the notify fan-out in `lib/notify.ts`); phone/email stay on the `leads` row and
are NOT duplicated here. `payload` carries lead ids + booleans, not contact details.

**`lead_activities.note`** — free text on the timeline; same "assume anything"
rule as `internal_notes`. Cascades on lead delete; actor FK is SET NULL so
removing an operator never erases the trail.

**`dispatch_queue.payload`** (jsonb, keyed by `kind`+`lead_id`) — carries the
failed outbound payload (Meta CAPI / License Portal) for retry; inherits
whatever PII the dispatch needed. `last_error` may embed upstream messages —
treat as tainted on display (it is rendered in admin views; XSS rule §3.3 applies).

**`media_assets` / `blog_posts` / `testimonials` / `case_studies`** — no visitor
PII by design, but all render admin-authored HTML/text publicly: they are the
stored-XSS surface (§3.3), not a PII store.

The following hold no PII: `site_settings`, `landing_sections`,
`landing_content`, `pricing_plans`, `social_links`, `menus`, `menu_items`,
`redirects`, `content_revisions` (payloads mirror the above; a PII leak into a
content payload is a bug, not a design).

## 3. Threat model

### T1 — Lead-form abuse (spam, flooding, scraping the endpoint)
Public `POST /api/leads` is the only unauthenticated mutating endpoint by
design. Layers: WAF rate limit (RUNBOOK §5 rule 1) → KV limiter + per-isolate
backstop (`lib/rateLimit.ts`, fails OPEN so a KV outage never costs a lead) →
Turnstile → Zod validation + phone normalisation → audit row per submission.
Residual: a distributed low-and-slow fill still lands rows; detection is the
`lead.notify` event rate in Workers Logs, response is WAF tuning, not code.

### T2 — Credential stuffing on `/admin/login`
Layers: WAF per-IP limit (RUNBOOK §5 rule 2) → per-account lockout counted from
`admin_audit_logs` (`auth.ts`) → PBKDF2-600k hashing (expensive to test per
guess) → TOTP second factor when enrolled. Residual: password reuse from other
breaches — enforce TOTP for all operators; there is no self-service reset path
to phish (resets are admin-issued).

### T3 — Stored XSS via media / blog / testimonial content
Admin-authored `content`/`alt_text`/`title` render on public pages. Rule: escape
at render, sanitise on save (`lib/sanitize.ts` — covered by
`tests/unit/sanitize.test.ts`), CSP `frame-ancestors`/script-src in
`lib/securityHeaders.ts` as the backstop, and treat `dispatch_queue.last_error`
+ `integration_logs.response` as untrusted on admin display for the same reason.

### T4 — IDOR on admin object ids (`/api/admin/.../[id]`)
Sequential integer ids are enumerable, so authorisation must never be "knows
the id". Enforcement: `proxy.ts` session gate → `lib/authz.ts`
`requireAdminRole` per route → ownership/scope checks in the handler (e.g. an
editor cannot touch superadmin rows, session revocation is scoped to the target
user). Tests that add a new `…/[id]` route must add the forbidden-role case.

### T5 — SSRF via the external License Portal URL
`LICENSE_PORTAL_API_BASE_URL` is operator-configured, but the dispatch path
(`lib/licensePortal.ts`) builds outbound requests from stored lead data. Rules:
the base URL comes from env, never from a lead field; redirects are not
followed with credentials; time-bounded fetch with failure recorded as
`licensePortalStatus='Failed'` (lead row stays authoritative, retry from admin).
Adding the planned order-transfer `kind` must reuse this posture, not invent one.

## 4. Out of scope / accepted risks

- No Sentry (deliberate — RUNBOOK §9.7): error visibility is `wrangler tail` +
  structured JSON logs.
- R2 has no object versioning (RUNBOOK §7.1): deleted media is unrecoverable
  until versioning is enabled.
- PITR unconfirmed, no drill run (RUNBOOK §7.2–7.3): RPO is currently a hope.
- `npm audit --audit-level=high` is RED (13 highs, dev-tooling chains —
  RUNBOOK §14.3): accepted pending targeted upgrades, tracked, not silenced.

## 5. Reporting a vulnerability

🚧 **BLOCKED — placeholder. Fill in before launch.**

| Channel | Address |
| --- | --- |
| Security contact | _(fill in — monitored mailbox, not an individual's inbox)_ |
| Expected response | Acknowledge within 48h; fix-or-mitigate timeline stated on triage |

Do not open a public issue for a suspected vulnerability. Include the affected
route/table, a minimal reproduction, and whether customer PII is (or could be)
exposed — that one fact sets the severity more than anything else.

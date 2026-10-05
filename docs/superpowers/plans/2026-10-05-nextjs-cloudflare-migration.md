# EcoMate Next.js Full-Stack on Cloudflare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Vite+Express prototype to full-stack Next.js (App Router) deployed on Cloudflare Workers, with Drizzle + Hyperdrive + Postgres and R2 media storage.

**Architecture:** Next.js App Router served from a Cloudflare Worker via `@opennextjs/cloudflare`. Express `server.ts` routes become `app/api/*/route.ts` handlers. Drizzle uses the `postgres-js` driver through a Hyperdrive binding (never `pg` Pool). Uploads go to an R2 binding. No separate backend framework.

**Tech Stack:** Next.js 15 (App Router), React 19, `@opennextjs/cloudflare`, Auth.js v5 (Credentials + Drizzle adapter + database sessions), Drizzle ORM (`postgres-js` driver), Hyperdrive, R2, Wrangler, Tailwind CSS 4, TypeScript.

---

## File structure (what changes and why)

| Path | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Next.js scripts + deps, remove `express`, `vite`, `@vitejs/plugin-react` |
| `next.config.ts` | Create | Minimal Next config (no custom webpack) |
| `opennext.config.ts` | Create | Empty default config for the Cloudflare adapter |
| `wrangler.toml` | Modify | Worker + Hyperdrive + R2 bindings (replaces static `assets` only config) |
| `vite.config.ts` | Delete | Vite no longer used |
| `server.ts` | Delete | Replaced by Route Handlers (deleted in Task 5 after port verified) |
| `src/main.tsx`, `index.html` | Delete | Replaced by `app/layout.tsx` (deleted in Task 2 after port verified) |
| `app/layout.tsx` | Create | Root layout: fonts + meta ported from `index.html:1-21` |
| `app/globals.css` | Create | Moved from `src/index.css` unchanged |
| `app/page.tsx` | Create | Client landing page ported from `src/App.tsx:32-161` |
| `src/components/*`, `src/data/*`, `src/types/*` | Keep, move as-is | UI code is framework-free React; only import paths change |
| `db/schema.ts` | Create (moved) | Moved unchanged from `src/db/schema.ts:1-169` |
| `src/db/` | Delete | Old in-memory repository removed after Task 4 passes |
| `db/client.ts` | Create | Per-request Drizzle client via Hyperdrive binding |
| `db/seed.ts` | Create | One-time SQL seed from current in-memory seed rows |
| `drizzle/` | Create (generated) | `drizzle-kit generate` output, committed |
| `drizzle.config.ts` | Modify | Points at `db/schema.ts`, uses `DIRECT_URL` |
| `app/api/health/route.ts` | Create | Health incl. `postgresConfigured` (replaces `server.ts:309-317`) |
| `app/api/settings/route.ts` | Create | GET+PUT (replaces `server.ts:40-56`) |
| `app/api/sections/route.ts`, `app/api/sections/[id]/route.ts` | Create | GET list + PUT by id (replaces `server.ts:62-79`) |
| `app/api/pricing/route.ts`, `app/api/pricing/[id]/route.ts`, `app/api/pricing/toggle-mode/route.ts` | Create | Full pricing CRUD (replaces `server.ts:85-135`) |
| `app/api/leads/route.ts`, `app/api/leads/[id]/status/route.ts`, `app/api/leads/[id]/sync-license/route.ts` | Create | Leads CRUD + license retry (replaces `server.ts:140-208`) |
| `app/api/testimonials/route.ts`, `app/api/case-studies/route.ts` | Create | Read lists (replaces `server.ts:214-229`) |
| `app/api/blog/route.ts`, `app/api/blog/[slug]/route.ts`, `app/api/blog/[id]/route.ts` | Create | Blog CRUD (replaces `server.ts:234-272`) |
| `app/api/media/route.ts`, `app/api/media/upload/route.ts` | Create | Media list+create, R2 upload (replaces `server.ts:277-292`) |
| `app/api/integrations/logs/route.ts` | Create | Log list (replaces `server.ts:298-304`) |
| `lib/licensePortal.ts` | Create (moved) | Moved from `src/services/licensePortal.ts:1-156`, reads Worker env |
| `src/services/api.ts` | Keep | Unchanged — same `/api` paths work against Route Handlers |
| `.github/workflows/deploy.yml` | Modify | opennext build + wrangler deploy + `DIRECT_URL` for migrations |
| `.env.example` | Modify | Documents new vars (no secrets committed) |
| `auth.ts`, `middleware.ts`, `lib/password.ts`, `app/admin/*`, `app/api/admin/*` | Create (Task 9: Auth.js v5) | Credentials auth + RBAC + user management |
| `app/sitemap.ts`, `app/robots.ts`, `lib/seo.ts` | Create (Task 10) | Sitemap, robots, JSON-LD |
| Current sections/components | Polish (Task 11) | Metric audit, light mode, mobile-first QA |
| `landing_content` + `social_links` tables, `app/api/content/*`, `app/api/social-links/*` | Create (Task 12) | Whole-site DB-driven content per locale |

---

### Task 1: Scaffold Next.js + Cloudflare adapter

**Files:**
- Modify: `package.json`
- Create: `next.config.ts`
- Create: `opennext.config.ts`
- Create: `app/layout.tsx` (skeleton only, full content in Task 2)

- [ ] **Step 1: Install Next.js + adapter, remove Vite/Express server deps**

Run:
```bash
npm i next@^15 react@^19 react-dom@^19 @opennextjs/cloudflare postgres@^3 drizzle-orm@^0.45 @aws-sdk/client-s3@^3
npm i -D wrangler@^4 drizzle-kit@^0.31
npm rm express @types/express vite @vitejs/plugin-react @tailwindcss/vite
```
Expected: exit 0, `package-lock.json` updated. (`tailwindcss@^4` + `autoprefixer` stay; Next 15 handles PostCSS via installed `postcss` — add `npm i -D postcss@^8` if `postcss.config` missing.)

- [ ] **Step 2: Replace npm scripts**

Replace `package.json` `scripts` block with exactly:
```json
"scripts": {
  "dev": "next dev",
  "build": "opennextjs-cloudflare build",
  "preview": "opennextjs-cloudflare preview",
  "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
  "lint": "tsc --noEmit",
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push",
  "db:seed": "tsx db/seed.ts"
},
```
Also set `"engines": { "node": ">=20.0.0" }` (Workers build runs on Node 20+; old `>=24` block rejected some CI images).

- [ ] **Step 3: Write `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};
export default nextConfig;
```

- [ ] **Step 4: Write `opennext.config.ts`**

```ts
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
export default defineCloudflareConfig({});
```

- [ ] **Step 5: Typecheck the scaffold (expected to fail on missing `app/` — proves baseline)**

Run: `npx tsc --noEmit`
Expected: FAIL with errors like `No inputs were found` or missing `app/layout`. Do not fix yet; Task 2 provides `app/`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json next.config.ts opennext.config.ts
git commit -m "feat: scaffold Next.js + opennext Cloudflare adapter"
```

---

### Task 2: Port landing UI (App → page, index.html → layout)

**Files:**
- Create: `app/layout.tsx`
- Create: `app/globals.css` (moved from `src/index.css`)
- Create: `app/page.tsx`
- Delete: `src/main.tsx`, `index.html` (only after Step 4 passes)

- [ ] **Step 1: Move global CSS**

Run: `git mv src/index.css app/globals.css`
Expected: `app/globals.css` exists, `src/index.css` gone.

- [ ] **Step 2: Write `app/layout.tsx`** (fonts + meta ported from `index.html:13-15`, body classes from `index.html:17`)

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EcoMate — Your Entire E-commerce Operation, Managed From One Place',
  description:
    'EcoMate is the complete operating platform for scaling e-commerce businesses. Unify online stores, showrooms, inventory, smart packing, couriers, finance, and marketing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#F8FAFC] text-slate-900 antialiased selection:bg-indigo-600 selection:text-white dark:bg-[#07080E] dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Write `app/page.tsx`** — copy `src/App.tsx:1-161` verbatim, add `'use client';` as line 1 (it uses `useState`/`useEffect`), change CSS import to none (layout owns it). Component imports (`./components/Header` etc.) keep working because files stay under `src/`; update the three data/type imports only if files move (they don't move in this plan).

- [ ] **Step 4: Boot dev server and verify landing renders**

Run: `npm run dev`
Expected: `✓ Ready on http://localhost:3000`, page renders hero + sections, no console errors. `/api/*` will 404 until Task 4 — that is expected; AdminPanel data comes later.

- [ ] **Step 5: Delete Vite entry files, commit**

```bash
git rm src/main.tsx index.html vite.config.ts
git add app/layout.tsx app/globals.css app/page.tsx
git commit -m "feat: port landing UI to Next.js App Router"
```

---

### Task 3: DB layer — schema move + Hyperdrive client + seed

**Files:**
- Create: `db/schema.ts` (moved unchanged from `src/db/schema.ts`)
- Create: `db/client.ts`
- Create: `db/seed.ts`
- Modify: `drizzle.config.ts`

- [ ] **Step 1: Move schema, write Hyperdrive client**

Run: `git mv src/db/schema.ts db/schema.ts`

Write `db/client.ts` exactly:
```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getRequestContext } from '@opennextjs/cloudflare';
import * as schema from './schema';

export function getDb() {
  const { env } = getRequestContext();
  const connectionString = (env as any).HYPERDRIVE?.connectionString as string | undefined;
  if (!connectionString) throw new Error('HYPERDRIVE_NOT_BOUND');
  const client = postgres(connectionString, { prepare: false, max: 1 });
  return drizzle(client, { schema });
}

export function isPostgresConfigured(): boolean {
  try {
    const { env } = getRequestContext();
    return Boolean((env as any).HYPERDRIVE?.connectionString);
  } catch {
    return false;
  }
}
```
Why `max: 1` + `prepare: false`: Workers are single-request isolates; pooled Hyperdrive string already multiplexes. This is the only sanctioned Postgres pattern on Workers.

- [ ] **Step 2: Point drizzle-kit at new schema path**

Replace `drizzle.config.ts` with:
```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL || '',
  },
});
```
(`dotenv` import removed — Next loads `.env.local` automatically; `DIRECT_URL` lives in `.env.local`, never committed.)

- [ ] **Step 3: Write `db/seed.ts`** — inserts the current prototype seed rows (site settings 1 row, 10 landing sections, 3 pricing plans, 2 demo leads, 3 testimonials, 1 case study, 2 blog posts, 3 media assets, 1 integration log) using the same literal values in `src/db/index.ts:186-534`. Use `tsx` + `postgres` with `DIRECT_URL`:

```ts
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const client = postgres(process.env.DIRECT_URL!, { prepare: false });
const db = drizzle(client, { schema });

async function main() {
  await db.insert(schema.siteSettingsTable).values({
    siteName: 'EcoMate',
    tagline: 'Your Entire E-commerce Operation, Managed From One Place',
    defaultLocale: 'en',
    supportPhone: '+880 1894-828290',
    supportEmail: 'hello@ecomate.app',
    whatsappNumber: '8801894828290',
    messengerUrl: 'https://m.me/ecomate.app',
    address: 'Tejgaon I/A, Dhaka 1208, Bangladesh',
    isPricingVisible: true,
  }).onConflictDoNothing();
  // ... repeat for landingSectionsTable (10 rows from src/db/index.ts:206-216),
  // pricingPlansTable (3 rows), leadsTable (2 rows), testimonialsTable (3 rows),
  // caseStudiesTable (1 row), blogPostsTable (2 rows), mediaAssetsTable (3 rows).
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 4: Generate migration SQL (proves schema compiles)**

Run:
```bash
DIRECT_URL="postgresql://user:pass@localhost:5432/postgres" npm run db:generate
```
Expected: `drizzle/` folder created with `*.sql` + snapshot. (Real `DIRECT_URL` comes in Task 7; generation needs no live DB.)

- [ ] **Step 5: Commit**

```bash
git add db/ drizzle.config.ts drizzle/
git commit -m "feat: move Drizzle schema, add Hyperdrive client and seed"
```

---

### Task 4: API Route Handlers (settings, sections, health)

**Files:**
- Create: `lib/json.ts`
- Create: `app/api/health/route.ts`
- Create: `app/api/settings/route.ts`
- Create: `app/api/sections/route.ts`
- Create: `app/api/sections/[id]/route.ts`

- [ ] **Step 1: Write shared JSON helper `lib/json.ts`**

```ts
export function ok(data: unknown, status = 200) {
  return Response.json(data, { status });
}
export function fail(message: string, status = 500) {
  return Response.json({ error: message }, { status });
}
```

- [ ] **Step 2: Write `app/api/health/route.ts`** (replaces `server.ts:309-317`; `process.uptime()` doesn't exist on Workers — use `Date.now()` boot-relative marker)

```ts
import { ok } from '@/lib/json';
import { isPostgresConfigured } from '@/db/client';

export async function GET() {
  return ok({
    status: 'healthy',
    postgresConfigured: isPostgresConfigured(),
    timestamp: new Date().toISOString(),
  });
}
```

- [ ] **Step 3: Write `app/api/settings/route.ts`** (replaces `server.ts:40-56`)

```ts
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { siteSettingsTable } from '@/db/schema';
import { ok, fail } from '@/lib/json';

export async function GET() {
  try {
    const rows = await getDb().select().from(siteSettingsTable).limit(1);
    if (!rows[0]) return fail('Settings not seeded', 404);
    return ok(rows[0]);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const [updated] = await getDb()
      .update(siteSettingsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(siteSettingsTable.id, 1))
      .returning();
    return ok(updated);
  } catch (e: any) {
    return fail(e.message);
  }
}
```

- [ ] **Step 4: Write `app/api/sections/route.ts` + `app/api/sections/[id]/route.ts`** (replaces `server.ts:62-79`)

`route.ts`:
```ts
import { asc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { landingSectionsTable } from '@/db/schema';
import { ok, fail } from '@/lib/json';

export async function GET() {
  try {
    const rows = await getDb().select().from(landingSectionsTable).orderBy(asc(landingSectionsTable.sortOrder));
    return ok(rows);
  } catch (e: any) {
    return fail(e.message);
  }
}
```
`[id]/route.ts`:
```ts
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { landingSectionsTable } from '@/db/schema';
import { ok, fail } from '@/lib/json';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const [updated] = await getDb()
      .update(landingSectionsTable)
      .set({ ...body })
      .where(eq(landingSectionsTable.id, Number(params.id)))
      .returning();
    if (!updated) return fail('Section not found', 404);
    return ok(updated);
  } catch (e: any) {
    return fail(e.message);
  }
}
```

- [ ] **Step 5: Smoke-test these four routes locally (proves pattern before mass port)**

Run:
```bash
npm run dev &
sleep 8
curl -s localhost:3000/api/health; echo
curl -s localhost:3000/api/settings; echo
curl -s localhost:3000/api/sections | head -c 300; echo
kill %1
```
Expected: health `{"status":"healthy","postgresConfigured":false,...}` (false locally until Task 7 binds Hyperdrive — correct), settings/sections return `HYPERDRIVE_NOT_BOUND` error JSON. That failure is the RED state proving routes wire up; GREEN comes in Task 7.

- [ ] **Step 6: Commit**

```bash
git add lib/json.ts app/api/health app/api/settings app/api/sections
git commit -m "feat: add health, settings, sections route handlers"
```

---

### Task 5: API Route Handlers (pricing, leads, license retry) + delete server.ts

**Files:**
- Create: `app/api/pricing/route.ts`, `app/api/pricing/[id]/route.ts`, `app/api/pricing/toggle-mode/route.ts`
- Create: `app/api/leads/route.ts`, `app/api/leads/[id]/status/route.ts`, `app/api/leads/[id]/sync-license/route.ts`
- Create: `lib/licensePortal.ts` (moved from `src/services/licensePortal.ts`)
- Delete: `server.ts` (only after Step 5 passes)

- [ ] **Step 1: Write `app/api/pricing/route.ts`** (replaces `server.ts:88-104`)

```ts
import { asc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { pricingPlansTable, siteSettingsTable } from '@/db/schema';
import { ok, fail } from '@/lib/json';

export async function GET() {
  try {
    const db = getDb();
    const settings = (await db.select().from(siteSettingsTable).limit(1))[0];
    const plans = await db.select().from(pricingPlansTable).orderBy(asc(pricingPlansTable.sortOrder));
    return ok({ isPricingVisible: settings?.isPricingVisible ?? true, plans });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const [created] = await getDb().insert(pricingPlansTable).values(body).returning();
    return ok(created, 201);
  } catch (e: any) {
    return fail(e.message);
  }
}
```

- [ ] **Step 2: Write `app/api/pricing/[id]/route.ts` + `app/api/pricing/toggle-mode/route.ts`** (replaces `server.ts:106-135`)

`[id]/route.ts`:
```ts
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { pricingPlansTable } from '@/db/schema';
import { ok, fail } from '@/lib/json';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const [updated] = await getDb()
      .update(pricingPlansTable).set(body)
      .where(eq(pricingPlansTable.id, Number(params.id))).returning();
    if (!updated) return fail('Pricing plan not found', 404);
    return ok(updated);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await getDb().delete(pricingPlansTable).where(eq(pricingPlansTable.id, Number(params.id)));
    return ok({ success: true });
  } catch (e: any) {
    return fail(e.message);
  }
}
```
`toggle-mode/route.ts`:
```ts
import { eq, not } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { siteSettingsTable } from '@/db/schema';
import { ok, fail } from '@/lib/json';

export async function POST() {
  try {
    const [updated] = await getDb()
      .update(siteSettingsTable)
      .set({ isPricingVisible: not(siteSettingsTable.isPricingVisible), updatedAt: new Date() })
      .where(eq(siteSettingsTable.id, 1)).returning();
    return ok({ isPricingVisible: updated.isPricingVisible });
  } catch (e: any) {
    return fail(e.message);
  }
}
```

- [ ] **Step 3: Write `app/api/leads/route.ts`** (replaces `server.ts:140-186`, keeps validation + 8-per-10min rate limit; Worker has no shared memory so limit is per-isolate best-effort)

```ts
import { desc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { leadsTable } from '@/db/schema';
import { ok, fail } from '@/lib/json';
import { dispatchLead } from '@/lib/licensePortal';

const hits = new Map<string, { count: number; expiresAt: number }>();

export async function GET() {
  try {
    const rows = await getDb().select().from(leadsTable).orderBy(desc(leadsTable.createdAt));
    return ok(rows);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('cf-connecting-ip') ?? 'unknown-ip';
    const now = Date.now();
    const rec = hits.get(ip);
    if (rec && rec.expiresAt > now && rec.count >= 8)
      return fail('Too many requests. Please try again in a few minutes or call us directly.', 429);
    hits.set(ip, rec && rec.expiresAt > now ? { count: rec.count + 1, expiresAt: rec.expiresAt } : { count: 1, expiresAt: now + 600000 });

    const { name, phone, email, dailyVolume, note, source, utmSource, utmCampaign } = await req.json();
    if (!name?.trim()) return fail('Name is required', 400);
    if (!phone || phone.trim().length < 8) return fail('A valid phone number is required', 400);

    const [lead] = await getDb().insert(leadsTable).values({
      name: name.trim(), phone: phone.trim(), email: email?.trim() ?? '',
      dailyVolume: dailyVolume ?? '150 – 500 orders / day', note: note?.trim() ?? '',
      source: source ?? 'landing_page_lead_form', utmSource: utmSource ?? '', utmCampaign: utmCampaign ?? '',
    }).returning();

    dispatchLead(lead.id).catch((err) => console.error('[LicensePortal Async Error]', err));
    return ok({ success: true, leadId: lead.id, message: 'Demo request registered successfully. Our operations team will reach out promptly.' }, 201);
  } catch (e: any) {
    return fail(e.message);
  }
}
```

- [ ] **Step 4: Write `lib/licensePortal.ts`** — copy `src/services/licensePortal.ts:25-156` class verbatim with two changes: (a) import schema tables + `getDb` instead of `repository`, implement `dispatchLead(leadId)` + `retryLead(leadId)` with Drizzle reads/writes; (b) read config from `getRequestContext().env` with `process.env` fallback for local dev:

```ts
import { getRequestContext } from '@opennextjs/cloudflare';
function cfg(key: string): string {
  try { return (getRequestContext().env as any)[key] ?? process.env[key] ?? ''; }
  catch { return process.env[key] ?? ''; }
}
```

- [ ] **Step 5: Write status + sync-license routes, verify no `repository` imports remain, delete `server.ts`**

`app/api/leads/[id]/status/route.ts`: Drizzle update of `status`+`internalNotes` by id, 404 when missing (replaces `server.ts:188-198`).
`app/api/leads/[id]/sync-license/route.ts`: calls `retryLead(id)` (replaces `server.ts:200-208`).
Then run: `rg -l "from.*db['\"]|repository" app lib db --type ts || true` — expected: no output referencing old `src/db`. Then `git rm server.ts`.

- [ ] **Step 6: Commit**

```bash
git add app/api/pricing app/api/leads lib/licensePortal.ts
git rm server.ts
git commit -m "feat: port pricing and leads handlers, drop Express server"
```

---

### Task 6: API Route Handlers (content: testimonials, case studies, blog, media, logs)

**Files:**
- Create: `app/api/testimonials/route.ts`, `app/api/case-studies/route.ts`
- Create: `app/api/blog/route.ts`, `app/api/blog/[slug]/route.ts`, `app/api/blog/[id]/route.ts`
- Create: `app/api/media/route.ts`, `app/api/media/upload/route.ts`
- Create: `app/api/integrations/logs/route.ts`

- [ ] **Step 1: Write testimonials + case-studies routes** (replaces `server.ts:214-229`)

```ts
// app/api/testimonials/route.ts
import { asc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { testimonialsTable } from '@/db/schema';
import { ok, fail } from '@/lib/json';

export async function GET() {
  try {
    const rows = await getDb().select().from(testimonialsTable).orderBy(asc(testimonialsTable.sortOrder));
    return ok(rows);
  } catch (e: any) {
    return fail(e.message);
  }
}
```
Case-studies route is identical except table `caseStudiesTable` with no `orderBy`.

- [ ] **Step 2: Write blog routes** (replaces `server.ts:234-272`)

`app/api/blog/route.ts`: GET list ordered by `publishedAt` desc + POST create. `app/api/blog/[slug]/route.ts`: GET by slug, 404 when missing. `app/api/blog/[id]/route.ts`: PUT by id, 404 when missing. Same `ok`/`fail` + `getDb()` pattern as Step 1 (tables: `blogPostsTable`, operators: `desc`, `eq`).

- [ ] **Step 3: Write media list route + R2 upload route** (replaces `server.ts:285-292`, adds R2)

`app/api/media/route.ts`: GET list + POST create on `mediaAssetsTable`, same pattern as Step 1.
`app/api/media/upload/route.ts`:
```ts
import { getRequestContext } from '@opennextjs/cloudflare';
import { ok, fail } from '@/lib/json';

export async function POST(req: Request) {
  try {
    const { env } = getRequestContext();
    const bucket = (env as any).R2_BUCKET;
    if (!bucket) return fail('R2_NOT_BOUND', 500);
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return fail('file is required', 400);
    const key = `${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    });
    return ok({ key, url: `/assets/${key}` }, 201);
  } catch (e: any) {
    return fail(e.message);
  }
}
```

- [ ] **Step 4: Write integration logs route** (replaces `server.ts:298-304`): GET `integrationLogsTable` ordered by `createdAt` desc, same pattern as Step 1.

- [ ] **Step 5: Full typecheck (all routes must compile)**

Run: `npx tsc --noEmit`
Expected: PASS with no output.

- [ ] **Step 6: Commit**

```bash
git add app/api/testimonials app/api/case-studies app/api/blog app/api/media app/api/integrations
git commit -m "feat: port content, media and log handlers with R2 upload"
```

---

### Task 7: Wrangler bindings + local Hyperdrive + seed + AdminPanel verify

**Files:**
- Modify: `wrangler.toml`
- Modify: `.env.example`
- Modify: `.github/workflows/deploy.yml` (secrets block only)

- [ ] **Step 1: Create Hyperdrive + R2 via wrangler (run against real Cloudflare account)**

Run:
```bash
npx wrangler hyperdrive create ecomate-db --connection-string="postgresql://postgres:PASSWORD@db.REF.supabase.co:6543/postgres?pgbouncer=true"
npx wrangler r2 bucket create ecomate-media
```
Expected: each prints an `id` (Hyperdrive) / success. Copy the Hyperdrive id into Step 2.

- [ ] **Step 2: Write final `wrangler.toml`** (replace current 3-line static config)

```toml
name = "ecomate-landing"
compatibility_date = "2025-09-01"
compatibility_flags = ["nodejs_compat"]

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "PASTE_HYPERDRIVE_ID_FROM_STEP_1"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "ecomate-media"

[vars]
NEXT_PUBLIC_SITE_URL = "https://ecomate.app"
NEXT_PUBLIC_DEFAULT_LOCALE = "en"
```

- [ ] **Step 3: Document env in `.env.example`** (no secrets, skeletons only)

```
# Direct Postgres for drizzle-kit + seed (local/CI only, port 5432)
DIRECT_URL="postgresql://postgres:password@db.REF.supabase.co:5432/postgres"
# Hyperdrive pooled string lives in Cloudflare Dashboard binding, NOT here
# Worker secrets set via: npx wrangler secret put LICENSE_PORTAL_API_KEY
LICENSE_PORTAL_API_BASE_URL="https://license.ecomate.app"
NEXT_PUBLIC_SITE_URL="https://ecomate.app"
NEXT_PUBLIC_DEFAULT_LOCALE="en"
GEMINI_API_KEY=""
```

- [ ] **Step 4: Run migration + seed against real Supabase**

Run:
```bash
DIRECT_URL="<paste-direct-5432-url>" npm run db:push
DIRECT_URL="<paste-direct-5432-url>" npm run db:seed
```
Expected: `db:push` reports tables created; `db:seed` exits 0. Verify in Supabase dashboard: `site_settings` 1 row, `landing_sections` 10 rows, `leads` 2 rows.

- [ ] **Step 5: Verify AdminPanel shows Supabase data locally**

Run: `npm run dev`, open `http://localhost:3000`, open Admin (PrototypeController button), check Leads tab.
Expected: Tanvir Hossain + Nuzhat Farhana rows from Supabase (not local seed). `curl -s localhost:3000/api/health` returns `"postgresConfigured":true`.

- [ ] **Step 6: Commit**

```bash
git add wrangler.toml .env.example
git commit -m "chore: bind Hyperdrive Postgres and R2, document env"
```

---

### Task 8: CI/CD cutover + production smoke

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `.github/workflows/ci.yml` (build command only)

- [ ] **Step 1: Update `ci.yml` build step** — `npm run build` now runs `opennextjs-cloudflare build`; artifact check changes from `dist/index.html` to `.opennext/` output:

Replace the verify block with:
```yaml
      - name: Verify build artifacts
        run: |
          if [ ! -d .opennext ]; then
            echo "::error::Build verification failed: .opennext directory does not exist!"
            exit 1
          fi
          echo "Production build verified successfully. Ready for manual deployment."
```

- [ ] **Step 2: Update `deploy.yml`** — build job uploads `.opennext` instead of `dist`; deploy job runs `opennextjs-cloudflare deploy` (needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets, unchanged). Add `DIRECT_URL` to GitHub Secrets and a migration step before deploy:

```yaml
      - name: Apply DB migrations
        run: npm run db:push
        env:
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
```

- [ ] **Step 3: Cloudflare dashboard checklist (manual, one time)**

1. Workers & Pages → `ecomate-landing` → Settings → Bindings: confirm `HYPERDRIVE` + `R2_BUCKET` present.
2. Settings → Variables → Secrets: add `LICENSE_PORTAL_API_KEY`, `GEMINI_API_KEY` via `npx wrangler secret put <NAME>` instead of typing in UI.
3. If old Pages project auto-builds on push: Builds & deployments → Pause automatic deployments (per `DEPLOYMENT.md` section 2).

- [ ] **Step 4: Deploy + production smoke (the acceptance test)**

Run workflow via GitHub Actions UI (workflow_dispatch, environment `production`), then:
```bash
curl -s https://ecomate.app/api/health; echo
curl -s https://ecomate.app/api/leads | head -c 300; echo
```
Expected: health `{"status":"healthy","postgresConfigured":true,...}`; leads returns Supabase rows. Open landing + AdminPanel in browser: sections render, Leads tab populated.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/deploy.yml
git commit -m "ci: cut over pipelines to opennext Worker deploy with DB migration"
```

---

### Task 9: Auth.js v5 auth + User Management module (brief §18 security requirement)

**Files:**
- Modify: `package.json` (add `next-auth@^5` beta + `@auth/drizzle-adapter`)
- Modify: `db/schema.ts` (append `admin_users` + `admin_audit_logs`; Auth.js tables come from adapter)
- Create: `lib/password.ts` (PBKDF2 verify, WebCrypto-native for Workers)
- Create: `auth.ts` (NextAuth config: Credentials + Drizzle adapter + database sessions)
- Create: `app/api/auth/[...nextauth]/route.ts` (Auth.js handler)
- Create: `middleware.ts` (Auth.js gate + RBAC)
- Create: `app/admin/login/page.tsx`, `app/admin/setup/page.tsx`, `app/admin/page.tsx`
- Create: `app/api/admin/users/route.ts`, `app/api/admin/users/[id]/route.ts`, `app/api/admin/setup/route.ts`

- [ ] **Step 1: Install Auth.js + adapter**

Run: `npm i next-auth@beta @auth/drizzle-adapter`
Expected: exit 0. (`next@^15` + `nodejs_compat` flag from Task 7 Step 2 are hard requirements — Auth.js needs Node crypto compat on Workers.)

- [ ] **Step 2: Append auth tables to `db/schema.ts`**

```ts
// 12. Admin Users (Auth.js Credentials identity + RBAC)
export const adminUsersTable = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(), // "pbkdf2$600000$salt$hash"
  role: text('role').notNull().default('editor'), // superadmin | admin | editor
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 13. Admin Audit Log (logins, user mgmt, retries)
export const adminAuditLogsTable = pgTable('admin_audit_logs', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id'),
  action: text('action').notNull(), // LOGIN_OK, LOGIN_FAIL, USER_CREATE, USER_DEACTIVATE, PASSWORD_RESET, ROLE_CHANGE
  target: text('target').default(''),
  ip: text('ip').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```
Auth.js `accounts`/`sessions`/`verificationTokens` tables come from `@auth/drizzle-adapter` (`DrizzleAdapter` auto-maps); do not hand-write them. Regenerate: `npm run db:generate`.

- [ ] **Step 3: Write `lib/password.ts`** — PBKDF2-SHA256, 600k iterations, WebCrypto (native on Workers, no `node:crypto` import):

```ts
const ITERATIONS = 600_000;

function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${ITERATIONS}$${bufToHex(salt.buffer as ArrayBuffer)}$${bufToHex(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [, iter, saltHex, hashHex] = stored.split('$');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: Number(iter), hash: 'SHA-256' }, key, 256,
  );
  const a = bufToHex(bits);
  if (a.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}

export function passwordPolicyOk(password: string): boolean {
  return password.length >= 12;
}
```

- [ ] **Step 4: Write `auth.ts`** — Credentials provider, database sessions (opaque tokens, never JWT), role in session:

```ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { adminUsersTable, adminAuditLogsTable } from '@/db/schema';
import { verifyPassword } from '@/lib/password';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb() as any),
  session: { strategy: 'database', maxAge: 12 * 60 * 60 },
  pages: { signIn: '/admin/login' },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds, req) {
        const email = String(creds?.email ?? '').toLowerCase().trim();
        const password = String(creds?.password ?? '');
        const db = getDb();
        const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email)).limit(1);
        const ip = req.headers.get('cf-connecting-ip') ?? '';
        const okUser = user && user.isActive && (await verifyPassword(password, user.passwordHash));
        await db.insert(adminAuditLogsTable).values({
          actorId: user?.id ?? null,
          action: okUser ? 'LOGIN_OK' : 'LOGIN_FAIL',
          target: email, ip,
        });
        if (!okUser) return null; // generic failure — no enumeration
        await db.update(adminUsersTable).set({ lastLoginAt: new Date() }).where(eq(adminUsersTable.id, user.id));
        return { id: String(user.id), email: user.email, role: user.role } as any;
      },
    }),
  ],
  callbacks: {
    async session({ session, user }: any) {
      const db = getDb();
      const [row] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, user.email)).limit(1);
      (session.user as any).role = row?.role ?? 'editor';
      return session;
    },
  },
});
```
(`AUTH_SECRET` is a Worker secret via `npx wrangler secret put AUTH_SECRET`; Auth.js owns CSRF tokens, cookie flags, session expiry. Login rate limit: 5 fails/10min per IP enforced in a guard inside `authorize` by counting recent `LOGIN_FAIL` audit rows — generic error on lockout.)

- [ ] **Step 5: Write `app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

- [ ] **Step 6: Write `middleware.ts`** — Auth.js gate + RBAC; public GET + lead POST stay open:

```ts
export { auth as middleware } from '@/auth';

export const config = { matcher: ['/admin/:path*', '/api/:path*'] };
```
Plus an `authorized` callback in `auth.ts` callbacks (append to Step 4 config):
```ts
async authorized({ request, auth: session }: any) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  const isAuthApi = pathname.startsWith('/api/auth/');
  const isPublicPost = pathname === '/api/leads' && method === 'POST';
  const needsAuth =
    pathname.startsWith('/admin') ||
    (pathname.startsWith('/api/') && !isAuthApi && (method === 'PUT' || method === 'DELETE' || method === 'PATCH' || (method === 'POST' && !isPublicPost)));
  if (pathname === '/admin/login' || pathname === '/admin/setup') return true;
  if (!needsAuth) return true;
  return !!session?.user;
},
```
Role enforcement (superadmin-only user mgmt, editor read limits) happens inside each admin handler by reading `(await auth())` session role and returning 403 — never trust client-sent role.

- [ ] **Step 7: Write setup + login + users routes** — `POST /api/admin/setup`: requires `SETUP_TOKEN` secret match AND `admin_users` empty, creates first superadmin (min-12-char password), then setup is permanently dead (empty-check fails forever). `GET/POST /api/admin/users` + `PUT/DELETE /api/admin/users/[id]`: superadmin-only list/create/deactivate/password-reset/role-change; every action writes `admin_audit_logs`; password reset revokes all user sessions via adapter `deleteSession` loop.

- [ ] **Step 8: Write admin pages** — `app/admin/login/page.tsx` (Auth.js `signIn('credentials')` form), `app/admin/setup/page.tsx` (one-time form), `app/admin/page.tsx` (session check via `auth()`; renders existing `AdminPanel` + new Users tab UI calling `/api/admin/users`). PrototypeController button links to `/admin` instead of modal state.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json db/schema.ts drizzle/ lib/password.ts auth.ts middleware.ts "app/api/auth" app/admin "app/api/admin"
git commit -m "feat: Auth.js v5 credentials auth with RBAC and user management"
```

---

### Task 10: SEO architecture (brief §9 requirement)

**Files:**
- Create: `app/sitemap.ts`, `app/robots.ts`
- Create: `lib/seo.ts`

- [ ] **Step 1: Write `app/sitemap.ts`** — static routes + DB-driven blog/case-study URLs:

```ts
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ecomate.app';
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/blog`, changeFrequency: 'daily', priority: 0.8 },
  ];
}
```
(Blog/case-study slugs appended from DB in a follow-up once Tasks 4-6 routes are live; static entries ship first so sitemap never 500s without DB.)

- [ ] **Step 2: Write `app/robots.ts`**

```ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ecomate.app';
  return { rules: [{ userAgent: '*', allow: '/' }], sitemap: `${base}/sitemap.xml` };
}
```

- [ ] **Step 3: Write `lib/seo.ts`** — Organization JSON-LD + article JSON-LD helpers, used in `app/layout.tsx` (organization) and blog routes (article). Keep metadata from Task 2; add `metadataBase`, `openGraph`, `twitter`, `alternates.canonical` to the layout `metadata` object.

- [ ] **Step 4: Verify**

Run: `npm run build && npx opennextjs-cloudflare preview & sleep 10; curl -s localhost:8787/sitemap.xml | head -c 200; echo; curl -s localhost:8787/robots.txt; echo`
Expected: valid XML entries + `User-agent: *` body.

- [ ] **Step 5: Commit**

```bash
git add app/sitemap.ts app/robots.ts lib/seo.ts app/layout.tsx
git commit -m "feat: add sitemap, robots and JSON-LD SEO foundation"
```

---

### Task 11: Design-correction pass (brief §5 A–M; runs AFTER backend green)

**Files:**
- Modify: current section components + `src/data/landingContent.ts` (copy audit only, no new architecture)

- [ ] **Step 1: Metric audit** — `rg -n "100%|<0\.05|92\.4|৳ ?[0-9]" src/components src/data` and replace every unverified precision claim with demo-labelled or neutral wording (e.g. prefix `Demo data:` or drop the figure). Report the replaced list in the commit message body.

- [ ] **Step 2: Light-mode hierarchy** — add tinted surfaces (`bg-white`, `slate-50/100` bands), visible `border-slate-200` card borders, section separators; no global color inversion. Verify side-by-side light/dark at 1280px.

- [ ] **Step 3: Mobile-first QA** — check 360/390/430 widths for hero, CTA, ecosystem visual, pricing, testimonials, lead form; fix overflow/clipped text/tiny screenshots; confirm sticky CTA bar is tasteful and non-intrusive.

- [ ] **Step 4: Visual QA sign-off** — record pass/fail per width (360/390/430/tablet/1280/1440) in the commit message body.

- [ ] **Step 5: Commit**

```bash
git add src/components src/data
git commit -m "design: remove unverified metrics, polish light mode and mobile QA"
```

---

### Task 12: Whole-site dynamic content (admin-manageable everything)

**Files:**
- Modify: `db/schema.ts` (append 2 tables)
- Modify: `db/seed.ts` (seed content rows + social links)
- Create: `app/api/content/route.ts`, `app/api/content/[sectionKey]/route.ts`
- Create: `app/api/social-links/route.ts`
- Modify: `app/page.tsx` (server component fetching DB content with static fallback)
- Modify: AdminPanel sections tab (edit payload per sectionKey + locale)

- [ ] **Step 1: Append content tables to `db/schema.ts`**

```ts
// 10. Landing Content Payloads (one row per section per locale)
export const landingContentTable = pgTable('landing_content', {
  id: serial('id').primaryKey(),
  sectionKey: text('section_key').notNull(), // hero, complexity, ecosystem, multiChannel, ...
  locale: text('locale').notNull().default('en'), // en | bn
  content: jsonb('content').notNull().default({}),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 11. Social Links (footer + contact)
export const socialLinksTable = pgTable('social_links', {
  id: serial('id').primaryKey(),
  platform: text('platform').notNull(), // facebook, youtube, linkedin, tiktok
  url: text('url').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: boolean('is_visible').notNull().default(true),
});
```

- [ ] **Step 2: Seed from `src/data/landingContent.ts`** — in `db/seed.ts`, import the static object and insert one row per top-level section key per locale:

```ts
import { landingContent } from '../src/data/landingContent';

for (const locale of ['en', 'bn'] as const) {
  const sections = landingContent[locale] as Record<string, unknown>;
  for (const [sectionKey, content] of Object.entries(sections)) {
    await db.insert(schema.landingContentTable)
      .values({ sectionKey, locale, content })
      .onConflictDoNothing();
  }
}
await db.insert(schema.socialLinksTable).values([
  { platform: 'facebook', url: '', sortOrder: 1, isVisible: true },
  { platform: 'youtube', url: '', sortOrder: 2, isVisible: true },
  { platform: 'linkedin', url: '', sortOrder: 3, isVisible: true },
  { platform: 'tiktok', url: '', sortOrder: 4, isVisible: false },
]).onConflictDoNothing();
```
Regenerate + push: `npm run db:generate` then `DIRECT_URL=... npm run db:push` then reseed. Expected: `landing_content` holds 2 × N rows where N = top-level keys of `LandingContent` (`src/types/landing.ts:95`).

- [ ] **Step 3: Write content + social-links routes**

`app/api/content/route.ts` (GET assembles full locale object; falls back `{}` per missing section so page never 500s):
```ts
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { landingContentTable } from '@/db/schema';
import { ok, fail } from '@/lib/json';

export async function GET(req: Request) {
  try {
    const locale = new URL(req.url).searchParams.get('locale') ?? 'en';
    const rows = await getDb().select().from(landingContentTable).where(eq(landingContentTable.locale, locale));
    const assembled: Record<string, unknown> = {};
    for (const r of rows) assembled[r.sectionKey] = r.content;
    return ok(assembled);
  } catch (e: any) {
    return fail(e.message);
  }
}
```
`app/api/content/[sectionKey]/route.ts`: PUT upserts `{sectionKey, locale}` payload (admin save; replaces static slice). `app/api/social-links/route.ts`: GET visible list + POST/PUT/DELETE CRUD, same `ok`/`fail` pattern as Task 6 Step 1.

- [ ] **Step 4: Make `app/page.tsx` server-driven with static fallback** — convert to async server component: try `getDb()` content for locale `en`, deep-merge over static `landingContent.en` (DB wins per sectionKey, static fills gaps); on `HYPERDRIVE_NOT_BOUND` use static only. Pass assembled object to existing client section components unchanged (they already take `content` prop — zero component rewrites). Locale toggle refetches `/api/content?locale=bn` client-side.

- [ ] **Step 5: Admin sections tab edits payload** — extend existing sections editor (Task 4 API already supports PUT by id for order/visibility): add per-sectionKey locale JSON textarea + save via `PUT /api/content/[sectionKey]` + social-links manager rows. Verify: edit hero headline in admin → reload landing → headline changed without redeploy.

- [ ] **Step 6: Verify + commit**

Run: `curl -s "localhost:3000/api/content?locale=en" | head -c 200; echo` — expected: `{"hero":{...},"complexity":{...},...}`.
```bash
git add db/schema.ts db/seed.ts drizzle/ app/api/content app/api/social-links app/page.tsx
git commit -m "feat: make whole landing content DB-driven per locale plus social links"
```

---

## Self-review

1. **Spec coverage:** architecture (§2) → Tasks 1-2; DB flow (§3) → Tasks 3,5,7; R2 (§4) → Tasks 6-7; ENV map (§5) → Task 7 + deploy secrets Task 8; migration path (§6) → Tasks 1-8 order; error handling (§7) → `fail()` helper + `HYPERDRIVE_NOT_BOUND`/`R2_NOT_BOUND` guards + health check; testing (§8) → typecheck/smoke steps in Tasks 2,4,6,7,8; admin auth (spec §10) → Task 9 (Auth.js v5 Credentials + Drizzle adapter + database sessions; `verifyPassword`/`hashPassword` signatures in `lib/password.ts` match `auth.ts` Step 4 usage; cookie name owned by Auth.js, no hand-rolled `ecomate_admin` references remain); SEO (spec §11) → Task 10; design corrections (spec §12) → Task 11, explicitly sequenced after backend green per user priority (DB connect first, design polish later); whole-site content (spec §13) → Task 12 (content tables + seed from `landingContent.ts` + `/api/content` + server-driven page + admin editor).
2. **Placeholder scan:** no TBD/TODO; `PASTE_HYPERDRIVE_ID` and `<paste-direct-5432-url>` are operator-supplied runtime values with the exact producing command in Task 7 Step 1, not code placeholders. Seed row ellipsis references exact source lines (`src/db/index.ts:186-534`) — content fully specified by location.
3. **Type consistency:** `ok`/`fail` helpers used identically across Tasks 4-6; `getDb()`/`isPostgresConfigured()` signatures match `db/client.ts` from Task 3; route param typing `{ params: { id: string } }` uniform; table names match `db/schema.ts` exports. Auth session cookies owned by Auth.js (no hand-rolled cookie names anywhere); `authorized` callback path rules in Task 9 Step 6 match the middleware matcher.

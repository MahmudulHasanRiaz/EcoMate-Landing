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
| `lib/events.ts`, `lib/metaCapi.ts`, `components/MetaPixel.tsx`, lead tracking columns | Create/Modify (Task 13) | Meta CAPI server-side Lead tracking + event bus |
| `lib/rateLimit.ts`, `lib/sanitize.ts`, `middleware.ts` headers, Turnstile, TOTP | Create/Modify (Task 14) | KV rate limits, bot protection, headers, 2FA, upload validation |
| `menus` + `redirects` tables, locale routing, hreflang, `llms.txt`, revalidation hooks | Create/Modify (Task 15) | Bilingual parity + SEO-100 |
| `lead_activities` table, CSV export, notifications abstraction, `docs/RUNBOOK.md`, Sentry | Create/Modify (Task 16) | Lead module pro + enterprise ops |

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
npm i next@^15 react@^19 react-dom@^19 @opennextjs/cloudflare postgres@^3 drizzle-orm@^0.45 @aws-sdk/client-s3@^3 zod@^3
npm i -D wrangler@^4 drizzle-kit@^0.31 vitest@^2 @vitest/coverage-v8@^2 @playwright/test@^1 @axe-core/playwright@^4 @lhci/cli@^0.14
npm rm express @types/express vite @vitejs/plugin-react @tailwindcss/vite
npx playwright install --with-deps chromium
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
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
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

- [ ] **Step 5: Soft delete + publish state + DB-level constraints (before ANY push)**

Hard-deleting a blog post or testimonial out from under a live URL is an SEO 404 and a lost backlink. Every content table gets `status` + `deletedAt`; every admin delete becomes `UPDATE ... SET deleted_at = now()`. DB `CHECK` constraints are the real guarantee — app validation is a courtesy.

```ts
import { sql } from 'drizzle-orm';

// landingContentTable (defined in Task 12) — version enables optimistic locking (Task 19)
export const landingContentTable = pgTable('landing_content', {
  id: serial('id').primaryKey(),
  sectionKey: text('section_key').notNull(),
  locale: text('locale').notNull().default('en'),
  content: jsonb('content').notNull().default({}),
  status: text('status').notNull().default('published'), // draft | published
  version: integer('version').notNull().default(1),
  deletedAt: timestamp('deleted_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// pricing: non-negative enforced by Postgres, not by hopeful JS
export const pricingPlansTable = pgTable('pricing_plans', {
  // ...all columns from src/db/schema.ts:40-62...
  monthlyPrice: integer('monthly_price').notNull(),
  annualPrice: integer('annual_price').notNull(),
}, (t) => [
  sql`CHECK (${t.monthlyPrice} >= 0)`,
  sql`CHECK (${t.annualPrice} >= 0)`,
]);

// blog post lifecycle: draft | scheduled | published | archived
export const blogPostsTable = pgTable('blog_posts', {
  // ...all columns from src/db/schema.ts:127-145...
  status: text('status').notNull().default('draft'),
  deletedAt: timestamp('deleted_at'),
  publishedAt: timestamp('published_at'),
});

// testimonials + case studies also get deletedAt (visible flag already exists)
export const testimonialsTable = pgTable('testimonials', {
  // ...columns from src/db/schema.ts:86-105...
  deletedAt: timestamp('deleted_at'),
});
```
Also add to `blog_posts_table` a unique index on `slug` where `deleted_at IS NULL` (`uniqueIndex().on(t.slug).where(sql\`${t.deletedAt} IS NULL\`)`) so slug reuse after delete is legal while live slugs stay unique.
`onDelete` foreign keys are added in the same task that introduces each parent table: `admin_users` FKs in Task 9/16, `menus` FKs in Task 15, `leads` FKs in Task 16. Defining them earlier would not compile.
Re-run `npm run db:generate`. Expected: migration now contains `CHECK` constraints + partial unique index. Verify no push has happened yet (Task 7 is the first apply).

- [ ] **Step 6: Multi-table writes MUST be transactional (pattern applied in Tasks 4-6, 12, 16)**

`postgres-js` auto-commits each statement. Any handler writing two tables (lead + timeline, settings + audit, blog post + revision) wraps in one transaction:

```ts
await getDb().transaction(async (tx) => {
  const [lead] = await tx.insert(leadsTable).values({ name, phone }).returning();
  await tx.insert(leadActivitiesTable).values({ leadId: lead.id, toStatus: 'New' });
});
```
Reason: a lead with no timeline row, or a settings change with no audit row, is silent data corruption that prototype-stage manual testing will never catch.

- [ ] **Step 7: Commit**

```bash
git add db/ drizzle.config.ts drizzle/
git commit -m "feat: move Drizzle schema, add Hyperdrive client, soft delete and DB constraints"
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
    // NEVER `.set({ ...body })` — body is attacker-controlled. Spreading it lets a caller
    // overwrite any column (id, created_at, is_pricing_visible) that this endpoint never
    // intended to expose. Allowlist every field explicitly.
    const body = await req.json();
    const patch = {
      siteName: body.siteName != null ? String(body.siteName) : undefined,
      tagline: body.tagline != null ? String(body.tagline) : undefined,
      logoUrl: body.logoUrl != null ? String(body.logoUrl) : undefined,
      faviconUrl: body.faviconUrl != null ? String(body.faviconUrl) : undefined,
      defaultLocale: body.defaultLocale === 'bn' ? 'bn' : 'en',
      supportPhone: body.supportPhone != null ? String(body.supportPhone) : undefined,
      supportEmail: body.supportEmail != null ? String(body.supportEmail) : undefined,
      whatsappNumber: body.whatsappNumber != null ? String(body.whatsappNumber) : undefined,
      messengerUrl: body.messengerUrl != null ? String(body.messengerUrl) : undefined,
      address: body.address != null ? String(body.address) : undefined,
      isPricingVisible: typeof body.isPricingVisible === 'boolean' ? body.isPricingVisible : undefined,
      seoTitle: body.seoTitle != null ? String(body.seoTitle) : undefined,
      seoDescription: body.seoDescription != null ? String(body.seoDescription) : undefined,
      updatedAt: new Date(),
    };
    const [updated] = await getDb()
      .update(siteSettingsTable)
      .set(patch)
      .where(eq(siteSettingsTable.id, 1))
      .returning();
    return ok(updated);
  } catch (e: any) {
    return fail(e.message);
  }
}
```
(Hand-rolled allowlisting here; Task 17 replaces every one of these with declarative Zod schemas so the field list has exactly one source of truth.)
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

// NEVER `.values(body)` — mass assignment on insert is the same hole as on update.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const row = {
      slug: String(body.slug ?? '').trim(),
      nameEn: String(body.nameEn ?? '').trim(),
      nameBn: String(body.nameBn ?? '').trim(),
      tierSubtitleEn: String(body.tierSubtitleEn ?? '').trim(),
      tierSubtitleBn: String(body.tierSubtitleBn ?? '').trim(),
      monthlyPrice: Number(body.monthlyPrice) || 0,
      annualPrice: Number(body.annualPrice) || 0,
      currency: String(body.currency ?? '৳'),
      orderVolume: String(body.orderVolume ?? '').trim(),
      usersIncluded: String(body.usersIncluded ?? '').trim(),
      showroomsIncluded: String(body.showroomsIncluded ?? '').trim(),
      featuresEn: Array.isArray(body.featuresEn) ? body.featuresEn : [],
      featuresBn: Array.isArray(body.featuresBn) ? body.featuresBn : [],
      ctaLabelEn: String(body.ctaLabelEn ?? 'Start with this tier'),
      ctaLabelBn: String(body.ctaLabelBn ?? 'এই প্ল্যানে শুরু করুন'),
      isPopular: Boolean(body.isPopular),
      sortOrder: Number(body.sortOrder) || 0,
      isActive: body.isActive !== false,
    };
    if (!row.slug || !row.nameEn) return fail('slug and nameEn are required', 400);
    const [created] = await getDb().insert(pricingPlansTable).values(row).returning();
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

- [ ] **Step 4: Media lifecycle completeness (delete, cache headers, CDN, in-use guard)**

Uploading without deleting/CDN-configuring is a half-built media library. Add:
`DELETE /api/media/[id]` — soft-delete the DB row (`deletedAt`), only `bucket.delete(key)` when no other `media_assets` row (including soft-deleted, within 30 days) references the same `key`; return `R2_DELETE_FAILED` (500) if R2 removal errors so the row is not orphaned silently.
`bucket.put` gains cache headers: `httpMetadata: { cacheControl: 'public, max-age=31536000, immutable' }` — media keys are content-addressed by timestamp, so they are safe to cache forever.
Public R2 custom domain: `npx wrangler r2 bucket domain ecomate-media --custom-domain media.ecomate.app`, then `images.remotePatterns` in `next.config.ts`:
```ts
images: { remotePatterns: [{ protocol: 'https', hostname: 'media.ecomate.app' }] },
```
Media URLs now come from the CDN, not from `/assets/${key}` (which only worked because of a Pages-asset accident and will 404 the moment this is a Worker).
Result: `url: https://media.ecomate.app/${key}`.

- [ ] **Step 5: Write integration logs route** (replaces `server.ts:298-304`): GET `integrationLogsTable` ordered by `createdAt` desc, same pattern as Step 1.

- [ ] **Step 6: Full typecheck (all routes must compile)**

Run: `npx tsc --noEmit`
Expected: PASS with no output.

- [ ] **Step 7: Commit**

```bash
git add app/api/testimonials app/api/case-studies app/api/blog app/api/media app/api/integrations next.config.ts
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
npx wrangler kv namespace create RATE_LIMIT_KV
npx wrangler kv namespace create RATE_LIMIT_KV --preview # preview-env counters stay separate
```
Expected: each prints an `id` (Hyperdrive, KV) / success. Copy the Hyperdrive id + KV id into Step 2.

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

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "PASTE_KV_ID" # from: npx wrangler kv namespace create RATE_LIMIT_KV

[vars]
NEXT_PUBLIC_SITE_URL = "https://ecomate.app"
NEXT_PUBLIC_DEFAULT_LOCALE = "en"
NEXT_PUBLIC_META_PIXEL_ID = ""
NEXT_PUBLIC_TURNSTILE_SITE_KEY = ""
```

- [ ] **Step 3: Document env in `.env.example`** (no secrets, skeletons only)

```
// Direct Postgres for drizzle-kit + seed (local/CI only, port 5432)
DIRECT_URL="postgresql://postgres:password@db.REF.supabase.co:5432/postgres"
# Hyperdrive pooled string lives in Cloudflare Dashboard binding, NOT here
# Worker secrets set via: npx wrangler secret put <NAME>
LICENSE_PORTAL_API_BASE_URL="https://license.ecomate.app"
NEXT_PUBLIC_SITE_URL="https://ecomate.app"
NEXT_PUBLIC_DEFAULT_LOCALE="en"
GEMINI_API_KEY=""
AUTH_SECRET="" # openssl rand -base64 32
AUTH_TRUST_HOST="true" # allowlist our own hostnames; never a bare trustHost:true
SETUP_TOKEN="" # one-time bootstrap, rotate/delete after first superadmin
META_CAPI_TOKEN=""
META_TEST_EVENT_CODE="" # Events Manager test code, empty in prod
TURNSTILE_SECRET_KEY=""
NEXT_PUBLIC_META_PIXEL_ID=""
NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
SENTRY_DSN=""
RESEND_API_KEY="" # future lead notifications, unused until wired
CRON_SECRET="" # guards /api/cron/* routes
RETENTION_DAYS="180" # lead PII retention window (Task 16)
DIRECT_URL_TEST="" # throwaway test DB for integration tests; tests skip loudly if unset
```

- [ ] **Step 4: Run migration + seed against real Supabase**

Run:
```bash
DIRECT_URL="<paste-direct-5432-url>" npm run db:migrate
DIRECT_URL="<paste-direct-5432-url>" npm run db:seed
```
Expected: `db:migrate` applies journaled SQL from `drizzle/`; `db:seed` exits 0.
`db:push` is a local-dev convenience only — it diffs live schema against the schema file and can silently drop columns. Production and preview both use `migrate`; Task 21 adds a CI guard that fails if `db:push` appears in a deploy workflow. Verify in Supabase dashboard: `site_settings` 1 row, `landing_sections` 10 rows, `leads` 2 rows.

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
        run: npm run db:migrate
        env:
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
```

- [ ] **Step 3: Cloudflare dashboard checklist (manual, one time)**

1. Workers & Pages → `ecomate-landing` → Settings → Bindings: confirm `HYPERDRIVE` + `R2_BUCKET` + `RATE_LIMIT_KV` present.
2. Settings → Variables → Secrets: add `LICENSE_PORTAL_API_KEY`, `GEMINI_API_KEY`, `AUTH_SECRET`, `SETUP_TOKEN`, `META_CAPI_TOKEN`, `TURNSTILE_SECRET_KEY`, `SENTRY_DSN`, `RESEND_API_KEY` via `npx wrangler secret put <NAME>` instead of typing in UI. Delete/rotate `SETUP_TOKEN` after first superadmin exists.
3. Security → WAF → Rate limiting rules: `POST /api/leads` 5/min per IP; `/api/auth/*` 10/min per IP (code-level KV limits in Task 14 are the second layer, WAF is the first).
4. If old Pages project auto-builds on push: Builds & deployments → Pause automatic deployments (per `DEPLOYMENT.md` section 2).

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
  // NOT bare `trustHost: true` — that accepts ANY Host header, which is a host-header
  // injection / cache-poisoning primitive. Trust only our own deployment hostnames.
  trustHost: process.env.AUTH_TRUST_HOST === 'true',
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

- [ ] **Step 9: Session hardening (admin HTML must never be cached, sessions must be revocable)**

`no-store` on every admin response — a cached `/admin` HTML in a shared browser is a credential leak:
```ts
// app/admin/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
// plus in middleware: if (pathname.startsWith('/admin')) res.headers.set('Cache-Control', 'no-store, private');
```
Session management in user mgmt: `GET /api/admin/users/[id]/sessions` lists active sessions (created, lastSeen, ip, userAgent from the Auth.js `sessions` table), `DELETE /api/admin/users/[id]/sessions/[sid]` revokes one, and "sign out everywhere" revokes all. Password reset and role change revoke **every** session for that user (privilege change must not leave a live session with the old role).
Account lockout: after 5 failed logins for one email in 15 minutes, reject further attempts for that email with a generic message and write `LOGIN_LOCKED` to the audit log. Rate limit (Task 14) is per-IP; this is per-account, because distributed IP rotation defeats per-IP limits alone.
Cookie hardening: Auth.js sets `httpOnly` + `sameSite=lax`; additionally set `secure: true` explicitly in `cookies.sessionToken` options and pin `maxAge` to the session `maxAge` so the cookie expires with the server-side session.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json db/schema.ts drizzle/ lib/password.ts auth.ts middleware.ts "app/api/auth" app/admin "app/api/admin"
git commit -m "feat: Auth.js v5 credentials auth with RBAC, revocable sessions and user management"
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

`landing_content` (already introduced with `status`/`version`/`deletedAt` in Task 3 Step 5 — that definition is canonical; this step only adds the two seedable tables that did not exist yet):

```ts
// 11. Social Links (footer + contact)
export const socialLinksTable = pgTable('social_links', {
  id: serial('id').primaryKey(),
  platform: text('platform').notNull(), // facebook, youtube, linkedin, tiktok
  url: text('url').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: boolean('is_visible').notNull().default(true),
});
```
If Task 3 Step 5 was skipped, `landing_content` must be created here with the same three columns (`status`, `version`, `deletedAt`) — Task 19's optimistic locking and Task 12's draft/publish both depend on them existing.

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
Regenerate + apply: `npm run db:generate` then `DIRECT_URL=... npm run db:migrate` then reseed. Expected: `landing_content` holds 2 × N rows where N = top-level keys of `LandingContent` (`src/types/landing.ts:95`).

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

### Task 13: Meta server-side Lead tracking + event bus (spec §15)

**Files:**
- Modify: `db/schema.ts` (append tracking columns on `leadsTable` — new columns, no rewrite of existing)
- Modify: `db/seed.ts` (nothing — tracking columns default empty)
- Create: `lib/events.ts` (provider bus)
- Create: `lib/metaCapi.ts` (Meta provider)
- Create: `components/MetaPixel.tsx` (browser pixel, dedup via shared `event_id`)
- Modify: `app/api/leads/route.ts` (capture fbp/fbc + event_id, verify Turnstile hook point, dispatch async)
- Modify: AdminPanel leads tab (show CAPI status + retry button reusing sync pattern)

- [ ] **Step 1: Append tracking columns to `leadsTable` in `db/schema.ts`**

```ts
// append inside leadsTable definition:
fbp: text('fbp').default(''),          // _fbp browser cookie at submit time
fbc: text('fbc').default(''),          // _fbc browser cookie at submit time
eventId: text('event_id').default(''), // shared browser+CAPI deduplication id
clientIp: text('client_ip').default(''),
userAgent: text('user_agent').default(''),
metaCapiStatus: text('meta_capi_status').notNull().default('Pending'), // Pending | Sent | Failed | Skipped
metaCapiError: text('meta_capi_error').default(''),
```
Run `npm run db:generate` after. Expected: new migration SQL with `ALTER TABLE leads ADD COLUMN ...` only.

- [ ] **Step 2: Write `lib/events.ts`** — provider bus so TikTok/GA4 plug in later without touching call sites:

```ts
export interface TrackLeadInput {
  leadId: number; name: string; phone: string; email: string;
  fbp: string; fbc: string; eventId: string;
  clientIp: string; userAgent: string; eventSourceUrl: string;
}
export interface TrackingProvider {
  name: string;
  trackLead(input: TrackLeadInput): Promise<{ ok: boolean; error?: string }>;
}
const providers: TrackingProvider[] = [];
export function registerProvider(p: TrackingProvider) { providers.push(p); }
export async function dispatchLeadTracked(input: TrackLeadInput) {
  for (const p of providers) {
    try {
      const r = await p.trackLead(input);
      if (!r.ok) console.error(`[Tracking ${p.name} error]`, r.error);
    } catch (e) { console.error(`[Tracking ${p.name} threw]`, e); }
  }
}
```

- [ ] **Step 3: Write `lib/metaCapi.ts`** — Meta Conversions API `Lead` event, SHA-256-hashed PII, never logs raw PII:

```ts
import { createHash } from 'node:crypto';
import { getRequestContext } from '@opennextjs/cloudflare';
import { registerProvider, type TrackLeadInput } from './events';

const norm = (v: string) => v.trim().toLowerCase();
const sha = (v: string) => (v ? createHash('sha256').update(norm(v)).digest('hex') : undefined);

async function sendLead(input: TrackLeadInput): Promise<{ ok: boolean; error?: string }> {
  let pixelId = '', token = '', testCode = '';
  try {
    const env = getRequestContext().env as any;
    pixelId = env.NEXT_PUBLIC_META_PIXEL_ID ?? process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';
    token = env.META_CAPI_TOKEN ?? '';
    testCode = env.META_TEST_EVENT_CODE ?? '';
  } catch { token = process.env.META_CAPI_TOKEN ?? ''; }
  if (!pixelId || !token) return { ok: true }; // Skipped: tracking unconfigured, lead already saved
  const body: any = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      action_source: 'website',
      event_source_url: input.eventSourceUrl,
      user_data: {
        ...(input.email ? { em: [sha(input.email)] } : {}),
        ...(input.phone ? { ph: [sha(input.phone.replace(/\D/g, ''))] } : {}),
        ...(input.fbp ? { fbp: input.fbp } : {}),
        ...(input.fbc ? { fbc: input.fbc } : {}),
        ...(input.clientIp ? { client_ip_address: input.clientIp } : {}),
        ...(input.userAgent ? { client_user_agent: input.userAgent } : {}),
      },
    }],
  };
  if (testCode) body.test_event_code = testCode;
  const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, error: `Meta CAPI ${res.status}: ${(await res.text()).slice(0, 300)}` };
  return { ok: true };
}

registerProvider({ name: 'MetaCAPI', trackLead: sendLead });
```

- [ ] **Step 4: Write `components/MetaPixel.tsx`** — browser pixel fires `Lead` with the SAME `event_id` the server will send (Meta dedupes on `event_id` + `event_name`):

```tsx
'use client';
import Script from 'next/script';

export function MetaPixel() {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!id) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${id}'); fbq('track','PageView');`}
      </Script>
      <noscript>{/* eslint-disable-next-line @next/next/no-img-element */}<img height="1" width="1" style={{display:'none'}} alt="" src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`} /></noscript>
    </>
  );
}

export function trackBrowserLead(eventId: string) {
  (window as any).fbq?.('track', 'Lead', {}, { eventId });
}
```
Mount `<MetaPixel />` in `app/layout.tsx`. Lead form generates `event_id` client-side (`crypto.randomUUID()`), sends it + `fbp`/`fbc` cookie values in the POST body, and calls `trackBrowserLead(eventId)` on 201.

- [ ] **Step 5: Harden `app/api/leads/route.ts`** — replace Task 5 POST with: read `eventId`/`fbp`/`fbc` from body (generate server-side if absent), store tracking columns + `clientIp`/`userAgent`, keep KV rate-limit (Task 14 lib; until then per-isolate guard stays), then `await import('@/lib/metaCapi')` + `dispatchLeadTracked(...)` + `dispatchLead(...)` (license) both async after 201, and write `metaCapiStatus`/`licensePortalStatus` outcomes to `integration_logs` + lead row. Admin retry endpoint reuses the sync-license pattern for CAPI (`POST /api/leads/[id]/sync-meta`).

Two corrections that make this actually correct in production:
**`waitUntil`, not fire-and-forget.** A bare `dispatchLead(...).catch()` after the response can be cancelled the moment the isolate is recycled — leads silently never reach the License Portal. Both dispatches must be handed to the platform:
```ts
import { waitUntil } from '@opennextjs/cloudflare';
const work = (async () => {
  const r1 = await dispatchLeadTracked(tracked).catch((e) => ({ ok: false, error: String(e) }));
  const r2 = await dispatchLead(lead.id).catch((e) => ({ ok: false, error: String(e) }));
  await getDb().insert(integrationLogsTable).values({ serviceName: 'MetaCAPI', action: 'LEAD_DISPATCH', payload: { leadId: lead.id, ok: r1.ok }, response: { ok: r1.ok }, status: r1.ok ? 'Success' : 'Failed', errorMessage: r1.error ?? '', attempts: 1 });
})();
waitUntil(work);
```
Retry safety: before dispatching, check `metaCapiStatus`/`licensePortalStatus` is not already `Sent`/`Synced`, so a retried request cannot double-send.
**Consent is a legal prerequisite, not a nice-to-have.** We set tracking cookies and fire a Meta pixel at Bangladeshi and EU visitors. Add columns to `leadsTable`: `consentGiven boolean notNull default false`, `consentAt timestamp`, `consentText text` (stores the exact privacy-policy version accepted). The lead form requires an unticked-by-default consent checkbox; `POST /api/leads` rejects `consentGiven !== true` with 400. Meta pixel + CAPI only fire after consent (Task 20 gates the pixel on the consent banner). Without this the site is a GDPR/PIPL violation on day one.

- [ ] **Step 6: Verify end-to-end with test code**

Set `META_TEST_EVENT_CODE` in preview env, submit a lead, check Events Manager → Test Events for the `Lead` with matching `event_id` for browser + server. Then clear the test code for prod. Expected: one deduped Lead per submission.

- [ ] **Step 7: Commit**

```bash
git add db/schema.ts drizzle/ lib/events.ts lib/metaCapi.ts components/MetaPixel.tsx app/api/leads app/layout.tsx
git commit -m "feat: Meta CAPI server-side Lead tracking with pixel deduplication"
```

---

### Task 14: Security hardening beyond Auth.js (spec §16)

**Files:**
- Create: `lib/rateLimit.ts` (KV sliding window)
- Create: `lib/sanitize.ts` (blog HTML allowlist)
- Create: `lib/totp.ts` (TOTP for superadmin)
- Create: `components/Turnstile.tsx`
- Modify: `middleware.ts` (security headers on all responses)
- Modify: `app/api/leads/route.ts` (KV limit + Turnstile verify)
- Modify: `app/api/media/upload/route.ts` (size cap, MIME sniff, SVG reject)
- Modify: blog render path (sanitize before `dangerouslySetInnerHTML`)
- Modify: `app/api/admin/users/*` (TOTP enroll/verify, session list/revoke UI data)

- [ ] **Step 1: Write `lib/rateLimit.ts`** — KV sliding window; KV miss → allow-open locally but deny-closed in prod (fail safe direction documented):

```ts
import { getRequestContext } from '@opennextjs/cloudflare';

export async function hitLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  try {
    const kv = (getRequestContext().env as any).RATE_LIMIT_KV;
    if (!kv) return false; // local dev without KV: backstop only
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `${key}:${Math.floor(now / windowSec)}`;
    const count = Number((await kv.get(windowKey)) ?? 0) + 1;
    await kv.put(windowKey, String(count), { expirationTtl: windowSec * 2 });
    return count > limit;
  } catch {
    return false;
  }
}
```
Apply: lead POST `hitLimit('lead:'+ip, 5, 600)`, login `hitLimit('login:'+ip, 10, 600)`, uploads `hitLimit('upload:'+userId, 30, 3600)`. WAF rules (Task 8) stay as layer one.

- [ ] **Step 2: Turnstile on lead form** — `components/Turnstile.tsx` renders Cloudflare widget (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`); token posted with lead; server verifies via `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `TURNSTILE_SECRET_KEY`, rejects on failure (400). Widget invisible until submit to keep mobile UX clean.

- [ ] **Step 3: Security headers in `middleware.ts`** — append to every response: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a tight CSP (`default-src 'self'; img-src 'self' data: https:; script-src 'self' https://connect.facebook.net https://challenges.cloudflare.com; connect-src 'self' https://graph.facebook.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com`). Verify none of the landing scripts break (Meta pixel + Turnstile explicitly allowlisted).

- [ ] **Step 4: Upload validation** — 5MB cap (`file.size`), MIME allowlist `image/jpeg|image/png|image/webp` by sniffing first bytes (not `file.type` — client-controlled), SVG/GIF/HTML rejected (XSS vector), filename sanitized (existing), R2 key prefixed `media/YYYY/MM/`. Return 413/415 with clear messages.

- [ ] **Step 5: Blog sanitization** — `lib/sanitize.ts` allowlist (`p,b,i,strong,em,a[href],ul,ol,li,h2,h3,blockquote,code,pre,img[src|alt]`) strips `script/style/on*` handlers; render path uses it before `dangerouslySetInnerHTML`. (Small local allowlist function, no new dependency — keeps Worker bundle lean.)

- [ ] **Step 6: TOTP for superadmin** — `lib/totp.ts` (RFC 6238, WebCrypto HMAC-SHA1, 30s step, ±1 window); `admin_users` gets `totpSecret` (nullable) + `totpEnabled`; enroll shows QR (`otpauth://` URI rendered as data-URL QR — no external call); login requires code when enabled; recovery via superadmin peer reset (audited). Editor/admin roles: optional; superadmin: enforced at setup.

- [ ] **Step 7: Commit**

```bash
git add lib/rateLimit.ts lib/sanitize.ts lib/totp.ts components/Turnstile.tsx middleware.ts app/api/leads "app/api/media" "app/api/admin"
git commit -m "feat: KV rate limits, Turnstile, security headers, upload validation, TOTP"
```

---

### Task 15: Bilingual parity + SEO-100 + managed nav/redirects (spec §14, §11)

**Files:**
- Modify: `db/schema.ts` (append `menus`, `menu_items`, `redirects`)
- Create: `app/api/menus/route.ts`, `app/api/redirects/route.ts`
- Create: `app/[locale]/...` routing (locale-aware URLs with `en|bn`, default `en` unprefixed)
- Modify: `app/sitemap.ts` (DB slugs both locales), `lib/seo.ts` (hreflang, canonical, OG images, breadcrumb JSON-LD)
- Create: `public/llms.txt`
- Modify: every admin PUT (settings/sections/content/pricing/blog) → `revalidatePath`/`revalidateTag`
- Modify: media admin (alt-text required), AdminPanel (side-by-side EN/BN editor + missing-translation report)

- [ ] **Step 1: Append `menus`, `menu_items`, `redirects` tables** — `menus(key, locale)`, `menu_items(menuId FK cascade, label, href, sortOrder, isVisible)`, `redirects(fromPath unique, toPath, statusCode default 308)`. Header reads menu `main`, footer reads `footer`; `middleware.ts` checks `redirects` (cached, 5-min TTL in KV) before routing — URL changes stay SEO-safe.

- [ ] **Step 2: Locale routing** — `app/[locale]/page.tsx` + `app/[locale]/blog/[slug]/page.tsx` for `en|bn`; root `/` serves default locale (`NEXT_PUBLIC_DEFAULT_LOCALE`), `/bn/*` serves Bangla; unknown locale → 404. `generateStaticParams` returns `[{locale:'en'},{locale:'bn'}]`. Middleware preserves redirect-table checks first.

- [ ] **Step 3: Locale-correct formatting (BN is not a string swap)**

Numbers, currency and dates must be `Intl`-formatted per locale, not interpolated raw. `৳12,500` is correct for `bn-BD`; `BDT 12,500` for `en-BD`; dates as `২৬ অক্টোবর ২০২৬` vs `26 October 2026`. Shared helpers in `lib/format.ts` (`formatMoney(minor-free integer, locale)`, `formatDate(iso, locale)`, `formatNumber`) used by pricing, analytics and blog. Also set `Content-Language` per response, and make the locale switcher preserve scroll position + section anchor so EN→BN switch does not dump the visitor at the top of a 16-section page.

- [ ] **Step 4: SEO-100 pass** — `hreflang` (`en`, `bn`, `x-default`) on every page; per-locale canonical; sitemap includes all published blog slugs + case-study slugs in both locales with `lastmod`; OG images resolved from R2 post `featuredImageUrl` with absolute URL fallback; breadcrumb JSON-LD on blog/case-study; `public/llms.txt` summarizing site + sitemap pointer for AI discoverability; media admin rejects publish without `altText`.

- [ ] **Step 5: On-demand revalidation** — every admin PUT/POST/DELETE (settings, sections, content, pricing, blog, menus, social) calls `revalidateTag('<domain>')` after commit; public pages use `fetch(..., { next: { tags: ['<domain>'] } })`. Verify: edit hero in admin → reload landing (no rebuild) shows change; response carries fresh `Last-Modified`.

- [ ] **Step 6: Side-by-side locale editor + missing-translation report** — AdminPanel content editor shows EN and BN fields adjacent; `/api/admin/i18n-report` lists `landing_content` keys where `bn` row missing or equal to seed-empty; dashboard badge counts gaps. Fallback chain documented: `bn` missing → `en` rendered (page never blank).

- [ ] **Step 7: Commit**

```bash
git add db/schema.ts drizzle/ app/api/menus app/api/redirects "app/[locale]" app/sitemap.ts lib/seo.ts lib/format.ts public/llms.txt middleware.ts
git commit -m "feat: locale routing, hreflang, menus, redirects, revalidation, i18n report"
```

---

### Task 16: Lead module pro + enterprise ops (spec §16)

**Files:**
- Modify: `db/schema.ts` (append `lead_activities`; leads get `assignedToId` FK + `followUpAt`)
- Create: `app/api/leads/export/route.ts` (CSV), `app/api/leads/[id]/activities/route.ts`
- Create: `lib/notify.ts` (new-lead notification abstraction; logs until provider wired)
- Create: `lib/paginate.ts` (shared `limit`/`offset` parser with caps)
- Modify: list routes (leads/blog/logs/media) → paginated `{ data, total, limit, offset }`
- Modify: `deploy.yml` (`migrate` not `push` in prod) + preview env job
- Create: `docs/RUNBOOK.md`, Sentry wiring (`sentry.*.config.ts` + tunnel route)

- [ ] **Step 1: Lead timeline + assignment** — `lead_activities(leadId FK cascade, actorId, fromStatus, toStatus, note, createdAt)`; every status change writes a row (server-side, actor from session — history can't be forged from client). `assignedToId → admin_users.id` (SET NULL on delete); assignee change also logged. Admin lead drawer shows timeline newest-first.

- [ ] **Step 2: Dedupe warning + follow-up + CSV** — POST warns (not blocks) on existing same-phone lead within 90 days (`DUPLICATE_WARNING` with matched id). `followUpAt` date set from admin; overdue list query in dashboard. `GET /api/leads/export?format=csv` streams CSV (superadmin/admin only, audited, 10k-row cap).

- [ ] **Step 3: Notification abstraction** — `lib/notify.ts` `notifyNewLead(lead)` → Resend adapter interface; unwired provider = structured log + `integration_logs` row (same retry pattern as license portal). Wiring Resend later = env + one provider file, zero call-site changes.

- [ ] **Step 4: Pagination everywhere** — `lib/paginate.ts` parses `limit` (default 20, max 100) + `offset`; all list routes return `{ data, total, limit, offset }`. AdminPanel lists updated to new envelope (single shared fetch wrapper change in `src/services/api.ts`).

- [ ] **Step 5: Prod-safe migrations + preview env** — CI: `drizzle-kit migrate` (journal from `drizzle/`) against `DIRECT_URL` on deploy; `db:push` banned in prod job (comment guard in workflow). Preview env job deploys PRs with separate preview Hyperdrive DB + KV; preview secrets suffixed `-preview`. Supabase PITR enabled (dashboard note in runbook).

- [ ] **Step 6: Data retention (PII does not get to live forever)**

Leads hold name, phone, email, IP and user agent — personal data under GDPR (and Bangladesh's Personal Data Protection Act). Retention must be enforced by a job, not a hope. Add cron to `wrangler.toml`:
```toml
[triggers]
crons = ["17 3 * * *"] # daily 03:17 UTC — off the :00 stampede
```
`app/api/cron/retention/route.ts` (guarded by `CRON_SECRET` header check, cron binding sends it):
- anonymize leads older than `RETENTION_DAYS` (default 180): null out `name` → `Withheld`, `phone`/`email`/`clientIp`/`userAgent` → `''`, append `anonymizedAt`;
- delete Auth.js `sessions` where `expiresAt < now()` (index on `expiresAt` makes this cheap);
- purge expired `RATE_LIMIT_KV` windows older than 24h;
- never anonymize leads with status `Won`/`Qualified` unless legal explicitly extends retention — the sales team owns those.
Record the anonymization count in the run log so it is auditable.

- [ ] **Step 7: Observability + runbook** — Sentry (`@sentry/nextjs` + tunnel route `/api/monitoring` so ad-blockers don't blind error reporting; DSN server-side only); structured JSON logs with request id on every API error; `/api/ready` deep check (DB select 1 + R2 head + KV ping). `docs/RUNBOOK.md`: deploy, rollback (wrangler rollback + migration journal direction), secret rotation, restore-from-PITR, incident contacts, WAF rule list.

- [ ] **Step 8: Final acceptance sweep** — re-run Task 8 smoke + CAPI test event + Turnstile + TOTP login + locale URLs + sitemap + CSV export + preview deploy. Record results in commit body.

- [ ] **Step 9: Commit**

```bash
git add db/schema.ts drizzle/ app/api/leads app/api/cron lib/notify.ts lib/paginate.ts src/services/api.ts .github/workflows/deploy.yml docs/RUNBOOK.md public/llms.txt wrangler.toml
git commit -m "feat: lead timeline, CSV export, pagination, preview env, observability, runbook"
```

---

### Task 17: Validation layer + referential guards (mass-assignment closeout)

**Files:**
- Create: `lib/validation/settings.ts`, `pricing.ts`, `content.ts`, `lead.ts`, `blog.ts`, `media.ts`
- Modify: all mutation routes in `app/api/*` (adopt schemas; delete hand-rolled allowlists from Tasks 4-5)
- Create: `lib/guard.ts` (referential guards)
- Test: `tests/validation/*.test.ts`

- [ ] **Step 1: Write Zod schemas** — Tasks 4-5 hand-allowlisted fields to close the mass-assignment hole fast; this task makes it declarative so the field list has one source of truth:

```ts
// lib/validation/settings.ts
import { z } from 'zod';
export const settingsPatch = z.object({
  siteName: z.string().min(1).max(120).optional(),
  tagline: z.string().min(1).max(300).optional(),
  logoUrl: z.string().url().or(z.literal('')).optional(),
  faviconUrl: z.string().url().or(z.literal('')).optional(),
  defaultLocale: z.enum(['en', 'bn']).optional(),
  supportPhone: z.string().min(6).max(32).optional(),
  supportEmail: z.string().email().or(z.literal('')).optional(),
  whatsappNumber: z.string().regex(/^\d{6,20}$/).optional(),
  messengerUrl: z.string().url().or(z.literal('')).optional(),
  address: z.string().max(300).optional(),
  isPricingVisible: z.boolean().optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(200).optional(),
}).strict(); // .strict() is the point: unknown keys are rejected, not silently dropped
```
`.strict()` everywhere is what actually prevents mass assignment. Pricing: `monthlyPrice`/`annualPrice` `z.number().int().min(0).max(10_000_000)`, `slug` `z.string().regex(/^[a-z0-9-]{2,60}$/)`, `featuresEn/Bn` `z.array(z.string().max(200)).max(40)`. Lead: `name` `min 1 max 120`, `phone` `regex(/^[+0-9][0-9 \-()]{7,19}$/)` after stripping spaces, `email` optional `.or(literal(''))`, `consentGiven` `z.literal(true)`. Blog: `slug` slug regex, `content` `max(100_000)`, `status` enum, `seoTitle` max 70 / `seoDescription` max 200 (search engines truncate beyond these; catching it in admin is free SEO). Media: `url` url-or-empty, `altText` required non-empty on publish (Task 15 §4 depends on it), `category` enum.

- [ ] **Step 2: Adopt in every mutation route** — uniform error contract:
```ts
import { z } from 'zod';
const parsed = settingsPatch.safeParse(await req.json());
if (!parsed.success) return fail('Validation failed', 400, { issues: parsed.error.issues });
const [updated] = await getDb().update(siteSettingsTable).set(parsed.data).where(eq(siteSettingsTable.id, 1)).returning();
```
Extend `lib/json.ts` → `fail(message, status, details?)`. AdminPanel renders field-level errors against the correct input (server returns `issues[].path`, admin maps path → field id).

- [ ] **Step 3: Referential guards in `lib/guard.ts`** — the destructive operations that silently break other pages:
- `assertNotLastSuperadmin(userId)` — deactivating/demoting the final active superadmin returns 409 (otherwise the site becomes unadministrable).
- `assertMediaNotInUse(key)` — refuses delete when referenced by any `featuredImageUrl`/`logoUrl`/`ogImage` row.
- `assertNotSelfDeactivate(userId)` — an admin cannot lock themselves out mid-session.
- `assertSlugAvailable(table, slug, excludeId)` — for blog posts, case studies, pricing plans.
All four call sites return 409 with the conflicting entity named, so the admin UI can explain instead of just failing.

- [ ] **Step 4: Tests for validators and guards** — `tests/validation/*.test.ts`: each schema rejects unknown key (`.strict()` proof), rejects oversized/out-of-range values, accepts valid; guards tested against a seeded test DB. Run `npm test` — expected PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validation lib/guard.ts lib/json.ts app/api tests/validation
git commit -m "feat: declarative Zod validation with strict keys and referential guards"
```

---

### Task 18: Test suite + a11y + performance gates

**Files:**
- Create: `vitest.config.ts`, `tests/unit/*`, `tests/integration/*`
- Create: `playwright.config.ts`, `e2e/*.spec.ts`
- Create: `.github/workflows/ci.yml` additions (test job), `lighthouserc.json`

- [ ] **Step 1: Vitest unit tests for pure logic** — the code with real branching and no framework safety net:
`tests/unit/password.test.ts` (hash→verify roundtrip; wrong password fails; tamper with stored hash/salt/iterations fails), `tests/unit/totp.test.ts` (RFC 6238 test vectors — the standard's 8 known vectors; ±1 window accepts, ±2 rejects), `tests/unit/sanitize.test.ts` (strips `<script>`, `onerror=`, `javascript:` hrefs; keeps allowed tags), `tests/unit/slug.test.ts` (Bangla titles produce stable ASCII slugs, duplicates suffixed), `tests/unit/paginate.test.ts` (`limit` clamped to 100, `offset` floored at 0, negative/invalid ignored), `tests/unit/contentMerge.test.ts` (DB slice wins, missing `bn` key falls back to `en`, static fills remaining gaps), `tests/unit/metaCapi.test.ts` (PII hashed lowercase+trimmed, phone digits-only, `event_id` passthrough, no raw PII in payload), `tests/unit/rateLimit.test.ts` (mock KV: allows up to limit, blocks over, window rolls). Run `npm test` — expected PASS with coverage on `lib/`.

- [ ] **Step 2: Integration tests against a real Postgres** — use a throwaway Supabase/Neon branch DB (never the prod DB; `DIRECT_URL_TEST`). Cover: lead insert → timeline row in same transaction; settings patch rejects unknown column; blog slug unique index blocks duplicate live slug but allows reuse after soft delete; pricing CHECK rejects negative; session expiry respected by `auth()`. Tests must `skip` with a loud message when `DIRECT_URL_TEST` is unset so CI never silently passes green with zero DB coverage.

- [ ] **Step 3: Playwright E2E for the money paths** — `e2e/lead.spec.ts`: fill form (name+phone only, no email) → submit → success state → appears in `/admin` leads list with correct phone; duplicate phone → warning (not block); Turnstile token missing → 400. `e2e/admin.spec.ts`: setup first superadmin → login → edit hero headline → save → sign out → public landing shows the new headline without rebuild (proves the whole CMS loop end-to-end); deactivate self → 409; non-superadmin hitting user management → 403. `e2e/locale.spec.ts`: `/bn` renders Bangla, switcher keeps scroll position, missing `bn` section falls back to English. `e2e/seo.spec.ts`: `/sitemap.xml` contains published slugs and excludes drafts; `hreflang` reciprocity present on `/` and `/bn`.

- [ ] **Step 4: Axe accessibility gate** — `@axe-core/playwright` on landing (default + dark), admin, login, and the lead form at 360px: zero `critical`/`serious` violations as a blocking assertion; `prefers-reduced-motion` honored (no long-running animations when reduced); all form controls labelled; focus visible on keyboard-only traversal of hero CTA → form.

- [ ] **Step 5: Performance budget gate (LHCI)** — `lighthouserc.json`: mobile preset, assertions `largest-contentful-paint < 2000`, `cumulative-layout-shift < 0.05`, `total-blocking-time < 300`, `uses-responsive-images` warn, `unused-javascript` warn. Run against `next build` + `next start` in CI. First run is non-blocking to record the real baseline; flip `assert` on once green so regressions fail the build rather than being noticed later. This is how "the page must sell on mobile" becomes measurable rather than aspirational.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts tests playwright.config.ts e2e lighthouserc.json .github/workflows/ci.yml
git commit -m "test: unit, integration, E2E, a11y and Lighthouse CI gates"
```

---

### Task 19: Content lifecycle — draft, publish, revisions, rollback

**Files:**
- Modify: `db/schema.ts` (append `content_revisions`)
- Create: `lib/revisions.ts`
- Modify: `app/api/content/[sectionKey]/route.ts`, `app/api/blog/*`, `app/api/pricing/*` (revision writes + publish endpoints)
- Modify: AdminPanel editors (publish controls, history drawer)

- [ ] **Step 1: Append `content_revisions`** — every admin content write is versioned, so a bad edit is recoverable without a DB restore:
```ts
export const contentRevisionsTable = pgTable('content_revisions', {
  id: serial('id').primaryKey(),
  entity: text('entity').notNull(),      // landing_content | blog_post | pricing_plan | case_study | testimonial | site_settings
  entityKey: text('entity_key').notNull(), // sectionKey | id | '1'
  version: integer('version').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull(),        // draft | published
  actorId: integer('actor_id').references(() => adminUsersTable.id, { onDelete: 'set null' }),
  note: text('note').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```
Index `(entity, entity_key, version desc)`.

- [ ] **Step 2: `lib/revisions.ts`** — `recordRevision(tx, { entity, entityKey, payload, status, actorId, note })` inserts inside the same transaction as the content write (Task 3 Step 6 pattern: content row + revision row commit together or not at all). Version number comes from `max(version)+1` for that key inside the transaction.

- [ ] **Step 3: Draft vs publish split** — admins edit `status: 'draft'` freely; the public page reads only `status: 'published'` (public fetch filter, Task 15 revalidation tags unchanged). `POST /api/content/[sectionKey]/publish` flips a draft to published and records a revision with `note: 'publish'`. A published edit that changes headline/copy writes a **draft** and leaves the live copy untouched until published — this is what makes "manage the whole site" safe for a marketing team.

- [ ] **Step 4: Rollback endpoint** — `POST /api/content/[sectionKey]/restore` with `{ version }`: reads that revision, applies its payload as a **new** revision (never destructive delete of history), returns the new version number. Rollback is auditable and forward-only in the log.

- [ ] **Step 5: Optimistic locking (two admins, one hero)** — `landing_content.version` increments on each write; the update is `WHERE section_key = ? AND locale = ? AND version = ?`. Zero rows updated → 409 with the current server payload so the admin can see what changed and re-apply. Without this, the second admin's save silently destroys the first admin's edit. Editor UI shows "changed by X at HH:MM — reload to see their version".

- [ ] **Step 6: Scheduled publishing** — cron (`wrangler.toml` triggers, Task 16 pattern) `app/api/cron/publish/route.ts` flips `blog_posts` where `status = 'scheduled'` and `published_at <= now()` to `published`, then `revalidateTag('blog')`. Scheduled content actually ships on time.

- [ ] **Step 7: Commit**

```bash
git add db/schema.ts drizzle/ lib/revisions.ts app/api/content app/api/blog app/api/cron
git commit -m "feat: content revisions, draft/publish split, rollback and optimistic locking"
```

---

### Task 20: Failure modes, compliance, consent, legal pages

**Files:**
- Create: `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `app/[locale]/loading.tsx`
- Create: `app/privacy/page.tsx`, `app/terms/page.tsx` (+ `bn` variants)
- Create: `components/ConsentBanner.tsx`
- Modify: `middleware.ts` (error envelope + request id), `app/api/leads/route.ts` (retry queue drain)
- Modify: `db/schema.ts` (append `dispatch_queue`)

- [ ] **Step 1: Error boundaries + not-found** — a 500 in a section must not blank the whole 16-section sales page. `app/error.tsx` (route-level reset), `app/global-error.tsx` (root fallback with html/body), `app/not-found.tsx` (brand-styled 404 with links to `/`, `/blog`, and WhatsApp contact — a 404 that offers a human is a lead), `app/[locale]/loading.tsx` (skeleton preserving layout height so CLS stays under the LHCI budget from Task 18).

- [ ] **Step 2: Uniform API error envelope with request id** — every handler returns `{ error, requestId }`; `middleware.ts` mints `crypto.randomUUID()` per request, sets `x-request-id`, and echoes it. Client errors surface the request id so a support request ("it failed at 14:32") maps to an exact log line. Stack traces never reach the client; `fail()` logs server-side with the request id.

- [ ] **Step 3: DB-down degradation** — landing must still sell when Postgres is unreachable: the server component catches `HYPERDRIVE_NOT_BOUND`/connection errors, serves the static `landingContent` fallback with a subtle non-blocking banner (only in non-production to avoid confusing visitors... no: in production serve silently, and log — a visitor should never see our outage), admin shows a maintenance state with retry, `/api/ready` returns 503 so the platform/orchestrator knows. Lead POST during an outage must fail loudly (400/503 with "try again") rather than pretend success — losing a lead silently is worse than a visible error.

- [ ] **Step 4: Dispatch retry queue (correctness under failure)** — `dispatch_queue(id, kind, leadId, payload, attempts, nextAttemptAt, lastError, status)`; `waitUntil` (Task 13) hands the first attempt to the platform, and on failure inserts a queue row. Cron `app/api/cron/dispatch-drain/route.ts` retries due rows with exponential backoff (1m, 5m, 30m, 2h, 12h, then `Failed`). Admin lead drawer shows dispatch state and a manual retry. This is what "future-proof" means concretely: Meta CAPI or License Portal being down for 6 hours must not lose a single lead, and adding an order-transfer queue later reuses this table unchanged.

- [ ] **Step 5: Consent gate (legally required, blocks Task 13 firing early)** — `components/ConsentBanner.tsx`: no pixel, no CAPI, no analytics until the visitor accepts; choices: Accept all / Essential only; choice stored in a `ecomate_consent` cookie (12 months) **and** in the lead row (`consentGiven`, `consentAt`, `consentText` = policy version). Rejecting keeps the site fully functional with only essential storage. Banner must not obscure the mobile CTA bar (position above it) and must be keyboard/AT accessible.

- [ ] **Step 6: Legal pages, bilingual, CMS-editable** — `/privacy` and `/terms` in EN and BN, content from `landing_content` keys `legal.privacy.*` / `legal.terms.*` so legal wording is admin-editable without a deploy. Must state: what PII is collected (name, phone, optional email, IP, UA, UTM), that Meta Pixel/CAPI is used and gated by consent, retention period (Task 16 §6), contact + data-deletion request channel. Footer links both. Blog pages get `Article` JSON-LD including `inLanguage`.

- [ ] **Step 7: Verification** — E2E (Task 18 style): consent declined → no `fbq` call and no CAPI request in network log; consent accepted → both fire with matching `event_id`; `/privacy` and `/terms` reachable in both locales and present in sitemap; 404 offers contact.

- [ ] **Step 8: Commit**

```bash
git add app/error.tsx app/global-error.tsx app/not-found.tsx "app/[locale]/loading.tsx" app/privacy app/terms components/ConsentBanner.tsx middleware.ts app/api/cron db/schema.ts drizzle/ app/api/leads
git commit -m "feat: error boundaries, request-id errors, DB-down degradation, consent gate, legal pages"
```

---

### Task 21: Production governance — environments, CI security, monitoring

**Files:**
- Modify: `wrangler.toml` (environments block), `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- Create: `.github/dependabot.yml`, `.github/CODEOWNERS`, `.github/workflows/preview.yml`, `.gitleaks.toml`
- Create: `docs/RUNBOOK.md` (extend Task 16), `docs/SECURITY.md`

- [ ] **Step 1: Wrangler environments (prod/preview isolation)** — `[env.production]` and `[env.preview]`, each with its own `hyperdrive.id`, `r2_buckets.bucket_name`, `kv_namespaces.id`, and `[env.*.vars]`; scripts become `deploy:preview` / `deploy:prod` using `--env`. Today a single flat config means one mistaken `wrangler deploy` repoints production — this makes that impossible. Also add `[env.production.observability] enabled = true` (Workers Logs) as the zero-config observability floor.

- [ ] **Step 2: CI supply-chain security** — `gitleaks` scan (no secrets in history — also the reason every secret in this plan goes through `wrangler secret put`), `npm audit --audit-level=high` and `osv-scanner` on the lockfile as blocking, Dependabot for `npm` + `github-actions` weekly, `permissions: contents: read` at workflow level (drop the default write-all), pinned action SHAs for third-party actions. Add a CI assertion that no deploy workflow contains `db:push` (guard for Task 7's warning) and that `NEXT_PUBLIC_` is not used for any secret-looking name.

- [ ] **Step 3: Schema-drift guard** — CI runs `npm run db:generate` and fails if it produces a diff, meaning `drizzle/` was not committed alongside a schema change. Uncommitted migrations are how "works on my machine" becomes a production incident.

- [ ] **Step 4: Preview per PR + required checks** — `preview.yml` on `pull_request`: migrate + seed the preview DB, build, deploy `--env preview`, run the Playwright smoke subset + LHCI against the preview URL, and comment the URL + LHCI deltas on the PR. Concurrency group cancels superseded runs. Branch protection: `main` requires CI + preview + migration-drift checks, 1 approving review, no direct pushes, no force-push; `CODEOWNERS` requires review on `db/schema.ts`, `auth.ts`, `middleware.ts`, `.github/**`, `wrangler.toml`.

- [ ] **Step 5: Monitoring + alerting** — external uptime monitor on `/api/health` and `/api/ready` (60s interval, alerts to email + the sales phone as fallback via a monitor service webhook into `lib/notify.ts`), Sentry alerts on new error types and on lead-submit failures (a silently failing lead form is a revenue incident, not a bug), Workers Logs retention 7 days. Documented threshold: alert if lead POST success rate drops below 95% over 15 minutes.

- [ ] **Step 6: Runbook + restore drill (executed once, not just written)** — `docs/RUNBOOK.md`: deploy/rollback (`wrangler rollback` to previous version id + how to decide whether a DB migration must be rolled forward or forward-fixed — never destructive down-migrations on prod), secret rotation procedure per secret (Auth.js `AUTH_SECRET` rotation logs everyone out — say so), WAF rule inventory, KV/Hyperdrive rebinding, R2 restore, **PITR restore drill**: restore the DB to a point in time into a scratch database and verify lead counts match expectations, dated in the runbook; `docs/SECURITY.md`: data flow diagram (what PII exists where), threat model (abuse, credential stuffing, XSS via media/blog, IDOR on admin IDs, SSRF via external portal URL), and the report contact.

- [ ] **Step 7: Final gate** — full pipeline green on a real PR (CI + preview + Playwright + LHCI), then production deploy via manual `workflow_dispatch` per `DEPLOYMENT.md`, then the Task 16 acceptance sweep re-run end to end. Commit body records the deployed version id and every check's result.

- [ ] **Step 8: Commit**

```bash
git add wrangler.toml .github .gitleaks.toml docs/RUNBOOK.md docs/SECURITY.md
git commit -m "chore: env isolation, supply-chain CI gates, preview env, monitoring, runbook"
```

---

## Self-review

1. **Spec coverage:** architecture (§2) → Tasks 1-2; DB flow (§3) → Tasks 3,5,7; R2 (§4) → Tasks 6-7; ENV map (§5) → Task 7 + deploy secrets Task 8; migration path (§6) → Tasks 1-8; error handling (§7) → `fail()` helper + `HYPERDRIVE_NOT_BOUND`/`R2_NOT_BOUND` + Task 20 §3 degradation; testing (§8 — rewritten, see spec) → Task 18; admin auth (§10) → Task 9 + §9 session hardening; SEO (§11) → Tasks 10, 15; design corrections (§12) → Task 11; whole-site content (§13) → Task 12; bilingual parity (§14) → Task 15 (§3 Intl formatting + §6 gap report); Meta tracking (§15) → Task 13 (+ consent prerequisite Task 20 §5, `waitUntil` correctness, retry queue Task 20 §4); enterprise hardening (§16) → Tasks 14, 16, 17, 19, 20, 21. New spec sections §17-21 map to Tasks 17-21 one-to-one.
2. **Placeholder scan:** no TBD/TODO. `PASTE_HYPERDRIVE_ID`, `PASTE_KV_ID`, `<paste-direct-5432-url>` are operator-supplied values with the exact producing command in Task 7 Step 1. Seed row content specified by source location (`src/db/index.ts:186-534`).
3. **Type consistency:** `ok`/`fail(message, status, details?)` — `fail` gains an optional third arg in Task 17 and is used with it only from Task 17 onward. `getDb()`/`isPostgresConfigured()` from Task 3 unchanged throughout. `getDb().transaction(tx => ...)` (Task 3 §6) is the same API used by `lib/revisions.ts` (Task 19 §2). All mutation routes adopt `.strict()` Zod schemas (Task 17) and the Task 4-5 hand-rolled allowlists are deleted in the same step, so no two competing field lists survive. Cookie/session ownership stays with Auth.js; `trustHost` is env-gated (Task 9) and `AUTH_TRUST_HOST` is listed in `.env.example`/wrangler vars.
4. **Ordering constraints:** Task 3 §5 must precede Task 7's first `migrate`; Task 9's `admin_users` precedes `admin_users` FKs in Tasks 16/19/20; Task 13's tracking columns precede Task 14's consent check on the same table; Task 20 §5 consent gates Task 13's pixel/CAPI firing, so the consent banner must ship with (or before) the pixel going live — flagged in Task 20 §5.
5. **Residual risk stated honestly:** LHCI budgets are baseline-then-block (Task 18 §5), not magically met on first run; R2 image transformation is not included (paid Workers feature, costs money); MySQL support remains out of scope (spec §9); "100% secure/SEO" means every checklist item is implemented and verified, not that a breach is impossible.

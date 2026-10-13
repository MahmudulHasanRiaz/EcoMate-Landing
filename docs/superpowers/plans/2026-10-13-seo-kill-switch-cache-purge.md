# SEO Kill-Switch + Admin Cache Purge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an Admin-gated global SEO indexing kill-switch (default OFF, 4-layer enforcement) plus one-click cache purge buttons (all / landing-only).

**Architecture:** New `site_settings.seo_indexing_enabled` boolean (default false) read through a single `unstable_cache` getter in `lib/content.ts` (tag `seo`); `robots.ts`, `sitemap.ts`, root `generateMetadata`, and `proxy.ts` all branch on it fail-closed. New `POST /api/admin/cache/purge` fans out to the existing `invalidateDomains`/`invalidateMenus` helpers. Spec: `docs/superpowers/specs/2026-10-13-seo-kill-switch-cache-purge-design.md`.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + Postgres (Hyperdrive), `unstable_cache` + `updateTag`/`revalidateTag`, zod, vitest, playwright.

---

## File structure

| File | Responsibility |
|---|---|
| `db/schema.ts` (modify) | Add `seoIndexingEnabled` column to `site_settings` |
| `drizzle/*.sql` (create via generate) | Migration for the new column |
| `db/seed.ts` (modify) | Seed the flag `false` on fresh installs |
| `lib/validation/settings.ts` (modify) | Accept `seoIndexingEnabled` in settings PATCH |
| `src/types/api.ts` (modify) | Add `seoIndexingEnabled: boolean` to `SiteSettings` |
| `lib/content.ts` (modify) | Add `getSeoIndexingEnabled()` cached getter (tag `seo`) |
| `lib/revalidate.ts` (modify) | Add `SEO_DOMAIN = 'seo'` + union member |
| `docs/CACHE.md` (modify) | Register the `seo` tag row |
| `app/robots.ts` (modify) | `Disallow: /` + no sitemap when OFF |
| `app/sitemap.ts` (modify) | Return `[]` when OFF |
| `app/layout.tsx` (modify) | Conditional `robots` metadata in `generateMetadata` |
| `proxy.ts` (modify) | `X-Robots-Tag: noindex, nofollow` header when OFF |
| `app/api/settings/route.ts` (modify) | Invalidate `seo` tag on settings write |
| `app/api/admin/cache/purge/route.ts` (create) | `POST {scope}` purge endpoint, admin-only, rate-limited |
| `src/services/api.ts` (modify) | Add `purgeCache(scope)` client |
| `src/components/admin/AdminPanel.tsx` (modify) | SEO toggle + two purge buttons in Settings tab |
| `tests/validation/settings.test.ts` (modify) | Fixture + cases for the new flag |
| `tests/validation/cache-purge.test.ts` (create) | Unit tests for purge scope schema + tag lists |
| `tests/integration/seo-flag.test.ts` (create) | DB round-trip for the flag (skips without `DIRECT_URL_TEST`) |
| `e2e/seo-kill-switch.spec.ts` (create) | E2E: 4-layer OFF/ON matrix |

---

### Task 1: Schema column + migration + seed

**Files:**
- Modify: `db/schema.ts:29`
- Create: `drizzle/00NN_*.sql` (via generate)
- Modify: `db/seed.ts:56`

- [ ] **Step 1: Add the column to the schema**

In `db/schema.ts`, after line 29 (`isPricingVisible`), insert:

```ts
  seoIndexingEnabled: boolean('seo_indexing_enabled').notNull().default(false),
```

- [ ] **Step 2: Generate the migration**

Run: `npm run db:generate`
Expected: drizzle-kit prints a new `drizzle/00NN_<name>.sql` containing `ALTER TABLE "site_settings" ADD COLUMN "seo_indexing_enabled" boolean DEFAULT false NOT NULL;`

- [ ] **Step 3: Verify the migration file**

Run: `git status --short drizzle/`
Expected: one new `drizzle/00NN_*.sql` plus modified `drizzle/meta/_journal.json`, nothing else.

- [ ] **Step 4: Seed default OFF**

In `db/seed.ts`, inside the settings insert (after `isPricingVisible: true,` line 56), add:

```ts
        seoIndexingEnabled: false,
```

- [ ] **Step 5: Typecheck and commit**

Run: `npm run lint`
Expected: exit 0, no errors.

```bash
git add db/schema.ts db/seed.ts drizzle/
git commit -m "feat(seo): add site_settings.seo_indexing_enabled default false"
```

---

### Task 2: Validation + DTO type + unit tests (TDD)

**Files:**
- Modify: `lib/validation/settings.ts:21`
- Modify: `src/types/api.ts:26`
- Modify: `tests/validation/settings.test.ts:15`

- [ ] **Step 1: Extend the test fixture and add failing cases**

In `tests/validation/settings.test.ts`, add `seoIndexingEnabled: false,` to the `valid` object (after `isPricingVisible: true,`), and append inside the `describe` block:

```ts
  it('accepts seoIndexingEnabled true/false', () => {
    expect(settingsPatch.safeParse({ seoIndexingEnabled: true }).success).toBe(true);
    expect(settingsPatch.safeParse({ seoIndexingEnabled: false }).success).toBe(true);
  });

  it('rejects non-boolean seoIndexingEnabled', () => {
    expect(settingsPatch.safeParse({ seoIndexingEnabled: 'yes' }).success).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/validation/settings.test.ts`
Expected: FAIL — `settingsPatch.safeParse({ ...valid })` fails on the unknown strict key `seoIndexingEnabled` (strictObject proof), plus the two new cases fail.

- [ ] **Step 3: Add the field to validation and DTO**

In `lib/validation/settings.ts` after line 21, insert:

```ts
  seoIndexingEnabled: z.boolean().optional(),
```

In `src/types/api.ts` after line 26 (`isPricingVisible: boolean;`), insert:

```ts
  seoIndexingEnabled: boolean;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/validation/settings.test.ts`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validation/settings.ts src/types/api.ts tests/validation/settings.test.ts
git commit -m "feat(seo): validate seoIndexingEnabled flag end to end"
```

---

### Task 3: Cached flag reader + revalidate domain + cache map

**Files:**
- Modify: `lib/content.ts` (append after `getSiteBranding`, lines 628-633)
- Modify: `lib/revalidate.ts:39,41-49`
- Modify: `docs/CACHE.md` (tag table)

- [ ] **Step 1: Add `SEO_DOMAIN` to `lib/revalidate.ts`**

After line 39 (`export const BRANDING_DOMAIN = 'branding' as const;`), insert:

```ts
/** Global SEO indexing kill-switch (`site_settings.seo_indexing_enabled`). */
export const SEO_DOMAIN = 'seo' as const;
```

Add `| typeof SEO_DOMAIN` to the `Domain` union (lines 41-49). `tagsFor` needs NO change: the generic fallthrough `return [domain]` already yields `['seo']`.

- [ ] **Step 2: Add the cached getter to `lib/content.ts`**

Append after the `getSiteBranding` wrapper (line 633):

```ts
/** Global SEO indexing kill-switch. Fail-closed: missing row or DB error → `false`. */
async function _getSeoIndexingEnabled(): Promise<boolean> {
  try {
    const [row] = await withTimeout(getDb()
      .select({ seoIndexingEnabled: siteSettingsTable.seoIndexingEnabled })
      .from(siteSettingsTable)
      .limit(1), 'getSeoIndexingEnabled');
    return row?.seoIndexingEnabled ?? false;
  } catch (e) {
    logOnce('warn', 'content:seo-flag', '[content] seo flag read failed, defaulting OFF:', errorMessage(e));
    return false;
  }
}

export function getSeoIndexingEnabled(): Promise<boolean> {
  return unstable_cache(_getSeoIndexingEnabled, ['seo-indexing-enabled'], {
    tags: ['seo'],
    revalidate: REVALIDATE_STANDARD,
  })();
}
```

(`withTimeout`, `getDb`, `siteSettingsTable`, `logOnce`, `errorMessage`, `unstable_cache`, `REVALIDATE_STANDARD` are all already imported/defined in this file.)

- [ ] **Step 3: Register the tag in `docs/CACHE.md`**

Append to the tag table (after the `casestudies` body row):

```md
| `seo` | `getSeoIndexingEnabled()` (global flag) | `PUT /api/settings` | `updateTag` via `invalidateDomains('seo')` | `3600` |
```

- [ ] **Step 4: Typecheck and commit**

Run: `npm run lint`
Expected: exit 0.

```bash
git add lib/content.ts lib/revalidate.ts docs/CACHE.md
git commit -m "feat(seo): cached seo-indexing flag reader (tag seo)"
```

---

### Task 4: robots.txt + sitemap enforcement

**Files:**
- Modify: `app/robots.ts`
- Modify: `app/sitemap.ts:1-4,30`

- [ ] **Step 1: Rewrite `app/robots.ts`**

Replace the whole file body (keep the route contract) with:

```ts
import type { MetadataRoute } from 'next';
import { getSeoIndexingEnabled } from '@/lib/content';
import { SITE_URL } from '@/lib/seo';

/**
 * Indexing kill-switch: while `site_settings.seo_indexing_enabled` is false
 * (the default), every crawler is disallowed and no sitemap is advertised.
 * Fail-closed — a read error serves the dark branch.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const enabled = await getSeoIndexingEnabled().catch(() => false);
  if (!enabled) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    // L-37: no `host` directive — only Yandex supports it, and Next warns on it.
  };
}
```

- [ ] **Step 2: Gate `app/sitemap.ts`**

Add the import:

```ts
import { getSeoIndexingEnabled } from '@/lib/content';
```

As the first statements of the `sitemap()` function body (before `staticEntries`), insert:

```ts
  // Kill-switch: dark by default. An empty sitemap + `Disallow: /` gives crawlers
  // nothing to discover and nothing to fetch. Fail-closed on read error.
  const indexingEnabled = await getSeoIndexingEnabled().catch(() => false);
  if (!indexingEnabled) return [];
```

- [ ] **Step 3: Typecheck and commit**

Run: `npm run lint`
Expected: exit 0.

```bash
git add app/robots.ts app/sitemap.ts
git commit -m "feat(seo): gate robots.txt and sitemap on indexing flag"
```

---

### Task 5: Root metadata enforcement

**Files:**
- Modify: `app/layout.tsx:97-102`

- [ ] **Step 1: Make `generateMetadata` flag-aware**

Replace the `generateMetadata` function (lines 97-102) with:

```tsx
export async function generateMetadata(): Promise<Metadata> {
  const branding = await getSiteBranding();
  // Kill-switch (sequential awaits: see app/[locale]/layout.tsx note on joined
  // cache branches). Fail-closed — read error keeps the page noindexed.
  const { getSeoIndexingEnabled } = await import('@/lib/content');
  const seoIndexingEnabled = await getSeoIndexingEnabled().catch(() => false);
  const base = {
    ...baseMetadata,
    robots: seoIndexingEnabled
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
  const favicon = branding?.faviconUrl.trim() ?? '';
  if (!favicon) return base;
  return { ...base, icons: { icon: favicon } };
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run lint`
Expected: exit 0.

```bash
git add app/layout.tsx
git commit -m "feat(seo): noindex metadata while kill-switch is off"
```

---

### Task 6: `X-Robots-Tag` header in `proxy.ts`

**Files:**
- Modify: `proxy.ts:32-38,200-214`

Rationale for a static import: this file already imports the Drizzle-backed `@/auth` config and its header comment (lines 13-15) documents that the proxy runs on the Node.js runtime, so importing the cached getter is equally safe. The read is `unstable_cache`-backed (tag cache, no per-request DB storm) and fail-closed.

- [ ] **Step 1: Add the import**

After line 33 (`import { auth } from '@/auth';`), insert:

```ts
import { getSeoIndexingEnabled } from '@/lib/content';
```

- [ ] **Step 2: Set the header on dark public documents**

Replace lines 211-213:

```ts
    const isPublicDocument =
      isDocument && !pathname.startsWith('/api/') && !pathname.startsWith('/admin');
    if (isPublicDocument) stripAuthCookies(response.headers);
```

with:

```ts
    const isPublicDocument =
      isDocument && !pathname.startsWith('/api/') && !pathname.startsWith('/admin');
    if (isPublicDocument) {
      stripAuthCookies(response.headers);
      // Kill-switch layer 4: crawlers that ignore metadata still honor the header.
      // Fail-closed — any read error keeps `noindex` on the response.
      try {
        const enabled = await getSeoIndexingEnabled().catch(() => false);
        if (!enabled) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      } catch {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      }
    }
```

- [ ] **Step 3: Typecheck and commit**

Run: `npm run lint`
Expected: exit 0.

```bash
git add proxy.ts
git commit -m "feat(seo): X-Robots-Tag noindex while kill-switch is off"
```

---

### Task 7: Settings write path invalidates `seo`

**Files:**
- Modify: `app/api/settings/route.ts:45`

- [ ] **Step 1: Extend invalidation**

Replace line 45:

```ts
    invalidateDomains(['content', 'pricing', 'branding'], updated.defaultLocale === 'bn' ? 'bn' : 'en');
```

with:

```ts
    invalidateDomains(['content', 'pricing', 'branding', 'seo'], updated.defaultLocale === 'bn' ? 'bn' : 'en');
```

(No validation change needed — Task 2 already allowlists the field, and `parsed.data` flows into the existing explicit `.set({ ...parsed.data, ... })` allowlist path.)

- [ ] **Step 2: Typecheck and commit**

Run: `npm run lint`
Expected: exit 0.

```bash
git add app/api/settings/route.ts
git commit -m "feat(seo): invalidate seo tag on settings save"
```

---

### Task 8: Purge endpoint (TDD)

> **REVISION (executed):** importing the route file from vitest failed
> (`next-auth` → `next/server` unresolvable). Pure scope/tag logic lives in
> `lib/cache-purge.ts` (zod-only); the route and the test both import from there.
> Test imports `@/lib/cache-purge`, never the route.

**Files:**
- Create: `lib/cache-purge.ts`
- Create: `app/api/admin/cache/purge/route.ts`
- Create: `tests/validation/cache-purge.test.ts`

Audit note (spec refinement): `recordRevision` (`lib/revisions.ts:64`) MUST run inside the content write's transaction — a purge has no content write, so a revision row would violate that module's contract. Audit is therefore a structured single-line JSON log (same shape as `logServerError`, event `api.admin.cache-purge`), never `logOnce` (that helper is for deduped warnings, and an admin action is a genuine per-request event).

- [ ] **Step 1: Write the failing test**

Create `tests/validation/cache-purge.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { purgeScopeTags } from '@/app/api/admin/cache/purge/route';

describe('purgeScopeTags', () => {
  it('landing scope covers the shell and leaves content domains alone', () => {
    const tags = purgeScopeTags('landing');
    expect(tags).toContain('content:en');
    expect(tags).toContain('content:bn');
    expect(tags).toContain('branding');
    expect(tags).toContain('pricing');
    expect(tags).toContain('seo');
    expect(tags).not.toContain('blog');
    expect(tags).not.toContain('casestudies');
    expect(tags).not.toContain('testimonials');
  });

  it('all scope covers every tag family', () => {
    const tags = purgeScopeTags('all');
    for (const tag of [
      'content:en',
      'content:bn',
      'menus:main:en',
      'menus:footer:bn',
      'blog',
      'pricing',
      'social',
      'testimonials',
      'casestudies',
      'branding',
      'seo',
    ]) {
      expect(tags).toContain(tag);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/validation/cache-purge.test.ts`
Expected: FAIL with "Failed to resolve import" / "purgeScopeTags is not a function".

- [ ] **Step 3: Write the endpoint**

Create `app/api/admin/cache/purge/route.ts`:

```ts
import { z } from 'zod';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { invalidateDomains, invalidateMenus } from '@/lib/revalidate';

const purgeBody = z.object({ scope: z.enum(['all', 'landing']) });

type PurgeScope = z.infer<typeof purgeBody>['scope'];

const LANDING_TAGS = [
  'content:en',
  'content:bn',
  'menus:main:en',
  'menus:main:bn',
  'menus:footer:en',
  'menus:footer:bn',
  'branding',
  'pricing',
  'seo',
] as const;

const ALL_TAGS = [
  ...LANDING_TAGS,
  'blog',
  'social',
  'testimonials',
  'casestudies',
] as const;

/** The exact tag list a scope invalidates. Exported for unit tests. */
export function purgeScopeTags(scope: PurgeScope): string[] {
  return [...(scope === 'all' ? ALL_TAGS : LANDING_TAGS)];
}

function purgeLanding(): void {
  invalidateDomains('content', 'en');
  invalidateDomains('content', 'bn');
  invalidateMenus('main', 'en');
  invalidateMenus('main', 'bn');
  invalidateMenus('footer', 'en');
  invalidateMenus('footer', 'bn');
  invalidateDomains(['pricing', 'branding', 'seo'], 'en');
}

function purgeAll(): void {
  purgeLanding();
  invalidateDomains(['blog', 'social', 'testimonials', 'casestudies'], 'en');
}

// Global per-minute cap: this endpoint is admin-only and each hit refreshes every
// cached read site-wide, so an accidental double-click storm must not loop the DB.
const PURGE_WINDOW_MS = 60_000;
const PURGE_MAX = 10;
let purgeAt: number[] = [];

function purgeRateLimited(): boolean {
  const now = Date.now();
  purgeAt = purgeAt.filter((t) => now - t < PURGE_WINDOW_MS);
  if (purgeAt.length >= PURGE_MAX) return true;
  purgeAt.push(now);
  return false;
}

export async function POST(req: Request) {
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;
  const parsed = purgeBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail('Validation failed', 400, { issues: parsed.error.issues });
  }
  if (purgeRateLimited()) return fail('Rate limited, try again shortly', 429);
  try {
    if (parsed.data.scope === 'all') purgeAll();
    else purgeLanding();
    const invalidated = purgeScopeTags(parsed.data.scope);
    console.info(
      JSON.stringify({
        level: 'info',
        event: 'api.admin.cache-purge',
        op: 'POST /api/admin/cache/purge',
        scope: parsed.data.scope,
        tags: invalidated,
      }),
    );
    return ok({ scope: parsed.data.scope, invalidated });
  } catch (e) {
    logServerError('POST /api/admin/cache/purge', e);
    return fail(errorMessage(e));
  }
}
```

Why `blog` covers `blog:${slug}` bodies and `casestudies` covers per-slug bodies: the single-body getters carry BOTH tags (`lib/content.ts:326`, `:701`), so invalidating the base tag expires bodies too.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/validation/cache-purge.test.ts`
Expected: 2 tests PASS.

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/cache/purge/route.ts tests/validation/cache-purge.test.ts
git commit -m "feat(admin): cache purge endpoint (all / landing scopes)"
```

---

### Task 9: Admin UI — SEO toggle + purge buttons

**Files:**
- Modify: `src/services/api.ts` (append near `updateSettings`, line 136)
- Modify: `src/components/admin/AdminPanel.tsx` (Settings tab, after Save button ~line 2613)

- [ ] **Step 1: Add the `purgeCache` client**

In `src/services/api.ts` after `updateSettings` (line 136), insert:

```ts
export async function purgeCache(scope: 'all' | 'landing'): Promise<{ scope: string; invalidated: string[] }> {
  const res = await fetch(`${API_BASE}/admin/cache/purge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope }),
  });
  if (!res.ok) await throwApiError(res, 'Failed to purge cache');
  return res.json();
}
```

(`throwApiError` is already imported in this file at line 85; `Response.json` returns the bare `{ scope, invalidated }` because `ok(data)` sends it unwrapped — `lib/json.ts:10-12`.)

- [ ] **Step 2: Add the SEO toggle to the Settings form**

In `AdminPanel.tsx`, inside the settings `<form>` before the submit row (line 2605), insert a toggle card following the file's existing field pattern (`label` + checkbox + `FieldError`-free boolean, bound to the shared `settings` state so the existing `handleSaveSettings` persists it with zero new handlers):

```tsx
<div className="p-4 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 space-y-2">
  <label htmlFor="settings-seoIndexing" className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 cursor-pointer">
    <input
      id="settings-seoIndexing"
      type="checkbox"
      checked={settings?.seoIndexingEnabled ?? false}
      onChange={(e) => settings && setSettings({ ...settings, seoIndexingEnabled: e.target.checked })}
      className="h-4 w-4 accent-indigo-600"
    />
    <span>Search engine indexing</span>
  </label>
  <p className="text-[11px] text-slate-600 dark:text-slate-300">
    OFF থাকলে Google কোনো পেজ index করবে না (robots + sitemap + meta + header সব বন্ধ)।
    ON করলে পুরো সাইট index শুরু হবে। Save চাপলে কার্যকর হবে।
  </p>
</div>
```

Guard: this block lives inside the existing `settings && (` conditional section of the form — place it adjacent to the SEO title/description fields (lines 2534-2547) so `settings` is non-null by construction; keep the `settings &&` guard in `onChange` as shown.

- [ ] **Step 3: Add the cache purge card after the form**

After the closing `</form>` (line 2614), still inside the settings tab container, insert:

```tsx
<div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] space-y-3 shadow-xs">
  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cache</h3>
  <p className="text-[11px] text-slate-600 dark:text-slate-300">
    Purge করলে সব cached content expire হবে — পরের ভিজিটে fresh DB read হবে।
  </p>
  <div className="flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={async () => {
        if (!window.confirm('সব cache clear হবে। নিশ্চিত?')) return;
        try {
          const res = await api.purgeCache('all');
          showNotification(`Cache purged (${res.invalidated.length} tags)`);
        } catch (err) {
          showNotification(err instanceof Error ? err.message : 'Purge failed');
        }
      }}
      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs cursor-pointer"
    >
      Purge all cache
    </button>
    <button
      type="button"
      title="শুধু landing shell (content, menus, branding, pricing)"
      onClick={async () => {
        if (!window.confirm('Landing cache clear হবে। নিশ্চিত?')) return;
        try {
          const res = await api.purgeCache('landing');
          showNotification(`Landing cache purged (${res.invalidated.length} tags)`);
        } catch (err) {
          showNotification(err instanceof Error ? err.message : 'Purge failed');
        }
      }}
      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer flex items-center gap-1.5"
    >
      <RotateCcw className="h-4 w-4" />
      <span>Landing only</span>
    </button>
  </div>
</div>
```

(`showNotification`, `api.*` namespace, `RotateCcw`/`Save` icons follow existing usage in this file — verify `RotateCcw` is in the lucide import at the top; if not, add it to that import list. `settings` state type flows from `SiteSettings`, which Task 2 already extended, so no cast is needed.)

- [ ] **Step 4: Typecheck and commit**

Run: `npm run lint`
Expected: exit 0.

```bash
git add src/services/api.ts src/components/admin/AdminPanel.tsx
git commit -m "feat(admin): SEO toggle and cache purge buttons in Settings"
```

---

### Task 10: Integration + E2E tests

**Files:**
- Create: `tests/integration/seo-flag.test.ts`
- Create: `e2e/seo-kill-switch.spec.ts`

- [ ] **Step 1: Read the integration DB pattern**

Read `tests/integration/constraints.test.ts:1-60` and mirror its `getDb()` setup and skip logic exactly (tests skip loudly when `DIRECT_URL_TEST` is unset — `.env.example:36`).

- [ ] **Step 2: Write the integration test**

Create `tests/integration/seo-flag.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { siteSettingsTable } from '@/db/schema';

// Mirror tests/integration/constraints.test.ts setup (db handle + loud skip).
const hasTestDb = Boolean(process.env.DIRECT_URL_TEST);
const describeDb = hasTestDb ? describe : describe.skip;

describeDb('seo_indexing_enabled', () => {
  it('defaults to false on insert and round-trips true->false', async () => {
    const db = getDb();
    const [row] = await db
      .insert(siteSettingsTable)
      .values({ siteName: `seo-flag-probe-${Date.now()}` })
      .returning({ id: siteSettingsTable.id, flag: siteSettingsTable.seoIndexingEnabled });
    expect(row.flag).toBe(false);
    const [on] = await db
      .update(siteSettingsTable)
      .set({ seoIndexingEnabled: true })
      .where(eq(siteSettingsTable.id, row.id))
      .returning({ flag: siteSettingsTable.seoIndexingEnabled });
    expect(on.flag).toBe(true);
    await db.delete(siteSettingsTable).where(eq(siteSettingsTable.id, row.id));
  });
});
```

- [ ] **Step 3: Run integration tests**

Run: `npx vitest run tests/integration/seo-flag.test.ts`
Expected: PASS with test DB, or SKIP (loud) without `DIRECT_URL_TEST`.

- [ ] **Step 4: Write the E2E kill-switch spec**

Create `e2e/seo-kill-switch.spec.ts` (default state is OFF — no auth needed for the dark assertions):

```ts
import { expect, test } from '@playwright/test';

/**
 * SEO kill-switch (default OFF): all four crawler surfaces stay dark until an
 * admin flips `site_settings.seo_indexing_enabled`. The ON-state is covered by
 * the existing `e2e/seo.spec.ts` expectations once the flag is enabled.
 */
test.describe('seo kill-switch (default OFF)', () => {
  test('/robots.txt disallows everything and advertises no sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('Disallow: /');
    expect(body).not.toContain('Sitemap:');
  });

  test('/sitemap.xml is empty while dark', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect(xml).not.toMatch(/<loc>/);
  });

  test('/ carries noindex meta and X-Robots-Tag header', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    expect(response.headers()['x-robots-tag']).toContain('noindex');
    const html = await response.text();
    expect(html).toMatch(/name="robots"[^>]*content="[^"]*noindex/);
  });
});
```

- [ ] **Step 5: Run the E2E spec**

Run: `npx playwright test e2e/seo-kill-switch.spec.ts`
Expected: 3 tests PASS (needs the E2E env per `playwright.config.ts` + `wrangler.e2e.json`).

- [ ] **Step 6: Commit**

```bash
git add tests/integration/seo-flag.test.ts e2e/seo-kill-switch.spec.ts
git commit -m "test(seo): kill-switch integration and E2E coverage"
```

---

### Task 11: Final verification (AGENTS.md gate)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 2: Full unit suite**

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 3: Build (routing/config/rendering changed — mandatory)**

Run one heavy command at a time, heap-capped:
`NODE_OPTIONS="--max-old-space-size=2048" npm run build`
Expected: build succeeds. (If this machine has <16GB free, run with nothing else open — see AGENTS.md command discipline.)

- [ ] **Step 4: Confirm the Worker bundle**

Run: `ls -la .open-next/worker.js`
Expected: file exists, non-zero size.

- [ ] **Step 5: Confirm migration committed**

Run: `git status --short drizzle/ && git log --oneline -8`
Expected: clean tree (migration committed in Task 1), spec + plan commits visible.

---

## Self-review

1. **Spec coverage:** §3.1→Task 1; §3.2→Task 3; §3.3 four layers→Tasks 4, 5, 6 (robots/sitemap, meta, header); §3.4→Tasks 2, 7, 9; §4.1→Task 8; §4.2→Task 9; §5 fail-closed→Tasks 3-6 (each carries `.catch(() => false)` + try/catch); §6→Tasks 2, 8, 10, 11; §7 rollout is operator runbook, no task needed. No gaps.
2. **Placeholder scan:** no TBD/TODO/"similar to"/unshown code — every code step carries its block; the one research step (Task 10 Step 1) names the exact file and lines to mirror. The audit deviation from the spec (structured log instead of revision row) is documented with its reason in Task 8 rather than silently dropped.
3. **Type consistency:** `seoIndexingEnabled` (camelCase TS) vs `seo_indexing_enabled` (snake_case SQL) matches the repo's existing convention (`isPricingVisible` ↔ `is_pricing_visible`); `purgeScopeTags` return type `string[]` matches the test import; `purgeCache` client shape matches `ok({ scope, invalidated })`; `SiteSettings` extension flows into `Partial<SiteSettings>` for `updateSettings` with no cast.

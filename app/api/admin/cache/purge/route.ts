import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { purgeScopeSchema, purgeScopeTags } from '@/lib/cache-purge';
import { invalidateDomains, invalidateMenus } from '@/lib/revalidate';

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

// Per-isolate per-minute cap on Workers (not global): this endpoint is admin-only and each hit refreshes every
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
  const parsed = purgeScopeSchema.safeParse(
    ((await req.json().catch(() => null)) as { scope?: unknown } | null)?.scope,
  );
  if (!parsed.success) {
    return fail('Validation failed', 400, { issues: parsed.error.issues });
  }
  if (purgeRateLimited()) return fail('Rate limited, try again shortly', 429);
  try {
    if (parsed.data === 'all') purgeAll();
    else purgeLanding();
    const invalidated = purgeScopeTags(parsed.data);
    console.info(
      JSON.stringify({
        level: 'info',
        event: 'api.admin.cache-purge',
        op: 'POST /api/admin/cache/purge',
        scope: parsed.data,
        tags: invalidated,
      }),
    );
    return ok({ scope: parsed.data, invalidated });
  } catch (e) {
    logServerError('POST /api/admin/cache/purge', e);
    return fail(errorMessage(e));
  }
}

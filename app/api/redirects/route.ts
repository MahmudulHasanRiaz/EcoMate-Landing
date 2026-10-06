/**
 * GET/POST/PUT/DELETE /api/redirects — managed URL moves (Task 15 §1).
 *
 * `proxy.ts` reads this table before routing (through `lib/redirects.ts`, which caches it in
 * KV for five minutes), so a rule created here takes effect within that window with no deploy.
 *
 * ## The self-redirect and the loop guards
 *
 * A redirect table is the one place where bad input produces an outage rather than a bug: a
 * rule pointing at itself, or a two-rule cycle (`/a` → `/b`, `/b` → `/a`), will hang a crawler
 * until it gives up, and both are trivially easy to create by hand. Three cheap invariants are
 * therefore enforced on write instead of being left to review:
 *
 *  1. `fromPath` may never equal `toPath` (an infinite self-redirect).
 *  2. `toPath` may not already be some other rule's `fromPath` (a two-rule cycle).
 *  3. `fromPath` must be a site-absolute path and must not sit under `/admin` or `/api`
 *     (a redirect can never usefully target a session-gated or machine surface, and shadowing
 *     `/api/leads` would turn a lead capture into a redirect).
 */
import { and, asc, eq, ne } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { redirectsTable } from '@/db/schema';
import {
  asObject,
  errorMessage,
  fail,
  isUniqueViolation,
  logServerError,
  ok,
  parseId,
  readNumber,
  readString,
} from '@/lib/json';
import { requireAdminRole } from '@/lib/authz';
import { canWriteContent } from '@/lib/roles';
import { resetRedirectCache } from '@/lib/redirects';

const ALLOWED_STATUS_CODES = [301, 302, 307, 308] as const;

/** Prefixes a redirect may never claim, because they are not public documents. */
const RESERVED_PREFIXES = ['/admin', '/api', '/_next', '/_vercel'];

function normalisePath(raw: string): string | null {
  const path = raw.trim();
  if (path === '' || !path.startsWith('/')) return null;
  // Collapse a trailing slash so `/old` and `/old/` are one rule, not two.
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

function readStatusCode(value: unknown): number {
  const code = readNumber(value, 308);
  return (ALLOWED_STATUS_CODES as readonly number[]).includes(code) ? code : 308;
}

export async function GET() {
  try {
    const rows = await getDb()
      .select()
      .from(redirectsTable)
      .orderBy(asc(redirectsTable.id));
    return ok(rows);
  } catch (e) {
    logServerError('GET /api/redirects', e);
    return fail(errorMessage(e));
  }
}

/** Shared validation for POST and PUT: returns an error string, or the normalised rule. */
function validateRule(
  body: Record<string, unknown>,
): { fromPath: string; toPath: string; statusCode: number } | string {
  const fromPath = normalisePath(readString(body.fromPath));
  const toPath = normalisePath(readString(body.toPath));
  if (!fromPath) return 'fromPath must be a site-absolute path starting with "/"';
  if (!toPath) return 'toPath must be a site-absolute path starting with "/"';
  if (fromPath === toPath) return 'fromPath and toPath must differ (that is an infinite redirect)';
  if (RESERVED_PREFIXES.some((prefix) => fromPath === prefix || fromPath.startsWith(`${prefix}/`))) {
    return `fromPath may not be under ${RESERVED_PREFIXES.join(', ')}`;
  }
  return { fromPath, toPath, statusCode: readStatusCode(body.statusCode) };
}

/** Reject a rule whose `toPath` is already the source of another rule. */
async function assertNoCycle(toPath: string, excludeId: number | null): Promise<string | null> {
  const [existing] = await getDb()
    .select({ id: redirectsTable.id })
    .from(redirectsTable)
    .where(
      excludeId === null
        ? eq(redirectsTable.fromPath, toPath)
        : and(eq(redirectsTable.fromPath, toPath), ne(redirectsTable.id, excludeId)),
    )
    .limit(1);
  return existing
    ? `toPath "${toPath}" is already redirected from; that would create a redirect loop`
    : null;
}

export async function POST(req: Request) {
  const guard = await requireAdminRole(['superadmin', 'admin', 'editor']);
  if (!guard.ok) return guard.response;
  if (!canWriteContent(guard.role)) return fail('Editors cannot manage redirects', 403);

  try {
    const body = asObject(await req.json());
    const rule = validateRule(body);
    if (typeof rule === 'string') return fail(rule, 400);

    const cycle = await assertNoCycle(rule.toPath, null);
    if (cycle) return fail(cycle, 409);

    const [created] = await getDb()
      .insert(redirectsTable)
      .values({ fromPath: rule.fromPath, toPath: rule.toPath, statusCode: rule.statusCode })
      .returning();
    // The proxy memoises the table for five minutes; a fresh write has to be visible to the
    // admin who just made it, so the in-process copy is dropped. The KV copy expires on its
    // own TTL — invalidating it here would need a second KV round trip on the write path.
    resetRedirectCache();
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/redirects', e);
    if (isUniqueViolation(e)) return fail('A redirect for that fromPath already exists', 409);
    return fail(errorMessage(e));
  }
}

export async function PUT(req: Request) {
  const guard = await requireAdminRole(['superadmin', 'admin', 'editor']);
  if (!guard.ok) return guard.response;
  if (!canWriteContent(guard.role)) return fail('Editors cannot manage redirects', 403);

  try {
    const body = asObject(await req.json());
    const id = parseId(readString(body.id));
    if (id === null) return fail('Invalid redirect id', 400);

    const rule = validateRule(body);
    if (typeof rule === 'string') return fail(rule, 400);

    const cycle = await assertNoCycle(rule.toPath, id);
    if (cycle) return fail(cycle, 409);

    const [updated] = await getDb()
      .update(redirectsTable)
      .set({ ...rule, updatedAt: new Date() })
      .where(eq(redirectsTable.id, id))
      .returning();
    if (!updated) return fail('Redirect not found', 404);
    resetRedirectCache();
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/redirects', e);
    if (isUniqueViolation(e)) return fail('A redirect for that fromPath already exists', 409);
    return fail(errorMessage(e));
  }
}

export async function DELETE(req: Request) {
  const guard = await requireAdminRole(['superadmin', 'admin', 'editor']);
  if (!guard.ok) return guard.response;
  if (!canWriteContent(guard.role)) return fail('Editors cannot manage redirects', 403);

  try {
    const body = asObject(await req.json());
    const id = parseId(readString(body.id));
    if (id === null) return fail('Invalid redirect id', 400);

    const [deleted] = await getDb()
      .delete(redirectsTable)
      .where(eq(redirectsTable.id, id))
      .returning();
    if (!deleted) return fail('Redirect not found', 404);
    resetRedirectCache();
    return ok({ success: true });
  } catch (e) {
    logServerError('DELETE /api/redirects', e);
    return fail(errorMessage(e));
  }
}
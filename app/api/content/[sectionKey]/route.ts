/**
 * GET/PUT /api/content/[sectionKey] — one section payload per locale.
 *
 * `landing_content` is upserted on the (section_key, locale) unique index, so the admin
 * save is a single statement. Multi-table writes in this app are transactional (Task 3
 * §6); this one touches a single table and a single row, so the upsert itself is atomic.
 */
import { and, eq, isNull, sql } from 'drizzle-orm';
import { updateTag } from 'next/cache';
import { getDb } from '@/db/client';
import { landingContentTable } from '@/db/schema';
import { asObject, errorMessage, fail, logServerError, ok, optionalObject } from '@/lib/json';
import type { Locale } from '@/src/types/landing';

// Section keys are ours (hero, complexity, …), not user copy: a strict shape keeps a typo
// from creating an unreachable row and keeps the key usable in a cache tag.
const SECTION_KEY = /^[a-z][a-z0-9._-]{0,63}$/;

interface RouteContext {
  params: Promise<{ sectionKey: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const sectionKey = (await params).sectionKey;
    const [row] = await getDb()
      .select()
      .from(landingContentTable)
      .where(and(
        eq(landingContentTable.sectionKey, sectionKey),
        isNull(landingContentTable.deletedAt),
      ))
      .limit(1);
    if (!row) return fail('Section content not found', 404);
    return ok(row);
  } catch (e) {
    logServerError('GET /api/content/[sectionKey]', e);
    return fail(errorMessage(e));
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const sectionKey = (await params).sectionKey;
    if (!SECTION_KEY.test(sectionKey)) return fail('Invalid section key', 400);

    // NEVER spread the body into `.set()` / `.values()`: it is attacker-controlled and
    // would let a caller write id, version, deleted_at or another tenant's locale.
    const body = asObject(await req.json());
    const locale: Locale = body.locale === 'bn' ? 'bn' : 'en';
    const content = optionalObject(body.content);
    if (!content) return fail('content must be a JSON object', 400);
    const status = body.status === 'draft' ? 'draft' : 'published';

    const db = getDb();
    const [row] = await db
      .insert(landingContentTable)
      .values({ sectionKey, locale, content, status })
      .onConflictDoUpdate({
        target: [landingContentTable.sectionKey, landingContentTable.locale],
        set: {
          content,
          status,
          // Optimistic locking reads this (Task 19 §5); incrementing it on every write
          // costs nothing and makes the version meaningful from the first save.
          version: sql`${landingContentTable.version} + 1`,
          updatedAt: new Date(),
          deletedAt: null,
        },
      })
      .returning();

    // Cache Components invalidation (Task 15 §5). Same-request `updateTag` so the admin
    // sees their own edit immediately; the landing page tag is per locale, so editing
    // Bangla cannot invalidate English.
    try {
      updateTag(`content:${locale}`);
    } catch (e) {
      // A route handler invoked outside Next's request pipeline (unit tests, scripts) has
      // no tag store. The write already committed; the page revalidates on its profile.
      logServerError('PUT /api/content/[sectionKey] invalidation', e);
    }

    return ok(row);
  } catch (e) {
    logServerError('PUT /api/content/[sectionKey]', e);
    return fail(errorMessage(e));
  }
}

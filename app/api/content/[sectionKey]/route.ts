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
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { contentUpsert } from '@/lib/validation';

interface RouteContext {
  params: Promise<{ sectionKey: string }>;
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const sectionKey = (await params).sectionKey;
    // Optional `?locale=en|bn`. Without it the handler keeps its original contract — the
    // first non-deleted row for the key — so an existing caller cannot change behaviour by
    // gaining a query string. The side-by-side editor (Task 15 §6) needs the two rows
    // separately, because the *merged* public payload this route used to be the only source
    // of already has English folded into the Bangla one.
    const requested = new URL(req.url).searchParams.get('locale');
    const locale = requested === 'en' || requested === 'bn' ? requested : null;

    const [row] = await getDb()
      .select()
      .from(landingContentTable)
      .where(and(
        eq(landingContentTable.sectionKey, sectionKey),
        isNull(landingContentTable.deletedAt),
        ...(locale ? [eq(landingContentTable.locale, locale)] : []),
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

    // NEVER spread the body into `.set()` / `.values()`: it is attacker-controlled and
    // would let a caller write id, version, deleted_at or another tenant's locale. The
    // section key travels in the URL, so it is merged with the body and validated as one
    // strict object — an unknown key or a malformed section key is a 400, not a new row.
    const body: unknown = await req.json().catch(() => null);
    const candidate =
      typeof body === 'object' && body !== null ? { ...(body as object), sectionKey } : null;
    const parsed = contentUpsert.safeParse(candidate);
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    const { locale, content, status } = parsed.data;

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

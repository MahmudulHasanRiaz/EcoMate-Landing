import { desc, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { mediaAssetsTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import {
  errorMessage,
  fail,
  failWithRequestId,
  isUniqueViolation,
  logServerError,
  ok,
} from '@/lib/json';
import { paginate } from '@/lib/paginate';
import { requestId } from '@/lib/request';
import { mediaCreate } from '@/lib/validation';

/** Paginated (Task 16 §4): the media library is a growing list, not a fixed set. */
export async function GET(req: Request) {
  try {
    const page = await paginate(
      req.url,
      (limit, offset) =>
        getDb()
          .select()
          .from(mediaAssetsTable)
          .where(isNull(mediaAssetsTable.deletedAt))
          .orderBy(desc(mediaAssetsTable.createdAt), desc(mediaAssetsTable.id))
          .limit(limit)
          .offset(offset),
      async () => {
        const [row] = await getDb()
          .select({ count: sql<number>`count(*)` })
          .from(mediaAssetsTable)
          .where(isNull(mediaAssetsTable.deletedAt));
        return { count: Number(row?.count ?? 0) };
      },
    );
    return ok(page);
  } catch (e) {
    logServerError('GET /api/media', e, requestId(req));
    return failWithRequestId(errorMessage(e), requestId(req));
  }
}

// NEVER `.values(body)` — allowlist every column this endpoint may write.
export async function POST(req: Request) {
  // H-9: media metadata writes need a role check (Decision 1 — editors manage media).
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;
  try {
    const parsed = mediaCreate.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    // An asset created through the admin *is* the publish — there is no separate draft flag on
    // `media_assets`, so the schema requires non-empty alt text on this path: accepting a row
    // without it would put an unlabelled image into the library, where nothing later forces
    // it to be labelled.
    const [created] = await getDb()
      .insert(mediaAssetsTable)
      .values({
        key: parsed.data.key.trim(),
        title: parsed.data.title.trim(),
        url: parsed.data.url,
        altText: parsed.data.altText.trim(),
        category: parsed.data.category ?? 'general',
      })
      .returning();
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/media', e, requestId(req));
    if (isUniqueViolation(e)) return fail('A media asset with that key already exists', 409);
    return fail(errorMessage(e));
  }
}

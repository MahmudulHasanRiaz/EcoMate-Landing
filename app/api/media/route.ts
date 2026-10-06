import { desc, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { mediaAssetsTable } from '@/db/schema';
import {
  asObject,
  errorMessage,
  fail,
  failWithRequestId,
  isUniqueViolation,
  logServerError,
  ok,
  readString,
} from '@/lib/json';
import { paginate } from '@/lib/paginate';
import { requestId } from '@/lib/request';

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
  try {
    const body = asObject(await req.json());
    const row = {
      key: readString(body.key).trim(),
      title: readString(body.title).trim(),
      url: readString(body.url).trim(),
      altText: readString(body.altText).trim(),
      category: readString(body.category, 'general').trim() || 'general',
    };
    if (!row.key || !row.title) return fail('key and title are required', 400);
    if (!row.url) return fail('url is required', 400);
    // An asset created through the admin *is* the publish — there is no separate draft flag on
    // `media_assets`. Accepting a row without alt text would put an unlabelled image into the
    // library, where nothing later forces it to be labelled: a screen reader announces a file
    // name, and an unnamed decorative image is indistinguishable from a broken one. Refusing
    // the write is the only point where the asset is still editable.
    if (!row.altText) return fail('altText is required before an asset can be published', 400);
    const [created] = await getDb().insert(mediaAssetsTable).values(row).returning();
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/media', e, requestId(req));
    if (isUniqueViolation(e)) return fail('A media asset with that key already exists', 409);
    return fail(errorMessage(e));
  }
}

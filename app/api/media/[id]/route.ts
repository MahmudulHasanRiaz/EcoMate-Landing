import { and, eq, gte, isNull, ne, or } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { mediaAssetsTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, isUniqueViolation, logServerError, ok, parseId } from '@/lib/json';
import { assertMediaNotInUse } from '@/lib/guard';
import { resolveBucket } from '@/lib/media';
import { requestId } from '@/lib/request';
import { mediaUpdate } from '@/lib/validation';

/** Soft-deleted rows younger than this still count as references to their R2 key. */
const REFERENCE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * DELETE /api/media/[id]
 *
 * Hard-deleting the DB row while the R2 object stays reachable is how a "removed" asset
 * keeps appearing in search and on old links, so removal is two steps with a guard:
 *
 *  1. Soft-delete the DB row (`deleted_at`) so it disappears from every live read.
 *  2. Purge the R2 object only when no other row — including soft-deleted rows from the
 *     last 30 days — still references the same key. Shared keys are common (a logo reused
 *     by several assets), and deleting the object out from under a sibling would break a
 *     live page.
 *
 * The R2 delete runs *before* the row is soft-deleted. If the object store fails, the row
 * stays live and the request returns 500, so the state is retryable and can never end up
 * as a soft-deleted row with an object still publicly served.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // H-9: media deletion needs a role check (Decision 1 — editors manage media).
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid media id', 400);

    const db = getDb();
    const [asset] = await db
      .select()
      .from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.id, id))
      .limit(1);
    if (!asset) return fail('Media asset not found', 404);

    // Referential guard: a key still embedded in live content cannot be deleted out
    // from under the page that serves it. Names the conflicting entity in the 409.
    const inUse = await assertMediaNotInUse(asset.key);
    if (!inUse.ok) return fail(inUse.reason ?? 'Media asset is still in use', 409);

    const cutoff = new Date(Date.now() - REFERENCE_RETENTION_MS);
    const [stillReferenced] = await db
      .select({ id: mediaAssetsTable.id })
      .from(mediaAssetsTable)
      .where(
        and(
          eq(mediaAssetsTable.key, asset.key),
          ne(mediaAssetsTable.id, asset.id),
          or(isNull(mediaAssetsTable.deletedAt), gte(mediaAssetsTable.deletedAt, cutoff)),
        ),
      )
      .limit(1);

    let r2Deleted = false;
    if (!stillReferenced) {
      const bucket = resolveBucket();
      if (!bucket) return fail('R2_NOT_BOUND', 500);
      try {
        await bucket.delete(asset.key);
        r2Deleted = true;
      } catch (e) {
        logServerError('DELETE /api/media/[id] (R2)', e);
        return fail(`R2_DELETE_FAILED: ${errorMessage(e)}`, 500);
      }
    }

    await db
      .update(mediaAssetsTable)
      .set({ deletedAt: new Date() })
      .where(eq(mediaAssetsTable.id, asset.id));

    return ok({ success: true, r2Deleted });
  } catch (e) {
    logServerError('DELETE /api/media/[id]', e);
    return fail(errorMessage(e));
  }
}

/**
 * PATCH /api/media/[id] — edit library metadata (Phase 3b Item 17).
 *
 * Title / alt text / category / URL only: the R2 `key` is the immutable object
 * identity (renaming it would orphan the stored bytes), so `key` writes are refused
 * even though the shared `mediaUpdate` schema permits the field elsewhere.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid media id', 400, undefined, requestId(req));

    const parsed = mediaUpdate.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues }, requestId(req));
    }
    // NEVER spread the body: explicit fields only, and `key` is never writable here.
    const patch: { title?: string; altText?: string; category?: string; url?: string } = {};
    if (parsed.data.title !== undefined) patch.title = parsed.data.title.trim();
    if (parsed.data.altText !== undefined) patch.altText = parsed.data.altText.trim();
    if (parsed.data.category !== undefined) patch.category = parsed.data.category;
    if (parsed.data.url !== undefined) patch.url = parsed.data.url;
    if (Object.keys(patch).length === 0) {
      return fail('Nothing to update', 400, undefined, requestId(req));
    }

    const [updated] = await getDb()
      .update(mediaAssetsTable)
      .set(patch)
      .where(and(eq(mediaAssetsTable.id, id), isNull(mediaAssetsTable.deletedAt)))
      .returning();
    if (!updated) return fail('Media asset not found', 404, undefined, requestId(req));
    return ok(updated);
  } catch (e) {
    logServerError('PATCH /api/media/[id]', e, requestId(req));
    if (isUniqueViolation(e)) return fail('A media asset with that URL already exists', 409, undefined, requestId(req));
    return fail(errorMessage(e), 500, undefined, requestId(req));
  }
}

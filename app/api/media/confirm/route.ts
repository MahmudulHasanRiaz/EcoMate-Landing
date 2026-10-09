import { getDb } from '@/db/client';
import { mediaAssetsTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, isUniqueViolation, logServerError, ok } from '@/lib/json';
import { MAX_UPLOAD_BYTES, MEDIA_KEY_PATTERN, resolveBucket, resolvePublicOrigin, SNIFF_BYTES, sniffImageType } from '@/lib/media';
import { requestId } from '@/lib/request';
import { mediaConfirmRequest } from '@/lib/validation';

/**
 * POST /api/media/confirm — verify a direct-to-R2 upload and mint the library row
 * (Phase 3b Item 17, Decision 9).
 *
 * Trust model: the browser PUT bytes straight to R2, so NOTHING about the upload is
 * taken on faith here —
 * - `key` must match the backend-minted shape (a client-invented key can never confirm);
 * - the object must exist (`head`) and fit the size cap;
 * - the first 12 bytes are range-GET round-tripped and magic-sniffed (same table as
 *   the legacy upload path — SVG/GIF/HTML stay rejected).
 *
 * A sniff failure deletes the object (no orphaned attack bytes) and answers 415. A
 * verified object mints the `media_assets` row with server-observed mime + size, so
 * the library never renders a client claim. No confirm = no row = invisible object
 * (swept by the bucket lifecycle rule documented in RUNBOOK §7).
 */
export async function POST(req: Request) {
  const reqId = requestId(req);
  // Decision 1: editors manage the media library.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const parsed = mediaConfirmRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues }, reqId);
    }
    const { key } = parsed.data;
    if (!MEDIA_KEY_PATTERN.test(key)) return fail('Unknown upload key', 404, undefined, reqId);

    const bucket = resolveBucket();
    if (!bucket) return fail('R2_NOT_BOUND', 500, undefined, reqId);

    const head = await bucket.head(key);
    if (!head) return fail('Upload not found. The presigned URL may have expired — request a new one.', 404, undefined, reqId);
    if (head.size > MAX_UPLOAD_BYTES) {
      await bucket.delete(key).catch(() => undefined);
      return fail('File is larger than the 5 MB limit', 413, undefined, reqId);
    }

    // Server-side byte verification without proxying the file: a 12-byte range read.
    const ranged = await bucket.get(key, { range: { offset: 0, length: SNIFF_BYTES } });
    const headBytes = new Uint8Array(await (ranged?.arrayBuffer() ?? Promise.resolve(new ArrayBuffer(0))));
    const imageType = sniffImageType(headBytes);
    if (!imageType) {
      await bucket.delete(key).catch(() => undefined);
      return fail(
        'Uploaded bytes are not a JPEG, PNG or WebP image. The object was discarded — SVG, GIF and HTML are rejected.',
        415,
        undefined,
        reqId,
      );
    }

    const [created] = await getDb()
      .insert(mediaAssetsTable)
      .values({
        key,
        title: parsed.data.title.trim(),
        url: `${resolvePublicOrigin()}/${key}`,
        altText: parsed.data.altText.trim(),
        category: parsed.data.category ?? 'general',
        mimeType: imageType.mime,
        sizeBytes: head.size,
        uploadedBy: guard.actorId ?? null,
      })
      .returning();
    if (!created) return fail('Media asset could not be recorded', 500, undefined, reqId);
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/media/confirm', e, reqId);
    if (isUniqueViolation(e)) return fail('This upload was already confirmed', 409, undefined, reqId);
    return fail(errorMessage(e), 500, undefined, reqId);
  }
}

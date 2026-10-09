/**
 * Media upload: R2 object write with real (sniffed) MIME validation.
 *
 * ## Why the bytes decide, not `file.type`
 *
 * `File.type` is a string the client chooses. Accepting it would let an attacker store, say,
 * `text/html` or `image/svg+xml` in R2 and serve it from the media CDN domain — a stored
 * XSS on our own origin. The handler therefore reads the first bytes of the upload and only
 * accepts a signature it recognises:
 *
 *   JPEG  `FF D8 FF`
 *   PNG   `89 50 4E 47 0D 0A 1A 0A`
 *   WebP  `RIFF .... WEBP`
 *
 * SVG/GIF/HTML are rejected on purpose (SVG and HTML execute as documents; GIF is an
 * animation format this product does not use). The stored `Content-Type` is the sniffed
 * one, never the client's claim. Size is capped at 5 MB, and `Content-Length` is checked
 * before the multipart body is buffered so a huge upload cannot exhaust the isolate.
 */
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import {
  buildObjectKey,
  MAX_UPLOAD_BYTES,
  resolveBucket,
  resolvePublicOrigin,
  SNIFF_BYTES,
  sniffImageType,
} from '@/lib/media';
import { hitLimit } from '@/lib/rateLimit';
import { mediaUploadMeta } from '@/lib/validation';

/**
 * Legacy direct upload (kept): same sniffing/key rules as the presigned flow, minus the
 * presign handshake — bytes transit the Worker here. New clients should use
 * `POST /api/media/sign` → PUT → `POST /api/media/confirm` instead.
 *
 * All media facts (sniff table, key shape, size cap, bucket resolver) live in
 * `lib/media.ts` — this file owns only the multipart legacy path.
 */
/** Room for the multipart envelope (boundaries + the other form fields). */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
/** 30 uploads per operator per hour (Task 14 §1). */
const UPLOAD_LIMIT_MAX = 30;
const UPLOAD_LIMIT_WINDOW_SEC = 3600;

export async function POST(req: Request) {
  // Media writes are a content-authoring action (Decision 1 — editors manage the media
  // library). The proxy only proves a session exists — this is the authoritative role check.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const bucket = resolveBucket();
    if (!bucket) return fail('R2_NOT_BOUND', 500);

    if (await hitLimit(`upload:${guard.actorId ?? 'unknown'}`, UPLOAD_LIMIT_MAX, UPLOAD_LIMIT_WINDOW_SEC)) {
      return fail('Too many uploads. Please try again later.', 429);
    }

    // Reject on the declared length before the body is buffered into memory.
    const declaredLength = Number.parseInt(req.headers.get('content-length') ?? '', 10);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES) {
      return fail('File is larger than the 5 MB limit', 413);
    }

    const form = await req.formData();
    // Accompanying meta fields are optional, but when present they are validated rather
    // than trusted — the file sniffing below is unchanged.
    const metaCandidate: Record<string, unknown> = {};
    for (const field of ['title', 'altText', 'category'] as const) {
      const value = form.get(field);
      if (typeof value === 'string' && value !== '') metaCandidate[field] = value;
    }
    if (Object.keys(metaCandidate).length > 0) {
      const meta = mediaUploadMeta.safeParse(metaCandidate);
      if (!meta.success) {
        return fail('Validation failed', 400, { issues: meta.error.issues });
      }
    }
    const file = form.get('file');
    if (!(file instanceof File)) return fail('file is required', 400);
    if (file.size === 0) return fail('file is empty', 400);
    if (file.size > MAX_UPLOAD_BYTES) return fail('File is larger than the 5 MB limit', 413);

    const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
    const imageType = sniffImageType(head);
    if (!imageType) {
      return fail(
        'Unsupported image type. Upload a JPEG, PNG or WebP file — SVG, GIF and HTML are rejected.',
        415,
      );
    }

    const key = buildObjectKey(file.name, imageType.extension);
    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: imageType.mime,
        // Keys embed a timestamp and random suffix, so they are never reused: safe to cache
        // at the edge for a year.
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    return ok(
      // `key` already starts with `media/YYYY/MM/`, so the public path IS the key —
      // no prefix added. The same-origin proxy (`app/media/[...key]/route.ts`) serves it.
      { key, url: `${resolvePublicOrigin()}/${key}`, mimeType: imageType.mime, size: file.size },
      201,
    );
  } catch (e) {
    logServerError('POST /api/media/upload', e);
    return fail(errorMessage(e));
  }
}

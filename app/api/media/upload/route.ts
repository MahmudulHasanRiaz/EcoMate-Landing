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
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { requireAdminRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { hitLimit } from '@/lib/rateLimit';
import { mediaUploadMeta } from '@/lib/validation';

/**
 * Public origin for uploaded media. The R2 bucket is fronted by the custom domain
 * `media.ecomate.app` (`npx wrangler r2 bucket domain ecomate-media --custom-domain
 * media.ecomate.app`), which is also the hostname allowlisted in `next.config.ts`
 * `images.remotePatterns`. A `/assets/<key>` URL would only have worked on Pages static
 * hosting and 404s the moment this runs as a Worker.
 */
const MEDIA_CDN_ORIGIN = 'https://media.ecomate.app';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Room for the multipart envelope (boundaries + the other form fields). */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const MAX_FILENAME_LENGTH = 80;
/** 30 uploads per operator per hour (Task 14 §1). */
const UPLOAD_LIMIT_MAX = 30;
const UPLOAD_LIMIT_WINDOW_SEC = 3600;
const SNIFF_BYTES = 12;

interface ImageType {
  readonly mime: string;
  readonly extension: string;
  readonly matches: (head: Uint8Array) => boolean;
}

const IMAGE_TYPES: readonly ImageType[] = [
  {
    mime: 'image/jpeg',
    extension: 'jpg',
    matches: (head) => head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff,
  },
  {
    mime: 'image/png',
    extension: 'png',
    matches: (head) =>
      head.length >= 8 &&
      head[0] === 0x89 &&
      head[1] === 0x50 &&
      head[2] === 0x4e &&
      head[3] === 0x47 &&
      head[4] === 0x0d &&
      head[5] === 0x0a &&
      head[6] === 0x1a &&
      head[7] === 0x0a,
  },
  {
    mime: 'image/webp',
    extension: 'webp',
    matches: (head) =>
      head.length >= 12 &&
      head[0] === 0x52 && // R
      head[1] === 0x49 && // I
      head[2] === 0x46 && // F
      head[3] === 0x46 && // F
      head[8] === 0x57 && // W
      head[9] === 0x45 && // E
      head[10] === 0x42 && // B
      head[11] === 0x50, // P
  },
];

function sniffImageType(head: Uint8Array): ImageType | null {
  return IMAGE_TYPES.find((type) => type.matches(head)) ?? null;
}

/**
 * `media/YYYY/MM/<slug>-<time36>-<random>.<ext>`.
 *
 * The month prefix keeps the bucket browsable, the time+random suffix keeps keys unique —
 * and therefore immutable, which is what allows the one-year `immutable` cache header on the
 * CDN. The extension comes from the sniffed type, never from the uploaded filename, and the
 * slug is stripped to `[a-z0-9_-]` so traversal and query metacharacters cannot survive.
 */
function buildObjectKey(originalName: string, extension: string): string {
  const slug =
    originalName
      .replace(/\.[^.]*$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_FILENAME_LENGTH) || 'image';

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const suffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  return `media/${year}/${month}/${slug}-${now.getTime().toString(36)}-${suffix}.${extension}`;
}

/**
 * The R2 binding only exists inside a Worker request. `getCloudflareContext()` is
 * synchronous and throws outside one (build time, plain Node), so the absence is reported
 * as a binding miss rather than an exception.
 */
function resolveBucket(): R2Bucket | undefined {
  try {
    return getCloudflareContext().env.R2_BUCKET;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request) {
  // Media writes are a content-authoring action; editors are read-only (`lib/roles.ts`).
  // The proxy only proves a session exists — this is the authoritative role check.
  const guard = await requireAdminRole(['superadmin', 'admin']);
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
      { key, url: `${MEDIA_CDN_ORIGIN}/${key}`, mimeType: imageType.mime, size: file.size },
      201,
    );
  } catch (e) {
    logServerError('POST /api/media/upload', e);
    return fail(errorMessage(e));
  }
}

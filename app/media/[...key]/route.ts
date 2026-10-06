/**
 * Same-origin public media proxy: `GET /media/<key>` serves R2 bytes directly.
 *
 * Why this exists instead of a custom CDN domain: the R2 custom domain
 * (`media.ecomate.app`) does not resolve, so every absolute CDN media URL 404s.
 * This route needs no DNS — it works on dev, preview and production unchanged,
 * and edge-caches for a year (keys embed timestamp + random suffix, never reused).
 * A dedicated CDN later is config only: set `R2_PUBLIC_ORIGIN` and uploads point
 * there with zero code change (see the upload route).
 *
 * Public by design (site images, OG cards): no session required. The key allowlist
 * below is the entire attack surface — `..`, absolute paths and non-image
 * extensions cannot pass it, so directory traversal and content-type confusion
 * are rejected before R2 is touched. Upload still sniffs bytes + requires admin.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { fail } from '@/lib/json';

// Exactly what `buildObjectKey` in the upload route produces, nothing else:
// media/YYYY/MM/<slug>-<time36>-<rand36>.<jpg|png|webp>
const KEY_PATTERN = /^media\/\d{4}\/\d{2}\/[a-z0-9_-]+\.(jpg|png|webp)$/;

function resolveBucket(): R2Bucket | undefined {
  try {
    return (getCloudflareContext().env as { R2_BUCKET?: R2Bucket }).R2_BUCKET;
  } catch {
    return undefined;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const { key } = await params;
  // The route prefix `/media/` is consumed by routing; the object key itself starts
  // with `media/` (`media/YYYY/MM/...` from `buildObjectKey`), so re-attach it here.
  // `/media/media/...` therefore resolves to `media/media/...`, which the pattern
  // below rejects — no double-prefix escape.
  const objectKey = `media/${key.join('/')}`;

  if (!KEY_PATTERN.test(objectKey)) {
    return fail('Media not found', 404);
  }

  const bucket = resolveBucket();
  if (!bucket) {
    return fail('Media unavailable', 503);
  }

  const object = await bucket.get(objectKey);
  if (!object) {
    return fail('Media not found', 404);
  }

  const contentType = object.httpMetadata?.contentType ?? 'application/octet-stream';
  // Images only, enforced twice: the key pattern above already restricts extensions,
  // and the stored Content-Type was sniffed (not client-claimed) at upload.
  if (!contentType.startsWith('image/')) {
    return fail('Media not found', 404);
  }

  return new Response(object.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      // Immutable: keys are never reused, so a year at the edge is safe.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

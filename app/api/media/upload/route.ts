import { getCloudflareContext } from '@opennextjs/cloudflare';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';

/**
 * Public origin for uploaded media. The R2 bucket is fronted by the custom domain
 * `media.ecomate.app` (`npx wrangler r2 bucket domain ecomate-media --custom-domain
 * media.ecomate.app`), which is also the hostname allowlisted in `next.config.ts`
 * `images.remotePatterns`. A `/assets/<key>` URL would only have worked on Pages static
 * hosting and 404s the moment this runs as a Worker.
 */
const MEDIA_CDN_ORIGIN = 'https://media.ecomate.app';

export async function POST(req: Request) {
  try {
    const bucket = resolveBucket();
    if (!bucket) return fail('R2_NOT_BOUND', 500);

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return fail('file is required', 400);
    if (file.size === 0) return fail('file is empty', 400);

    // Keys are timestamp-prefixed and sanitized to a safe character set: no path
    // traversal, no query metacharacters, and a stable object name for the CDN.
    const key = `media/${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._/-]/g, '_');
    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
        // Timestamp-addressed keys are immutable: safe to cache at the edge for a year.
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
    return ok({ key, url: `${MEDIA_CDN_ORIGIN}/${key}` }, 201);
  } catch (e) {
    logServerError('POST /api/media/upload', e);
    return fail(errorMessage(e));
  }
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

/**
 * Shared media primitives (Phase 3b Item 17, Decision 9).
 *
 * One module owns the security-critical media facts so the three writers (legacy
 * `POST /api/media/upload`, presigned `POST /api/media/sign` + `POST
 * /api/media/confirm`) and the public proxy (`app/media/[...key]`) cannot drift:
 *
 * - accepted bytes (magic-byte sniff table — the client-claimed `Content-Type` is
 *   never trusted; SVG/GIF/HTML stay rejected),
 * - object-key shape (`media/YYYY/MM/<slug>-<time36>-<rand36>.<ext>`, immutable),
 * - size cap (5 MB),
 * - the R2 binding resolver.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_FILENAME_LENGTH = 80;
export const SNIFF_BYTES = 12;

/** Exactly what `buildObjectKey` produces, nothing else. */
export const MEDIA_KEY_PATTERN = /^media\/\d{4}\/\d{2}\/[a-z0-9_-]+\.(jpg|png|webp)$/;

export interface ImageType {
  readonly mime: 'image/jpeg' | 'image/png' | 'image/webp';
  readonly extension: 'jpg' | 'png' | 'webp';
  readonly matches: (head: Uint8Array) => boolean;
}

export const IMAGE_TYPES: readonly ImageType[] = [
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

export function sniffImageType(head: Uint8Array): ImageType | null {
  return IMAGE_TYPES.find((type) => type.matches(head)) ?? null;
}

/** MIME allowlist for presign requests (client claim — re-verified by sniff at confirm). */
export function imageTypeForMime(mime: string): ImageType | null {
  return IMAGE_TYPES.find((type) => type.mime === mime) ?? null;
}

/**
 * `media/YYYY/MM/<slug>-<time36>-<random>.<ext>`.
 *
 * The month prefix keeps the bucket browsable, the time+random suffix keeps keys unique —
 * and therefore immutable, which is what allows the one-year `immutable` cache header.
 * The extension comes from the sniffed/allowlisted type, never from the uploaded
 * filename, and the slug is stripped to `[a-z0-9_-]` so traversal and query
 * metacharacters cannot survive.
 */
export function buildObjectKey(originalName: string, extension: string): string {
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
 * synchronous and throws outside one (build time, plain Node), so the absence is
 * reported as a binding miss rather than an exception.
 */
export function resolveBucket(): R2Bucket | undefined {
  try {
    return (getCloudflareContext().env as { R2_BUCKET?: R2Bucket }).R2_BUCKET;
  } catch {
    return undefined;
  }
}

/**
 * Public origin for uploaded media, resolved per request (never a frozen constant, so a
 * domain move is config, not a code change):
 *
 * 1. `R2_PUBLIC_ORIGIN` Worker var when set — a dedicated CDN/custom domain in front of
 *    the bucket (e.g. `https://media.ecomate.bd` after `wrangler r2 bucket domain`
 *    + DNS). Zero code change to switch CDN on later.
 * 2. Same-origin `/media/<key>` proxy (this Worker serves R2 bytes itself, edge-cached
 *    for a year since keys are content-addressed). This is the default because it needs
 *    no DNS. `NEXT_PUBLIC_SITE_URL` is build-time public config, safe to embed.
 */
export function resolvePublicOrigin(): string {
  try {
    const origin = (getCloudflareContext().env as Record<string, string | undefined>)
      .R2_PUBLIC_ORIGIN;
    if (origin) return origin.replace(/\/+$/, '');
  } catch {
    // No request context (tests, build): fall through to public site URL.
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return site.replace(/\/+$/, '');
  return 'https://media.ecomate.bd';
}

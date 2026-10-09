import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { buildObjectKey, imageTypeForMime } from '@/lib/media';
import { hitLimit } from '@/lib/rateLimit';
import { missingPresignKeys, presignConfig, presignedPutUrl, PRESIGN_EXPIRES_SEC } from '@/lib/r2sign';
import { requestId } from '@/lib/request';
import { mediaSignRequest } from '@/lib/validation';

/** 30 presigns per operator per hour — same budget as the legacy upload path. */
const SIGN_LIMIT_MAX = 30;
const SIGN_LIMIT_WINDOW_SEC = 3600;

/**
 * POST /api/media/sign — mint a presigned direct-to-R2 PUT URL (Phase 3b Item 17).
 *
 * The browser uploads bytes STRAIGHT to R2; the Worker never buffers them. Flow:
 * `sign` → browser `PUT`s the file to `uploadUrl` with exactly `contentType` (signed
 * header — anything else 403s) → browser calls `POST /api/media/confirm`, which
 * verifies the object and mints the library row. No confirm = no row = invisible.
 *
 * Setup is automatic (DEPLOYMENT.md §4b–§4c): the deploy workflow mints the R2 API
 * token itself, stores the four `R2_*` values on the Worker, and ensures the bucket
 * CORS rule for browser PUTs. Without them this answers 503 — the legacy `upload`
 * route keeps working meanwhile.
 */
export async function POST(req: Request) {
  const reqId = requestId(req);
  // Decision 1: editors manage the media library.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    if (await hitLimit(`media-sign:${guard.actorId ?? 'unknown'}`, SIGN_LIMIT_MAX, SIGN_LIMIT_WINDOW_SEC)) {
      return fail('Too many uploads. Please try again later.', 429);
    }

    const parsed = mediaSignRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues }, reqId);
    }

    const imageType = imageTypeForMime(parsed.data.contentType);
    if (!imageType) return fail('Unsupported image type', 415, undefined, reqId);

    const config = presignConfig();
    const missing = missingPresignKeys(config);
    if (missing.length > 0) {
      return fail(
        `Direct upload is not configured (${missing.join(', ')} unset — the deploy auto-provisions them; grant 'API Tokens: Edit' to CLOUDFLARE_API_TOKEN and re-run deploy). The standard upload keeps working meanwhile.`,
        503,
        undefined,
        reqId,
      );
    }

    const key = buildObjectKey(parsed.data.filename, imageType.extension);
    const uploadUrl = await presignedPutUrl({
      accountId: config.accountId,
      bucket: config.bucket,
      key,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      contentType: imageType.mime,
    });

    return ok({ key, uploadUrl, contentType: imageType.mime, expiresIn: PRESIGN_EXPIRES_SEC }, 201);
  } catch (e) {
    logServerError('POST /api/media/sign', e, reqId);
    return fail(errorMessage(e), 500, undefined, reqId);
  }
}

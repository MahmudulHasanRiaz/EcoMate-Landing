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
 * Setup required (once per environment, see DEPLOYMENT.md): an R2 S3 API token
 * (`R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY`), the account id (`R2_ACCOUNT_ID`)
 * and the bucket name (`R2_BUCKET_NAME`), plus bucket CORS allowing PUT from the
 * site origin. Without them this answers 503 — the legacy `upload` route keeps
 * working meanwhile.
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
        `Direct upload is not configured (${missing.join(', ')} unset). Ask an operator to provision R2 presign credentials, or use the standard upload.`,
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

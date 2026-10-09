/**
 * Typed access to Worker bindings and secrets.
 *
 * Server code runs in two places:
 *  - inside a request on Cloudflare, where bindings/secrets live in
 *    `getCloudflareContext().env`;
 *  - at build time (prerendering a `'use cache'` function) or in plain Node, where there
 *    is no Cloudflare context at all and `getCloudflareContext()` throws.
 *
 * `getCloudflareContext()` is synchronous and throws when there is no request context —
 * which is exactly the signal we need to decide between the two.
 *
 * Reading is deliberately key-by-key through the union below instead of an index
 * signature: a typo in a secret name is a compile error, not a silent empty string.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';

/** Every binding/secret this module is allowed to read. Extend when adding a new one. */
export type CloudflareEnvKey =
  | 'AUTH_SECRET'
  | 'AUTH_TRUST_HOST'
  | 'SETUP_TOKEN'
  | 'LICENSE_PORTAL_API_BASE_URL'
  | 'LICENSE_PORTAL_API_KEY'
  | 'NEXT_PUBLIC_SITE_URL'
  | 'NEXT_PUBLIC_META_PIXEL_ID'
  | 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'
  | 'META_CAPI_TOKEN'
  | 'META_TEST_EVENT_CODE'
  | 'TURNSTILE_SECRET_KEY'
  | 'TOTP_ENCRYPTION_KEY'
  | 'RESEND_API_KEY'
  | 'NOTIFY_FROM_EMAIL'
  | 'NOTIFY_TO_EMAIL'
  | 'CRON_SECRET'
  | 'RETENTION_DAYS'
  // Phase 3b Item 17: presigned direct-to-R2 uploads (account id + S3 API keys).
  // Secrets or vars — `envString` reads both; documented in DEPLOYMENT.md.
  | 'R2_ACCOUNT_ID'
  | 'R2_BUCKET_NAME'
  | 'R2_ACCESS_KEY_ID'
  | 'R2_SECRET_ACCESS_KEY';

/**
 * Resolve a string binding/secret or return `''`.
 *
 * The binding wins when both sources are present: in production the Worker secret is the
 * configured value, while `process.env` only carries `[vars]` and whatever a local `.env`
 * file provided.
 */
export function envString(key: CloudflareEnvKey): string {
  try {
    const bound = getCloudflareContext().env[key];
    if (typeof bound === 'string' && bound !== '') return bound;
  } catch {
    // No request context (build time / plain Node): fall back to process.env.
  }
  const fromProcess = process.env[key];
  return typeof fromProcess === 'string' ? fromProcess : '';
}

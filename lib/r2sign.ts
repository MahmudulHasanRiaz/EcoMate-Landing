/**
 * R2 presigned PUT URLs, hand-rolled SigV4 (Phase 3b Item 17, Decision 9).
 *
 * Why hand-rolled: `@aws-sdk/client-s3` was removed by owner decision (Decision 5 —
 * dead dependency), and no new Cloudflare services may be added (Decision 2). SigV4
 * query-auth is ~60 lines over WebCrypto (`crypto.subtle`, available on Workers and
 * Node 19+), with no dependency to audit.
 *
 * Security properties:
 * - The browser PUTs bytes STRAIGHT to R2 (`<account>.r2.cloudflarestorage.com`) —
 *   file bytes never transit the Worker (backend stays light, no 5 MB buffering).
 * - `Content-Type` is a SIGNED header: the browser must send exactly the allowlisted
 *   type the sign endpoint approved, or R2 rejects the PUT with 403. The stored type
 *   is therefore allowlisted by construction.
 * - Bytes are still verified server-side at confirm time (`POST /api/media/confirm`
 *   range-GETs the first 12 bytes and magic-sniffs them): a client that sends HTML
 *   bytes with an `image/png` type gets its object deleted + 415.
 * - URLs expire in 15 minutes; keys embed timestamp + randomness (immutable).
 */
import { envString } from '@/lib/env';

export const PRESIGN_EXPIRES_SEC = 900;

export interface PresignInput {
  accountId: string;
  bucket: string;
  key: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Allowlisted at the sign endpoint (`image/jpeg`/`image/png`/`image/webp`). */
  contentType: string;
  expiresSec?: number;
  /** Overridable for tests; defaults to the current time. */
  nowMs?: number;
}

/** RFC 3986 encoding (`encodeURIComponent` leaves `!'()*` unescaped; SigV4 forbids that). */
function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function hmacSha256(key: Uint8Array | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  // `TextEncoder().encode()` types as `Uint8Array<ArrayBufferLike>` on recent TS DOM
  // libs; `subtle.importKey` wants a plain `BufferSource`. Normalise once here so no
  // call site trips over the `SharedArrayBuffer` assignability error.
  const raw: Uint8Array = key instanceof Uint8Array ? key : new Uint8Array(key);
  const bytes = new Uint8Array(raw.byteLength);
  bytes.set(raw);
  const cryptoKey = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

function amzDates(nowMs: number): { amzDate: string; dateStamp: string } {
  const d = new Date(nowMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  const amzDate = `${dateStamp}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  return { amzDate, dateStamp };
}

/** R2 uses SigV4 with region `auto` and service `s3`. */
export function r2CredentialScope(dateStamp: string): string {
  return `${dateStamp}/auto/s3/aws4_request`;
}

export async function presignedPutUrl(input: PresignInput): Promise<string> {
  const { accountId, bucket, key, accessKeyId, secretAccessKey, contentType } = input;
  if (!accountId || !bucket || !key || !accessKeyId || !secretAccessKey || !contentType) {
    throw new Error('presignedPutUrl: missing required input');
  }
  const expiresSec = input.expiresSec ?? PRESIGN_EXPIRES_SEC;
  const { amzDate, dateStamp } = amzDates(input.nowMs ?? Date.now());
  const host = `${accountId}.r2.cloudflarestorage.com`;
  // Path-style: `/<bucket>/<key>`, each segment encoded (keys never contain reservable
  // characters by construction, but encode anyway — a mismatch here 403s the PUT).
  const encodedPath = `/${encodeRfc3986(bucket)}/${key.split('/').map(encodeRfc3986).join('/')}`;
  const credential = `${accessKeyId}/${r2CredentialScope(dateStamp)}`;
  const params: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresSec)],
    ['X-Amz-SignedHeaders', 'content-type;host'],
  ];
  params.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const canonicalQuery = params.map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`).join('&');

  const canonicalHeaders = `content-type:${contentType.trim()}\nhost:${host}\n`;
  const canonicalRequest = [
    'PUT',
    encodedPath,
    canonicalQuery,
    canonicalHeaders,
    'content-type;host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, r2CredentialScope(dateStamp), await sha256Hex(canonicalRequest)].join('\n');

  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, 'auto');
  const kService = await hmacSha256(kRegion, 's3');
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  return `https://${host}${encodedPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** Presign credentials + bucket name, from env (secrets or vars — `envString` covers both). */
export function presignConfig(): { accountId: string; bucket: string; accessKeyId: string; secretAccessKey: string } {
  return {
    accountId: envString('R2_ACCOUNT_ID'),
    bucket: envString('R2_BUCKET_NAME'),
    accessKeyId: envString('R2_ACCESS_KEY_ID'),
    secretAccessKey: envString('R2_SECRET_ACCESS_KEY'),
  };
}

/** Which presign env names are unset (for the 503 message — names only, never values). */
export function missingPresignKeys(config: {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}): string[] {
  const names = [
    ['accountId', 'R2_ACCOUNT_ID'],
    ['bucket', 'R2_BUCKET_NAME'],
    ['accessKeyId', 'R2_ACCESS_KEY_ID'],
    ['secretAccessKey', 'R2_SECRET_ACCESS_KEY'],
  ] as const;
  return names.filter(([key]) => !config[key]).map(([, envName]) => envName);
}

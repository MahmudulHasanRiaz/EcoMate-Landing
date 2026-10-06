/**
 * RFC 6238 TOTP (SHA-1, 6 digits, 30-second period) for admin 2FA — WebCrypto only.
 *
 * `node:crypto` is not available on Workers, so every primitive here is WebCrypto:
 * HMAC-SHA1 for the code, AES-256-GCM for the secret at rest.
 *
 * ## Secret storage
 *
 * `admin_users.totp_secret` never contains the base32 secret. It stores
 * `v1:<iv-b64>:<ciphertext-b64>` — AES-256-GCM under a key derived from the
 * `TOTP_ENCRYPTION_KEY` Worker secret (falling back to a *domain-separated* derivation of
 * `AUTH_SECRET` on deployments that have not provisioned a separate key yet). A plaintext
 * `totp_secret` column would hand the second factor to anyone who reads a leaked dump, and
 * the whole point of the column is to be useless without the runtime secret.
 *
 * `verifyTotp` accepts a ±1 step window to absorb phone/server clock skew. A corrupt or
 * undecryptable stored secret is a verification failure, never a 500 — the login path must
 * not reveal the difference (and `auth.ts` audits it).
 */
import { envString } from '@/lib/env';
import { encodeQrMatrix, qrMatrixToSvg } from '@/lib/qr';

/** RFC 4226 recommendation: 160-bit shared secret. */
const SECRET_BYTES = 20;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const TOTP_DIGITS = 6;
const PERIOD_SECONDS = 30;
/** ±1 step = ±30 s of clock tolerance. */
const WINDOW_STEPS = 1;

const ENCRYPTION_VERSION = 'v1';
/** Domain separation so the derived key can never collide with another AUTH_SECRET use. */
const ENCRYPTION_CONTEXT = 'ecomate:totp:v1';
const ADDITIONAL_DATA = new TextEncoder().encode(ENCRYPTION_CONTEXT);

// --- Base32 -------------------------------------------------------------------

export function base32Encode(bytes: Uint8Array): string {
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');

  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    out += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }
  return out;
}

/**
 * Decode an unpadded base32 secret (spaces and hyphens tolerated, the way authenticator
 * apps display secrets). Throws on a non-base32 character — callers that must not throw
 * (`verifyTotp`) catch it and treat the secret as unusable.
 */
export function base32Decode(secret: string): Uint8Array<ArrayBuffer> {
  const cleaned = secret.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase();
  if (cleaned === '') throw new Error('TOTP secret is empty');

  let buffer = 0;
  let bits = 0;
  const out: number[] = [];
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error('TOTP secret is not valid base32');
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >>> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

// --- HOTP / TOTP --------------------------------------------------------------

/**
 * RFC 4226 HOTP value. Exported (not only used internally) because it is the function the
 * RFC 6238 test vectors exercise: `hotpCode(base32(seed), Math.floor(t / 30), 8)` must
 * reproduce the published codes exactly.
 */
export async function hotpCode(secret: string, counter: number, digits: number = TOTP_DIGITS): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base32Decode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );

  const message = new ArrayBuffer(8);
  new DataView(message).setBigUint64(0, BigInt(Math.floor(counter)));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, message));

  // Dynamic truncation (RFC 4226 §5.3).
  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    (signature[offset + 1] << 16) |
    (signature[offset + 2] << 8) |
    signature[offset + 3];

  return String(binary % 10 ** digits).padStart(digits, '0');
}

/** Length-independent comparison for the short user-supplied code. */
function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a 6-digit code against the stored base32 secret, accepting the previous and the
 * next step. Returns `false` for a malformed token or an undecodable secret.
 */
export async function verifyTotp(secret: string, token: string): Promise<boolean> {
  const normalized = token.replace(/\s/g, '');
  if (!new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(normalized)) return false;
  try {
    base32Decode(secret);
  } catch {
    return false;
  }

  const counter = Math.floor(Date.now() / 1000 / PERIOD_SECONDS);
  for (let offset = -WINDOW_STEPS; offset <= WINDOW_STEPS; offset += 1) {
    const candidate = await hotpCode(secret, counter + offset);
    if (timingSafeEqualStrings(candidate, normalized)) return true;
  }
  return false;
}

// --- Enrollment material ------------------------------------------------------

export function generateTotpSecret(): string {
  return base32Encode(crypto.getRandomValues(new Uint8Array(SECRET_BYTES)));
}

export function totpUri(email: string, secret: string): string {
  const label = encodeURIComponent(`EcoMate Admin:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=EcoMate&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${PERIOD_SECONDS}`;
}

/**
 * Render the `otpauth://` URI as an inline SVG data URL — no external QR service, which
 * would leak the shared secret to a third party. Returns `null` for a payload that does not
 * fit the encoder (>~213 bytes, i.e. an unusually long email): the caller then shows the
 * secret for manual entry instead of failing enrolment.
 */
export function generateTotpQrDataUrl(uri: string): string | null {
  try {
    const svg = qrMatrixToSvg(encodeQrMatrix(uri));
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  } catch (error) {
    console.warn('[totp] QR rendering skipped:', error);
    return null;
  }
}

// --- Encryption at rest -------------------------------------------------------

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.trim());
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Resolve the key material, preferring the dedicated `TOTP_ENCRYPTION_KEY` secret.
 * `AUTH_SECRET` is a fallback, not an equal: it is domain-separated above and documented as
 * a fallback so an existing deployment does not lose the ability to enrol before a new
 * secret is provisioned. Throws when neither exists (local misconfiguration).
 */
function encryptionKeyMaterial(): string {
  const dedicated = envString('TOTP_ENCRYPTION_KEY');
  if (dedicated !== '') return dedicated;
  const fallback = envString('AUTH_SECRET');
  if (fallback !== '') return fallback;
  throw new Error('TOTP_ENCRYPTION_KEY (or AUTH_SECRET) must be configured to store TOTP secrets');
}

async function encryptionKey(): Promise<CryptoKey> {
  const material = encryptionKeyMaterial();
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${ENCRYPTION_CONTEXT}:${material}`),
  );
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptTotpSecret(secret: string): Promise<string> {
  const key = await encryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: ADDITIONAL_DATA },
    key,
    new TextEncoder().encode(secret),
  );
  return `${ENCRYPTION_VERSION}:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptTotpSecret(stored: string): Promise<string> {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== ENCRYPTION_VERSION) {
    throw new Error('Unsupported TOTP secret format');
  }
  const iv = base64ToBytes(parts[1]);
  const ciphertext = base64ToBytes(parts[2]);
  if (iv.length !== 12 || ciphertext.length < 16) {
    throw new Error('TOTP secret is malformed');
  }
  const key = await encryptionKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: ADDITIONAL_DATA },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

// --- Enrollment helpers shared by the setup and admin routes -------------------

export interface TotpEnrollment {
  /** Base32 secret, shown once for manual entry into the authenticator app. */
  readonly secret: string;
  /** Ciphertext for `admin_users.totp_secret`. */
  readonly encrypted: string;
  readonly uri: string;
  readonly qrDataUrl: string | null;
}

/** Generate a fresh secret, its `otpauth://` URI and the QR data URL. */
export async function createTotpEnrollment(email: string): Promise<TotpEnrollment> {
  const secret = generateTotpSecret();
  const uri = totpUri(email, secret);
  return {
    secret,
    encrypted: await encryptTotpSecret(secret),
    uri,
    qrDataUrl: generateTotpQrDataUrl(uri),
  };
}

/**
 * Verify a code against a *stored* secret (pending or enabled), decrypting first.
 *
 * A missing, malformed or undecryptable stored value is a failed verification, never an
 * exception: callers are auth paths that must answer 400/`null`, not 500.
 */
export async function storedTotpMatches(stored: string | null, code: string): Promise<boolean> {
  if (!stored) return false;
  try {
    return await verifyTotp(await decryptTotpSecret(stored), code);
  } catch (error) {
    console.error('[totp] stored secret could not be used:', error);
    return false;
  }
}

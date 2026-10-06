/**
 * Password hashing for admin accounts.
 *
 * PBKDF2-SHA256 via WebCrypto, not `node:crypto`: this code runs inside a Cloudflare
 * Worker where the WebCrypto API is native and the Node crypto module is only partially
 * emulated by `nodejs_compat`. WebCrypto is available identically in `next dev`, in
 * `@auth/core`, and on Workers, so there is exactly one code path.
 *
 * Stored format: `pbkdf2$<iterations>$<saltHex>$<hashHex>` — self-describing, so the
 * iteration count can be raised later without invalidating existing hashes.
 */

const SCHEME = 'pbkdf2';
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

/**
 * Guards against a hostile/corrupted stored hash driving an unbounded KDF on the server
 * (a 1,000,000,000-iteration row would be a trivial CPU-exhaustion primitive).
 */
const MIN_ITERATIONS = 1_000;
const MAX_ITERATIONS = 5_000_000;

export const MIN_PASSWORD_LENGTH = 12;

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

/** Returns `null` for anything that is not an even-length hex string. */
function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function deriveBits(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  bits: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    bits,
  );
  return new Uint8Array(derived);
}

/** Length-independent comparison: never short-circuits on the first differing byte. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Constant-time comparison for shared secrets (`SETUP_TOKEN`, `CRON_SECRET`). Length is
 * not hidden — an attacker who can measure it already knows their own length — but the
 * byte-by-byte comparison never short-circuits.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  return timingSafeEqual(encoder.encode(a), encoder.encode(b));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, ITERATIONS, KEY_BITS);
  return `${SCHEME}$${ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

/**
 * Verify a plaintext password against a stored hash.
 *
 * Returns `false` — never throws — for malformed or out-of-range records so a corrupted
 * row cannot turn a failed login into a 500 that leaks the difference between "no such
 * user" and "bad hash".
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4) return false;

  const [scheme, iterationsRaw, saltHex, hashHex] = parts;
  if (scheme !== SCHEME) return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    return false;
  }

  const salt = hexToBytes(saltHex);
  const expected = hexToBytes(hashHex);
  if (!salt || !expected || expected.length === 0) return false;

  const actual = await deriveBits(password, salt, iterations, expected.length * 8);
  return timingSafeEqual(actual, expected);
}

/**
 * Minimum viable policy for a security-critical admin password. Length beats forced
 * character-class rules (NIST SP 800-63B): a passphrase is both stronger and more
 * memorable than `Passw0rd!`.
 */
export function passwordPolicyOk(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

/** Human-readable policy failure for API responses, or `null` when the password is fine. */
export function passwordPolicyError(password: string): string | null {
  if (typeof password !== 'string' || password.length === 0) return 'Password is required';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import { base32Decode, base32Encode, hotpCode, verifyTotp } from '@/lib/totp';

// RFC 6238 Appendix B, SHA-1. The standard's seed is the ASCII string
// "12345678901234567890"; its base32 form (verified independently with
// `python3 -c "import base64; ..."`) is hardcoded below so the test does not
// depend on the implementation it is checking.
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

// (unix time, T = floor(time / 30), expected 8-digit code) from the RFC table.
const VECTORS: Array<[number, number, string]> = [
  [59, 1, '94287082'],
  [1111111109, 37037036, '07081804'],
  [1111111111, 37037037, '14050471'],
  [1234567890, 41152263, '89005924'],
  [2000000000, 66666666, '69279037'],
  [20000000000, 666666666, '65353130'],
];

describe('TOTP (lib/totp.ts)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('decodes the RFC seed to the exact ASCII bytes', () => {
    const bytes = base32Decode(RFC_SECRET);
    expect(new TextDecoder().decode(bytes)).toBe('12345678901234567890');
    expect(base32Encode(bytes)).toBe(RFC_SECRET);
  });

  it('reproduces the RFC 6238 Appendix B vectors (SHA-1, 8 digits)', async () => {
    for (const [, counter, expected] of VECTORS) {
      expect(await hotpCode(RFC_SECRET, counter, 8)).toBe(expected);
    }
  });

  it('accepts the current step and ±1 step (clock-skew window)', async () => {
    // Pin "now" to the middle of counter 41152263 (t = 1234567890 + 15s).
    const centerSeconds = 41152263 * 30 + 15;
    vi.spyOn(Date, 'now').mockReturnValue(centerSeconds * 1000);
    for (const offset of [-1, 0, 1]) {
      const token = await hotpCode(RFC_SECRET, 41152263 + offset);
      expect(await verifyTotp(RFC_SECRET, token)).toBe(true);
    }
  });

  it('rejects ±2 steps outside the window', async () => {
    const centerSeconds = 41152263 * 30 + 15;
    vi.spyOn(Date, 'now').mockReturnValue(centerSeconds * 1000);
    for (const offset of [-2, 2]) {
      const token = await hotpCode(RFC_SECRET, 41152263 + offset);
      expect(await verifyTotp(RFC_SECRET, token)).toBe(false);
    }
  });

  it('rejects malformed tokens and undecodable secrets without throwing', async () => {
    const centerSeconds = 41152263 * 30 + 15;
    vi.spyOn(Date, 'now').mockReturnValue(centerSeconds * 1000);
    const valid = await hotpCode(RFC_SECRET, 41152263);
    expect(await verifyTotp(RFC_SECRET, '12345')).toBe(false);
    expect(await verifyTotp(RFC_SECRET, 'abcdef')).toBe(false);
    expect(await verifyTotp(RFC_SECRET, '')).toBe(false);
    expect(await verifyTotp('not!!valid!!base32', valid)).toBe(false);
    expect(await verifyTotp('', valid)).toBe(false);
  });
});

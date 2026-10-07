import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';

// PBKDF2 at the Workers-maximum 100k iterations costs ~0.1-0.3s per derive; each `it`
// below performs at most two derives so the default 5s timeout is never close.
describe('password hashing (lib/password.ts)', () => {
  it('hash-then-verify roundtrip accepts the correct password', async () => {
    const stored = await hashPassword('correct-horse-battery-staple-99');
    expect(stored.startsWith('pbkdf2$100000$')).toBe(true);
    expect(await verifyPassword('correct-horse-battery-staple-99', stored)).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const stored = await hashPassword('correct-horse-battery-staple-99');
    expect(await verifyPassword('correct-horse-battery-staple-98', stored)).toBe(false);
  });

  it('rejects tampered iterations without hashing (out-of-range guard)', async () => {
    const stored = await hashPassword('correct-horse-battery-staple-99');
    const tampered = stored.replace('$100000$', '$10$');
    expect(tampered).not.toBe(stored);
    expect(await verifyPassword('correct-horse-battery-staple-99', tampered)).toBe(false);
  });

  it('rejects a tampered salt (valid hex, so the KDF runs and still disagrees)', async () => {
    const stored = await hashPassword('correct-horse-battery-staple-99');
    const parts = stored.split('$');
    const saltHex = parts[2];
    const flipped = saltHex.slice(0, -1) + (saltHex.endsWith('0') ? '1' : '0');
    expect(await verifyPassword('correct-horse-battery-staple-99', [parts[0], parts[1], flipped, parts[3]].join('$'))).toBe(false);
  });

  it('rejects a tampered hash (valid hex, so the KDF runs and still disagrees)', async () => {
    const stored = await hashPassword('correct-horse-battery-staple-99');
    const parts = stored.split('$');
    const hashHex = parts[3];
    const flipped = hashHex.slice(0, -1) + (hashHex.endsWith('0') ? '1' : '0');
    expect(await verifyPassword('correct-horse-battery-staple-99', [parts[0], parts[1], parts[2], flipped].join('$'))).toBe(false);
  });

  it('returns false — never throws — for malformed records', async () => {
    const cases = [
      '',
      'not-a-hash',
      'pbkdf2$600000$only-three',
      'argon2$600000$abcd$ef01',
      'pbkdf2$not-a-number$abcd$ef01',
      'pbkdf2$600000$zzzz-not-hex$ef01',
      'pbkdf2$600000$abcd$',
    ];
    for (const stored of cases) {
      expect(await verifyPassword('anything-at-all-12', stored)).toBe(false);
    }
  });
});

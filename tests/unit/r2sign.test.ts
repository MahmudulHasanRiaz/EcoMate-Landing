import { createHmac, createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { missingPresignKeys, presignedPutUrl, PRESIGN_EXPIRES_SEC, r2CredentialScope } from '@/lib/r2sign';

const INPUT = {
  accountId: 'testaccount123',
  bucket: 'ecomate-media',
  key: 'media/2026/10/hero-abc123.jpg',
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
  contentType: 'image/jpeg',
  nowMs: Date.UTC(2026, 9, 8, 12, 0, 0),
};

/** Independent SigV4 recomputation via Node's crypto (separate code path, same spec). */
function referenceSignature(url: string, secret: string): { signature: string; recomputed: string } {
  const parsed = new URL(url);
  // Raw pairs (NOT URLSearchParams-decoded): SigV4 mandates RFC3986 encoding (`/` →
  // `%2F`), which a decode/re-encode round-trip would mangle back to literals.
  const pairs = parsed.search
    .slice(1)
    .split('&')
    .map((pair) => pair.split('=') as [string, string])
    .filter(([name]) => name !== 'X-Amz-Signature')
    .sort(([a], [b]) => (a < b ? -1 : 1));
  const byName = Object.fromEntries(pairs);
  const signature = new URL(url).searchParams.get('X-Amz-Signature') ?? '';
  const canonicalQuery = pairs.map(([k, v]) => `${k}=${v}`).join('&');
  const canonicalRequest = [
    'PUT',
    parsed.pathname,
    canonicalQuery,
    `content-type:${INPUT.contentType}\nhost:${parsed.host}\n`,
    'content-type;host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const scope = decodeURIComponent(byName['X-Amz-Credential']).split('/').slice(1).join('/');
  const dateStamp = byName['X-Amz-Date'].slice(0, 8);
  const stringToSign = ['AWS4-HMAC-SHA256', byName['X-Amz-Date'], scope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  void dateStamp;
  const h = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest();
  const kDate = h(`AWS4${secret}`, scope.split('/')[0]);
  const kRegion = h(kDate, 'auto');
  const kService = h(kRegion, 's3');
  const kSigning = h(kService, 'aws4_request');
  return { signature, recomputed: h(kSigning, stringToSign).toString('hex') };
}

describe('R2 SigV4 presigner (lib/r2sign.ts)', () => {
  it('builds a well-formed presigned PUT URL', async () => {
    const url = await presignedPutUrl(INPUT);
    expect(url.startsWith('https://testaccount123.r2.cloudflarestorage.com/ecomate-media/media/2026/10/hero-abc123.jpg?')).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(params.get('X-Amz-Expires')).toBe(String(PRESIGN_EXPIRES_SEC));
    expect(params.get('X-Amz-SignedHeaders')).toBe('content-type;host');
    expect(params.get('X-Amz-Credential')).toBe(`AKIDEXAMPLE/${r2CredentialScope('20261008')}`);
    expect(params.get('X-Amz-Date')).toBe('20261008T120000Z');
    expect(params.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches an independent Node-crypto recomputation', async () => {
    const url = await presignedPutUrl(INPUT);
    const { signature, recomputed } = referenceSignature(url, INPUT.secretAccessKey);
    expect(recomputed).toBe(signature);
  });

  it('is deterministic for a fixed clock and varies with inputs', async () => {
    const a = await presignedPutUrl(INPUT);
    const b = await presignedPutUrl(INPUT);
    expect(a).toBe(b);
    const c = await presignedPutUrl({ ...INPUT, key: 'media/2026/10/other-def456.png', contentType: 'image/png' });
    expect(c).not.toBe(a);
  });

  it('throws on missing inputs (fail-closed at sign time)', async () => {
    await expect(presignedPutUrl({ ...INPUT, secretAccessKey: '' })).rejects.toThrow();
    await expect(presignedPutUrl({ ...INPUT, key: '' })).rejects.toThrow();
  });

  it('reports exactly which presign env names are unset', () => {
    expect(
      missingPresignKeys({ accountId: 'a', bucket: '', accessKeyId: '', secretAccessKey: '' }),
    ).toEqual(['R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']);
    expect(
      missingPresignKeys({ accountId: 'a', bucket: 'b', accessKeyId: 'c', secretAccessKey: 'd' }),
    ).toEqual([]);
  });
});

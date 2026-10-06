import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchLeadTracked, type TrackLeadInput } from '@/lib/events';
import { hashForMeta, hashPhoneForMeta } from '@/lib/metaCapi';

// Import for the side effect: the module registers the MetaCAPI provider on load.
import '@/lib/metaCapi';

const PIXEL_ID = 'test-pixel-id';
const TOKEN = 'test-capi-token';
const EMAIL = 'Test.User@Example.COM';
const PHONE = '+880 1712-345678';
const EVENT_ID = 'evt-test-12345678';

function trackInput(): TrackLeadInput {
  return {
    leadId: 1,
    name: 'Test User',
    phone: PHONE,
    email: EMAIL,
    fbp: 'fb.1.123.1',
    fbc: 'fb.1.123.abc',
    eventId: EVENT_ID,
    clientIp: '203.0.113.7',
    userAgent: 'vitest',
    eventSourceUrl: 'https://ecomate.app/#lead-form',
  };
}

describe('Meta CAPI hashing (lib/metaCapi.ts)', () => {
  const savedEnv = { ...process.env };
  let fetchMock: ReturnType<typeof vi.fn>;
  let capturedUrl = '';
  let capturedBody = '';

  function installFetch() {
    capturedUrl = '';
    capturedBody = '';
    fetchMock = vi.fn(async (url: string, init: { body: unknown }) => {
      capturedUrl = String(url);
      capturedBody = String(init.body);
      return {
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({ events_received: 1 }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    process.env.NEXT_PUBLIC_META_PIXEL_ID = PIXEL_ID;
    process.env.META_CAPI_TOKEN = TOKEN;
  }

  afterEach(() => {
    process.env = { ...savedEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('hashes PII lowercase and trimmed (email)', async () => {
    expect(await hashForMeta('  Test.User@Example.COM ')).toBe(await hashForMeta('test.user@example.com'));
    const hashed = await hashForMeta(EMAIL);
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes phones digits-only (formatting variants collide)', async () => {
    expect(await hashPhoneForMeta('+880 1712-345678')).toBe(
      await hashPhoneForMeta('8801712345678'),
    );
    expect(await hashPhoneForMeta('not a phone')).toBeUndefined();
    expect(await hashForMeta('   ')).toBeUndefined();
  });

  it('passes event_id through verbatim and ships NO raw email/phone', async () => {
    installFetch();
    const results = await dispatchLeadTracked(trackInput());
    const meta = results.find((result) => result.provider === 'MetaCAPI');
    expect(meta?.ok).toBe(true);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(capturedUrl).toContain(PIXEL_ID);

    // event_id deduplication key shared with the browser pixel: verbatim.
    expect(capturedBody).toContain(EVENT_ID);

    // The serialised payload must not contain the raw PII in any spelling the
    // test fed in: full email, upper/lower variants, full phone, digit runs.
    const serialised = capturedBody;
    for (const raw of [EMAIL, EMAIL.toLowerCase(), PHONE, '8801712345678', '01712345678']) {
      expect(serialised).not.toContain(raw);
    }
    // ...but it must contain the hashes' schema slots.
    expect(serialised).toContain('"em"');
    expect(serialised).toContain('"ph"');
  });

  it('reports skipped (never failed) when unconfigured', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('fetch must not be called when unconfigured');
      }),
    );
    process.env.NEXT_PUBLIC_META_PIXEL_ID = '';
    process.env.META_CAPI_TOKEN = '';
    const results = await dispatchLeadTracked(trackInput());
    const meta = results.find((result) => result.provider === 'MetaCAPI');
    expect(meta?.ok).toBe(true);
    expect(meta?.skipped).toBe(true);
  });
});

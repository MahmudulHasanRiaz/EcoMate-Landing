import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchLeadTracked, type TrackLeadInput } from '@/lib/events';
import { defaultMetaCapiSettings, getMetaCapiSettings } from '@/lib/metaCapiSettings';
import { settingsPatch } from '@/lib/validation';

// Import for the side effect: the module registers the MetaCAPI provider on load.
import '@/lib/metaCapi';

const PIXEL_ID = 'test-pixel-id';
const TOKEN = 'test-capi-token';

function baseInput(): TrackLeadInput {
  return {
    leadId: 7,
    name: 'Test User',
    phone: '+880 1712-345678',
    email: 'test.user@example.com',
    fbp: 'fb.1.123.1',
    fbc: 'fb.1.123.abc',
    eventId: 'evt-mode-12345678',
    clientIp: '203.0.113.7',
    userAgent: 'vitest',
    eventSourceUrl: 'https://ecomate.bd/#lead-form',
  };
}

describe('Meta CAPI two-mode payloads (H-1)', () => {
  const savedEnv = { ...process.env };
  let capturedBody = '';

  function installFetch() {
    capturedBody = '';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: { body: unknown }) => {
        capturedBody = String(init.body);
        return {
          ok: true,
          status: 200,
          text: async () => '',
          json: async () => ({ events_received: 1 }),
        };
      }),
    );
    process.env.NEXT_PUBLIC_META_PIXEL_ID = PIXEL_ID;
    process.env.META_CAPI_TOKEN = TOKEN;
  }

  afterEach(() => {
    process.env = { ...savedEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('light instant event carries no hashed identifiers, IP/UA or custom data', async () => {
    installFetch();
    const results = await dispatchLeadTracked({
      ...baseInput(),
      eventName: 'LeadInitiated',
      light: true,
    });
    expect(results.find((r) => r.provider === 'MetaCAPI')?.ok).toBe(true);
    expect(capturedBody).toContain('"event_name":"LeadInitiated"');
    expect(capturedBody).toContain('"fbp"');
    for (const forbidden of ['"em"', '"ph"', 'client_ip_address', 'client_user_agent', 'custom_data']) {
      expect(capturedBody).not.toContain(forbidden);
    }
  });

  it('minimal full Lead carries hashed identifiers but no click IDs, IP/UA or custom data', async () => {
    installFetch();
    const results = await dispatchLeadTracked({ ...baseInput(), minimal: true });
    expect(results.find((r) => r.provider === 'MetaCAPI')?.ok).toBe(true);
    expect(capturedBody).toContain('"event_name":"Lead"');
    expect(capturedBody).toContain('"em"');
    expect(capturedBody).toContain('"ph"');
    for (const forbidden of ['"fbp"', '"fbc"', 'client_ip_address', 'client_user_agent', 'custom_data']) {
      expect(capturedBody).not.toContain(forbidden);
    }
  });

  it('default (full) event is unchanged: identifiers + matching data + custom_data', async () => {
    installFetch();
    const results = await dispatchLeadTracked(baseInput());
    expect(results.find((r) => r.provider === 'MetaCAPI')?.ok).toBe(true);
    expect(capturedBody).toContain('"event_name":"Lead"');
    for (const required of ['"em"', '"ph"', '"fbp"', 'custom_data']) {
      expect(capturedBody).toContain(required);
    }
  });
});

describe('Meta CAPI settings reader (H-1)', () => {
  it('defaults to instant mode with safe values', () => {
    expect(defaultMetaCapiSettings()).toEqual({
      mode: 'instant',
      trigger: '',
      instantEventName: 'LeadInitiated',
    });
  });

  it('falls back to defaults without a database (fail-safe: pre-2b behavior)', async () => {
    const savedDirect = process.env.DIRECT_URL;
    process.env.DIRECT_URL = '';
    try {
      await expect(getMetaCapiSettings()).resolves.toEqual(defaultMetaCapiSettings());
    } finally {
      if (savedDirect === undefined) delete process.env.DIRECT_URL;
      else process.env.DIRECT_URL = savedDirect;
    }
  });
});

describe('settingsPatch Meta CAPI fields (H-1)', () => {
  it('accepts a valid two-mode configuration', () => {
    expect(
      settingsPatch.safeParse({
        metaCapiMode: 'validated',
        metaLeadStatusTrigger: 'Qualified',
        metaInstantEventName: 'LeadInitiated',
      }).success,
    ).toBe(true);
    expect(settingsPatch.safeParse({ metaLeadStatusTrigger: '' }).success).toBe(true);
  });

  it('rejects bad mode, bad trigger and bad event names', () => {
    expect(settingsPatch.safeParse({ metaCapiMode: 'auto' }).success).toBe(false);
    expect(settingsPatch.safeParse({ metaLeadStatusTrigger: 'VIP' }).success).toBe(false);
    expect(settingsPatch.safeParse({ metaInstantEventName: 'Lead Initiated!' }).success).toBe(false);
    expect(settingsPatch.safeParse({ metaInstantEventName: '' }).success).toBe(false);
  });
});

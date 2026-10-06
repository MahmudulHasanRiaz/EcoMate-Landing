import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { hitLimit } from '@/lib/rateLimit';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

type KvStore = Map<string, string>;

function installKv(store: KvStore): void {
  const fakeKv = {
    get: async (key: string): Promise<string | null> => store.get(key) ?? null,
    put: async (key: string, value: string): Promise<void> => {
      store.set(key, value);
    },
  };
  vi.mocked(getCloudflareContext).mockReturnValue({
    env: { RATE_LIMIT_KV: fakeKv },
  } as unknown as ReturnType<typeof getCloudflareContext>);
}

function installNoBinding(): void {
  vi.mocked(getCloudflareContext).mockReturnValue({
    env: {},
  } as unknown as ReturnType<typeof getCloudflareContext>);
}

describe('KV rate limiter (lib/rateLimit.ts)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows up to the limit, then blocks', async () => {
    installKv(new Map());
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    expect(await hitLimit('lead:1.2.3.4', 3, 600)).toBe(false);
    expect(await hitLimit('lead:1.2.3.4', 3, 600)).toBe(false);
    expect(await hitLimit('lead:1.2.3.4', 3, 600)).toBe(false);
    expect(await hitLimit('lead:1.2.3.4', 3, 600)).toBe(true);
    // A different key has its own bucket.
    expect(await hitLimit('lead:9.9.9.9', 3, 600)).toBe(false);
  });

  it('rolls into a fresh window (old bucket unreachable)', async () => {
    installKv(new Map());
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1_700_000_000_000);
    expect(await hitLimit('lead:5.6.7.8', 1, 60)).toBe(false);
    expect(await hitLimit('lead:5.6.7.8', 1, 60)).toBe(true);
    now.mockReturnValue(1_700_000_000_000 + 61_000);
    expect(await hitLimit('lead:5.6.7.8', 1, 60)).toBe(false);
  });

  it('allows when the KV binding is absent (local dev backstop only)', async () => {
    installNoBinding();
    expect(await hitLimit('lead:1.2.3.4', 1, 600)).toBe(false);
    expect(await hitLimit('lead:1.2.3.4', 1, 600)).toBe(false);
  });

  it('treats a misconfigured call site as no-limit (never fail-closed)', async () => {
    const store = new Map<string, string>();
    installKv(store);
    expect(await hitLimit('k', 0, 600)).toBe(false);
    expect(await hitLimit('k', -1, 600)).toBe(false);
    expect(await hitLimit('k', 5, 0)).toBe(false);
    expect(await hitLimit('k', Number.NaN, 600)).toBe(false);
    expect(store.size).toBe(0);
  });

  it('fails open when KV throws', async () => {
    vi.mocked(getCloudflareContext).mockReturnValue({
      env: {
        RATE_LIMIT_KV: {
          get: async (): Promise<string | null> => {
            throw new Error('KV outage');
          },
          put: async (): Promise<void> => undefined,
        },
      },
    } as unknown as ReturnType<typeof getCloudflareContext>);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await hitLimit('lead:1.2.3.4', 1, 600)).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});

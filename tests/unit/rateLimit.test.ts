import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '@/db/client';
import { hitLimit, retryAfterSec } from '@/lib/rateLimit';

vi.mock('@/db/client', () => ({
  getDb: vi.fn(),
}));

/** In-memory replica of the `rate_limit_counters` upsert semantics. */
interface CounterRow {
  windowStartMs: number;
  count: number;
}

function installDb(store: Map<string, CounterRow>, opts?: { throwOn?: 'insert' | 'sweep' }): void {
  const returning = async (values: { key: string; windowStart: Date; count: number }) => {
    if (opts?.throwOn === 'insert') throw new Error('DB outage');
    const current = store.get(values.key);
    const bucketMs = values.windowStart.getTime();
    if (current && current.windowStartMs === bucketMs) {
      current.count += 1;
    } else {
      store.set(values.key, { windowStartMs: bucketMs, count: 1 });
    }
    return [{ count: store.get(values.key)?.count ?? 0 }];
  };
  const chain = {
    delete: vi.fn(() => ({
      where: vi.fn(async () => {
        if (opts?.throwOn === 'sweep') throw new Error('sweep failed');
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((values: { key: string; windowStart: Date; count: number }) => ({
        onConflictDoUpdate: vi.fn(() => ({
          returning: vi.fn(() => returning(values)),
        })),
      })),
    })),
  };
  vi.mocked(getDb).mockReturnValue(chain as unknown as ReturnType<typeof getDb>);
}

describe('Postgres rate limiter (lib/rateLimit.ts)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows up to the limit, then blocks', async () => {
    installDb(new Map());
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    expect(await hitLimit('lead:1.2.3.4', 3, 600)).toBe(false);
    expect(await hitLimit('lead:1.2.3.4', 3, 600)).toBe(false);
    expect(await hitLimit('lead:1.2.3.4', 3, 600)).toBe(false);
    expect(await hitLimit('lead:1.2.3.4', 3, 600)).toBe(true);
    // A different key has its own bucket.
    expect(await hitLimit('lead:9.9.9.9', 3, 600)).toBe(false);
  });

  it('rolls into a fresh window (counter restarts)', async () => {
    installDb(new Map());
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1_700_000_000_000);
    expect(await hitLimit('lead:5.6.7.8', 1, 60)).toBe(false);
    expect(await hitLimit('lead:5.6.7.8', 1, 60)).toBe(true);
    now.mockReturnValue(1_700_000_000_000 + 61_000);
    expect(await hitLimit('lead:5.6.7.8', 1, 60)).toBe(false);
  });

  it('treats a misconfigured call site as no-limit (never fail-closed)', async () => {
    const store = new Map<string, CounterRow>();
    installDb(store);
    expect(await hitLimit('k', 0, 600)).toBe(false);
    expect(await hitLimit('k', -1, 600)).toBe(false);
    expect(await hitLimit('k', 5, 0)).toBe(false);
    expect(await hitLimit('k', Number.NaN, 600)).toBe(false);
    expect(store.size).toBe(0);
  });

  it('fails open when the database throws', async () => {
    installDb(new Map(), { throwOn: 'insert' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await hitLimit('lead:1.2.3.4', 1, 600)).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it('computes Retry-After as the seconds left in the window', () => {
    const aligned = 1_700_000_000 - (1_700_000_000 % 600);
    // 600s window, 100s elapsed → 500s left.
    expect(retryAfterSec(600, (aligned + 100) * 1000)).toBe(500);
    // Exactly on the boundary → full window (never zero: a zero Retry-After is meaningless).
    expect(retryAfterSec(600, aligned * 1000)).toBe(600);
    expect(retryAfterSec(0)).toBe(60);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/db/client';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

const ctx = () => vi.mocked(getCloudflareContext);

// Lazy client: parsing never dials, so an unreachable URL is safe — no socket opens
// until the first query, and these tests never query.
const REQUEST_URL = 'postgres://user:pass@localhost:5432/requestdb';
const BUILD_URL = 'postgres://user:pass@localhost:5432/build-only-db';

function mockRequestContext(waitUntil: (p: Promise<unknown>) => void): void {
  ctx().mockImplementation(
    () =>
      ({
        env: { HYPERDRIVE: { connectionString: REQUEST_URL } },
        cf: undefined,
        ctx: { waitUntil },
      }) as unknown as ReturnType<typeof getCloudflareContext>,
  );
}

function mockNoContext(): void {
  ctx().mockImplementation(() => {
    throw new Error('no request context');
  });
}

afterEach(() => {
  ctx().mockReset();
  delete process.env.DIRECT_URL;
  delete process.env.DATABASE_URL;
});

describe('db/client per-request isolation (2026-10-09 P0)', () => {
  it('returns a FRESH client per getDb() call inside a request (no shared singleton)', () => {
    const seen: Promise<unknown>[] = [];
    mockRequestContext((p) => {
      seen.push(p);
    });
    const first = getDb();
    const second = getDb();
    expect(second).not.toBe(first);
    // One cleanup registration per client, so the isolate closes each pool.
    expect(seen).toHaveLength(2);
  });

  it('N concurrent request-path calls resolve independently (no shared pool)', () => {
    let registrations = 0;
    mockRequestContext(() => {
      registrations += 1;
    });
    const clients = Array.from({ length: 10 }, () => getDb());
    const distinct = new Set(clients);
    expect(distinct.size).toBe(10);
    expect(registrations).toBe(10);
  });

  it('keeps the module singleton on the build path (no request context)', () => {
    mockNoContext();
    process.env.DIRECT_URL = BUILD_URL;
    expect(getDb()).toBe(getDb());
  });

  it('still throws HYPERDRIVE_NOT_BOUND when nothing is configured', () => {
    mockNoContext();
    expect(() => getDb()).toThrow('HYPERDRIVE_NOT_BOUND');
  });
});

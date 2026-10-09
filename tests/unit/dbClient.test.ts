import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import postgres from 'postgres';
import { getDb } from '@/db/client';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock('postgres', () => ({
  default: vi.fn(),
}));

const ctx = () => vi.mocked(getCloudflareContext);
const pg = () => vi.mocked(postgres);

// Lazy client: parsing never dials, so an unreachable URL is safe — no socket opens
// until the first query, and these tests never query.
const REQUEST_URL = 'postgres://user:pass@localhost:5432/requestdb';
const BUILD_URL = 'postgres://user:pass@localhost:5432/build-only-db';

// The mocked context returns a STABLE store object per simulated request — mirroring
// the entrypoint's AsyncLocalStorage, which scopes one {env, ctx, cf} object per
// request. Returning a fresh object per getCloudflareContext() call would defeat
// memoization testing (every lookup would miss).
function mockRequestContext(): void {
  const store = {
    env: { HYPERDRIVE: { connectionString: REQUEST_URL } },
    cf: undefined,
    ctx: { waitUntil: () => undefined },
  } as unknown as ReturnType<typeof getCloudflareContext>;
  ctx().mockImplementation(() => store);
}

function mockNoContext(): void {
  ctx().mockImplementation(() => {
    throw new Error('no request context');
  });
}

afterEach(() => {
  ctx().mockReset();
  pg().mockReset();
  delete process.env.DIRECT_URL;
  delete process.env.DATABASE_URL;
});

// Default: a fake pool that never dials. Individual tests override `end` when they
// assert on it. (The real postgres() client is lazy — parsing never connects — but a
// fake keeps these unit tests hermetic by construction.)
// drizzle() touches client.options.parsers/serializers at construction — the fake
// provides them alongside end.
function fakePool(end: (...args: never[]) => Promise<undefined>): ReturnType<typeof postgres> {
  return { end, options: { parsers: {}, serializers: {} } } as unknown as ReturnType<typeof postgres>;
}

beforeEach(() => {
  pg().mockReturnValue(fakePool(vi.fn().mockResolvedValue(undefined)));
});

describe('db/client per-request isolation (2026-10-09 P0)', () => {
  it('memoizes ONE client per request: same store across getDb() calls -> toBe', () => {
    mockRequestContext();
    expect(getDb()).toBe(getDb());
  });

  it('isolates concurrent requests: different stores -> not.toBe', () => {
    mockRequestContext();
    const firstRequest = getDb();
    // Second simulated concurrent request: a distinct context object, same as a
    // second ALS scope on the worker.
    mockRequestContext();
    const secondRequest = getDb();
    expect(secondRequest).not.toBe(firstRequest);
  });

  it('does NOT end the pool at creation — eager end() rejects all later queries with CONNECTION_ENDED (P0 2026-10-10)', () => {
    const end = vi.fn().mockResolvedValue(undefined);
    pg().mockReturnValue(fakePool(end));
    mockRequestContext();
    getDb();
    // Synchronous assertion, no timers/flush: the pool must be usable the moment
    // getDb() returns. end() may only ever run against a pool being discarded.
    expect(end).not.toHaveBeenCalled();
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

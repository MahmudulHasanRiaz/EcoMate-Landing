import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMIT, MAX_LIMIT, paginate, parsePage } from '@/lib/paginate';

const BASE = 'https://ecomate.bd/api/leads';

describe('pagination parsing (lib/paginate.ts)', () => {
  it('defaults to 20/0 when no params are given', () => {
    expect(parsePage(BASE)).toEqual({ limit: DEFAULT_LIMIT, offset: 0 });
    expect(DEFAULT_LIMIT).toBe(20);
  });

  it('clamps limit to 100 instead of rejecting', () => {
    expect(parsePage(`${BASE}?limit=100000`).limit).toBe(MAX_LIMIT);
    expect(MAX_LIMIT).toBe(100);
    expect(parsePage(`${BASE}?limit=5`).limit).toBe(5);
    expect(parsePage(`${BASE}?limit=100`).limit).toBe(100);
  });

  it('floors offset at 0 instead of passing negatives to Postgres', () => {
    expect(parsePage(`${BASE}?offset=-1`).offset).toBe(0);
    expect(parsePage(`${BASE}?offset=0`).offset).toBe(0);
    expect(parsePage(`${BASE}?offset=25`).offset).toBe(25);
  });

  it('ignores invalid, negative and zero limits (defaults, not errors)', () => {
    for (const raw of ['abc', '-3', '0', '', 'NaN']) {
      expect(parsePage(`${BASE}?limit=${raw}`).limit).toBe(DEFAULT_LIMIT);
    }
    expect(parsePage(`${BASE}?offset=abc`).offset).toBe(0);
  });

  it('truncates fractional values toward the safe side', () => {
    expect(parsePage(`${BASE}?limit=2.9`).limit).toBe(2);
    expect(parsePage(`${BASE}?offset=7.8`).offset).toBe(7);
  });

  it('falls back to page one for a malformed URL (call-site bug, not client error)', () => {
    expect(parsePage('not a url')).toEqual({ limit: DEFAULT_LIMIT, offset: 0 });
  });

  it('wraps one page in the shared { data, total, limit, offset } envelope', async () => {
    const page = await paginate(
      `${BASE}?limit=5&offset=10`,
      async (limit, offset) => {
        expect(limit).toBe(5);
        expect(offset).toBe(10);
        return ['a', 'b'];
      },
      async () => ({ count: '42' }),
    );
    expect(page).toEqual({ data: ['a', 'b'], total: 42, limit: 5, offset: 10 });
  });
});

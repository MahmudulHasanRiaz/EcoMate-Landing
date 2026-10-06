/**
 * Shared `limit`/`offset` parsing for every list route (Task 16 §4).
 *
 * ## Clamp, never reject
 *
 * A client asking for `limit=100000` gets 100 rows, not a 400. The alternative — rejecting an
 * out-of-range page — turns a fat-fingered URL into a broken dashboard with no obvious cause,
 * and it hands a caller a way to probe for the exact boundary where behaviour changes. The caps
 * are a safety bound, not an API contract to be argued about.
 *
 * Offsets are floored at 0 rather than passed through: a negative `OFFSET` is a Postgres
 * error, so `-1` reaching the database would be a 500 on a request the client believed was
 * page one.
 *
 * ## The envelope
 *
 * `{ data, total, limit, offset }` everywhere. `total` is the count of *matching* rows, not of
 * the table, and each route supplies its own count query built from the same filters as its
 * data query — a shared global count would be wrong for every filtered list in the app.
 * Passing the filters twice is the price of a correct total; the alternative (a count helper
 * with its own separate filter argument) invites exactly the mismatch this comment prevents.
 */
import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import type { PgTable } from 'drizzle-orm/pg-core';

export interface Page<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** A `count(*)` result before it has been narrowed to a JSON-safe number. */
export interface CountResult {
  count: number | string | bigint;
}

/**
 * Read `limit`/`offset` from a request URL and clamp them into the safe range.
 *
 * Takes the URL rather than a `Request` so it is trivially testable and callable from anywhere
 * that has a string; `new URL()` needs an absolute base, and callers pass `request.url`.
 */
export function parsePage(url: string): { limit: number; offset: number } {
  // A malformed URL is a call-site bug, not a client error: a handler's `request.url` is always
  // parseable. Falling back to page one beats turning it into a 500 with no useful message.
  let params: URLSearchParams;
  try {
    params = new URL(url).searchParams;
  } catch {
    return { limit: DEFAULT_LIMIT, offset: 0 };
  }

  const rawLimit = Number(params.get('limit'));
  const rawOffset = Number(params.get('offset'));

  // `Number(null)` is 0 and `Number('')` is 0, so an absent parameter fails the `> 0` test and
  // lands on the defaults — which is the correct reading of "no limit supplied".
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const offset =
    Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;

  return { limit, offset };
}

/**
 * Wrap one page of rows in the shared envelope.
 *
 * `run` receives the clamped window and returns its rows; `countMatching` counts the rows
 * `run` would have returned *without* the window, using the same filters. Both run
 * concurrently: the count does not depend on the page, and serialising them doubles the
 * latency of every list endpoint for nothing.
 */
export async function paginate<T>(
  url: string,
  run: (limit: number, offset: number) => Promise<T[]>,
  countMatching: () => Promise<CountResult>,
): Promise<Page<T>> {
  const { limit, offset } = parsePage(url);
  const [data, counted] = await Promise.all([run(limit, offset), countMatching()]);
  // `count(*)` arrives as a string or bigint depending on the driver's type parser. The
  // envelope promises a JSON number, so it is normalised once here rather than in every route.
  const total = Number(counted.count ?? 0);
  return { data, total: Number.isFinite(total) ? total : 0, limit, offset };
}

/**
 * `SELECT count(*)` over a whole table, for the routes whose list really is the entire live
 * set. Filtered routes write their own count with the same `where` as their data query.
 *
 * The table identifier is passed to Drizzle, never interpolated into SQL text, so there is no
 * injection surface and no quoting to get wrong.
 */
export async function countTable(table: PgTable): Promise<CountResult> {
  const rows = await getDb().select({ count: sql<number>`count(*)` }).from(table);
  return { count: Number(rows[0]?.count ?? 0) };
}
import { describe } from 'vitest';
import { config } from 'dotenv';

// Vitest does not load Next's `.env.local`; the integration suite needs the
// throwaway database URL from it. Never print the value — only its presence.
config({ path: '.env.local' });

export const TEST_DATABASE_URL = process.env.DIRECT_URL_TEST ?? '';

if (TEST_DATABASE_URL !== '') {
  // `db/client.ts` resolves `DIRECT_URL` when no Hyperdrive binding exists
  // (plain Node). Pointing it at the throwaway DB keeps every query in this
  // process off the live database. `getDb()` rebuilds its client when the URL
  // changes, so setting this before the first query is sufficient.
  process.env.DIRECT_URL = TEST_DATABASE_URL;
}

/**
 * Loud skip when the throwaway DB is unavailable: a printed warning plus
 * `describe.skip`, never a silent green run with zero DB coverage.
 */
export function integrationSuite(name: string, fn: () => void): void {
  if (TEST_DATABASE_URL === '') {
    console.warn(
      `[integration] DIRECT_URL_TEST is unset — skipping suite "${name}" with zero DB coverage (this is a skip, not a pass).`,
    );
    describe.skip(name, fn);
  } else {
    describe(name, fn);
  }
}

/** Unique-per-run marker so fixtures never collide with real or parallel rows. */
export function probeTag(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000)}`;
}

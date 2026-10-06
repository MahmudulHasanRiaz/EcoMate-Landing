import { defineConfig, devices } from '@playwright/test';

/**
 * Task 18 Step 3: E2E runs against a production-like server, never `next dev`
 * (prefetching/caching assertions do not apply to dev).
 *
 * Start it manually so one heavy process runs at a time (AGENTS.md command
 * discipline) and no server is left behind:
 *
 *   E2E_TEST_MODE=1 DIRECT_URL="<DIRECT_URL_TEST value>" npm run preview
 *
 * then in another shell: `npm run test:e2e`. `PLAYWRIGHT_BASE_URL` overrides
 * the default preview port when wrangler picks another one.
 */
export default defineConfig({
  testDir: './e2e',
  // Serial: every spec shares one preview server and one throwaway database,
  // so parallel workers would race each other's fixtures.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8787',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

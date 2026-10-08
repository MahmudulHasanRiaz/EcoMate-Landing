/**
 * GET /api/health — cheap liveness probe (Decision 8).
 *
 * Deliberately dependency-free: no DB query, no R2/KV touch, not even a config
 * read that could throw. Uptime monitors hit this at high frequency, so it must
 * answer 200 in microseconds and can never fail for a reason that warrants a
 * restart. Deep dependency checks live in `/api/ready`, which is throttled.
 * Both endpoints stay PUBLIC — external monitors cannot authenticate.
 */
import { ok } from '@/lib/json';

// `process.uptime()` does not exist on Workers, so uptime is measured against the
// isolate's own boot moment instead of the process start time.
const BOOT_AT = Date.now();

export async function GET() {
  return ok({
    status: 'healthy',
    uptime: (Date.now() - BOOT_AT) / 1000,
    timestamp: new Date().toISOString(),
  });
}

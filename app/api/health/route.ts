import { isPostgresConfigured } from '@/db/client';
import { envString } from '@/lib/env';
import { ok } from '@/lib/json';

// `process.uptime()` does not exist on Workers, so uptime is measured against the
// isolate's own boot moment instead of the process start time.
const BOOT_AT = Date.now();

export async function GET() {
  return ok({
    status: 'healthy',
    uptime: (Date.now() - BOOT_AT) / 1000,
    postgresConfigured: isPostgresConfigured(),
    licensePortalConfigured: envString('LICENSE_PORTAL_API_BASE_URL') !== '',
    timestamp: new Date().toISOString(),
  });
}

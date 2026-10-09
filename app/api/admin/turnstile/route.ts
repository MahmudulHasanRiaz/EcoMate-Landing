import { desc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { turnstileDailyStatsTable } from '@/db/schema';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, failWithRequestId, logServerError, ok } from '@/lib/json';
import { requestId } from '@/lib/request';

/**
 * GET /api/admin/turnstile — Turnstile protection monitor (Phase 3b Item 19, M-13).
 *
 * Bot protection that is silently off is worse than none with an alert. Every lead
 * verification lands in `turnstile_daily_stats` (`verified` / `rejected` /
 * `skipped`), and this endpoint surfaces the trailing 30 days with one boolean:
 *
 * - `alert: true` when the trailing-7-day skip share exceeds half with real volume
 *   (>= 5 outcomes): the widget is unconfigured or Cloudflare is unreachable and a
 *   human must look. The fail-open direction keeps leads flowing meanwhile —
 *   the alert is what makes that safe.
 */
const HISTORY_DAYS = 30;
const ALERT_WINDOW_DAYS = 7;
/** Minimum trailing-week volume before the share means anything (avoids 1/1 alarms). */
const ALERT_MIN_OUTCOMES = 5;
/** Skip share that pages a human. */
const ALERT_SKIP_SHARE = 0.5;

export async function GET(req: Request) {
  const reqId = requestId(req);
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const rows = await getDb()
      .select()
      .from(turnstileDailyStatsTable)
      .orderBy(desc(turnstileDailyStatsTable.day))
      .limit(HISTORY_DAYS);

    const cutoff = new Date(Date.now() - ALERT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    let weekVerified = 0;
    let weekRejected = 0;
    let weekSkipped = 0;
    for (const row of rows) {
      if (row.day < cutoff) continue;
      weekVerified += row.verified;
      weekRejected += row.rejected;
      weekSkipped += row.skipped;
    }
    const weekTotal = weekVerified + weekRejected + weekSkipped;
    const skipShare = weekTotal > 0 ? weekSkipped / weekTotal : 0;
    const alert = weekTotal >= ALERT_MIN_OUTCOMES && skipShare > ALERT_SKIP_SHARE;

    return ok({
      days: rows,
      trailing7d: {
        verified: weekVerified,
        rejected: weekRejected,
        skipped: weekSkipped,
        total: weekTotal,
        skipShare,
      },
      alert,
      alertReason: alert
        ? `Turnstile skipped ${Math.round(skipShare * 100)}% of verifications in the trailing 7 days (${weekSkipped}/${weekTotal}) — protection is likely unconfigured or Cloudflare unreachable. Leads still flow (fail-open); fix the widget/secret.`
        : null,
    });
  } catch (e) {
    logServerError('GET /api/admin/turnstile', e, reqId);
    return failWithRequestId(errorMessage(e), reqId);
  }
}

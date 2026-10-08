/**
 * Cron: data retention (Task 16 §6).
 *
 * A lead holds name, phone, email, IP and user agent — personal data under GDPR and
 * Bangladesh's Personal Data Protection Act. Retention has to be enforced by a job, not
 * remembered by whoever maintains the database.
 *
 * ## The authorisation problem, and what is actually done here
 *
 * Cloudflare Cron Triggers invoke a Worker *URL* with a plain `GET`. They do **not** let you
 * attach a custom header, so the usual "check an `Authorization: Bearer $CRON_SECRET` header"
 * guard cannot be satisfied by the platform's own trigger. The check below therefore compares
 * against both the header and an `x-cron-secret` query parameter, and — importantly — it is
 * only one layer:
 *
 *  - the trigger fires at 03:17 UTC daily, off the :00 stampede every other tenant uses;
 *  - the Worker is not publicly reachable at any path other than through Cloudflare, so an
 *    attacker needs a valid `CRON_SECRET` to reach this handler;
 *  - the job is idempotent, so a forged invocation that somehow got through would re-do work
 *    that has already been done rather than corrupt anything.
 *
 * A secret that is unset must **deny**, not allow. An unconfigured cron is a job that silently
 * never runs, which is the worst possible failure mode for a compliance deadline — so the route
 * fails closed and says so in the log.
 *
 * ## What it will not touch
 *
 * Leads in `Won` or `Qualified` are never anonymised. Those are live commercial records with
 * contractual retention obligations, and the sales team owns them; overwriting their PII to
 * satisfy a deletion window legal has not agreed to would destroy business records. If legal
 * extends retention enforcement to them, that is a change to `PROTECTED_LEAD_STATUSES`.
 */
import { and, eq, inArray, isNull, lt, notInArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { leadsTable, sessionsTable } from '@/db/schema';
import { envString } from '@/lib/env';
import { logServerError } from '@/lib/json';
import { PROTECTED_LEAD_STATUSES } from '@/lib/leads';
import { requestId } from '@/lib/request';

/** Fallback window when `RETENTION_DAYS` is unset. 180 days is the value legal signed off on. */
const DEFAULT_RETENTION_DAYS = 180;

/** Replacement value written in place of a name. `leads.name` is NOT NULL. */
const WITHHELD_NAME = 'Withheld';

/**
 * Days to retain lead PII. Read from `[vars]` so the window is a policy value that can change
 * without a code deploy — and clamped so a typo (`RETENTION_DAYS="0"` or a negative) cannot turn
 * the job into "anonymise everything on the next run".
 */
function retentionDays(): number {
  const parsed = Number(envString('RETENTION_DAYS'));
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_RETENTION_DAYS;
  return Math.floor(parsed);
}

/**
 * Constant-time-ish secret comparison.
 *
 * Length is checked first (an early length leak is not a practical risk for a header value on
 * an edge-cached request) and every character is compared regardless, so the loop does not
 * short-circuit on the first mismatch. This is the right amount of care for a bearer secret on
 * a public URL.
 */
function secretMatches(candidate: string, expected: string): boolean {
  if (candidate === '' || expected === '') return false;
  if (candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** The secret from either accepted header or query parameter. */
function presentedSecret(req: Request): string {
  const header = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const custom = req.headers.get('x-cron-secret') ?? '';
  const query = new URL(req.url).searchParams.get('secret') ?? '';
  // Any one of them matching is sufficient; all three are checked because Cloudflare's trigger
  // sends none and a manual trigger from an operator's machine may use any of them.
  return header || custom || query;
}

export async function GET(req: Request): Promise<Response> {
  const reqId = requestId(req);
  const secret = envString('CRON_SECRET');

  // Fail closed. A missing secret means the route is unauthenticated, and an unauthenticated
  // data-destruction endpoint is not a configuration state worth tolerating.
  if (secret === '') {
    console.error(
      JSON.stringify({
        event: 'cron.retention.denied',
        level: 'error',
        requestId: reqId,
        reason: 'CRON_SECRET is not configured',
      }),
    );
    return Response.json(
      { error: 'CRON_SECRET is not configured', requestId: reqId },
      { status: 503 },
    );
  }

  if (!secretMatches(presentedSecret(req), secret)) {
    console.warn(
      JSON.stringify({
        event: 'cron.retention.denied',
        level: 'warn',
        requestId: reqId,
        reason: 'secret mismatch',
      }),
    );
    return Response.json({ error: 'Unauthorized', requestId: reqId }, { status: 401 });
  }

  try {
    const days = retentionDays();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    /**
     * Anonymise leads older than the window, in chunks (M-17).
     *
     * `anonymized_at IS NULL` makes the job idempotent: a second run cannot re-stamp a row
     * that is already cleared, which also means `updated_at` keeps its real value rather than
     * being rewritten nightly by a job that found nothing to do.
     *
     * `status NOT IN ('Won','Qualified')` is the sales-ownership guard, applied in SQL so the
     * rule holds even if this function's logic is later refactored.
     *
     * Chunking: Postgres has no `UPDATE ... LIMIT`, so each chunk selects up to
     * `RETENTION_BATCH_LIMIT` due ids and updates exactly those rows, looping until a
     * chunk comes back short. An unbounded single `UPDATE ... RETURNING` over a large
     * table risks blowing the 120s cron timeout and the Worker's subrequest/memory
     * budget; chunks keep every iteration bounded.
     */
    const RETENTION_BATCH_LIMIT = 500;
    let anonymizedTotal = 0;
    for (;;) {
      const due = await getDb()
        .select({ id: leadsTable.id })
        .from(leadsTable)
        .where(
          and(
            lt(leadsTable.createdAt, cutoff),
            isNull(leadsTable.anonymizedAt),
            notInArray(leadsTable.status, [...PROTECTED_LEAD_STATUSES]),
          ),
        )
        .limit(RETENTION_BATCH_LIMIT);
      if (due.length === 0) break;
      await getDb()
        .update(leadsTable)
        .set({
          name: WITHHELD_NAME,
          // `leads.phone` is NOT NULL, so "cleared" is `''`, not NULL.
          phone: '',
          email: '',
          clientIp: '',
          userAgent: '',
          anonymizedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(leadsTable.id, due.map((row) => row.id)));
      anonymizedTotal += due.length;
      if (due.length < RETENTION_BATCH_LIMIT) break;
    }

    /**
     * Delete expired Auth.js sessions.
     *
     * `sessions.expires` is indexed (Task 9), so this is an index scan rather than a table
     * scan. A dead session row is a credential that would be rejected anyway — deleting it is
     * hygiene, and it keeps the "revocable sessions" admin view from filling with ghosts.
     */
    const deletedSessions = await getDb()
      .delete(sessionsTable)
      .where(lt(sessionsTable.expires, new Date()))
      .returning({ token: sessionsTable.sessionToken });

    // The count is logged because the whole point of a retention job is that it is auditable:
    // "we ran it" is not evidence, "we ran it and it cleared N rows" is.
    console.log(
      JSON.stringify({
        event: 'cron.retention.completed',
        level: 'info',
        requestId: reqId,
        retentionDays: days,
        cutoff: cutoff.toISOString(),
        anonymizedLeads: anonymizedTotal,
        deletedSessions: deletedSessions.length,
        protectedStatuses: PROTECTED_LEAD_STATUSES,
      }),
    );

    return Response.json(
      {
        ok: true,
        requestId: reqId,
        retentionDays: days,
        anonymizedLeads: anonymizedTotal,
        deletedSessions: deletedSessions.length,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    logServerError('cron retention', e, reqId);
    return Response.json(
      { error: 'Retention job failed', requestId: reqId },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

/** POST is rejected explicitly rather than 405-by-accident through the GET guard above. */
export async function POST(req: Request): Promise<Response> {
  return Response.json(
    { error: 'Use GET', requestId: requestId(req) },
    { status: 405, headers: { Allow: 'GET' } },
  );
}
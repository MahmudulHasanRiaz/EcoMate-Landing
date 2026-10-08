/**
 * Cron: dispatch retry drain (Task 20 §4).
 *
 * Retries due `dispatch_queue` rows with exponential backoff
 * (1m, 5m, 30m, 2h, 12h, then `Failed`). Same `CRON_SECRET` guard shape as the
 * retention/publish crons: secret via `Authorization: Bearer`, `x-cron-secret`
 * or `?secret=`, fail closed when unset.
 *
 * Each row retries through `dispatchLeadIntegrations` (the same code as the
 * inline first attempt — never a duplicate path). A row whose lead reached a
 * terminal state meanwhile (`Sent`/`Synced`) is marked `Done` without re-sending.
 *
 * Overlapping runs cannot double-dispatch: rows are claimed atomically inside one
 * transaction (`SELECT ... FOR UPDATE SKIP LOCKED` + lease update), so a second
 * run starting while the first is still dispatching sees none of the claimed rows.
 */
import { and, eq, inArray, lte } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { dispatchQueueTable } from '@/db/schema';
import { envString } from '@/lib/env';
import { logServerError } from '@/lib/json';
import {
  DISPATCH_MAX_ATTEMPTS,
  dispatchLeadIntegrations,
  nextAttemptDelaySeconds,
} from '@/lib/leadDispatch';
import { requestId } from '@/lib/request';

const DRAIN_LIMIT = 20;

/**
 * Claim lease for a row taken by this run. Claimed rows are pushed out of the due
 * window so an overlapping run cannot re-select them while we dispatch. If this
 * run crashes before settling a row, the lease expires and the row becomes due
 * again — never stuck, and never double-dispatched while a run is alive.
 */
const CLAIM_LEASE_MS = 5 * 60 * 1000;

function secretMatches(candidate: string, expected: string): boolean {
  if (candidate === '' || expected === '') return false;
  if (candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function presentedSecret(req: Request): string {
  const header = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const custom = req.headers.get('x-cron-secret') ?? '';
  const query = new URL(req.url).searchParams.get('secret') ?? '';
  return header || custom || query;
}

export async function GET(req: Request): Promise<Response> {
  const reqId = requestId(req);
  const secret = envString('CRON_SECRET');

  if (secret === '') {
    console.error(
      JSON.stringify({
        event: 'cron.dispatch-drain.denied',
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
        event: 'cron.dispatch-drain.denied',
        level: 'warn',
        requestId: reqId,
        reason: 'secret mismatch',
      }),
    );
    return Response.json({ error: 'Unauthorized', requestId: reqId }, { status: 401 });
  }

  try {
    const db = getDb();
    // M-8 atomic claim: select + lease-update in ONE transaction. `SKIP LOCKED`
    // skips rows an overlapping run already locked; the lease update moves claimed
    // rows out of the due window, so a run starting mid-dispatch re-selects nothing
    // we own. Check-then-act across two statements would let both runs dispatch it.
    const due = await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(dispatchQueueTable)
        .where(
          and(
            inArray(dispatchQueueTable.status, ['Pending', 'Retrying']),
            lte(dispatchQueueTable.nextAttemptAt, new Date()),
          ),
        )
        .orderBy(dispatchQueueTable.nextAttemptAt)
        .limit(DRAIN_LIMIT)
        .for('update', { skipLocked: true });
      if (rows.length === 0) return rows;
      await tx
        .update(dispatchQueueTable)
        .set({
          status: 'Retrying',
          nextAttemptAt: new Date(Date.now() + CLAIM_LEASE_MS),
          updatedAt: new Date(),
        })
        .where(
          inArray(
            dispatchQueueTable.id,
            rows.map((row) => row.id),
          ),
        );
      return rows;
    });

    let succeeded = 0;
    let retried = 0;
    let failed = 0;

    for (const row of due) {
      try {
        // H-1: the queue payload carries the Meta event kind that failed
        // (`full` | `instant`), so the retry resends the same shape — a failed
        // validated-mode instant is not "upgraded" to a full Lead by the drain.
        // Pre-2b rows carry no kind: they predate validated mode, so they are
        // owed the full conversion, not the instant signal.
        const payload = (row.payload ?? {}) as { metaEvent?: 'full' | 'instant' };
        const summary = await dispatchLeadIntegrations(row.leadId, {
          metaCapi: row.kind === 'meta-capi',
          licensePortal: row.kind === 'license-portal',
          ...(row.kind === 'meta-capi' ? { metaEvent: payload.metaEvent ?? 'full' } : {}),
        });
        const settled =
          (row.kind === 'meta-capi' &&
            (summary.metaCapiStatus === 'Sent' || summary.metaCapiStatus === 'Skipped')) ||
          (row.kind === 'license-portal' && summary.licensePortalStatus === 'Synced');

        if (settled) {
          await db
            .update(dispatchQueueTable)
            .set({ status: 'Done', lastError: '', updatedAt: new Date() })
            .where(inArray(dispatchQueueTable.id, [row.id]));
          succeeded++;
          continue;
        }

        // Unknown kinds (e.g. a future producer with no consumer yet) must not spin
        // the drain forever: count the attempt and back off like any other failure.
        const attempts = row.attempts + 1;
        if (attempts >= DISPATCH_MAX_ATTEMPTS) {
          await db
            .update(dispatchQueueTable)
            .set({
              status: 'Failed',
              attempts,
              lastError: `Retry budget exhausted after ${attempts} attempts`,
              updatedAt: new Date(),
            })
            .where(inArray(dispatchQueueTable.id, [row.id]));
          failed++;
        } else {
          const delay = nextAttemptDelaySeconds(attempts) ?? 300;
          await db
            .update(dispatchQueueTable)
            .set({
              status: 'Retrying',
              attempts,
              nextAttemptAt: new Date(Date.now() + delay * 1000),
              updatedAt: new Date(),
            })
            .where(inArray(dispatchQueueTable.id, [row.id]));
          retried++;
        }
      } catch (e) {
        logServerError('cron dispatch-drain row', e, reqId);
        const attempts = row.attempts + 1;
        const message = e instanceof Error ? e.message : String(e);
        if (attempts >= DISPATCH_MAX_ATTEMPTS) {
          await db
            .update(dispatchQueueTable)
            .set({ status: 'Failed', attempts, lastError: message.slice(0, 500), updatedAt: new Date() })
            .where(inArray(dispatchQueueTable.id, [row.id]));
          failed++;
        } else {
          const delay = nextAttemptDelaySeconds(attempts) ?? 300;
          await db
            .update(dispatchQueueTable)
            .set({
              status: 'Retrying',
              attempts,
              nextAttemptAt: new Date(Date.now() + delay * 1000),
              lastError: message.slice(0, 500),
              updatedAt: new Date(),
            })
            .where(inArray(dispatchQueueTable.id, [row.id]));
          retried++;
        }
      }
    }

    console.log(
      JSON.stringify({
        event: 'cron.dispatch-drain.completed',
        level: 'info',
        requestId: reqId,
        examined: due.length,
        succeeded,
        retried,
        failed,
      }),
    );

    return Response.json(
      { ok: true, requestId: reqId, examined: due.length, succeeded, retried, failed },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    logServerError('cron dispatch-drain', e, reqId);
    return Response.json(
      { error: 'Dispatch drain failed', requestId: reqId },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function POST(req: Request): Promise<Response> {
  return Response.json(
    { error: 'Use GET', requestId: requestId(req) },
    { status: 405, headers: { Allow: 'GET' } },
  );
}

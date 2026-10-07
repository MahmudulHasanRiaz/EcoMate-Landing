/**
 * Fan-out from a stored lead to every external integration (Task 13 §5).
 *
 * The lead row is authoritative and is written before anything leaves the Worker: a failed
 * Meta CAPI call must never lose a lead. Both dispatches run through `waitUntil` at the call
 * site (`keepAlive` in the leads route) so a recycled isolate cannot cancel them silently.
 *
 * Retry safety: `Sent` (Meta) and `Synced` (License Portal) are terminal. Re-dispatching an
 * already-converted lead duplicates a conversion in Events Manager and a licence in the
 * portal, which is worse than a missed retry — so they are skipped, not re-sent.
 */
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { dispatchQueueTable, integrationLogsTable, leadsTable } from '@/db/schema';
import { envString } from '@/lib/env';
import { dispatchLeadTracked, type TrackLeadInput } from '@/lib/events';
import { logServerError } from '@/lib/json';
import { dispatchLead, LeadNotFoundError } from '@/lib/licensePortal';

// Side-effect import: `lib/metaCapi` registers itself with the provider bus on load.
import '@/lib/metaCapi';

export type MetaCapiStatus = 'Pending' | 'Sent' | 'Failed' | 'Skipped';
export type LicensePortalStatus = 'Pending' | 'Synced' | 'Failed';

export interface LeadDispatchSummary {
  metaCapiStatus: MetaCapiStatus | 'Unchanged';
  licensePortalStatus: LicensePortalStatus | 'Unchanged';
}

type LeadRow = typeof leadsTable.$inferSelect;

/** The page the form lives on; Meta wants the URL the conversion happened at. */
function eventSourceUrl(): string {
  const base = envString('NEXT_PUBLIC_SITE_URL').replace(/\/+$/, '');
  return `${base || 'https://ecomate.bd'}/#lead-form`;
}

export async function dispatchLeadIntegrations(
  leadId: number,
  options: { metaCapi?: boolean; licensePortal?: boolean } = {},
): Promise<LeadDispatchSummary> {
  const db = getDb();
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId)).limit(1);
  if (!lead) throw new LeadNotFoundError(leadId);

  const summary: LeadDispatchSummary = {
    metaCapiStatus: 'Unchanged',
    licensePortalStatus: 'Unchanged',
  };

  if (options.metaCapi !== false && lead.metaCapiStatus !== 'Sent') {
    summary.metaCapiStatus = await dispatchMetaCapi(lead);
  }
  if (options.licensePortal !== false && lead.licensePortalStatus !== 'Synced') {
    try {
      await dispatchLead(leadId);
    } catch (e) {
      // The service records its own failure row/state; rethrow only for a missing lead.
      if (e instanceof LeadNotFoundError) throw e;
      logServerError('leadDispatch licensePortal', e);
    }
    // A configured-but-failed portal dispatch lands in the retry queue (Task 20 §4).
    // Unconfigured (`Pending`) is a queued-locally state, not a failure — no row.
    try {
      const [current] = await getDb()
        .select({
          licensePortalStatus: leadsTable.licensePortalStatus,
          licensePortalError: leadsTable.licensePortalError,
        })
        .from(leadsTable)
        .where(eq(leadsTable.id, leadId))
        .limit(1);
      if (current?.licensePortalStatus === 'Failed') {
        await enqueueDispatch('license-portal', leadId, { source: 'dispatchLeadIntegrations' }, current.licensePortalError ?? '');
      }
    } catch (e) {
      logServerError('leadDispatch licensePortal enqueue', e);
    }
  }

  // Report what is actually persisted rather than what we hoped happened: the License
  // Portal service owns `licensePortalStatus` and an unconfigured endpoint is `Pending`.
  const [fresh] = await db
    .select({
      metaCapiStatus: leadsTable.metaCapiStatus,
      licensePortalStatus: leadsTable.licensePortalStatus,
    })
    .from(leadsTable)
    .where(eq(leadsTable.id, leadId))
    .limit(1);
  if (fresh) {
    summary.metaCapiStatus = fresh.metaCapiStatus as MetaCapiStatus;
    summary.licensePortalStatus = fresh.licensePortalStatus as LicensePortalStatus;
  }
  return summary;
}

/**
 * Consent gate (Task 20 §5): the server never sends a conversion event for a
 * visitor who did not consent. Every lead row created through the public form
 * carries `consentGiven: true` (the schema rejects anything else), so this is
 * defense in depth — a backfilled or imported row without consent stays `Skipped`.
 */
function hasTrackingConsent(lead: LeadRow): boolean {
  return lead.consentGiven === true;
}

async function dispatchMetaCapi(lead: LeadRow): Promise<MetaCapiStatus> {
  if (!hasTrackingConsent(lead)) {
    await markMetaSkipped(lead.id, 'Tracking consent not given');
    return 'Skipped';
  }
  const input: TrackLeadInput = {
    leadId: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email ?? '',
    fbp: lead.fbp ?? '',
    fbc: lead.fbc ?? '',
    eventId: lead.eventId ?? '',
    clientIp: lead.clientIp ?? '',
    userAgent: lead.userAgent ?? '',
    eventSourceUrl: eventSourceUrl(),
  };

  const results = await dispatchLeadTracked(input);
  const meta = results.find((result) => result.provider === 'MetaCAPI');

  let status: MetaCapiStatus;
  let error = '';
  if (!meta) {
    status = 'Skipped';
    error = 'MetaCAPI provider is not registered';
  } else if (meta.skipped) {
    status = 'Skipped';
  } else if (meta.ok) {
    status = 'Sent';
  } else {
    status = 'Failed';
    error = meta.error.slice(0, 500);
  }

  // Lead state + audit row commit together (Task 3 §6).
  await getDb().transaction(async (tx) => {
    await tx
      .update(leadsTable)
      .set({
        metaCapiStatus: status,
        metaCapiError: error,
        metaCapiSentAt: status === 'Sent' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(leadsTable.id, lead.id));

    await tx.insert(integrationLogsTable).values({
      serviceName: 'MetaCAPI',
      action: 'DISPATCH_LEAD',
      // Audit without PII: the event identity and the provider outcome, never the hashes
      // or the raw values (the lead row already owns those, under retention rules).
      payload: {
        leadId: lead.id,
        eventName: 'Lead',
        eventId: input.eventId,
        hasEmail: input.email.length > 0,
        hasPhone: input.phone.length > 0,
        hasFbp: input.fbp.length > 0,
        hasFbc: input.fbc.length > 0,
        providers: results.map((result) => result.provider),
      },
      response: { ok: status === 'Sent', skipped: status === 'Skipped', error },
      status: status === 'Failed' ? 'Failed' : 'Success',
      errorMessage: error,
      attempts: 1,
    });
  });

  // Task 20 §4: a failed first attempt lands in the retry queue; the drain cron
  // owns every attempt after this one. Enqueue failures are logged, never thrown —
  // the lead row is already committed and must not become a 500.
  if (status === 'Failed') {
    try {
      await enqueueDispatch('meta-capi', lead.id, { eventId: input.eventId }, error);
    } catch (e) {
      logServerError('leadDispatch metaCapi enqueue', e);
    }
  }

  return status;
}

async function markMetaSkipped(leadId: number, reason: string): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx
      .update(leadsTable)
      .set({ metaCapiStatus: 'Skipped', metaCapiError: reason, updatedAt: new Date() })
      .where(eq(leadsTable.id, leadId));
    await tx.insert(integrationLogsTable).values({
      serviceName: 'MetaCAPI',
      action: 'DISPATCH_LEAD',
      payload: { leadId, skippedForConsent: true },
      response: { ok: true, skipped: true, error: reason },
      status: 'Success',
      errorMessage: reason,
      attempts: 1,
    });
  });
}

/**
 * Retry backoff (Task 20 §4): 1m, 5m, 30m, 2h, 12h, then `Failed`.
 *
 * `attempts` counts failures so far (the inline failure enqueues with
 * `attempts: 1`). The delay for that count is `BACKOFF_SECONDS[attempts - 1]`;
 * when `attempts` exceeds the table the row is terminal.
 */
export const DISPATCH_BACKOFF_SECONDS = [60, 300, 1800, 7200, 43200] as const;
export const DISPATCH_MAX_ATTEMPTS = DISPATCH_BACKOFF_SECONDS.length + 1;

export function nextAttemptDelaySeconds(failedAttempts: number): number | null {
  if (failedAttempts < 1 || failedAttempts > DISPATCH_BACKOFF_SECONDS.length) return null;
  return DISPATCH_BACKOFF_SECONDS[failedAttempts - 1];
}

/**
 * Insert (or refresh) a retry row. Idempotent per (`kind`, `lead_id`) while a row
 * is still open (`Pending`/`Retrying`): a second failure before the drain runs
 * refreshes the error rather than stacking a duplicate retry.
 */
export async function enqueueDispatch(
  kind: string,
  leadId: number,
  payload: unknown,
  lastError: string,
): Promise<void> {
  const db = getDb();
  const [open] = await db
    .select({ id: dispatchQueueTable.id })
    .from(dispatchQueueTable)
    .where(
      and(
        eq(dispatchQueueTable.kind, kind),
        eq(dispatchQueueTable.leadId, leadId),
        eq(dispatchQueueTable.status, 'Pending'),
      ),
    )
    .limit(1);
  const error = (lastError || '').slice(0, 500);
  if (open) {
    await db
      .update(dispatchQueueTable)
      .set({ lastError: error, payload: payload as Record<string, unknown>, updatedAt: new Date() })
      .where(eq(dispatchQueueTable.id, open.id));
    return;
  }
  const [retrying] = await db
    .select({ id: dispatchQueueTable.id })
    .from(dispatchQueueTable)
    .where(
      and(
        eq(dispatchQueueTable.kind, kind),
        eq(dispatchQueueTable.leadId, leadId),
        eq(dispatchQueueTable.status, 'Retrying'),
      ),
    )
    .limit(1);
  if (retrying) {
    await db
      .update(dispatchQueueTable)
      .set({ lastError: error, payload: payload as Record<string, unknown>, updatedAt: new Date() })
      .where(eq(dispatchQueueTable.id, retrying.id));
    return;
  }
  const delay = nextAttemptDelaySeconds(1) ?? 60;
  await db.insert(dispatchQueueTable).values({
    kind,
    leadId,
    payload: (payload ?? {}) as Record<string, unknown>,
    attempts: 1,
    nextAttemptAt: new Date(Date.now() + delay * 1000),
    lastError: error,
    status: 'Pending',
  });
}

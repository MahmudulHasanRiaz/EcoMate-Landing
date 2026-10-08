/**
 * Fan-out from a stored lead to every external integration (Task 13 §5).
 *
 * The lead row is authoritative and is written before anything leaves the Worker: a failed
 * Meta CAPI call must never lose a lead. Both dispatches run through `waitUntil` at the call
 * site (`keepAlive` below) so a recycled isolate cannot cancel them silently.
 *
 * Retry safety: `Sent` (Meta) and `Synced` (License Portal) are terminal. Re-dispatching an
 * already-converted lead duplicates a conversion in Events Manager and a licence in the
 * portal, which is worse than a missed retry — so they are skipped, not re-sent.
 *
 * Meta two-mode (H-1/Decision 14): `instant` mode sends the full `Lead` on submit
 * (pre-2b behavior); `validated` mode sends a lightweight instant event on submit and
 * the minimized full `Lead` only on the configured status trigger (or manual retry).
 */
import { and, eq } from 'drizzle-orm';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/db/client';
import { dispatchQueueTable, integrationLogsTable, leadsTable } from '@/db/schema';
import { envString } from '@/lib/env';
import { dispatchLeadTracked, type TrackLeadInput } from '@/lib/events';
import { logServerError } from '@/lib/json';
import { dispatchLead, LeadNotFoundError } from '@/lib/licensePortal';
import { getMetaCapiSettings } from '@/lib/metaCapiSettings';

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

/**
 * Hand background work to the platform instead of leaving it as a bare floating promise.
 *
 * A `.catch()` after the response has been returned can be cancelled the moment the
 * isolate is recycled — the lead would silently never reach the integration.
 * `ctx.waitUntil` keeps the isolate alive until the promise settles. Outside a Worker
 * request (`next dev`, tests) there is no execution context, and the promise — already
 * running, already carrying its own `.catch` — simply continues.
 */
export function keepAlive(work: Promise<unknown>): void {
  const settled = work.catch((error: unknown) => logServerError('lead dispatch', error));
  try {
    getCloudflareContext().ctx.waitUntil(settled);
  } catch {
    // No Cloudflare context: nothing to hand off to.
  }
}

export async function dispatchLeadIntegrations(
  leadId: number,
  options: {
    metaCapi?: boolean;
    licensePortal?: boolean;
    /**
     * Which Meta event to send. Default is settings-driven: `instant` mode sends the
     * full `Lead`; `validated` mode sends the lightweight instant event (the submit
     * path). The status-trigger and manual-retry paths pass `'full'` explicitly.
     */
    metaEvent?: 'full' | 'instant';
  } = {},
): Promise<LeadDispatchSummary> {
  const db = getDb();
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId)).limit(1);
  if (!lead) throw new LeadNotFoundError(leadId);

  const summary: LeadDispatchSummary = {
    metaCapiStatus: 'Unchanged',
    licensePortalStatus: 'Unchanged',
  };

  if (options.metaCapi !== false && lead.metaCapiStatus !== 'Sent') {
    summary.metaCapiStatus = await dispatchMetaCapi(lead, options.metaEvent);
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
 * Consent gate (H-1/Decision 14): the server never sends a conversion event for a
 * visitor who did not consent. Enforcement reads the persisted `trackingConsent`
 * boolean — derived from the submit-time consent payload and stored on the row —
 * so every dispatch path (inline, drain retry, manual retry) is gated identically.
 * The `metaCapiStatus = 'Skipped'` text stays as the visible audit trail; the
 * boolean is what refuses.
 */
function hasTrackingConsent(lead: LeadRow): boolean {
  return lead.trackingConsent === true;
}

/**
 * Which Meta event a dispatch sends, and with what payload shape.
 *
 * - `'full'`: the `Lead` event. Minimized (`minimal: true`) when the validated
 *   mode owns it (trigger/retry in validated mode); full-shaped otherwise
 *   (instant mode submit, instant-mode retry — pre-2b behavior).
 * - `'instant'`: the lightweight validated-mode submit event (default name
 *   `'LeadInitiated'`): event metadata + fbp/fbc passthrough only — no hashed
 *   identifiers, no IP/UA, no custom data.
 */
async function dispatchMetaCapi(lead: LeadRow, event?: 'full' | 'instant'): Promise<MetaCapiStatus> {
  if (!hasTrackingConsent(lead)) {
    await markMetaSkipped(lead.id, 'Tracking consent not given');
    return 'Skipped';
  }
  const settings = await getMetaCapiSettings();
  const validated = settings.mode === 'validated';
  // Explicit caller intent wins (trigger + manual retry always mean the full Lead);
  // the submit path defaults to whatever the configured mode owns.
  const which = event ?? (validated ? 'instant' : 'full');
  const eventName = which === 'instant' ? settings.instantEventName : 'Lead';
  // Minimized exactly when the validated mode sends a full Lead: trigger + retry.
  const minimal = which === 'full' && validated;

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
    eventName,
    minimal,
    light: which === 'instant',
  };

  const results = await dispatchLeadTracked(input);
  const meta = results.find((result) => result.provider === 'MetaCAPI');

  /**
   * Status outcomes per event kind.
   *
   * Full `Lead`: `Sent` is terminal (dedupe guard above never re-sends it);
   * `Failed` lands in the retry queue with the event kind so the drain resends
   * the same shape. Provider-unconfigured in instant mode keeps the pre-2b
   * `Skipped` (reversible admin state, not a failure).
   *
   * Validated instant event: success leaves the row `Pending` — the full Lead is
   * still owed on the status trigger, and `Pending` is exactly what the trigger
   * path looks for alongside the terminal-`Sent` guard. Provider-unconfigured
   * likewise leaves `Pending` (nothing was sent, nothing is owed yet). No new
   * status value is introduced, so the `leads_meta_capi_status_valid` check
   * constraint is untouched.
   */
  let status: MetaCapiStatus;
  let error = '';
  if (!meta) {
    status = 'Skipped';
    error = 'MetaCAPI provider is not registered';
  } else if (meta.skipped) {
    if (which === 'instant') return lead.metaCapiStatus as MetaCapiStatus;
    status = 'Skipped';
  } else if (meta.ok) {
    if (which === 'instant') {
      await recordMetaEvent(lead.id, eventName, input.eventId, 'instant');
      return lead.metaCapiStatus as MetaCapiStatus;
    }
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
        eventName,
        metaEvent: which,
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
  // the lead row is already committed and must not become a 500. The queue payload
  // carries the event kind so the drain resends the same shape that failed.
  if (status === 'Failed') {
    try {
      await enqueueDispatch('meta-capi', lead.id, { eventId: input.eventId, metaEvent: which }, error);
    } catch (e) {
      logServerError('leadDispatch metaCapi enqueue', e);
    }
  }

  return status;
}

/**
 * Audit row for a successful validated-mode instant event.
 *
 * The row status is deliberately untouched (`Pending` persists until the trigger
 * or a failure moves it), but an invisible send is an unauditable send — so the
 * event name, event id and outcome are recorded in `integration_logs` on their own.
 */
async function recordMetaEvent(
  leadId: number,
  eventName: string,
  eventId: string,
  which: 'full' | 'instant',
): Promise<void> {
  try {
    await getDb().insert(integrationLogsTable).values({
      serviceName: 'MetaCAPI',
      action: 'DISPATCH_LEAD',
      payload: { leadId, eventName, metaEvent: which, eventId },
      response: { ok: true, skipped: false, error: '' },
      status: 'Success',
      errorMessage: '',
      attempts: 1,
    });
  } catch (e) {
    logServerError('leadDispatch recordMetaEvent', e);
  }
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

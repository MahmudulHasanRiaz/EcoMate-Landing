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
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { integrationLogsTable, leadsTable } from '@/db/schema';
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
  return `${base || 'https://ecomate.app'}/#lead-form`;
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

async function dispatchMetaCapi(lead: LeadRow): Promise<MetaCapiStatus> {
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

  return status;
}

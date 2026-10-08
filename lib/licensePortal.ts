/**
 * License Portal integration layer.
 *
 * Ported from `src/services/licensePortal.ts:25-156` (which talked to the in-memory
 * prototype repository) onto Drizzle. Semantics are unchanged:
 *
 *  - the local lead row is authoritative and is written first;
 *  - an unconfigured portal is a queued state (`Pending`), not an error;
 *  - failures never throw out of a request path unless the lead itself is missing.
 *
 * Every outcome writes the lead row *and* an `integration_logs` row. Those two writes go
 * through one transaction: a lead marked `Synced` with no audit row (or vice versa) is
 * silent data corruption that manual testing will never catch.
 *
 * Config is read per call from the request's bindings (`getCloudflareContext().env`) with
 * a `process.env` fallback, because Worker secrets only exist inside a request and must
 * never be cached at module scope.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { integrationLogsTable, leadsTable } from '@/db/schema';
import { envString } from '@/lib/env';
import { asObject } from '@/lib/json';

export interface LicensePortalLeadPayload {
  externalId: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  estimatedVolume?: string;
  source: string;
  utm?: {
    source?: string;
    campaign?: string;
  };
  submittedAt: string;
}

export interface LicensePortalResponse {
  success: boolean;
  trackingId?: string;
  message: string;
}

/** Thrown by `retryLead`/`dispatchLead` when the lead id does not exist — maps to 404. */
export class LeadNotFoundError extends Error {
  constructor(leadId: number) {
    super(`Lead #${leadId} not found`);
    this.name = 'LeadNotFoundError';
  }
}

/** Thrown by `retryLead` when the lead is not in a retryable state — maps to 409. */
export class LeadNotRetryableError extends Error {
  constructor(leadId: number, status: string) {
    super(`Lead #${leadId} license sync is '${status}', not Failed/Pending — refusing duplicate dispatch`);
    this.name = 'LeadNotRetryableError';
  }
}

type LeadRow = typeof leadsTable.$inferSelect;
type SyncStatus = 'Pending' | 'Synced' | 'Failed';
type LogStatus = 'Success' | 'Failed' | 'Pending';

interface OutcomeLog {
  action: string;
  response: unknown;
  status: LogStatus;
  errorMessage: string;
}

class LicensePortalService {
  /**
   * Dispatches a lead to the external License Management Portal API.
   * If the external API is unconfigured or unreachable, it logs the failure and keeps the
   * local lead record authoritative.
   */
  async dispatchLead(leadId: number): Promise<LicensePortalResponse> {
    const db = getDb();
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId)).limit(1);
    if (!lead) throw new LeadNotFoundError(leadId);

    const payload = this.buildPayload(lead);
    const baseUrl = envString('LICENSE_PORTAL_API_BASE_URL');
    const apiKey = envString('LICENSE_PORTAL_API_KEY');

    // External endpoint not configured yet: record as queued / standby.
    if (!baseUrl) {
      const message =
        'LICENSE_PORTAL_API_BASE_URL is not configured. Lead queued locally in the authoritative SQL database.';
      await this.recordOutcome(lead.id, 'Pending', message, payload, {
        action: 'DISPATCH_LEAD_QUEUED',
        response: { queued: true, note: message },
        status: 'Pending',
        errorMessage: '',
      });
      return { success: true, trackingId: `LOCAL-QUEUE-${lead.id}`, message };
    }

    try {
      const response = await fetch(`${baseUrl}/api/v1/leads/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-EcoMate-Source': 'Website-Public-Form',
          // H-2: stable per lead, so a portal that honours idempotency keys collapses
          // a retried POST into the original licence instead of minting a duplicate.
          // Safe to reuse across attempts: `retryLead` refuses non-Failed/Pending rows,
          // so this key is never attached to a second, distinct licence for one lead.
          'Idempotency-Key': `ecomate-lead-${lead.id}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const failureMessage = `License portal responded with HTTP ${response.status}: ${errorText.slice(0, 200)}`;
        await this.recordOutcome(lead.id, 'Failed', failureMessage, payload, {
          action: 'DISPATCH_LEAD',
          response: { status: response.status, body: errorText.slice(0, 500) },
          status: 'Failed',
          errorMessage: failureMessage,
        });
        return { success: false, message: failureMessage };
      }

      const rawResponse: unknown = await response.json().catch(() => null);
      const body = asObject(rawResponse);
      const trackingId =
        typeof body.id === 'string' || typeof body.id === 'number'
          ? String(body.id)
          : `SYNCED-${lead.id}`;
      await this.recordOutcome(lead.id, 'Synced', '', payload, {
        action: 'DISPATCH_LEAD',
        response: rawResponse,
        status: 'Success',
        errorMessage: '',
      });
      // H-2: the portal body is recorded in `integration_logs`, never echoed to the
      // caller — the route returns only success/trackingId/message.
      return {
        success: true,
        trackingId,
        message: 'Successfully dispatched to License Portal',
      };
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Network error reaching License Portal API';
      await this.recordOutcome(lead.id, 'Failed', errMessage, payload, {
        action: 'DISPATCH_LEAD',
        response: null,
        status: 'Failed',
        errorMessage: errMessage,
      });
      return { success: false, message: errMessage };
    }
  }

  /** Admin-triggered retry of a previously failed or pending lead. */
  async retryLead(leadId: number): Promise<LicensePortalResponse> {
    const db = getDb();
    const [lead] = await db
      .select({ id: leadsTable.id, licensePortalStatus: leadsTable.licensePortalStatus })
      .from(leadsTable)
      .where(eq(leadsTable.id, leadId))
      .limit(1);
    if (!lead) throw new LeadNotFoundError(leadId);
    // H-2: refuse the retry unless the row is actually Failed/Pending — repeating the
    // call against a Synced lead would mint a duplicate licence in the portal.
    if (lead.licensePortalStatus !== 'Failed' && lead.licensePortalStatus !== 'Pending') {
      throw new LeadNotRetryableError(leadId, lead.licensePortalStatus);
    }
    return this.dispatchLead(leadId);
  }

  private buildPayload(lead: LeadRow): LicensePortalLeadPayload {
    return {
      externalId: `ECOMATE-WEB-${lead.id}`,
      name: lead.name,
      phone: lead.phone,
      email: lead.email ?? '',
      estimatedVolume: lead.dailyVolume ?? '',
      source: lead.source ?? '',
      utm: {
        source: lead.utmSource ?? '',
        campaign: lead.utmCampaign ?? '',
      },
      submittedAt: lead.createdAt.toISOString(),
    };
  }

  /** Lead row + audit row, atomically (Task 3 Step 6: never one without the other). */
  private async recordOutcome(
    leadId: number,
    syncStatus: SyncStatus,
    errorMessage: string,
    payload: LicensePortalLeadPayload,
    log: OutcomeLog,
  ): Promise<void> {
    await getDb().transaction(async (tx) => {
      await tx
        .update(leadsTable)
        .set({
          licensePortalStatus: syncStatus,
          licensePortalError: errorMessage,
          licensePortalSyncedAt: syncStatus === 'Synced' ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(leadsTable.id, leadId));

      await tx.insert(integrationLogsTable).values({
        serviceName: 'LicensePortal',
        action: log.action,
        payload,
        response: log.response,
        status: log.status,
        errorMessage: log.errorMessage,
        attempts: 1,
      });
    });
  }
}

export const licensePortalService = new LicensePortalService();

/** Convenience entry points used by the route handlers. */
export function dispatchLead(leadId: number): Promise<LicensePortalResponse> {
  return licensePortalService.dispatchLead(leadId);
}

export function retryLead(leadId: number): Promise<LicensePortalResponse> {
  return licensePortalService.retryLead(leadId);
}

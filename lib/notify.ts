/**
 * New-lead notification abstraction (Task 16 §3).
 *
 * ## Shape of the thing
 *
 * `notifyNewLead(lead)` is the only call site in the codebase. Everything provider-specific —
 * which vendor, which endpoint, which API key, which retry policy — lives behind
 * `NotificationProvider`. Wiring Resend for real is then: set `RESEND_API_KEY` plus the
 * from/to addresses, add one provider file (`lib/notifyResend.ts`), and import it. Zero
 * changes to any call site.
 *
 * ## Why the fallback provider is a log, not a stub that throws
 *
 * Until a real provider is configured, `notifyNewLead` writes a structured log line and an
 * `integration_logs` row. It does not fail, and it does not pretend to have sent anything.
 * That shape is deliberate: the lead is already committed before this runs, so "no provider"
 * must never surface as a lead-capture error, and an operator needs to be able to answer "was
 * this lead announced anywhere?" from the integrations tab without reading Worker logs.
 *
 * `integration_logs` is the same table and the same retry shape the License Portal already
 * uses (`lib/licensePortal.ts`): `Pending` for "queued but undelivered", `Success` when a
 * provider accepted it, `Failed` with the reason when it did not. An operator can retry a
 * failed notification from the same screen they already use.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { integrationLogsTable, leadsTable } from '@/db/schema';
import { envString } from '@/lib/env';
import { logServerError } from '@/lib/json';

/** The minimum a notification needs to know about a lead. */
export interface NotifiableLead {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  dailyVolume?: string | null;
  source?: string | null;
  createdAt?: Date;
}

export type NotificationStatus = 'Pending' | 'Sent' | 'Failed';

export interface NotificationResult {
  provider: string;
  status: NotificationStatus;
  error: string;
  /** Provider-side id when there is one (a Resend message id); empty otherwise. */
  externalId: string;
}

export interface NotificationProvider {
  name: string;
  /** Must never throw: a notification failure is a logged failure, never a failed lead. */
  notifyNewLead(lead: NotifiableLead): Promise<NotificationResult>;
}

const providers: NotificationProvider[] = [];

/** Idempotent by name, so a hot reload cannot double-register. */
export function registerNotificationProvider(provider: NotificationProvider): void {
  if (providers.some((existing) => existing.name === provider.name)) return;
  providers.push(provider);
}

export function registeredNotificationProviders(): string[] {
  return providers.map((provider) => provider.name);
}

/** Upper bound on providers attempted. They are independent: one failing does not stop the rest. */
const MAX_PROVIDERS = 5;

/**
 * The fallback provider's name. Recognised so it can be skipped whenever a real provider is
 * present — see `activeProviders`.
 */
const FALLBACK_PROVIDER_NAME = 'Log';

/**
 * Providers to actually attempt.
 *
 * The `Log` fallback is a *fallback*: once a real provider (Resend) is registered, including it
 * would write two rows per lead — a `Sent` from Resend and a `Pending` from Log — and an
 * operator reading "Pending: no provider configured" next to "Sent" has to work out which one
 * means the lead was actually emailed. Exactly one attempt per provider that can really deliver.
 */
function activeProviders(): NotificationProvider[] {
  const real = providers.filter((provider) => provider.name !== FALLBACK_PROVIDER_NAME);
  const chosen = real.length > 0 ? real : providers.filter((p) => p.name === FALLBACK_PROVIDER_NAME);
  return chosen.slice(0, MAX_PROVIDERS);
}

/**
 * Announce a new lead to every active provider.
 *
 * Never throws. The caller is the lead-creation path, and a lead that is stored but whose
 * notification failed is a recoverable state (retry from the integrations tab) — a lead whose
 * response 500s because a webhook timed out is a lost sale.
 *
 * Returns one result per provider; the `integration_logs` row is written here regardless, so the
 * trail is complete whether or not anyone inspects the return value.
 */
export async function notifyNewLead(lead: NotifiableLead): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  for (const provider of activeProviders()) {
    let result: NotificationResult;
    try {
      result = await provider.notifyNewLead(lead);
    } catch (error) {
      // A provider that throws has broken its own contract. Absorbed here anyway: this is the
      // last line of defence before a lead submission fails.
      logServerError('notify provider threw', error);
      result = {
        provider: provider.name,
        status: 'Failed',
        error: error instanceof Error ? error.message : String(error),
        externalId: '',
      };
    }
    results.push(result);
  }

  await recordNotificationResults(lead, results);
  return results;
}

/**
 * One `integration_logs` row per provider attempt, plus a structured log line per result.
 *
 * The stored payload carries no contact PII beyond booleans: this table is read by the admin
 * integrations view, and the lead row is the record that holds the actual details under
 * retention rules. The operator-facing name and volume are in the response body, which is what
 * makes the row useful for triage.
 */
async function recordNotificationResults(
  lead: NotifiableLead,
  results: NotificationResult[],
): Promise<void> {
  if (results.length === 0) {
    console.log(
      JSON.stringify({
        event: 'lead.notify',
        level: 'info',
        leadId: lead.id,
        delivered: false,
        reason: 'no_notification_provider_registered',
      }),
    );
    return;
  }

  try {
    await getDb().transaction(async (tx) => {
      for (const result of results) {
        await tx.insert(integrationLogsTable).values({
          serviceName: `Notify:${result.provider}`,
          action: 'NOTIFY_NEW_LEAD',
          payload: {
            leadId: lead.id,
            source: lead.source ?? '',
            hasEmail: Boolean(lead.email),
            hasPhone: Boolean(lead.phone),
          },
          response: {
            status: result.status,
            externalId: result.externalId,
            // Name and volume for triage; phone/email stay on the lead row behind the session
            // gate rather than being duplicated into a log table.
            leadName: lead.name,
            dailyVolume: lead.dailyVolume ?? '',
          },
          status:
            result.status === 'Sent' ? 'Success' : result.status === 'Failed' ? 'Failed' : 'Pending',
          errorMessage: result.error.slice(0, 500),
          attempts: 1,
        });
      }
    });
  } catch (error) {
    // The notification already happened; losing its audit row must not throw upward into the
    // lead response.
    logServerError('notify audit write failed', error);
  }

  for (const result of results) {
    console.log(
      JSON.stringify({
        event: 'lead.notify',
        level: result.status === 'Failed' ? 'error' : 'info',
        leadId: lead.id,
        provider: result.provider,
        status: result.status,
        externalId: result.externalId || undefined,
        error: result.error || undefined,
      }),
    );
  }
}

/**
 * The fallback provider, always registered, active until a real one is configured.
 *
 * It reports `Pending` rather than `Sent`: the row in `integration_logs` then reads as "queued,
 * nobody was told yet", which is the truth. Claiming `Sent` for a log line would be a lie an
 * operator acts on.
 */
const logProvider: NotificationProvider = {
  name: FALLBACK_PROVIDER_NAME,
  async notifyNewLead(lead: NotifiableLead): Promise<NotificationResult> {
    console.log(
      JSON.stringify({
        event: 'lead.notify.queued',
        level: 'info',
        leadId: lead.id,
        name: lead.name,
        source: lead.source ?? '',
        dailyVolume: lead.dailyVolume ?? '',
        reason: 'no_email_provider_configured',
      }),
    );
    return {
      provider: 'Log',
      status: 'Pending',
      error: 'No notification provider configured; recorded in integration_logs only.',
      externalId: '',
    };
  },
};

registerNotificationProvider(logProvider);

/**
 * Whether a real (delivering) provider is wired. Reported by `/api/ready` so an operator can see
 * "notifications are queued but undelivered" without reading code.
 *
 * Reads the **configuration**, not the registry. In Next.js each route is its own module graph,
 * so a provider that self-registers on import is only in *that route's* registry: `/api/ready`
 * never imports `lib/notifyResend`, so asking the registry there reported `log_only` even while
 * the leads route was genuinely sending email. Configuration is the only value that means the
 * same thing on every route.
 */
export function isNotificationProviderConfigured(): boolean {
  return (
    envString('RESEND_API_KEY') !== '' &&
    envString('NOTIFY_FROM_EMAIL') !== '' &&
    envString('NOTIFY_TO_EMAIL') !== ''
  );
}

/**
 * Re-dispatch a lead's notification (admin retry). Uses the same fan-out as creation, so a
 * retry cannot diverge from what the original send would have done.
 */
export async function retryNotification(leadId: number): Promise<NotificationResult[]> {
  const [lead] = await getDb().select().from(leadsTable).where(eq(leadsTable.id, leadId)).limit(1);
  if (!lead) {
    return [
      { provider: 'none', status: 'Failed', error: `Lead #${leadId} not found`, externalId: '' },
    ];
  }
  return notifyNewLead(lead);
}
/**
 * Email notification provider (Resend) — registered only when configured (Task 16 §3).
 *
 * This file plus `RESEND_API_KEY` is the entire wiring required for lead notifications to send
 * real email. Call sites (`notifyNewLead`) are unchanged whether or not it is active, which is
 * the whole point of the abstraction.
 *
 * ## Why the module self-registers
 *
 * `lib/notify.ts` is imported by the lead route. Importing this adapter there for its side
 * effect keeps that route free of provider knowledge — the same pattern `lib/metaCapi.ts`
 * already uses for the conversion bus.
 *
 * ## Failure handling
 *
 * A non-2xx from Resend is a `Failed` result, never a throw. Resend also reports some
 * rejections (spam filtering, unverified sender) with a 200 and an error body, so the body is
 * inspected rather than trusting the status alone.
 */
import { envString } from '@/lib/env';
import {
  registerNotificationProvider,
  type NotificationProvider,
  type NotificationResult,
} from '@/lib/notify';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const resendProvider: NotificationProvider = {
  name: 'Resend',

  async notifyNewLead(lead): Promise<NotificationResult> {
    const apiKey = envString('RESEND_API_KEY');
    const from = envString('NOTIFY_FROM_EMAIL');
    const to = envString('NOTIFY_TO_EMAIL');
    if (!apiKey || !from || !to) {
      return {
        provider: 'Resend',
        status: 'Failed',
        error: 'RESEND_API_KEY / NOTIFY_FROM_EMAIL / NOTIFY_TO_EMAIL are not all configured',
        externalId: '',
      };
    }

    // Plain text, no HTML: a lead's name is attacker-controlled, and this body is rendered by
    // mail clients that parse HTML far more eagerly than a browser does.
    const body = [
      `New inbound lead #${lead.id}`,
      '',
      `Name: ${lead.name}`,
      `Phone: ${lead.phone}`,
      `Email: ${lead.email || '(none given)'}`,
      `Order volume: ${lead.dailyVolume || '(not stated)'}`,
      `Source: ${lead.source || '(unknown)'}`,
      '',
      `Manage this lead in the admin console (lead #${lead.id}).`,
    ].join('\n');

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          // Resend honours this for 24h, so a retried send cannot produce a second email for
          // the same lead. The lead id is the natural key.
          'Idempotency-Key': `lead-${lead.id}`,
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `New lead #${lead.id} — ${lead.name}`,
          text: body,
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        return {
          provider: 'Resend',
          status: 'Failed',
          error: `Resend HTTP ${response.status}: ${detail.slice(0, 300)}`,
          externalId: '',
        };
      }

      const payload: unknown = await response.json().catch(() => null);
      const externalId =
        typeof payload === 'object' && payload !== null && 'id' in payload
          ? String((payload as { id: unknown }).id)
          : '';

      // A 200 carrying an `error` field is a real Resend rejection mode.
      if (typeof payload === 'object' && payload !== null && 'error' in payload) {
        const message = (payload as { error: unknown }).error;
        if (message) {
          return {
            provider: 'Resend',
            status: 'Failed',
            error: `Resend rejected the message: ${String(message).slice(0, 300)}`,
            externalId: '',
          };
        }
      }

      return { provider: 'Resend', status: 'Sent', error: '', externalId };
    } catch (error) {
      return {
        provider: 'Resend',
        status: 'Failed',
        error: error instanceof Error ? error.message : String(error),
        externalId: '',
      };
    }
  },
};

/**
 * Self-registers only when it is fully configured.
 *
 * Registering unconditionally produced one `Failed` `integration_logs` row per new lead for as
 * long as `RESEND_API_KEY` was empty — which is precisely the wrong signal. An operator reading
 * the integrations tab would see a red `Notify:Resend` failure on every lead and reasonably
 * conclude a working integration is broken, when in fact no email provider has been configured
 * at all. The `Log` provider already records `Pending` for that state, honestly.
 *
 * `RESEND_API_KEY` is read here, at module load, which only ever happens inside a request in
 * production — `lib/env.ts` falls back to `process.env` for build-time and plain-Node callers.
 */
if (
  envString('RESEND_API_KEY') !== '' &&
  envString('NOTIFY_FROM_EMAIL') !== '' &&
  envString('NOTIFY_TO_EMAIL') !== ''
) {
  registerNotificationProvider(resendProvider);
} else {
  console.log(
    JSON.stringify({
      event: 'notify.resend.not_registered',
      level: 'info',
      reason: 'RESEND_API_KEY / NOTIFY_FROM_EMAIL / NOTIFY_TO_EMAIL not all set; using the Log provider',
    }),
  );
}
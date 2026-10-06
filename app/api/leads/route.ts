import { getCloudflareContext } from '@opennextjs/cloudflare';
import { desc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { leadsTable } from '@/db/schema';
import { asObject, errorMessage, fail, logServerError, ok, readString } from '@/lib/json';
import { dispatchLeadIntegrations } from '@/lib/leadDispatch';
import { hitLimit } from '@/lib/rateLimit';
import { verifyTurnstile } from '@/lib/turnstile';

// Per-isolate best effort, deliberately kept as the *backstop* behind the KV limiter
// (Task 14 §1) and the WAF rule (Task 8): a Worker has no shared memory across the fleet,
// so this map only covers one isolate's lifetime — but it also covers the case where KV is
// not bound (local dev) or a KV call fails open.
const WINDOW_MS = 600_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, { count: number; expiresAt: number }>();

/** Distributed window: 5 lead submissions per 10 minutes per source IP. */
const KV_LIMIT_MAX = 5;
const KV_LIMIT_WINDOW_SEC = 600;

/** Version identifier stored on every consented lead (Task 13 §5, Task 20 §5). */
const PRIVACY_POLICY_VERSION = 'privacy-v1';
const MAX_TRACKING_VALUE = 200;
const MAX_USER_AGENT = 512;

/** `crypto.randomUUID` exists on Node 19+ and every Workers runtime; the fallback keeps a
 *  lead submittable in exotic environments rather than failing the request. */
function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    const random = Math.random().toString(36).slice(2, 10);
    return `lead-${Date.now().toString(36)}-${random}`;
  }
}

/** Event ids come from the client; they are opaque identifiers, so constrain their shape. */
function readEventId(value: unknown): string {
  const candidate = readString(value).trim();
  return /^[A-Za-z0-9._:-]{8,80}$/.test(candidate) ? candidate : newEventId();
}

function readClientIp(req: Request): string {
  const direct = req.headers.get('cf-connecting-ip');
  if (direct) return direct;
  // `x-forwarded-for` is a comma-separated chain; the first entry is the client.
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0]?.trim() ?? '' : '';
}

export async function GET() {
  try {
    const rows = await getDb().select().from(leadsTable).orderBy(desc(leadsTable.createdAt));
    return ok(rows);
  } catch (e) {
    logServerError('GET /api/leads', e);
    return fail(errorMessage(e));
  }
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('cf-connecting-ip') ?? 'unknown-ip';
    const now = Date.now();
    const rec = hits.get(ip);
    if (rec && rec.expiresAt > now && rec.count >= MAX_PER_WINDOW) {
      return fail('Too many requests. Please try again in a few minutes or call us directly.', 429);
    }
    hits.set(
      ip,
      rec && rec.expiresAt > now
        ? { count: rec.count + 1, expiresAt: rec.expiresAt }
        : { count: 1, expiresAt: now + WINDOW_MS },
    );
    // Bound the map: an isolate can live for hours and would otherwise accumulate one
    // entry per source IP it ever saw.
    if (hits.size > 1000) {
      for (const [key, value] of hits) if (value.expiresAt <= now) hits.delete(key);
    }

    // Fleet-wide sliding window (Task 14 §1). Runs after the per-isolate backstop so a
    // burst inside one isolate is rejected without a KV round-trip, and before any body
    // parsing so an abusive caller never reaches Turnstile or the database.
    if (await hitLimit(`lead:${ip}`, KV_LIMIT_MAX, KV_LIMIT_WINDOW_SEC)) {
      return fail('Too many requests. Please try again in a few minutes or call us directly.', 429);
    }

    const body = asObject(await req.json());
    const name = readString(body.name).trim();
    const phone = readString(body.phone).trim();
    if (!name) return fail('Name is required', 400);
    if (phone.length < 8) return fail('A valid phone number is required', 400);

    // Consent is a legal prerequisite, not a preference: without it there is no lawful
    // basis to store the PII, let alone send a conversion event to Meta.
    if (body.consentGiven !== true) {
      return fail('Consent to be contacted is required before submitting this form', 400);
    }
    const consentText =
      readString(body.consentText).trim().slice(0, 120) || PRIVACY_POLICY_VERSION;

    // Bot check (Task 14 §2). Skipped when Turnstile is not provisioned (local dev); an
    // explicit siteverify rejection is a 400 and the lead is never stored. Consent is
    // validated first so an invalid submission costs no external call.
    const turnstile = await verifyTurnstile(readString(body.turnstileToken), ip);
    if (!turnstile.ok) {
      console.warn(`[leads] turnstile rejected a submission: ${turnstile.reason}`);
      return fail('Human verification failed. Please refresh the page and try again.', 400);
    }

    const [lead] = await getDb()
      .insert(leadsTable)
      .values({
        name,
        phone,
        email: readString(body.email).trim(),
        dailyVolume: readString(body.dailyVolume, '150 – 500 orders / day'),
        note: readString(body.note).trim(),
        source: readString(body.source, 'landing_page_lead_form'),
        utmSource: readString(body.utmSource),
        utmCampaign: readString(body.utmCampaign),
        // --- tracking + consent (Task 13) ---------------------------------------------
        fbp: readString(body.fbp).trim().slice(0, MAX_TRACKING_VALUE),
        fbc: readString(body.fbc).trim().slice(0, MAX_TRACKING_VALUE),
        eventId: readEventId(body.eventId),
        clientIp: readClientIp(req),
        userAgent: readString(req.headers.get('user-agent')).slice(0, MAX_USER_AGENT),
        consentGiven: true,
        consentAt: new Date(),
        consentText,
      })
      .returning();

    // Meta CAPI + License Portal, both handed to the platform. `keepAlive` reuses
    // `ctx.waitUntil` so a recycled isolate cannot cancel either dispatch — and the lead
    // row is already committed, so a dispatch failure never loses the lead.
    keepAlive(dispatchLeadIntegrations(lead.id));

    return ok(
      {
        success: true,
        leadId: lead.id,
        eventId: lead.eventId,
        message:
          'Demo request registered successfully. Our operations team will reach out promptly.',
      },
      201,
    );
  } catch (e) {
    logServerError('POST /api/leads', e);
    return fail(errorMessage(e));
  }
}

/**
 * Hand background work to the platform instead of leaving it as a bare floating promise.
 *
 * A `.catch()` after the response has been returned can be cancelled the moment the
 * isolate is recycled, and the lead would silently never reach the License Portal.
 * `ctx.waitUntil` keeps the isolate alive until the promise settles. Outside a Worker
 * request (`next dev`, tests) there is no execution context, and the promise — already
 * running, already carrying its own `.catch` — simply continues.
 */
function keepAlive(work: Promise<unknown>): void {
  const settled = work.catch((error: unknown) => logServerError('lead dispatch', error));
  try {
    getCloudflareContext().ctx.waitUntil(settled);
  } catch {
    // No Cloudflare context: nothing to hand off to.
  }
}

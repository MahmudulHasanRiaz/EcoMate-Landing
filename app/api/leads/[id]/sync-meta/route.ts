/**
 * POST /api/leads/[id]/sync-meta — admin retry for a failed or skipped Meta CAPI dispatch.
 *
 * Sends the FULL `Lead` event (minimized in validated mode): a manual retry is an
 * operator validating the lead now, so it behaves like the status trigger, not the
 * submit-time event. `dispatchLeadIntegrations` still refuses a lead whose
 * `metaCapiStatus` is already `Sent`, so a double click cannot duplicate the conversion.
 *
 * H-1 invariant: opted-out visitors never dispatch to Meta — not inline, not via the
 * drain, not here. The persisted `trackingConsent` boolean refuses the retry with 409;
 * the `Skipped` status text stays as the audit trail.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { leadsTable } from '@/db/schema';
import { errorMessage, fail, logServerError, ok, parseId } from '@/lib/json';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { dispatchLeadIntegrations } from '@/lib/leadDispatch';
import { LeadNotFoundError } from '@/lib/licensePortal';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) return fail('Invalid lead id', 400);

  // H-3: forced CAPI re-send is a marketing-decision-level action (Decision 1) —
  // editors cannot trigger it.
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;

  try {
    // H-1(e): refuse before dispatching — the retry path honors tracking opt-out.
    const [lead] = await getDb()
      .select({ id: leadsTable.id, trackingConsent: leadsTable.trackingConsent })
      .from(leadsTable)
      .where(eq(leadsTable.id, id))
      .limit(1);
    if (!lead) return fail(`Lead #${id} not found`, 404);
    if (lead.trackingConsent !== true) {
      return fail('Tracking consent not given — Meta dispatch refused for this lead', 409);
    }
    const summary = await dispatchLeadIntegrations(id, { licensePortal: false, metaEvent: 'full' });
    return ok(summary);
  } catch (e) {
    logServerError('POST /api/leads/[id]/sync-meta', e);
    if (e instanceof LeadNotFoundError) return fail(errorMessage(e), 404);
    return fail(errorMessage(e));
  }
}

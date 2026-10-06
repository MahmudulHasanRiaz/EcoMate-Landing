/**
 * POST /api/leads/[id]/sync-meta — admin retry for a failed or skipped Meta CAPI dispatch.
 *
 * Mirrors the license-portal retry (`sync-license`). `dispatchLeadIntegrations` refuses to
 * re-send a lead whose `metaCapiStatus` is already `Sent`, so a double click in the admin
 * cannot duplicate the conversion.
 */
import { errorMessage, fail, logServerError, ok, parseId } from '@/lib/json';
import { dispatchLeadIntegrations } from '@/lib/leadDispatch';
import { LeadNotFoundError } from '@/lib/licensePortal';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) return fail('Invalid lead id', 400);

  try {
    const summary = await dispatchLeadIntegrations(id, { licensePortal: false });
    return ok(summary);
  } catch (e) {
    logServerError('POST /api/leads/[id]/sync-meta', e);
    if (e instanceof LeadNotFoundError) return fail(errorMessage(e), 404);
    return fail(errorMessage(e));
  }
}

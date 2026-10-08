import { errorMessage, fail, logServerError, ok, parseId } from '@/lib/json';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { LeadNotFoundError, retryLead } from '@/lib/licensePortal';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) return fail('Invalid lead id', 400);

  // H-2: license-portal retry is a marketing-decision-level action (Decision 1) —
  // editors cannot trigger it. (Idempotency-key work is Phase 2, not here.)
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const result = await retryLead(id);
    return ok(result);
  } catch (e) {
    logServerError('POST /api/leads/[id]/sync-license', e);
    if (e instanceof LeadNotFoundError) return fail(errorMessage(e), 404);
    return fail(errorMessage(e));
  }
}

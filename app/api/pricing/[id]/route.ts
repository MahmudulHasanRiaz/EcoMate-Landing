import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { pricingPlansTable } from '@/db/schema';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok, parseId } from '@/lib/json';
import { invalidateDomains } from '@/lib/revalidate';
import { pricingPlanUpdate, stripUnknownKeys } from '@/lib/validation';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // H-4: pricing is site customization (Decision 1) — editors cannot edit plans.
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid plan id', 400);

    // `slug` is creatable but not updatable: it is the stable identifier, and the strict
    // schema rejects it here rather than silently dropping it.
    const parsed = pricingPlanUpdate.safeParse(stripUnknownKeys(pricingPlanUpdate, await req.json().catch(() => null)));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }

    const [updated] = await getDb()
      .update(pricingPlansTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(pricingPlansTable.id, id))
      .returning();
    if (!updated) return fail('Pricing plan not found', 404);
    invalidateDomains('pricing');
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/pricing/[id]', e);
    return fail(errorMessage(e));
  }
}

/**
 * Hard delete. Unlike content tables (blog, testimonials, media) a pricing plan has no
 * public URL of its own, so there is no SEO/backlink reason to keep a tombstone row — and
 * `pricing_plans.slug` stays reusable.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // H-4: pricing is site customization (Decision 1) — editors cannot delete plans.
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid plan id', 400);

    const [deleted] = await getDb()
      .delete(pricingPlansTable)
      .where(eq(pricingPlansTable.id, id))
      .returning();
    if (!deleted) return fail('Pricing plan not found', 404);
    invalidateDomains('pricing');
    return ok({ success: true });
  } catch (e) {
    logServerError('DELETE /api/pricing/[id]', e);
    return fail(errorMessage(e));
  }
}

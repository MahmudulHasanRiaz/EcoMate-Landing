import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { pricingPlansTable } from '@/db/schema';
import { asObject, errorMessage, fail, logServerError, ok, parseId } from '@/lib/json';
import { readPricingPlanPatch } from '@/lib/pricing';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid plan id', 400);

    const { monthlyPrice, annualPrice, ...rest } = readPricingPlanPatch(
      asObject(await req.json()),
    );
    if (
      (monthlyPrice !== undefined && monthlyPrice < 0) ||
      (annualPrice !== undefined && annualPrice < 0)
    ) {
      return fail('Prices must be non-negative', 400);
    }

    const [updated] = await getDb()
      .update(pricingPlansTable)
      .set({ ...rest, monthlyPrice, annualPrice, updatedAt: new Date() })
      .where(eq(pricingPlansTable.id, id))
      .returning();
    if (!updated) return fail('Pricing plan not found', 404);
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
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid plan id', 400);

    const [deleted] = await getDb()
      .delete(pricingPlansTable)
      .where(eq(pricingPlansTable.id, id))
      .returning();
    if (!deleted) return fail('Pricing plan not found', 404);
    return ok({ success: true });
  } catch (e) {
    logServerError('DELETE /api/pricing/[id]', e);
    return fail(errorMessage(e));
  }
}

import { asc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { pricingPlansTable, siteSettingsTable } from '@/db/schema';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, isUniqueViolation, logServerError, ok } from '@/lib/json';
import { requestId } from '@/lib/request';
import { assertSlugAvailable } from '@/lib/guard';
import { invalidateDomains } from '@/lib/revalidate';
import { pricingPlanCreate } from '@/lib/validation';

export async function GET(req: Request) {
  const reqId = requestId(req);
  try {
    const db = getDb();
    const settings = (await db.select().from(siteSettingsTable).limit(1))[0];
    const plans = await db
      .select()
      .from(pricingPlansTable)
      .orderBy(asc(pricingPlansTable.sortOrder));
    return ok({ isPricingVisible: settings?.isPricingVisible ?? true, plans });
  } catch (e) {
    logServerError('GET /api/pricing', e, reqId);
    return fail(errorMessage(e), 500, undefined, reqId);
  }
}

// NEVER `.values(body)` — mass assignment on insert is the same hole as on update.
export async function POST(req: Request) {
  // H-4: pricing is site customization (Decision 1) — editors cannot create plans.
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;
  try {
    const parsed = pricingPlanCreate.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    // Friendly 409 before the unique index fires, naming the conflicting entity.
    const slugGuard = await assertSlugAvailable('pricing_plans', parsed.data.slug);
    if (!slugGuard.ok) return fail(slugGuard.reason, 409);
    const row = {
      slug: parsed.data.slug,
      nameEn: parsed.data.nameEn,
      nameBn: parsed.data.nameBn ?? '',
      tierSubtitleEn: parsed.data.tierSubtitleEn ?? '',
      tierSubtitleBn: parsed.data.tierSubtitleBn ?? '',
      monthlyPrice: parsed.data.monthlyPrice ?? 0,
      annualPrice: parsed.data.annualPrice ?? 0,
      currency: parsed.data.currency ?? '৳',
      orderVolume: parsed.data.orderVolume ?? '',
      usersIncluded: parsed.data.usersIncluded ?? '',
      showroomsIncluded: parsed.data.showroomsIncluded ?? '',
      featuresEn: parsed.data.featuresEn ?? [],
      featuresBn: parsed.data.featuresBn ?? [],
      excludedFeaturesEn: parsed.data.excludedFeaturesEn ?? [],
      ctaLabelEn: parsed.data.ctaLabelEn ?? 'Start with this tier',
      ctaLabelBn: parsed.data.ctaLabelBn ?? 'এই প্ল্যানে শুরু করুন',
      isPopular: parsed.data.isPopular ?? false,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
    };
    const [created] = await getDb().insert(pricingPlansTable).values(row).returning();
    invalidateDomains('pricing');
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/pricing', e);
    if (isUniqueViolation(e)) return fail('A plan with that slug already exists', 409);
    return fail(errorMessage(e));
  }
}

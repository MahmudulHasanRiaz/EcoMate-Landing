import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { siteSettingsTable } from '@/db/schema';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { invalidateDomains } from '@/lib/revalidate';
import { settingsPatch } from '@/lib/validation';

export async function GET() {
  try {
    const rows = await getDb().select().from(siteSettingsTable).limit(1);
    if (!rows[0]) return fail('Settings not seeded', 404);
    return ok(rows[0]);
  } catch (e) {
    logServerError('GET /api/settings', e);
    return fail(errorMessage(e));
  }
}

export async function PUT(req: Request) {
  // H-7: site settings are site customization (Decision 1) — editors cannot edit them.
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;
  try {
    // Declarative allowlist: unknown keys are rejected, not dropped — silent acceptance
    // is the mass-assignment hole. `parsed.data` carries only the validated fields.
    const parsed = settingsPatch.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    const [updated] = await getDb()
      .update(siteSettingsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(siteSettingsTable.id, 1))
      .returning();
    if (!updated) return fail('Settings not seeded', 404);
    // `is_pricing_visible` lives on this row and the pricing cache reads it, so a settings
    // edit has to invalidate pricing too — otherwise toggling pricing visibility from the
    // "System & Branding" tab would leave the cached pricing section in the old mode.
    invalidateDomains(['content', 'pricing'], updated.defaultLocale === 'bn' ? 'bn' : 'en');
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/settings', e);
    return fail(errorMessage(e));
  }
}

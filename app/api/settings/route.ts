import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { siteSettingsTable } from '@/db/schema';
import { asObject, errorMessage, fail, logServerError, ok, optionalBoolean, optionalString } from '@/lib/json';

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
  try {
    // NEVER `.set({ ...body })` — body is attacker-controlled. Spreading it lets a caller
    // overwrite any column (id, created_at, is_pricing_visible) that this endpoint never
    // intended to expose. Allowlist every field explicitly.
    const body = asObject(await req.json());
    const patch = {
      siteName: optionalString(body.siteName),
      tagline: optionalString(body.tagline),
      logoUrl: optionalString(body.logoUrl),
      faviconUrl: optionalString(body.faviconUrl),
      defaultLocale: body.defaultLocale === 'bn' ? 'bn' : 'en',
      supportPhone: optionalString(body.supportPhone),
      supportEmail: optionalString(body.supportEmail),
      whatsappNumber: optionalString(body.whatsappNumber),
      messengerUrl: optionalString(body.messengerUrl),
      address: optionalString(body.address),
      isPricingVisible: optionalBoolean(body.isPricingVisible),
      seoTitle: optionalString(body.seoTitle),
      seoDescription: optionalString(body.seoDescription),
      updatedAt: new Date(),
    };
    const [updated] = await getDb()
      .update(siteSettingsTable)
      .set(patch)
      .where(eq(siteSettingsTable.id, 1))
      .returning();
    if (!updated) return fail('Settings not seeded', 404);
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/settings', e);
    return fail(errorMessage(e));
  }
}

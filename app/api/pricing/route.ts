import { asc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { pricingPlansTable, siteSettingsTable } from '@/db/schema';
import {
  asObject,
  errorMessage,
  fail,
  isUniqueViolation,
  logServerError,
  ok,
} from '@/lib/json';
import { readPricingPlanCreate } from '@/lib/pricing';

export async function GET() {
  try {
    const db = getDb();
    const settings = (await db.select().from(siteSettingsTable).limit(1))[0];
    const plans = await db
      .select()
      .from(pricingPlansTable)
      .orderBy(asc(pricingPlansTable.sortOrder));
    return ok({ isPricingVisible: settings?.isPricingVisible ?? true, plans });
  } catch (e) {
    logServerError('GET /api/pricing', e);
    return fail(errorMessage(e));
  }
}

// NEVER `.values(body)` — mass assignment on insert is the same hole as on update.
export async function POST(req: Request) {
  try {
    const row = readPricingPlanCreate(asObject(await req.json()));
    if (!row.slug || !row.nameEn) return fail('slug and nameEn are required', 400);
    // The DB CHECK constraints are the guarantee; this is the courtesy that turns a
    // constraint violation into a 400 with a readable message.
    if (row.monthlyPrice < 0 || row.annualPrice < 0) {
      return fail('Prices must be non-negative', 400);
    }
    const [created] = await getDb().insert(pricingPlansTable).values(row).returning();
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/pricing', e);
    if (isUniqueViolation(e)) return fail('A plan with that slug already exists', 409);
    return fail(errorMessage(e));
  }
}

import { desc, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { mediaAssetsTable } from '@/db/schema';
import {
  asObject,
  errorMessage,
  fail,
  isUniqueViolation,
  logServerError,
  ok,
  readString,
} from '@/lib/json';

export async function GET() {
  try {
    const rows = await getDb()
      .select()
      .from(mediaAssetsTable)
      .where(isNull(mediaAssetsTable.deletedAt))
      .orderBy(desc(mediaAssetsTable.createdAt));
    return ok(rows);
  } catch (e) {
    logServerError('GET /api/media', e);
    return fail(errorMessage(e));
  }
}

// NEVER `.values(body)` — allowlist every column this endpoint may write.
export async function POST(req: Request) {
  try {
    const body = asObject(await req.json());
    const row = {
      key: readString(body.key).trim(),
      title: readString(body.title).trim(),
      url: readString(body.url).trim(),
      altText: readString(body.altText).trim(),
      category: readString(body.category, 'general').trim() || 'general',
    };
    if (!row.key || !row.title) return fail('key and title are required', 400);
    if (!row.url) return fail('url is required', 400);
    const [created] = await getDb().insert(mediaAssetsTable).values(row).returning();
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/media', e);
    if (isUniqueViolation(e)) return fail('A media asset with that key already exists', 409);
    return fail(errorMessage(e));
  }
}

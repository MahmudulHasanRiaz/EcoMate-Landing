/**
 * /api/social-links — footer/contact social profiles.
 *
 * GET is public and ordered; POST/PUT/DELETE are admin mutations (proxy.ts gates mutating
 * methods). Every field is allowlisted: the body never reaches `.values()`/`.set()` whole.
 */
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { socialLinksTable } from '@/db/schema';
import {
  asObject,
  errorMessage,
  fail,
  isUniqueViolation,
  logServerError,
  ok,
  optionalBoolean,
  optionalString,
  parseId,
} from '@/lib/json';
import type { JsonObject } from '@/lib/json';

const PLATFORMS = new Set<string>([
  'facebook',
  'youtube',
  'linkedin',
  'tiktok',
  'instagram',
  'x',
  'whatsapp',
]);

/** Only http(s) or root-relative targets: `javascript:` must never reach an href. */
const SAFE_URL = /^(https?:\/\/|\/|$)/i;

function optionalInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) return parsed;
  }
  return undefined;
}

/** Shared allowlist for POST and PUT. Absent fields stay `undefined` (partial update). */
function readLinkFields(body: JsonObject) {
  const rawPlatform = optionalString(body.platform)?.trim().toLowerCase();
  const rawUrl = optionalString(body.url)?.trim();
  return {
    platform: rawPlatform,
    url: rawUrl,
    sortOrder: optionalInt(body.sortOrder),
    isVisible: optionalBoolean(body.isVisible),
  };
}

export async function GET(req: Request) {
  try {
    const visibleOnly = new URL(req.url).searchParams.get('visible') === 'true';
    const rows = await getDb()
      .select()
      .from(socialLinksTable)
      .where(visibleOnly ? eq(socialLinksTable.isVisible, true) : undefined)
      .orderBy(asc(socialLinksTable.sortOrder), asc(socialLinksTable.id));
    return ok(rows);
  } catch (e) {
    logServerError('GET /api/social-links', e);
    return fail(errorMessage(e));
  }
}

export async function POST(req: Request) {
  try {
    const fields = readLinkFields(asObject(await req.json()));
    if (!fields.platform || !PLATFORMS.has(fields.platform)) {
      return fail(`platform must be one of: ${[...PLATFORMS].join(', ')}`, 400);
    }
    if (fields.url !== undefined && !SAFE_URL.test(fields.url)) {
      return fail('url must be http(s) or root-relative', 400);
    }
    const [created] = await getDb()
      .insert(socialLinksTable)
      .values({
        platform: fields.platform,
        url: fields.url ?? '',
        sortOrder: fields.sortOrder ?? 0,
        isVisible: fields.isVisible ?? true,
      })
      .returning();
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/social-links', e);
    if (isUniqueViolation(e)) return fail('That platform already has a link row', 409);
    return fail(errorMessage(e));
  }
}

export async function PUT(req: Request) {
  try {
    const body = asObject(await req.json());
    const id = parseId(optionalString(body.id) ?? '');
    if (id === null) return fail('id is required', 400);

    const fields = readLinkFields(body);
    if (fields.platform !== undefined && !PLATFORMS.has(fields.platform)) {
      return fail(`platform must be one of: ${[...PLATFORMS].join(', ')}`, 400);
    }
    if (fields.url !== undefined && !SAFE_URL.test(fields.url)) {
      return fail('url must be http(s) or root-relative', 400);
    }

    const patch = {
      platform: fields.platform,
      url: fields.url,
      sortOrder: fields.sortOrder,
      isVisible: fields.isVisible,
    };
    if (Object.values(patch).every((value) => value === undefined)) {
      return fail('Nothing to update', 400);
    }

    const [updated] = await getDb()
      .update(socialLinksTable)
      .set(patch)
      .where(eq(socialLinksTable.id, id))
      .returning();
    if (!updated) return fail('Social link not found', 404);
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/social-links', e);
    if (isUniqueViolation(e)) return fail('That platform already has a link row', 409);
    return fail(errorMessage(e));
  }
}

export async function DELETE(req: Request) {
  try {
    const id = parseId(new URL(req.url).searchParams.get('id') ?? '');
    if (id === null) return fail('id query parameter is required', 400);
    const [deleted] = await getDb()
      .delete(socialLinksTable)
      .where(eq(socialLinksTable.id, id))
      .returning({ id: socialLinksTable.id });
    if (!deleted) return fail('Social link not found', 404);
    return ok({ success: true, id: deleted.id });
  } catch (e) {
    logServerError('DELETE /api/social-links', e);
    return fail(errorMessage(e));
  }
}

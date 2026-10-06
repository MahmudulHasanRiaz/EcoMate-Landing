/**
 * GET/POST/PUT /api/menus — DB-managed navigation (Task 15 §1).
 *
 * The whole table is one document per `(key, locale)`: a GET returns the menu with its items
 * already nested, and a PUT replaces that set atomically. Replacing the set (rather than
 * diffing item by item) is what makes "reorder the nav" a single operation and keeps the
 * `sortOrder` sequence free of the gaps an incremental editor leaves behind.
 *
 * Reads are *public*: the header and the footer render menu data on the marketing page, which
 * is prerendered. Writes are not — they are `POST`/`PUT`, so `proxy.ts` already demands a
 * session for them, and `requireAdminRole` adds the author check (editors are read-only,
 * `lib/roles.ts` → `canWriteContent`).
 */
import { and, asc, eq, inArray } from 'drizzle-orm';
import { updateTag } from 'next/cache';
import { getDb } from '@/db/client';
import { menuItemsTable, menusTable } from '@/db/schema';
import {
  asObject,
  errorMessage,
  fail,
  logServerError,
  ok,
  readBoolean,
  readNumber,
  readString,
  readStringArray,
} from '@/lib/json';
import { requireAdminRole } from '@/lib/authz';
import { canWriteContent } from '@/lib/roles';
import { isLocale } from '@/lib/locales';
import type { Locale } from '@/src/types/landing';

const MENU_KEYS = ['main', 'footer'] as const;
type MenuKey = (typeof MENU_KEYS)[number];

export interface MenuPayload {
  key: MenuKey;
  locale: Locale;
  items: { label: string; href: string; sortOrder: number; isVisible: boolean }[];
}

function readMenuKey(value: unknown, fallback: MenuKey = 'main'): MenuKey {
  return MENU_KEYS.includes(value as MenuKey) ? (value as MenuKey) : fallback;
}

function isMenuKey(value: unknown): value is MenuKey {
  return MENU_KEYS.includes(value as MenuKey);
}

/**
 * One menu with its visible, top-level items in display order.
 *
 * `href` is validated for shape, not allowlisted against a set of pages: navigation may point
 * at an anchor (`#pricing`), a locale path (`/bn`) or an external URL, and all three are
 * legitimate. What is refused is a `javascript:` or `data:` URL, which is the only way this
 * column could become an injection vector — an admin is trusted with copy, not with script.
 */
const SAFE_HREF = /^(#|\/(?!\/)|https?:\/\/|mailto:|tel:)/;

function readHref(raw: string): string | null {
  const href = raw.trim();
  return href !== '' && SAFE_HREF.test(href) ? href : null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const keyParam = url.searchParams.get('key');
    const localeParam = url.searchParams.get('locale');

    const keys: MenuKey[] = isMenuKey(keyParam) ? [keyParam] : [...MENU_KEYS];
    const locale: Locale | null = localeParam ? (isLocale(localeParam) ? localeParam : null) : null;
    if (localeParam && !locale) return fail('Invalid locale', 400);

    const db = getDb();
    const menus = await db
      .select()
      .from(menusTable)
      .where(locale ? eq(menusTable.locale, locale) : undefined)
      .orderBy(asc(menusTable.key), asc(menusTable.locale));

    const wanted = menus.filter((menu) => keys.includes(readMenuKey(menu.key)));
    if (wanted.length === 0) return ok([] as MenuPayload[]);

    const items = await db
      .select()
      .from(menuItemsTable)
      .where(inArray(menuItemsTable.menuId, wanted.map((menu) => menu.id)))
      .orderBy(asc(menuItemsTable.sortOrder), asc(menuItemsTable.id));

    const payload: MenuPayload[] = wanted.map((menu) => ({
      key: readMenuKey(menu.key),
      locale: (isLocale(menu.locale) ? menu.locale : 'en') as Locale,
      items: items
        .filter((item) => item.menuId === menu.id && item.isVisible && item.parentId === null)
        .map((item) => ({
          label: item.label,
          href: item.href,
          sortOrder: item.sortOrder,
          isVisible: item.isVisible,
        })),
    }));
    return ok(payload);
  } catch (e) {
    logServerError('GET /api/menus', e);
    return fail(errorMessage(e));
  }
}

/**
 * Create a menu and its first item.
 *
 * The menu row and the item row are two tables, so this is a transaction (Task 3 §6): a menu
 * with no items renders as *absent* (the shell falls back to the hardcoded nav), which would
 * make a partially-completed save look like a successful one that deleted the navigation.
 */
export async function POST(req: Request) {
  const guard = await requireAdminRole(['superadmin', 'admin', 'editor']);
  if (!guard.ok) return guard.response;
  if (!canWriteContent(guard.role)) return fail('Editors cannot edit navigation', 403);

  try {
    const body = asObject(await req.json());
    const key = readMenuKey(body.key);
    const locale: Locale = isLocale(body.locale) ? body.locale : 'en';
    const label = readString(body.label).trim();
    const href = readHref(readString(body.href));
    if (!label) return fail('label is required', 400);
    if (!href) return fail('href must be a safe path, anchor or http(s) URL', 400);

    const db = getDb();
    const created = await db.transaction(async (tx) => {
      const [menu] = await tx
        .insert(menusTable)
        .values({ key, locale })
        // `menus_key_locale_idx` makes a duplicate an error; an admin re-saving a menu must
        // get 409 and be pointed at PUT, not silently create a second nav bar.
        .onConflictDoNothing({ target: [menusTable.key, menusTable.locale] })
        .returning();
      if (!menu) return null;
      const [item] = await tx
        .insert(menuItemsTable)
        .values({ menuId: menu.id, label, href })
        .returning();
      return item ?? null;
    });

    if (!created) return fail(`Menu "${key}" already exists for locale "${locale}"`, 409);
    invalidateMenu(key, locale);
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/menus', e);
    return fail(errorMessage(e));
  }
}

/**
 * Replace the whole item set of one `(key, locale)`.
 *
 * `items` is required and may be empty: an empty set is a deliberate "this menu is managed
 * but currently empty" state, which is different from the `null` the reader returns for an
 * unseeded table and is rendered differently (the shell falls back only on `null`).
 */
export async function PUT(req: Request) {
  const guard = await requireAdminRole(['superadmin', 'admin', 'editor']);
  if (!guard.ok) return guard.response;
  if (!canWriteContent(guard.role)) return fail('Editors cannot edit navigation', 403);

  try {
    const body = asObject(await req.json());
    const key = readMenuKey(body.key);
    const locale: Locale = isLocale(body.locale) ? body.locale : 'en';
    const rawItems = readStringArray(body.items);

    const parsed: { label: string; href: string; sortOrder: number; isVisible: boolean }[] = [];
    for (const [index, raw] of rawItems.entries()) {
      const item = asObject(raw);
      const label = readString(item.label).trim();
      const href = readHref(readString(item.href));
      if (!label || !href) {
        return fail(`items[${index}] needs a label and a safe href`, 400);
      }
      parsed.push({
        label,
        href,
        // Default to the array position so a client that does not send `sortOrder` still
        // stores the order it sent them in.
        sortOrder: item.sortOrder === undefined ? index : readNumber(item.sortOrder, index),
        isVisible: readBoolean(item.isVisible, true),
      });
    }

    const db = getDb();
    const [menu] = await db
      .select({ id: menusTable.id })
      .from(menusTable)
      .where(and(eq(menusTable.key, key), eq(menusTable.locale, locale)))
      .limit(1);
    if (!menu) return fail(`Menu "${key}" for locale "${locale}" not found`, 404);

    const rows = await db.transaction(async (tx) => {
      // Replace wholesale. The delete cascades to nothing else: `menu_items` has no children
      // beyond itself, and the ids change on every save, which is why no external table
      // references them.
      await tx.delete(menuItemsTable).where(eq(menuItemsTable.menuId, menu.id));
      if (parsed.length === 0) return [];
      return tx
        .insert(menuItemsTable)
        .values(parsed.map((item) => ({ ...item, menuId: menu.id })))
        .returning();
    });

    invalidateMenu(key, locale);
    return ok({ key, locale, items: rows });
  } catch (e) {
    logServerError('PUT /api/menus', e);
    return fail(errorMessage(e));
  }
}

/**
 * Same-request `updateTag` so the admin sees the navigation change on the page behind them.
 * Wrapped because a handler invoked outside Next's request pipeline has no tag store; the
 * write has already committed and the page revalidates on its own profile anyway.
 */
function invalidateMenu(key: MenuKey, locale: Locale): void {
  try {
    updateTag(`menus:${key}:${locale}`);
  } catch (e) {
    logServerError('PUT /api/menus invalidation', e);
  }
}
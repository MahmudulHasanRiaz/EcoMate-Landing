/**
 * GET/POST/PUT /api/menus — DB-managed navigation (Task 15 §1).
 *
 * The whole table is one document per `(key, locale)`: a GET returns the menu with its items
 * already nested, and a PUT replaces that set atomically. Replacing the set (rather than
 * diffing item by item) is what makes "reorder the nav" a single operation and keeps the
 * `sortOrder` sequence free of the gaps an incremental editor leaves behind.
 *
 * Reads are *public*: the header and the footer render menu data on the marketing page, which
 * is prerendered. Writes are admin-only: navigation is site chrome (Decision 1 matrix —
 * same as social links and landing sections), so `POST`/`PUT` require
 * `requireRole(ADMIN_ONLY_ROLES)`, not just any session.
 */
import { and, asc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { menuItemsTable, menusTable } from '@/db/schema';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { requestId } from '@/lib/request';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { isLocale } from '@/lib/locales';
import { menuCreate, menuReplace, stripUnknownKeys, type MENU_KEYS } from '@/lib/validation';
import { invalidateMenus } from '@/lib/revalidate';
import type { Locale } from '@/src/types/landing';

type MenuKey = (typeof MENU_KEYS)[number];

export interface MenuPayload {
  key: MenuKey;
  locale: Locale;
  items: { label: string; href: string; sortOrder: number; isVisible: boolean }[];
}

function readMenuKey(value: unknown, fallback: MenuKey = 'main'): MenuKey {
  return value === 'main' || value === 'footer' ? value : fallback;
}

function isMenuKey(value: unknown): value is MenuKey {
  return value === 'main' || value === 'footer';
}

export async function GET(req: Request) {
  const reqId = requestId(req);
  try {
    const url = new URL(req.url);
    const keyParam = url.searchParams.get('key');
    const localeParam = url.searchParams.get('locale');

    const keys: MenuKey[] = isMenuKey(keyParam) ? [keyParam] : ['main', 'footer'];
    const locale: Locale | null = localeParam ? (isLocale(localeParam) ? localeParam : null) : null;
    if (localeParam && !locale) return fail('Invalid locale', 400, undefined, reqId);

    const db = getDb();
    const menus = await db
      .select()
      .from(menusTable)
      .where(locale ? eq(menusTable.locale, locale) : undefined)
      .orderBy(asc(menusTable.key), asc(menusTable.locale));

    const wanted = menus.filter((menu) => isMenuKey(menu.key));
    if (wanted.length === 0) return ok([] as MenuPayload[]);

    const items = await db
      .select()
      .from(menuItemsTable)
      .where(inArray(menuItemsTable.menuId, wanted.map((menu) => menu.id)))
      .orderBy(asc(menuItemsTable.sortOrder), asc(menuItemsTable.id));

    const payload: MenuPayload[] = wanted
      .filter((menu) => keys.includes(readMenuKey(menu.key)))
      .map((menu) => ({
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
    logServerError('GET /api/menus', e, reqId);
    return fail(errorMessage(e), 500, undefined, reqId);
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
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const parsed = menuCreate.safeParse(stripUnknownKeys(menuCreate, await req.json().catch(() => null)));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    const key = parsed.data.key;
    const locale: Locale = parsed.data.locale ?? 'en';
    const { label, href } = parsed.data;

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
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const parsed = menuReplace.safeParse(stripUnknownKeys(menuReplace, await req.json().catch(() => null)));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    const key = parsed.data.key;
    const locale: Locale = parsed.data.locale ?? 'en';
    // Default to the array position so a client that does not send `sortOrder` still
    // stores the order it sent them in.
    const items = parsed.data.items.map((item, index) => ({
      label: item.label,
      href: item.href,
      sortOrder: item.sortOrder ?? index,
      isVisible: item.isVisible ?? true,
    }));

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
      if (items.length === 0) return [];
      return tx
        .insert(menuItemsTable)
        .values(items.map((item) => ({ ...item, menuId: menu.id })))
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
 * Same-request `updateTag` via `lib/revalidate.ts` so the admin sees the navigation change
 * on the page behind them. Centralised there so the tag string (`menus:${key}:${locale}`)
 * has exactly one writer matching the one reader in `lib/content.ts`.
 */
function invalidateMenu(key: MenuKey, locale: Locale): void {
  invalidateMenus(key, locale);
}

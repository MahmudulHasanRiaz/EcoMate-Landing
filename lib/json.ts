/**
 * Shared helpers for Route Handlers: JSON responses on one side, request bodies on the
 * other.
 *
 * The readers exist because a request body is attacker-controlled. Every handler
 * allowlists the exact fields it accepts and narrows each one to the type the column
 * accepts, so nothing from the wire is ever spread into `.set()` / `.values()`.
 */

export function ok(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function fail(message: string, status = 500): Response {
  return Response.json({ error: message }, { status });
}

/** `catch` binds `unknown` under strict mode — never widen it to `any`. */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Log the full error server-side (Workers logs / `next dev` console) while the response
 * body stays the terse message. Without this, a failing route is only visible to whoever
 * happened to curl it.
 */
export function logServerError(scope: string, e: unknown): void {
  console.error(`[api] ${scope} failed:`, e);
}

/**
 * Postgres unique-constraint violation (SQLSTATE 23505), surfaced by postgres-js as
 * `error.code`. Drizzle wraps driver errors, so the whole `cause` chain is inspected.
 * Lets a handler answer 409 instead of leaking a raw driver message as a 500.
 */
export function isUniqueViolation(e: unknown): boolean {
  let current: unknown = e;
  for (let depth = 0; depth < 4 && typeof current === 'object' && current !== null; depth++) {
    if ((current as { code?: unknown }).code === '23505') return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export type JsonObject = Record<string, unknown>;

export function asObject(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

/** Plain objects only — used for jsonb columns that must stay objects. */
export function optionalObject(value: unknown): JsonObject | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

/** Required text field: anything that is not a string becomes `''`. */
export function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Optional text field for partial updates: absent/non-scalar stays `undefined`. */
export function optionalString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

export function readNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function readIsoDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Route params arrive as strings (`params: Promise<{ id: string }>`). Returns `null` for
 * anything that is not a positive integer so handlers can answer 400 instead of silently
 * querying `id = NaN`.
 */
export function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

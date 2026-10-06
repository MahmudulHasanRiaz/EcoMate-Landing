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

export function fail(message: string, status = 500, details?: unknown): Response {
  return Response.json(
    details === undefined ? { error: message } : { error: message, details },
    { status },
  );
}

/** `catch` binds `unknown` under strict mode — never widen it to `any`. */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Log the full error server-side (Workers logs / `next dev` console) while the response
 * body stays the terse message. Without this, a failing route is only visible to whoever
 * happened to curl it.
 *
 * Emits one JSON object rather than `console.error(message, error)`: a thrown Error stringifies
 * with embedded newlines, and Workers treats each line as its own log entry. Structured output
 * keeps one failure on one line, carries the request id so it can be joined to the edge's
 * `cf-ray`, and gives a log query something stable to filter on.
 *
 * `scope` is the operation name (`"POST /api/leads"`) — it becomes the `op` field. Stack traces
 * are dropped: `wrangler tail` already prints them for uncaught throws, and repeating a full
 * stack on every caught-and-logged error doubles the ingest volume.
 */
export function logServerError(scope: string, e: unknown, requestId?: string): void {
  const entry: Record<string, unknown> = {
    level: 'error',
    event: 'api.error',
    op: scope,
    // Explicitly threaded rather than ambient. A module-level "current request" variable is
    // wrong on Workers: an isolate interleaves requests at every `await`, so a second handler
    // can run inside the first one's lifetime and log the wrong id. Threading the value costs
    // one argument per call site and removes the possibility entirely.
    requestId: requestId ?? null,
    message: errorMessage(e),
  };
  if (e instanceof Error && e.name) entry.errorName = e.name;
  // Drivers attach the machine-readable cause (SQLSTATE, HTTP status) one or two links down;
  // without it, "Postgres error" and "constraint 23505" are indistinguishable in a log search.
  const code = errorCode(e);
  if (code !== '') entry.code = code;
  try {
    console.error(JSON.stringify(entry));
  } catch {
    // JSON.stringify can throw on a BigInt inside the cause chain. A plain message is still
    // better than losing the error entirely.
    console.error(`[api] ${scope} failed: ${errorMessage(e)}`);
  }
}

/**
 * The machine-readable error code from a driver, walking the `cause` chain the way
 * `isUniqueViolation` does. Empty string when there is none.
 */
function errorCode(e: unknown): string {
  let current: unknown = e;
  for (let depth = 0; depth < 4 && typeof current === 'object' && current !== null; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && code !== '') return code;
    current = (current as { cause?: unknown }).cause;
  }
  return '';
}

/**
 * 500 with the request id in the body.
 *
 * The id is safe to return: it is a ray id or a uuid, and an operator reading it can quote it
 * back into a log search. Returning it is the difference between "it broke" and a report that
 * can be traced to a single Worker invocation.
 */
export function failWithRequestId(message: string, requestId?: string, status = 500): Response {
  return Response.json({ error: message, requestId: requestId ?? null }, { status });
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

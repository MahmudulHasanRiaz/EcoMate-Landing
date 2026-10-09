/**
 * Shared field-error helper for the admin UI (Task 17 §5).
 *
 * Mutation routes answer a failed validation with
 * `{ error, details: { issues: [{ path, message }] } }`, where `path` is the Zod issue
 * path (e.g. `["siteName"]`). A generic toast tells the operator *something* failed but
 * not *where*; this module maps each issue to the field id it belongs to so the form can
 * render the message against the right input.
 *
 * One helper rather than per-form parsing: every admin form consumes the same envelope.
 */

export interface ValidationIssue {
  path: (string | number)[];
  message: string;
}

/** Field id → message, for the fields the form actually renders. */
export type FieldErrors = Record<string, string>;

/** Pull the Zod issues out of an error payload, or `null` when it is not a 400 envelope. */
export function extractIssues(payload: unknown): ValidationIssue[] | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const details = (payload as { details?: unknown }).details;
  if (typeof details !== 'object' || details === null) return null;
  const issues = (details as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) return null;
  const parsed: ValidationIssue[] = [];
  for (const issue of issues) {
    if (typeof issue !== 'object' || issue === null) continue;
    const { path, message } = issue as { path?: unknown; message?: unknown };
    if (typeof message !== 'string') continue;
    const segments = Array.isArray(path)
      ? path.filter((segment): segment is string | number => typeof segment === 'string' || typeof segment === 'number')
      : typeof path === 'string'
        ? [path]
        : [];
    parsed.push({ path: segments, message });
  }
  return parsed;
}

/**
 * Collapse issues to the top-level field they belong to (`issues[].path[0]`).
 *
 * Nested paths (`items[2].href`) attribute to their root field; a caller that renders
 * nested rows can split further, but the flat form only needs the root.
 */
export function toFieldErrors(payload: unknown): FieldErrors {
  const issues = extractIssues(payload);
  if (!issues) return {};
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const [root] = issue.path;
    const key = typeof root === 'number' ? String(root) : (root ?? '');
    if (key === '') continue;
    // First message wins per field: one input shows one error, not a stack.
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/** An `Error` that also carries the per-field breakdown for the form that threw it. */
export class ApiValidationError extends Error {
  readonly fieldErrors: FieldErrors;
  /** HTTP status of the failed response (Phase 3b: lets callers branch on 503/409/…). */
  readonly status: number;

  constructor(message: string, payload: unknown, status = 0) {
    super(message);
    this.name = 'ApiValidationError';
    this.fieldErrors = toFieldErrors(payload);
    this.status = status;
  }
}

/** Read a failed response into a thrown error that keeps the server's message + issues. */
export async function throwApiError(response: Response, fallback: string): Promise<never> {
  const payload: unknown = await response.json().catch(() => null);
  const message =
    typeof payload === 'object' && payload !== null && 'error' in payload
      ? String((payload as { error: unknown }).error)
      : fallback;
  throw new ApiValidationError(message || fallback, payload, response.status);
}

/** Field errors from any caught submission error (validation or otherwise). */
export function fieldErrorsOf(error: unknown): FieldErrors {
  return error instanceof ApiValidationError ? error.fieldErrors : {};
}

/**
 * Auth.js catch-all endpoint: sign-in, sign-out, session, CSRF, callbacks.
 *
 * A dedicated route (not the proxy) so `/api/auth/*` keeps working when the proxy matcher
 * changes.
 */
import { handlers } from '@/auth';

export const { GET, POST } = handlers;

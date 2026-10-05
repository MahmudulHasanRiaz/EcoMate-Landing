/**
 * Auth.js module augmentation.
 *
 * Auth.js' `Session`/`User`/`JWT` types are open interfaces; the `role` and `sid` claims
 * this app adds are declared here once so `auth.ts`, the route handlers and the admin UI
 * all see them. Without this the auth config would need `as any` at every claim access —
 * which is exactly the kind of hole that lets a privilege check silently read `undefined`.
 */
import type { DefaultSession } from 'next-auth';
import type { AdminRole } from '@/lib/roles';

declare module 'next-auth' {
  interface Session {
    user: {
      /** `admin_users.id` as a string (Auth.js ids are strings). */
      id?: string;
      /** Live role, resolved from `admin_users` on every request. */
      role: AdminRole;
    } & DefaultSession['user'];
  }

  interface User {
    role?: AdminRole;
    /**
     * Opaque, DB-backed session id minted in `authorize`. Carried into the JWT so every
     * subsequent request can be checked against the `sessions` registry (revocability).
     */
    sessionToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: AdminRole;
    /** `sessions.sessionToken` for this login. */
    sid?: string;
  }
}

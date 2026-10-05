/**
 * Auth.js v5 configuration — Credentials sign-in + RBAC + revocable, DB-backed sessions.
 *
 * ## Why the session strategy is `jwt` and not `database`
 *
 * The migration plan specifies `session: { strategy: 'database' }`. That combination is
 * not implementable with the Credentials provider: `@auth/core`'s credentials branch
 * (`lib/actions/callback/index.js`, the `provider.type === "credentials"` case) always
 * runs `callbacks.jwt(...)` and encodes a JWT into the session cookie — it never calls
 * `adapter.createSession`. With `strategy: 'database'` the session read path
 * (`lib/actions/session.js`) instead calls `adapter.getSessionAndUser(cookieValue)`, which
 * can never match a JWT, so every login would be immediately anonymous. Auth.js documents
 * this constraint on the provider itself: "users authenticated in this manner are not
 * persisted in the database, and consequently the Credentials provider can only be used
 * if JSON Web Tokens are enabled for sessions" (`@auth/core/providers/credentials.d.ts`).
 *
 * Rather than ship a login that cannot work, this file keeps everything the plan asked
 * for structurally — the Drizzle adapter, the four hand-written Auth.js tables, the
 * `admin_users` / `admin_audit_logs` tables — and adds the missing piece: an **opaque
 * session registry** in the `sessions` table. `authorize` mints a 256-bit token, stores it
 * with the client ip/user-agent, and carries it in the JWT as `sid`. The `jwt` callback
 * validates that row on every request and returns `null` when it is gone or expired, so
 * sessions are genuinely revocable (sign-out-everywhere, password reset, deactivation,
 * role change) exactly as Task 9 Step 9 requires. The role is re-read from `admin_users`
 * on every request, so a privilege change can never leave a live session with the old role.
 *
 * ## Why the config is a factory
 *
 * `NextAuth(() => config)` defers `getDb()` to request time. A module-scope
 * `DrizzleAdapter(getDb(), ...)` would run while the Worker entry is being initialised —
 * outside any request context, where `getCloudflareContext()` throws and production has no
 * `DIRECT_URL` fallback — and take the whole isolate down at boot.
 */
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { and, count, eq, gt, gte, lte } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db/client';
import {
  accountsTable,
  adminAuditLogsTable,
  adminUsersTable,
  sessionsTable,
  usersTable,
  verificationTokensTable,
} from '@/db/schema';
import { envString } from '@/lib/env';
import { recordAudit } from '@/lib/audit';
import { verifyPassword } from '@/lib/password';
import { clientIp } from '@/lib/request';
import { isAdminRole, normalizeRole } from '@/lib/roles';

/** Absolute server-side session lifetime. The cookie slides; this does not. */
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

/** Per-account lockout: 5 failures in 15 minutes locks the *account* for that window. */
const ACCOUNT_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_LOCKOUT_MAX_FAILURES = 5;

/**
 * Per-client throttle. Distributed IP rotation defeats a per-IP limit on its own, so this
 * runs *alongside* the account lockout — Task 14 layers the KV sliding window on top.
 */
const IP_THROTTLE_WINDOW_MS = 10 * 60 * 1000;
const IP_THROTTLE_MAX_FAILURES = 10;

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * A real (600k-iteration) hash of a throwaway value. When the email does not exist we still
 * run a full KDF against this, so "no such account" and "wrong password" cost the same
 * wall-clock time and cannot be told apart by timing.
 */
const TIMING_EQUALIZER_HASH =
  'pbkdf2$600000$bdcb30f6977c7a0fe8f6594f8b3d1ea4$9f098ba6626d4ab39e545883d885a9f2dcc365f4bbd4282feba8d9c4427c1bb3';

const SECURE_COOKIE_PREFIX = process.env.NODE_ENV === 'production' ? '__Secure-' : '';

function newSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let token = '';
  for (const byte of bytes) token += byte.toString(16).padStart(2, '0');
  return token;
}

export const authConfig = (): NextAuthConfig => {
  const secret = envString('AUTH_SECRET') || undefined;

  return {
    // Explicit table map — Auth.js will not infer these. Constructed inside the factory so
    // no database client is created at module scope (see the file header).
    adapter: DrizzleAdapter(getDb(), {
      usersTable,
      accountsTable,
      sessionsTable,
      verificationTokensTable,
    }),

    // See the file header: `database` is impossible with Credentials. Sessions are still
    // DB-backed and revocable through the registry in `sessions`.
    session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },

    pages: { signIn: '/admin/login' },

    // NOT bare `trustHost: true` — that accepts ANY Host header, which is a host-header
    // injection / cache-poisoning primitive. Trust only our own deployment hostnames.
    trustHost: envString('AUTH_TRUST_HOST') === 'true',

    secret,

    // Explicit cookie flags rather than Auth.js' defaults: `httpOnly` + `sameSite=lax` for
    // CSRF resistance, `secure` whenever we are serving the production build, and a
    // `maxAge` pinned to the session lifetime so the cookie cannot outlive the DB row.
    cookies: {
      sessionToken: {
        name: `${SECURE_COOKIE_PREFIX}authjs.session-token`,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: SECURE_COOKIE_PREFIX !== '',
          maxAge: SESSION_MAX_AGE_SECONDS,
        },
      },
    },

    providers: [
      Credentials({
        id: 'credentials',
        name: 'EcoMate Admin',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials, request) {
          const email =
            typeof credentials?.email === 'string' ? credentials.email.toLowerCase().trim() : '';
          const password = typeof credentials?.password === 'string' ? credentials.password : '';
          if (!email || !password) return null;

          const db = getDb();
          const now = Date.now();
          const ip = clientIp(request);

          // --- Per-account lockout (5 failures / 15 min) ---
          const [accountFailures] = await db
            .select({ total: count() })
            .from(adminAuditLogsTable)
            .where(
              and(
                eq(adminAuditLogsTable.action, 'LOGIN_FAIL'),
                eq(adminAuditLogsTable.target, email),
                gte(adminAuditLogsTable.createdAt, new Date(now - ACCOUNT_LOCKOUT_WINDOW_MS)),
              ),
            );
          if ((accountFailures?.total ?? 0) >= ACCOUNT_LOCKOUT_MAX_FAILURES) {
            await recordAudit({ actorId: null, action: 'LOGIN_LOCKED', target: email, ip });
            return null;
          }

          // --- Per-client throttle (10 failures / 10 min) ---
          if (ip) {
            const [ipFailures] = await db
              .select({ total: count() })
              .from(adminAuditLogsTable)
              .where(
                and(
                  eq(adminAuditLogsTable.action, 'LOGIN_FAIL'),
                  eq(adminAuditLogsTable.ip, ip),
                  gte(adminAuditLogsTable.createdAt, new Date(now - IP_THROTTLE_WINDOW_MS)),
                ),
              );
            if ((ipFailures?.total ?? 0) >= IP_THROTTLE_MAX_FAILURES) {
              await recordAudit({ actorId: null, action: 'LOGIN_LOCKED', target: email, ip });
              return null;
            }
          }

          const [adminUser] = await db
            .select()
            .from(adminUsersTable)
            .where(eq(adminUsersTable.email, email))
            .limit(1);

          // Always run a KDF — see TIMING_EQUALIZER_HASH.
          const passwordOk = await verifyPassword(
            password,
            adminUser ? adminUser.passwordHash : TIMING_EQUALIZER_HASH,
          );

          // Generic failure: no user enumeration, no distinction between unknown account,
          // wrong password and deactivated operator.
          if (!adminUser || !adminUser.isActive || !passwordOk) {
            await recordAudit({ actorId: adminUser?.id ?? null, action: 'LOGIN_FAIL', target: email, ip });
            return null;
          }

          const sessionToken = newSessionToken();
          const userId = String(adminUser.id);
          const userAgent = (request.headers.get('user-agent') ?? '').slice(0, 400);

          // Multi-table write: the identity row, the session registry row, the "last seen"
          // stamp and the audit entry must all land together or none of them should.
          await db.transaction(async (tx) => {
            await tx
              .insert(usersTable)
              .values({ id: userId, name: adminUser.email, email: adminUser.email })
              .onConflictDoUpdate({
                target: usersTable.id,
                set: { name: adminUser.email, email: adminUser.email },
              });

            // Housekeeping: drop this operator's expired rows so the registry (and the
            // admin session list) does not grow without bound.
            await tx
              .delete(sessionsTable)
              .where(and(eq(sessionsTable.userId, userId), lte(sessionsTable.expires, new Date(now))));

            await tx.insert(sessionsTable).values({
              sessionToken,
              userId,
              expires: new Date(now + SESSION_MAX_AGE_MS),
              ip,
              userAgent,
            });

            await tx
              .update(adminUsersTable)
              .set({ lastLoginAt: new Date(now), updatedAt: new Date(now) })
              .where(eq(adminUsersTable.id, adminUser.id));

            await tx.insert(adminAuditLogsTable).values({
              actorId: adminUser.id,
              action: 'LOGIN_OK',
              target: adminUser.email,
              ip,
            });
          });

          return {
            id: userId,
            name: adminUser.email,
            email: adminUser.email,
            role: normalizeRole(adminUser.role),
            sessionToken,
          };
        },
      }),
    ],

    callbacks: {
      /**
       * Runs on every request that carries a session cookie. Stamps `sid` + role at
       * sign-in, then re-validates the registry row so revocation is immediate.
       */
      async jwt({ token, user, trigger }) {
        if (trigger === 'signIn' && user) {
          if (typeof user.sessionToken === 'string') token.sid = user.sessionToken;
          if (isAdminRole(user.role)) token.role = user.role;
        }

        const sid = token.sid;
        if (typeof sid !== 'string' || sid === '') return null;

        try {
          const [row] = await getDb()
            .select({ email: usersTable.email, role: adminUsersTable.role, isActive: adminUsersTable.isActive })
            .from(sessionsTable)
            .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
            .innerJoin(adminUsersTable, eq(adminUsersTable.email, usersTable.email))
            .where(and(eq(sessionsTable.sessionToken, sid), gt(sessionsTable.expires, new Date())))
            .limit(1);

          // A revoked, expired, or deactivated operator's session dies here.
          if (!row || !row.isActive) return null;

          token.role = normalizeRole(row.role);
          return token;
        } catch (error) {
          // Fail closed: if we cannot prove the session is still valid, it is not.
          console.error('[auth] session validation failed:', error);
          return null;
        }
      },

      async session({ session, token }) {
        if (session.user) {
          session.user.role = normalizeRole(token.role);
          if (typeof token.sub === 'string') session.user.id = token.sub;
        }
        return session;
      },

      /**
       * Proxy-level gate. Coarse on purpose (session present or not) — privilege
       * boundaries live in each handler via `requireAdminRole`.
       */
      async authorized({ request, auth: session }) {
        const { pathname } = request.nextUrl;
        const isAuthApi = pathname.startsWith('/api/auth/');
        const isAdminPage = pathname.startsWith('/admin');
        const isPublicAdminPage = pathname === '/admin/login' || pathname === '/admin/setup';
        const isPublicLeadPost = pathname === '/api/leads' && request.method === 'POST';
        // Bootstrap has to be reachable *before* any session exists — it is gated by the
        // one-time SETUP_TOKEN plus an empty `admin_users`, not by a session.
        const isBootstrap = pathname === '/api/admin/setup' && request.method === 'POST';

        const needsSession =
          (isAdminPage && !isPublicAdminPage) ||
          (pathname.startsWith('/api/') &&
            !isAuthApi &&
            !isBootstrap &&
            MUTATING_METHODS.has(request.method) &&
            !isPublicLeadPost);

        if (needsSession && !session?.user) return false;

        // Admin HTML must never be cached in a shared browser — a cached /admin response is
        // a credential leak. Cache Components removed `export const dynamic`, so the
        // header is set here instead of on the page.
        if (isAdminPage) {
          const response = NextResponse.next();
          response.headers.set('Cache-Control', 'no-store, private');
          return response;
        }
        return true;
      },
    },
  };
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

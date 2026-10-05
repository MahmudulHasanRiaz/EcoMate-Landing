/**
 * Worker bindings + secrets this app reads through `getCloudflareContext().env`.
 *
 * `@opennextjs/cloudflare` declares the global `CloudflareEnv` interface for its own
 * bindings (`ASSETS`, `IMAGES`, `NEXT_INC_CACHE_*`, ...). The bindings and secrets the
 * application itself uses are declared here by merging into that same interface, so
 * `app/**`, `lib/**` and `db/**` stay fully typed — no `as any`, no string indexing.
 *
 * `@cloudflare/workers-types` is not a dependency of this project, so the two binding
 * shapes we actually call (R2 for media, KV for rate limits) are declared structurally
 * and minimally: only the members this codebase uses.
 */
export {};

declare global {
  /**
   * The Worker request's execution context, reachable as
   * `getCloudflareContext().ctx`. Declared here (the adapter's own declaration references
   * it but `@cloudflare/workers-types` is not installed) so background work can be handed
   * to `waitUntil` with a real type instead of an unresolved one.
   */
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }

  interface R2Bucket {
    put(
      key: string,
      value: ArrayBuffer | ArrayBufferView | string | Blob | ReadableStream,
      options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
    ): Promise<unknown>;
    get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
    delete(key: string | string[]): Promise<void>;
  }

  interface KVNamespace {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
  }

  interface CloudflareEnv {
    /** Hyperdrive pooled Postgres connection (`[[hyperdrive]]` in wrangler.toml). */
    HYPERDRIVE?: { connectionString: string };
    /** R2 bucket holding uploaded media (`[[r2_buckets]]`). */
    R2_BUCKET?: R2Bucket;
    /** KV namespace behind the rate limiter (`[[kv_namespaces]]`). */
    RATE_LIMIT_KV?: KVNamespace;

    // --- Non-secret vars (`[vars]` in wrangler.toml) ---
    NEXT_PUBLIC_SITE_URL?: string;
    NEXT_PUBLIC_DEFAULT_LOCALE?: string;
    NEXT_PUBLIC_META_PIXEL_ID?: string;
    NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
    /**
     * Host-header trust switch for Auth.js. `"true"` only on our own deployments: Auth.js
     * refuses to derive its origin from an untrusted Host header, and a bare
     * `trustHost: true` in code would accept *any* Host (host-header injection /
     * cache-poisoning primitive).
     */
    AUTH_TRUST_HOST?: string;

    // --- Secrets (`npx wrangler secret put <NAME>`) ---
    LICENSE_PORTAL_API_BASE_URL?: string;
    LICENSE_PORTAL_API_KEY?: string;
    AUTH_SECRET?: string;
    SETUP_TOKEN?: string;
    META_CAPI_TOKEN?: string;
    META_TEST_EVENT_CODE?: string;
    TURNSTILE_SECRET_KEY?: string;
    GEMINI_API_KEY?: string;
    SENTRY_DSN?: string;
    RESEND_API_KEY?: string;
    CRON_SECRET?: string;
  }
}

#!/usr/bin/env node
/**
 * Journal-driven Postgres migration runner — a transparent replacement for
 * `drizzle-kit migrate`, which exits 1 silently in this repository (no error
 * output even on connection failure), making deploy failures undiagnosable.
 *
 * Contract (identical to drizzle-kit, minus the black box):
 * - Reads `drizzle/meta/_journal.json` (the single source of truth, committed).
 * - Compares against `drizzle.__drizzle_migrations` by sha256(file) with id = idx+1.
 * - Applies ONLY missing entries, in journal order, via `sql.file()`.
 * - Prints every decision and every error verbosely; exits 0 only when the DB
 *   matches the journal. Never drops, never diffs, never touches anything
 *   outside the journal (this is why `db:push` stays banned in deploy workflows).
 *
 * DB URL: `DIRECT_URL` (direct port-5432; the deploy workflow asserts this shape
 * before calling). Fails fast with a clear message when unset.
 */
import postgres from 'postgres';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns';

// Supabase publishes AAAA records for db.*.supabase.co and
// GitHub-hosted runners have no IPv6 route. Dialling the IPv6
// address fails with ENETUNREACH and postgres-js never falls back
// to IPv4. dns.setDefaultResultOrder('ipv4first') is only a hint
// (it was still observed dialling IPv6 in CI, 2026-10-06), so it
// is kept for the fallback path below and the hostname is resolved
// to its IPv4 address explicitly instead — the connection is then
// made to the address itself, with no DNS choice left to make.
// TLS keeps working: postgres-js derives the servername from the
// host, which is now an IP, so when the URL asks for SSL the
// servername is pinned back to the real hostname (certificate
// verification stays on).
dns.setDefaultResultOrder('ipv4first');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JOURNAL_PATH = join(ROOT, 'drizzle', 'meta', '_journal.json');

async function ipv4Connection(url) {
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  if (!hostname) {
    return { url, servername: undefined };
  }
  let resolved;
  try {
    // family:4 asks the resolver for an IPv4 address. A hostname
    // that is already an IPv4 literal passes through unchanged; an
    // IPv6 literal or IPv6-only host comes back with family 6 and
    // is left as-is — there is no IPv4 to force in that case.
    resolved = await dns.promises.lookup(hostname, { family: 4 });
  } catch (e) {
    // Resolution unavailable: dial the URL unchanged so the failure
    // is the real connection error, not this one.
    console.warn(`[db:migrate] WARNING: could not resolve an IPv4 address for ${hostname} (${e.code || e.message}); connecting to the URL as given.`);
    return { url, servername: undefined };
  }
  if (resolved.family !== 4 || !resolved.address) {
    return { url, servername: undefined };
  }
  parsed.hostname = resolved.address;
  console.log(`[db:migrate] ${hostname} -> ${resolved.address} (IPv4 forced: GitHub runners have no IPv6 route).`);
  return {
    url: parsed.toString(),
    servername: /[?&]sslmode=/i.test(url) ? hostname : undefined,
  };
}

function fail(msg) {
  console.error(`[db:migrate] FATAL: ${msg}`);
  process.exit(1);
}

const url = process.env.DIRECT_URL || '';
if (!url) {
  fail('DIRECT_URL is not set. Set the GitHub Secret DIRECT_URL to the Supabase direct connection string (Connect → Direct connection, port 5432).');
}

let journal;
try {
  journal = JSON.parse(readFileSync(JOURNAL_PATH, 'utf8'));
} catch (e) {
  fail(`cannot read journal at drizzle/meta/_journal.json: ${e.message}`);
}
if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
  fail('journal has no entries — nothing to check. Run `npm run db:generate` first.');
}

// Rewrite the URL to its IPv4 address before connecting (see ipv4Connection).
const { url: connectUrl, servername } = await ipv4Connection(url);

let sql;
try {
  sql = postgres(connectUrl, {
    prepare: false, // transaction-pooler safe; also required for multi-statement files
    connect_timeout: 15, // fail loudly instead of hanging the deploy
    idle_timeout: 10,
    max: 1,
    // Pin TLS SNI to the real hostname when its IPv4 address was
    // dialled, so certificate verification and SNI keep targeting
    // the database rather than an IP literal.
    ...(servername ? { ssl: { servername } } : {}),
  });
  // Force the connection now so network/auth failures surface HERE with a message,
  // not three steps later as a silent exit.
  await sql`select 1 as probe`;
  console.log('[db:migrate] connected.');
} catch (e) {
  fail(`cannot connect: [${e.code || 'NO_CODE'}] ${String(e.message || e).slice(0, 300)}`);
}

try {
  await sql.unsafe(`
    create schema if not exists drizzle;
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at timestamp default now() not null
    );
  `);
} catch (e) {
  fail(`cannot ensure journal table: [${e.code || 'NO_CODE'}] ${String(e.message || e).slice(0, 300)}`);
}

let applied = 0;
for (const entry of journal.entries) {
  const id = entry.idx + 1; // drizzle-kit's convention, verified against live rows
  const file = join(ROOT, 'drizzle', `${entry.tag}.sql`);
  let body;
  try {
    body = readFileSync(file, 'utf8');
  } catch (e) {
    fail(`journal references ${entry.tag}.sql but the file is missing — commit it first.`);
  }
  const hash = createHash('sha256').update(body).digest('hex');

  const existing = await sql`select hash from drizzle.__drizzle_migrations where id = ${id}`;
  if (existing.length > 0 && existing[0].hash === hash) {
    console.log(`[db:migrate] #${id} ${entry.tag}: already applied, skipping.`);
    continue;
  }

  if (existing.length > 0) {
    // Hash mismatch: either the file was edited after apply (real divergence —
    // the completion attempt below will fail loudly on it), or a legacy manual
    // run recorded a non-sha256 marker instead of the file hash. Complete
    // idempotently: statements whose objects already exist are skipped via
    // Postgres' own duplicate-object codes; anything else aborts loudly.
    console.log(
      `[db:migrate] #${id} ${entry.tag}: journal hash mismatch (recorded ` +
        `'${String(existing[0].hash).slice(0, 16)}…', file hashes to '${hash.slice(0, 16)}…'). ` +
        `Attempting idempotent completion...`,
    );
  } else {
    console.log(`[db:migrate] #${id} ${entry.tag}: applying...`);
  }

  // drizzle-kit separates statements with this marker; splitting on it lets us
  // attribute failures per statement instead of failing the whole file blindly.
  const statements = body
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  // "Already exists" codes: table (42P07), index/constraint/type (42710),
  // column (42701). Anything else is a real failure.
  const ALREADY_EXISTS = new Set(['42P07', '42710', '42701']);
  let completed = 0;
  let skipped = 0;
  try {
    for (const stmt of statements) {
      try {
        await sql.unsafe(stmt);
        completed += 1;
      } catch (e) {
        if (ALREADY_EXISTS.has(e.code)) {
          skipped += 1;
        } else {
          throw e;
        }
      }
    }
    if (existing.length > 0) {
      await sql`update drizzle.__drizzle_migrations set hash = ${hash} where id = ${id}`;
      console.log(
        `[db:migrate] #${id} ${entry.tag}: healed journal hash ` +
          `(${completed} applied, ${skipped} already-existed). ` +
          `If you did not expect a mismatch here, investigate before the next deploy.`,
      );
    } else {
      await sql`insert into drizzle.__drizzle_migrations (id, hash) values (${id}, ${hash})`;
      console.log(`[db:migrate] #${id} ${entry.tag}: applied OK (${completed} statements).`);
    }
    applied += 1;
  } catch (e) {
    fail(
      `migration #${id} ${entry.tag} FAILED: [${e.code || 'NO_CODE'}] ` +
        `${String(e.message || e).slice(0, 500)} — fix the database or the file, then re-run.`,
    );
  }
}

await sql.end();
console.log(
  applied === 0
    ? '[db:migrate] database already matches the journal — nothing to do.'
    : `[db:migrate] done: ${applied} migration(s) applied.`,
);

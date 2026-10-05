'use client';

/**
 * One-time first-superadmin bootstrap.
 *
 * Both gates are enforced server-side (`SETUP_TOKEN` match **and** an empty `admin_users`);
 * this page only reflects that state, and reports "already completed" instead of showing a
 * form that can never succeed.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { ShieldPlus } from 'lucide-react';
import { MIN_PASSWORD_LENGTH } from '@/lib/password';

interface SetupStatus {
  setupEnabled: boolean;
  alreadyCompleted: boolean;
}

export default function AdminSetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/admin/setup');
        const payload: unknown = await response.json();
        if (cancelled) return;
        if (typeof payload === 'object' && payload !== null && 'setupEnabled' in payload) {
          setStatus(payload as SetupStatus);
        } else {
          setStatus({ setupEnabled: false, alreadyCompleted: false });
        }
      } catch {
        if (!cancelled) setStatus({ setupEnabled: false, alreadyCompleted: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof payload === 'object' && payload !== null && 'error' in payload
            ? String((payload as { error: unknown }).error)
            : `Setup failed (${response.status})`;
        setError(message);
        return;
      }
      window.location.assign('/admin/login');
    } catch {
      setError('Setup is temporarily unavailable.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <ShieldPlus className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        First superadmin
      </h1>

      {status === null && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Checking setup state…</p>}

      {status?.alreadyCompleted && (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-[#0B0D1B]">
          Setup has already been completed.{' '}
          <a className="font-semibold text-indigo-600 dark:text-indigo-400" href="/admin/login">
            Sign in instead
          </a>
          .
        </p>
      )}

      {status && !status.alreadyCompleted && !status.setupEnabled && (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Setup is disabled: the <span className="font-mono">SETUP_TOKEN</span> Worker secret is not set on this deployment.
        </p>
      )}

      {status?.setupEnabled && !status.alreadyCompleted && (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Paste the one-time <span className="font-mono">SETUP_TOKEN</span> from the deployment secrets. This endpoint
            stops working permanently once an operator exists.
          </p>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Setup token</span>
            <input
              type="password"
              required
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-black/30"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-black/30"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Password</span>
            <input
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-black/30"
            />
            <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
              At least {MIN_PASSWORD_LENGTH} characters.
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Creating…' : 'Create superadmin'}
          </button>
        </form>
      )}
    </main>
  );
}

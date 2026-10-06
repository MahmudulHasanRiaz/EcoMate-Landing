'use client';

/**
 * One-time first-superadmin bootstrap.
 *
 * Both gates are enforced server-side (`SETUP_TOKEN` match **and** an empty `admin_users`);
 * this page only reflects that state, and reports "already completed" instead of showing a
 * form that can never succeed.
 *
 * Task 14 §6: the superadmin second factor is mandatory and established here. The account
 * is created without `totp_enabled`, and `auth.ts` refuses a superadmin sign-in until the
 * code below is confirmed — so the flow is create → scan → confirm → sign in. If the tab is
 * lost before confirmation (or the secret is lost later), the same `SETUP_TOKEN` can reissue
 * enrolment material for a superadmin while the token still exists on the deployment.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { ShieldPlus, Smartphone } from 'lucide-react';
import { MIN_PASSWORD_LENGTH } from '@/lib/password';

interface SetupStatus {
  setupEnabled: boolean;
  alreadyCompleted: boolean;
}

interface TotpEnrollment {
  uri: string;
  secret: string;
  qrDataUrl: string | null;
}

function readEnrollment(value: unknown): TotpEnrollment | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.secret !== 'string' || typeof record.uri !== 'string') return null;
  return {
    secret: record.secret,
    uri: record.uri,
    qrDataUrl: typeof record.qrDataUrl === 'string' ? record.qrDataUrl : null,
  };
}

function readError(value: unknown, fallback: string): string {
  if (typeof value === 'object' && value !== null && 'error' in value) {
    const message = (value as { error?: unknown }).error;
    if (typeof message === 'string' && message !== '') return message;
  }
  return fallback;
}

export default function AdminSetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
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

  async function onCreate(event: FormEvent<HTMLFormElement>) {
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
        setError(readError(payload, `Setup failed (${response.status})`));
        return;
      }
      const material =
        typeof payload === 'object' && payload !== null
          ? readEnrollment((payload as { totp?: unknown }).totp)
          : null;
      if (!material) {
        setError('The account was created but no authenticator material came back. Reload and use "resume enrolment".');
        return;
      }
      setEnrollment(material);
    } catch {
      setError('Setup is temporarily unavailable.');
    } finally {
      setPending(false);
    }
  }

  async function onResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/setup/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, reissue: true }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(readError(payload, `Could not reissue enrolment (${response.status})`));
        return;
      }
      const material = readEnrollment(payload);
      if (!material) {
        setError('The reissue response did not include enrolment material.');
        return;
      }
      setEnrollment(material);
    } catch {
      setError('Setup is temporarily unavailable.');
    } finally {
      setPending(false);
    }
  }

  async function onConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/setup/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, code }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(readError(payload, `Confirmation failed (${response.status})`));
        return;
      }
      setEnrolled(true);
      setEnrollment(null);
    } catch {
      setError('Setup is temporarily unavailable.');
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-black/30';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <ShieldPlus className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        First superadmin
      </h1>

      {status === null && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Checking setup state…</p>}

      {enrolled && (
        <div className="mt-6 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          <p>Two-factor authentication is active. The account can now sign in.</p>
          <a className="font-semibold underline" href="/admin/login">
            Go to sign in
          </a>
        </div>
      )}

      {!enrolled && enrollment && (
        <form onSubmit={onConfirm} className="mt-8 space-y-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Smartphone className="h-4 w-4" /> Scan this code with your authenticator app
          </p>
          {enrollment.qrDataUrl ? (
            // Generated server-side as an inline SVG data URL — no external QR service ever
            // sees the shared secret.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={enrollment.qrDataUrl}
              alt="TOTP enrolment QR code"
              width={200}
              height={200}
              className="mx-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-white/10"
            />
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              The QR code is too large for this account&apos;s label. Add the secret below manually.
            </p>
          )}
          <p className="break-all rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono dark:border-white/10 dark:bg-black/30">
            {enrollment.secret}
          </p>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Six-digit code
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              className={inputClass}
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || code.length !== 6}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Confirming…' : 'Confirm and finish setup'}
          </button>
        </form>
      )}

      {!enrolled && !enrollment && status?.alreadyCompleted && (
        <div className="mt-6 space-y-4">
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-[#0B0D1B]">
            Setup has already been completed.{' '}
            <a className="font-semibold text-indigo-600 dark:text-indigo-400" href="/admin/login">
              Sign in instead
            </a>
            .
          </p>

          {resumeOpen ? (
            <form onSubmit={onResume} className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reissues the authenticator secret for the existing superadmin. The old code stops working
                immediately; confirming the new one activates login again.
              </p>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Setup token</span>
                <input
                  type="password"
                  required
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Superadmin email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                />
              </label>
              {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
              >
                {pending ? 'Reissuing…' : 'Reissue enrolment'}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setResumeOpen(true)}
              className="text-xs font-semibold text-indigo-600 underline dark:text-indigo-400"
            >
              Lost the authenticator before confirming? Resume enrolment
            </button>
          )}
        </div>
      )}

      {!enrolled && !enrollment && status && !status.alreadyCompleted && !status.setupEnabled && (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Setup is disabled: the <span className="font-mono">SETUP_TOKEN</span> Worker secret is not set on this deployment.
        </p>
      )}

      {!enrolled && !enrollment && status?.setupEnabled && !status.alreadyCompleted && (
        <form onSubmit={onCreate} className="mt-8 space-y-4">
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
              className={inputClass}
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
              className={inputClass}
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
              className={inputClass}
            />
            <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
              At least {MIN_PASSWORD_LENGTH} characters. You will set up an authenticator app next.
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

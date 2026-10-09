'use client';

/**
 * Operator (RBAC) management.
 *
 * Every mutation goes through `/api/admin/*`, which re-checks the caller's role server-side;
 * this component's own role check is a UX affordance only. Session tokens are never
 * rendered — the API exposes only SHA-256-derived public ids.
 */
import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, RefreshCw, ShieldAlert, UserMinus, UserPlus } from 'lucide-react';
import { ADMIN_ROLES, type AdminRole } from '@/lib/roles';
import { MIN_PASSWORD_LENGTH } from '@/lib/password';

interface Operator {
  id: number;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SessionRow {
  id: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  expires: string;
}

interface AdminUsersPanelProps {
  role: AdminRole;
  currentUserId: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export function AdminUsersPanel({ role, currentUserId }: AdminUsersPanelProps) {
  const isSuperadmin = role === 'superadmin';

  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState<boolean>(isSuperadmin);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('editor');

  const [resetFor, setResetFor] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const [sessionsFor, setSessionsFor] = useState<number | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const load = useCallback(async () => {
    if (!isSuperadmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await request<{ users: Operator[] }>('/api/admin/users');
      setOperators(data.users);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load operators');
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadSessions = useCallback(async (operatorId: number) => {
    setError(null);
    try {
      const data = await request<{ sessions: SessionRow[] }>(`/api/admin/users/${operatorId}/sessions`);
      setSessions(data.sessions);
      setSessionsFor(operatorId);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Failed to load sessions');
    }
  }, []);

  async function runAction(action: () => Promise<string>): Promise<void> {
    setError(null);
    setNotice(null);
    try {
      setNotice(await action());
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Action failed');
    }
  }

  if (!isSuperadmin) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldAlert className="h-4 w-4" />
          Operator management requires the superadmin role
        </p>
        <p className="mt-1">
          Your account has the <span className="font-mono">{role}</span> role. You can still use the CMS panel.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0B0D1B]">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <UserPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          Add operator
        </h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void runAction(async () => {
              await request('/api/admin/users', {
                method: 'POST',
                body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
              });
              setNewEmail('');
              setNewPassword('');
              setNewRole('editor');
              return 'Operator created';
            });
          }}
        >
          <input
            type="email"
            required
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="operator@ecomate.bd"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-black/30"
          />
          <input
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder={`Min ${MIN_PASSWORD_LENGTH} characters`}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-black/30"
          />
          <select
            value={newRole}
            onChange={(event) => setNewRole(event.target.value as AdminRole)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-black/30"
          >
            {ADMIN_ROLES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        </form>
      </div>

      {(error || notice) && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
          }`}
        >
          {error ?? notice}
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B0D1B]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="text-sm font-bold">Operators ({operators.length})</h2>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {operators.map((operator) => (
              <li key={operator.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {operator.email}
                      {String(operator.id) === currentUserId && (
                        <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                          you
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Last login {formatDate(operator.lastLoginAt)} ·{' '}
                      <span className={operator.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                        {operator.isActive ? 'active' : 'deactivated'}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={operator.role}
                      onChange={(event) => {
                        const nextRole = event.target.value as AdminRole;
                        void runAction(async () => {
                          await request(`/api/admin/users/${operator.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ role: nextRole }),
                          });
                          return `${operator.email} is now ${nextRole}`;
                        });
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs dark:border-white/10 dark:bg-black/30"
                    >
                      {ADMIN_ROLES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setResetFor(resetFor === operator.id ? null : operator.id);
                        setResetPassword('');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Reset password
                    </button>

                    <button
                      type="button"
                      onClick={() => void loadSessions(operator.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                    >
                      Sessions
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void runAction(async () => {
                          await request(`/api/admin/users/${operator.id}`, {
                            method: operator.isActive ? 'DELETE' : 'PUT',
                            body: operator.isActive ? undefined : JSON.stringify({ isActive: true }),
                          });
                          return operator.isActive
                            ? `${operator.email} deactivated and signed out everywhere`
                            : `${operator.email} reactivated`;
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      {operator.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                </div>

                {resetFor === operator.id && (
                  <form
                    className="mt-3 flex flex-wrap gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void runAction(async () => {
                        await request(`/api/admin/users/${operator.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ password: resetPassword }),
                        });
                        setResetFor(null);
                        setResetPassword('');
                        return `${operator.email}'s password was reset and all their sessions revoked`;
                      });
                    }}
                  >
                    <input
                      type="password"
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                      placeholder={`New password (min ${MIN_PASSWORD_LENGTH})`}
                      className="min-w-56 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-white/10 dark:bg-black/30"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
                    >
                      Save password
                    </button>
                  </form>
                )}

                {sessionsFor === operator.id && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Active sessions ({sessions.length})
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void runAction(async () => {
                              await request(`/api/admin/users/${operator.id}/sessions`, { method: 'DELETE' });
                              await loadSessions(operator.id);
                              return `${operator.email} signed out everywhere`;
                            })
                          }
                          className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-white/15 dark:text-slate-200"
                        >
                          Sign out everywhere
                        </button>
                        <button
                          type="button"
                          onClick={() => setSessionsFor(null)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-white/15 dark:text-slate-200"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                    {sessions.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No active sessions.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {sessions.map((session) => (
                          <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600 dark:text-slate-300">
                              <span className="font-mono">{session.id.slice(0, 12)}…</span> · {session.ip || 'unknown ip'} · started{' '}
                              {formatDate(session.createdAt)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void runAction(async () => {
                                  await request(`/api/admin/users/${operator.id}/sessions/${session.id}`, {
                                    method: 'DELETE',
                                  });
                                  await loadSessions(operator.id);
                                  return 'Session revoked';
                                })
                              }
                              className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 dark:border-red-500/30 dark:text-red-300"
                            >
                              Revoke
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

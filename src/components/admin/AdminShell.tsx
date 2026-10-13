'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Eraser,
  ExternalLink,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
} from 'lucide-react';
import type { AdminTab } from './AdminPanel';

export interface AdminNavItem {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  tone?: 'rose' | 'amber';
}

export interface AdminHealth {
  sql: 'ok' | 'down';
  license: 'connected' | 'standby';
}

export interface AdminUser {
  name: string;
  email: string;
  role: string;
}

export interface AdminShellProps {
  nav: { group: string; items: AdminNavItem[] }[];
  activeTab: AdminTab;
  onTab: (tab: AdminTab) => void;
  breadcrumb: string;
  health: AdminHealth;
  user: AdminUser;
  logoUrl: string;
  siteName: string;
  purging: null | 'all' | 'landing';
  onPurge: (scope: 'all' | 'landing') => void;
  onSignOut: () => void;
  onBackToSite: () => void;
  children: React.ReactNode;
}

function brandInitials(siteName: string): string {
  const words = siteName.trim().split(/\s+/).filter((w) => w.length > 0);
  const picked = words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  return picked !== '' ? picked : 'A';
}

function userInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0);
  const picked = words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  return picked !== '' ? picked : 'U';
}

function countChipTone(tone: AdminNavItem['tone']): string {
  if (tone === 'rose') {
    return 'text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10';
  }
  if (tone === 'amber') {
    return 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10';
  }
  return 'text-[#566070] dark:text-[#a2a2b6] border-[#e6e8ec] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a]';
}

export const AdminShell: React.FC<AdminShellProps> = ({
  nav,
  activeTab,
  onTab,
  breadcrumb,
  health,
  user,
  logoUrl,
  siteName,
  purging,
  onPurge,
  onSignOut,
  onBackToSite,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [systemsOpen, setSystemsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserOpen(false);
        setSystemsOpen(false);
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('ecomate-theme', next ? 'dark' : 'light');
    } catch {
      // Private-mode storage failure must not break the toggle.
    }
    setIsDark(next);
  };

  const handleNav = (tab: AdminTab) => {
    onTab(tab);
    setSidebarOpen(false);
    setUserOpen(false);
    setSystemsOpen(false);
  };

  const busy = purging !== null;
  const systemsOk = health.sql === 'ok' && health.license === 'connected';

  return (
    <div className="bg-[#f5f6f8] dark:bg-[#0a0a0f] text-[#14171c] dark:text-[#ededf3] grid grid-cols-[252px_minmax(0,1fr)] max-md:grid-cols-1 min-h-screen">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`sticky top-0 h-screen flex flex-col bg-[#fafbfc] dark:bg-[#0e0e14] border-r border-[#e6e8ec] dark:border-[#1c1c27] p-[16px_12px] w-[252px] max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:transition-transform max-md:duration-200 ${sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}`}
        aria-label="Admin navigation"
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-1">
          {logoUrl !== '' ? (
            <img
              src={logoUrl}
              className="w-[34px] h-[34px] rounded-lg object-cover flex-none"
              alt=""
            />
          ) : (
            <span className="w-[34px] h-[34px] rounded-lg flex-none bg-[#0f766e] text-white grid place-items-center font-semibold text-[13px]">
              {brandInitials(siteName)}
            </span>
          )}
          <div className="min-w-0">
            <p className="m-0 text-[14.5px] font-semibold leading-tight truncate">{siteName}</p>
            <p className="m-0 text-[12px] text-[#6b7280] dark:text-[#8a8a9e] leading-tight truncate">
              PostgreSQL &amp; Content Engine
            </p>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="mt-2 overflow-y-auto">
          {nav.map((group) => (
            <div key={group.group}>
              <p className="px-[10px] pt-[16px] pb-[6px] m-0 text-[11px] uppercase tracking-wider text-[#6b7280] dark:text-[#8a8a9e] font-semibold">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === activeTab;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNav(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative flex items-center justify-between gap-2 w-full min-h-[34px] px-[10px] rounded-[6px] text-[13.5px] cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[#e6f2f0] dark:bg-[#12302e] font-semibold'
                          : 'font-medium text-[#2b313b] dark:text-[#c6c6d4] hover:bg-[#eef0f3] dark:hover:bg-[#16161f]'
                      }`}
                    >
                      {isActive ? (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-[#0f766e] rounded-full"
                        />
                      ) : null}
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={
                            isActive
                              ? 'w-4 h-4 flex-none text-[#0f766e] dark:text-teal-300'
                              : 'w-4 h-4 flex-none text-[#6b7280] dark:text-[#8a8a9e]'
                          }
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.count !== undefined && item.count > 0 ? (
                        <span
                          className={`inline-flex items-center rounded border px-1.5 py-px text-[11px] font-semibold flex-none ${countChipTone(item.tone)}`}
                        >
                          {item.count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User widget */}
        <div className="mt-auto pt-3 border-t border-[#e6e8ec] dark:border-[#1c1c27] relative">
          {userOpen ? (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-[10px] border border-[#e4e7ec] dark:border-[#232331] bg-white dark:bg-[#14141c] shadow-lg overflow-hidden">
              <div className="px-3.5 py-3 border-b border-[#eceef1] dark:border-[#1e1e2a]">
                <p className="m-0 text-[13.5px] font-semibold truncate">{user.name}</p>
                <p className="m-0 text-[12px] text-[#6b7280] dark:text-[#8a8a9e] truncate">
                  {user.email}
                </p>
              </div>
              <div className="p-1.5" role="menu" aria-label="Account">
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="flex items-center gap-2.5 px-2.5 min-h-[34px] w-full rounded-[6px] text-[13.5px] font-medium text-[#2b313b] dark:text-[#c6c6d4] disabled:opacity-50 text-left"
                >
                  <User className="w-4 h-4 flex-none text-[#6b7280] dark:text-[#8a8a9e]" />
                  Account &amp; profile
                </button>
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="flex items-center gap-2.5 px-2.5 min-h-[34px] w-full rounded-[6px] text-[13.5px] font-medium text-[#2b313b] dark:text-[#c6c6d4] disabled:opacity-50 text-left"
                >
                  <Bell className="w-4 h-4 flex-none text-[#6b7280] dark:text-[#8a8a9e]" />
                  Notifications
                </button>
                <button
                  type="button"
                  onClick={onBackToSite}
                  className="flex items-center gap-2.5 px-2.5 min-h-[34px] w-full rounded-[6px] text-[13.5px] font-medium text-[#2b313b] dark:text-[#c6c6d4] hover:bg-[#eef0f3] dark:hover:bg-[#1a1a26] cursor-pointer text-left"
                >
                  <ExternalLink className="w-4 h-4 flex-none text-[#6b7280] dark:text-[#8a8a9e]" />
                  Back to Public Site
                </button>
              </div>
              <div className="border-t border-[#eceef1] dark:border-[#1e1e2a] p-1.5">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex items-center gap-2.5 px-2.5 min-h-[34px] w-full rounded-[6px] text-[13.5px] font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4 flex-none" />
                  Sign out
                </button>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setUserOpen((v) => !v)}
            aria-expanded={userOpen}
            className="flex items-center gap-2.5 w-full px-1 py-1 rounded-[6px] hover:bg-[#eef0f3] dark:hover:bg-[#16161f] cursor-pointer text-left"
          >
            <span
              aria-hidden="true"
              className="w-[34px] h-[34px] rounded-lg flex-none bg-[#e6f2f0] dark:bg-[#12302e] border border-[#bfdcd7] dark:border-[#1f4f4a] text-teal-700 dark:text-teal-300 grid place-items-center font-semibold text-[12.5px]"
            >
              {userInitials(user.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium leading-tight truncate">
                {user.name}
              </span>
              <span className="block text-[12px] text-[#6b7280] dark:text-[#8a8a9e] leading-tight truncate">
                {user.role}
              </span>
            </span>
            <ChevronDown className="w-4 h-4 flex-none text-[#6b7280] dark:text-[#8a8a9e]" />
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="min-w-0 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-[56px] flex items-center justify-between gap-3 px-4 sm:px-6 bg-white/90 dark:bg-[#0a0a0f]/90 backdrop-blur border-b border-[#e6e8ec] dark:border-[#1c1c27]">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle navigation"
              className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#444b57] dark:text-[#b9b9cc] cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <p className="m-0 text-[13.5px] truncate">
              <span className="text-[#6b7280] dark:text-[#8a8a9e]">Operations / </span>
              <span className="font-semibold">{breadcrumb}</span>
            </p>
            <span className="hidden sm:inline-flex text-[12px] font-medium text-teal-700 dark:text-teal-300 bg-[#e6f2f0] dark:bg-[#12302e] border border-[#bfdcd7] dark:border-[#1f4f4a] rounded-[5px] px-2 py-[1px] flex-none">
              Self-Contained CMS &amp; DB
            </span>
          </div>

          <div className="flex items-center gap-2 flex-none">
            <button
              type="button"
              onClick={() => onPurge('all')}
              disabled={busy}
              className="inline-flex items-center gap-2 min-h-[34px] px-3 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#1f242b] dark:text-[#e2e2ec] text-[13px] font-medium cursor-pointer transition-colors hover:bg-[#f1f3f5] dark:hover:bg-[#1a1a26] disabled:opacity-50 disabled:cursor-wait"
            >
              <Eraser className="w-4 h-4" />
              {busy ? 'Purging…' : 'Purge all'}
            </button>
            <button
              type="button"
              onClick={() => onPurge('landing')}
              disabled={busy}
              title="Purge public cache"
              aria-label="Purge public cache"
              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#444b57] dark:text-[#b9b9cc] cursor-pointer transition-colors hover:bg-[#f1f3f5] dark:hover:bg-[#1c1c2c] disabled:opacity-50 disabled:cursor-wait"
            >
              <Eraser className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              title="Toggle theme"
              aria-label="Toggle theme"
              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#444b57] dark:text-[#b9b9cc] cursor-pointer transition-colors hover:bg-[#f1f3f5] dark:hover:bg-[#1c1c2c]"
            >
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSystemsOpen((v) => !v)}
                aria-expanded={systemsOpen}
                className="inline-flex items-center gap-2 min-h-[34px] px-3 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#1f242b] dark:text-[#e2e2ec] text-[13px] font-medium cursor-pointer transition-colors hover:bg-[#f1f3f5] dark:hover:bg-[#1a1a26]"
              >
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full flex-none ${systemsOk ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
                Systems
                <ChevronDown className="w-3.5 h-3.5 text-[#6b7280] dark:text-[#8a8a9e]" />
              </button>
              {systemsOpen ? (
                <div className="absolute right-0 top-full mt-2 w-60 rounded-[10px] border border-[#e4e7ec] dark:border-[#232331] bg-white dark:bg-[#14141c] shadow-lg p-1.5">
                  <div className="flex items-center justify-between gap-2 px-2.5 min-h-[34px]">
                    <span className="text-[13px] font-medium">SQL Repository</span>
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#566070] dark:text-[#a2a2b6]">
                      <span
                        aria-hidden="true"
                        className={`w-2 h-2 rounded-full ${health.sql === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      />
                      {health.sql === 'ok' ? 'Operational' : 'Down'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-2.5 min-h-[34px]">
                    <span className="text-[13px] font-medium">License Portal</span>
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#566070] dark:text-[#a2a2b6]">
                      <span
                        aria-hidden="true"
                        className={`w-2 h-2 rounded-full ${health.license === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      />
                      {health.license === 'connected' ? 'Connected' : 'Standby'}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="w-full max-w-[1180px] mx-auto px-8 py-9 font-admin max-md:px-4 max-md:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

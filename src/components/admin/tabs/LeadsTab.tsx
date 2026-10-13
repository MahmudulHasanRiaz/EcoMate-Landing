import { useEffect, useState } from 'react';
import { Clock, Download, History, LayoutGrid, List, RefreshCw, Search, Upload } from 'lucide-react';
import type { Lead, OverdueLead } from '../../../types/api';
import { AsyncButton } from '@/hooks/useAsyncAction';
import { Avatar, Card, EmptyState, IconButton, StatCell, Tag } from '../ui';

export interface LeadsTabProps {
  leads: Lead[];
  filteredLeads: Lead[];
  overdueLeads: OverdueLead[];
  leadSearchQuery: string;
  leadStatusFilter: string;
  /** Shared panel mutation pending flag (AdminPanel `mutation.pending`). */
  mutating: boolean;
  exportUrl: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onOpenLead: (lead: Lead) => void;
  onStatusChange: (id: number, status: Lead['status']) => void;
  onRetryCapi: (id: number) => void | Promise<void>;
  onRetryPortal: (id: number) => void | Promise<void>;
  onNotify: (message: string) => void;
}

const LEAD_STATUSES: Lead['status'][] = ['New', 'Contacted', 'Qualified', 'Demo Scheduled', 'Won', 'Lost'];

const STATUS_DOTS: Record<Lead['status'], string> = {
  New: 'bg-amber-500',
  Contacted: 'bg-sky-500',
  Qualified: 'bg-indigo-500',
  'Demo Scheduled': 'bg-teal-600',
  Won: 'bg-emerald-500',
  Lost: 'bg-rose-500',
};

function initialsOf(name: string): string {
  const picked = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join('');
  return (picked || '?').toUpperCase();
}

/** Compact KPI numeral: `StatCell` has no size prop, so the 19px size rides on the `value` slot. */
function kpi(value: number): React.ReactNode {
  return (
    <span className="text-[19px] font-semibold tracking-[-0.02em] leading-[1.15] text-[#14171c] dark:text-[#ededf3]">
      {value}
    </span>
  );
}

const GRID_COLS =
  'grid-cols-[40px_minmax(210px,1.35fr)_minmax(190px,1.15fr)_150px_170px_92px_92px_124px]';

export const LeadsTab: React.FC<LeadsTabProps> = ({
  leads,
  filteredLeads,
  overdueLeads,
  leadSearchQuery,
  leadStatusFilter,
  mutating,
  exportUrl,
  onSearchChange,
  onStatusFilterChange,
  onOpenLead,
  onStatusChange,
  onRetryCapi,
  onRetryPortal,
  onNotify,
}) => {
  // Local view/selection state only — AdminPanel keeps no new state (shell wiring lands in Task 7).
  const [view, setView] = useState<'list' | 'board'>('list');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Prune stale row selection when the visible set changes (search / stage / view).
  useEffect(() => {
    setSelectedIds([]);
  }, [leadSearchQuery, leadStatusFilter, view]);

  const demoCount = leads.filter((l) => l.status === 'Demo Scheduled').length;
  const portalPendingCount = leads.filter((l) => l.licensePortalStatus === 'Pending').length;
  const capiPendingCount = leads.filter((l) => l.metaCapiStatus === 'Pending').length;

  const countFor = (status: string): number =>
    status === 'All' ? leads.length : leads.filter((l) => l.status === status).length;

  const toggleSelect = (id: number): void => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleSelectAll = (): void => {
    setSelectedIds((prev) =>
      prev.length === filteredLeads.length && filteredLeads.length > 0
        ? []
        : filteredLeads.map((l) => l.id),
    );
  };

  const portalTone = (status: string): 'teal' | 'amber' | 'red' | 'slate' =>
    status === 'Synced' ? 'teal' : status === 'Failed' ? 'red' : status === 'Skipped' ? 'slate' : 'amber';
  const capiTone = (status: string): 'teal' | 'amber' | 'red' | 'slate' =>
    status === 'Sent' ? 'teal' : status === 'Failed' ? 'red' : status === 'Skipped' ? 'slate' : 'amber';

  return (
    <div className="space-y-3.5">
      {/* Header: H1 22px + 13.5px sub, Export right */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-[22px] font-semibold tracking-[-0.015em] text-[#14171c] dark:text-[#ededf3]">
            Inbound Lead Pipeline
          </h1>
          <p className="mt-0.5 max-w-[640px] text-[13.5px] text-[#667085] dark:text-[#8e8ea4]">
            Authoritative PostgreSQL records from public demo booking forms. Syncable to License Portal.
          </p>
        </div>
        {/* CSV export: plain link (not fetch-then-blob) — browser handles download, Content-Disposition filename from server, session cookie rides along. */}
        <a
          href={exportUrl}
          title="Download every lead as CSV (audited; capped at 10,000 rows)"
          className="inline-flex items-center gap-2 min-h-[34px] px-3 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px] font-medium cursor-pointer transition-colors hover:bg-[#f1f3f5] dark:hover:bg-[#1a1a26]"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </a>
      </div>

      {/* 4-KPI strip, compact numerals via the value slot */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[#e4e7ec] bg-[#e4e7ec] dark:border-[#232331] dark:bg-[#232331] lg:grid-cols-4">
        <StatCell label="Total leads" value={kpi(leads.length)} sub={<span>From public demo forms</span>} />
        <StatCell label="Demo scheduled" value={kpi(demoCount)} sub={<span>Ready for walkthrough</span>} />
        <StatCell
          label="Portal sync pending"
          value={kpi(portalPendingCount)}
          sub={<span>Waiting for License Portal</span>}
        />
        <StatCell
          label="Meta CAPI pending"
          value={kpi(capiPendingCount)}
          sub={<span>Events not yet delivered</span>}
        />
      </div>

      {/* Overdue follow-up worklist — same logic as before, compact card */}
      {overdueLeads.length > 0 && (
        <div className="rounded-[10px] border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-rose-900 dark:text-rose-200">
            <Clock className="h-4 w-4" />
            Overdue follow-ups ({overdueLeads.length})
          </h3>
          <p className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-300/80">
            Promised callback dates that have passed on leads that are still open.
          </p>
          <ul className="mt-3 divide-y divide-rose-200/60 text-xs dark:divide-rose-500/20">
            {overdueLeads.map((overdue) => (
              <li key={overdue.id} className="flex items-center justify-between gap-3 py-2">
                <button
                  type="button"
                  onClick={() => {
                    const match = leads.find((l) => l.id === overdue.id);
                    if (match) void onOpenLead(match);
                    else
                      onNotify(
                        `Lead #${overdue.id} is outside the loaded page — narrow the filters or use the CSV export.`,
                      );
                  }}
                  className="min-w-0 text-left font-semibold text-slate-900 hover:underline dark:text-white cursor-pointer"
                >
                  <span className="block truncate">{overdue.name}</span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">{overdue.phone}</span>
                </button>
                <span className="shrink-0 font-mono text-[11px] text-rose-700 dark:text-rose-300">
                  due {overdue.followUpAt ? new Date(overdue.followUpAt).toLocaleDateString() : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Toolbar: search (flex 0 1 260px) + stage chips with counts + list/board toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-[0_1_260px]">
          <Search className="absolute left-[11px] top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085] dark:text-[#8e8ea4]" />
          <input
            type="search"
            placeholder="Search name, phone, email"
            aria-label="Search leads"
            value={leadSearchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full min-h-[30px] rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] py-0 pr-3 pl-[34px] text-[13px] text-[#1f242b] dark:text-[#e2e2ec] placeholder-[#667085] dark:placeholder-[#8e8ea4] focus:outline-2 focus:outline-[#0f766e] focus:outline-offset-1"
          />
        </div>
        <div className="flex flex-1 flex-wrap gap-1" role="group" aria-label="Filter by stage">
          {['All', ...LEAD_STATUSES].map((status) => {
            const active = leadStatusFilter === status;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={active}
                onClick={() => onStatusFilterChange(status)}
                className={`inline-flex min-h-[28px] items-center gap-[7px] rounded-md border px-2.5 text-[12.5px] cursor-pointer transition-colors ${
                  active
                    ? 'border-[#bfdcd7] dark:border-[#1f4f4a] bg-[#e6f2f0] dark:bg-[#12302e] font-medium text-teal-700 dark:text-teal-300'
                    : 'border-transparent text-[#566070] dark:text-[#a2a2b6] hover:bg-[#f1f3f5] dark:hover:bg-white/[0.04]'
                }`}
              >
                {status}
                <em className="font-mono text-[12px] not-italic text-[#667085] dark:text-[#8e8ea4]">
                  {countFor(status)}
                </em>
              </button>
            );
          })}
        </div>
        <div
          className="ml-auto inline-flex overflow-hidden rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a]"
          role="group"
          aria-label="View"
        >
          {(
            [
              { id: 'list', label: 'List', Icon: List },
              { id: 'board', label: 'Board', Icon: LayoutGrid },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={`inline-flex min-h-[28px] items-center gap-1.5 px-2.5 text-[12.5px] cursor-pointer ${
                view === id
                  ? 'bg-[#e6f2f0] dark:bg-[#12302e] font-medium text-teal-700 dark:text-teal-300'
                  : 'text-[#566070] dark:text-[#a2a2b6] hover:text-[#14171c] dark:hover:text-[#ededf3]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk bar: visible while rows are selected; each action reuses the single-row handlers */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-[#bfdcd7] dark:border-[#1f4f4a] bg-[#e8f3f1] dark:bg-[#0f2b29] px-3 py-2 text-[13.5px]">
          <b className="mr-auto font-medium text-[#0f766e] dark:text-teal-300">
            Bulk actions ({selectedIds.length})
          </b>
          <AsyncButton
            onClick={async () => {
              for (const id of selectedIds) {
                await onRetryPortal(id);
              }
              setSelectedIds([]);
            }}
            loading={mutating}
            className="inline-flex items-center gap-2 min-h-[34px] px-3 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px] font-medium cursor-pointer transition-colors hover:bg-[#f1f3f5] dark:hover:bg-[#1a1a26] disabled:opacity-50 disabled:cursor-wait"
          >
            <Upload className="h-3.5 w-3.5" />
            Sync to Portal
          </AsyncButton>
          <AsyncButton
            onClick={async () => {
              for (const id of selectedIds) {
                await onRetryCapi(id);
              }
              setSelectedIds([]);
            }}
            loading={mutating}
            className="inline-flex items-center gap-2 min-h-[34px] px-3 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px] font-medium cursor-pointer transition-colors hover:bg-[#f1f3f5] dark:hover:bg-[#1a1a26] disabled:opacity-50 disabled:cursor-wait"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry CAPI
          </AsyncButton>
        </div>
      )}

      {view === 'list' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[940px]">
              <div
                className={`grid ${GRID_COLS} items-center gap-x-3 bg-[#fafbfc] dark:bg-white/[0.02] px-4 min-h-[32px] border-b border-[#eceef1] dark:border-[#1e1e2a] text-[11px] font-medium uppercase tracking-[0.07em] text-[#667085] dark:text-[#8e8ea4]`}
              >
                <span>
                  <input
                    type="checkbox"
                    aria-label="Select all leads"
                    checked={filteredLeads.length > 0 && selectedIds.length === filteredLeads.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer accent-[#0f766e]"
                  />
                </span>
                <span>Lead / Company</span>
                <span>Phone &amp; Email</span>
                <span>Order volume</span>
                <span>Stage</span>
                <span>License sync</span>
                <span>Meta CAPI</span>
                <span className="text-right">Actions</span>
              </div>
              {filteredLeads.length === 0 ? (
                <EmptyState>No leads in this stage yet.</EmptyState>
              ) : (
                <div className="divide-y divide-[#eceef1] dark:divide-[#1e1e2a]">
                  {filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className={`grid ${GRID_COLS} items-center gap-x-3 px-4 min-h-[50px] py-1 transition-colors hover:bg-[#f8f9fb] dark:hover:bg-white/[0.02]`}
                    >
                      <span>
                        <input
                          type="checkbox"
                          aria-label={`Select ${lead.name}`}
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="h-4 w-4 cursor-pointer accent-[#0f766e]"
                        />
                      </span>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Avatar initials={initialsOf(lead.name)} size="sm" />
                        <span className="flex min-w-0 flex-col gap-0">
                          <b className="text-[13.5px] font-semibold text-[#14171c] dark:text-[#ededf3]">
                            {lead.name}
                          </b>
                          <span className="block max-w-full truncate text-[12px] leading-[1.35] text-[#566070] dark:text-[#a2a2b6]">
                            {new Date(lead.createdAt).toLocaleDateString()} ·{' '}
                            <code className="font-mono">{lead.source}</code>
                          </span>
                        </span>
                      </span>
                      <span className="flex min-w-0 flex-col gap-0">
                        <b className="font-mono text-[13px] font-medium text-[#1f242b] dark:text-[#e2e2ec]">
                          {lead.phone}
                        </b>
                        <span className="block max-w-full truncate text-[12px] leading-[1.35] text-[#566070] dark:text-[#a2a2b6]">
                          {lead.email || 'N/A'}
                        </span>
                      </span>
                      <span>
                        <Tag>{lead.dailyVolume}</Tag>
                      </span>
                      <span>
                        <select
                          value={lead.status}
                          aria-label={`Stage for ${lead.name}`}
                          disabled={mutating}
                          onChange={(e) => onStatusChange(lead.id, e.target.value as Lead['status'])}
                          className="min-h-[30px] cursor-pointer rounded-md border border-[#d5d9e0] bg-white px-2 py-0.5 text-[12.5px] font-medium text-[#1f242b] dark:border-[#2a2a3a] dark:bg-[#12121a] dark:text-[#e2e2ec]"
                        >
                          {LEAD_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </span>
                      <span>
                        <Tag tone={portalTone(lead.licensePortalStatus)}>{lead.licensePortalStatus}</Tag>
                      </span>
                      <span>
                        <Tag
                          tone={capiTone(lead.metaCapiStatus)}
                        >
                          <span title={lead.metaCapiError || 'Server-side Meta Conversions API (Lead event)'}>
                            {lead.metaCapiStatus}
                          </span>
                        </Tag>
                      </span>
                      <span className="flex justify-end gap-1">
                        <IconButton
                          label={`Retry CAPI for ${lead.name}`}
                          title="Retry CAPI"
                          disabled={mutating}
                          aria-busy={mutating}
                          onClick={() => onRetryCapi(lead.id)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          label={`Sync ${lead.name} to Portal`}
                          title="Sync Portal"
                          disabled={mutating}
                          aria-busy={mutating}
                          onClick={() => onRetryPortal(lead.id)}
                        >
                          <Upload className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          label={`History for ${lead.name}`}
                          title="History"
                          onClick={() => onOpenLead(lead)}
                        >
                          <History className="h-3.5 w-3.5" />
                        </IconButton>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-[#eceef1] dark:border-[#1e1e2a] px-4 py-2 text-[12px] text-[#667085] dark:text-[#8e8ea4]">
            Select a lead to open details, follow-ups and sync history.
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {LEAD_STATUSES.map((status) => {
            const cards = filteredLeads.filter((l) => l.status === status);
            return (
              <div
                key={status}
                className="flex min-h-[140px] flex-col gap-2 rounded-[10px] border border-[#eceef1] dark:border-[#1e1e2a] bg-[#f4f6f8] dark:bg-white/[0.02] p-2.5"
              >
                <div className="flex items-center gap-2 px-1 pt-0.5 pb-1.5 text-[13px]">
                  <span className={`h-[7px] w-[7px] rounded-full ${STATUS_DOTS[status]}`} aria-hidden="true" />
                  <b className="font-medium text-[#1f242b] dark:text-[#e2e2ec]">{status}</b>
                  <em className="ml-auto text-[12px] not-italic text-[#667085] dark:text-[#8e8ea4]">
                    {cards.length}
                  </em>
                </div>
                {cards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#e4e7ec] dark:border-[#232331] px-2 py-4 text-center text-[12.5px] text-[#667085] dark:text-[#8e8ea4]">
                    No leads
                  </div>
                ) : (
                  cards.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => onOpenLead(lead)}
                      className="flex cursor-pointer flex-col gap-1.5 rounded-lg border border-[#e4e7ec] dark:border-[#232331] bg-white dark:bg-[#111118] p-2.5 text-left transition-colors hover:border-[#b8bfc9] dark:hover:border-[#2a2a3a]"
                    >
                      <span className="flex items-center gap-2">
                        <Avatar initials={initialsOf(lead.name)} size="sm" />
                        <b className="text-[13px] font-semibold text-[#14171c] dark:text-[#ededf3]">
                          {lead.name}
                        </b>
                      </span>
                      <Tag>{lead.dailyVolume}</Tag>
                      <span className="block truncate text-[12px] leading-[1.35] text-[#566070] dark:text-[#a2a2b6]">
                        {new Date(lead.createdAt).toLocaleDateString()} ·{' '}
                        <code className="font-mono">{lead.source}</code>
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        <Tag tone={portalTone(lead.licensePortalStatus)}>
                          Portal {lead.licensePortalStatus}
                        </Tag>
                        <Tag tone={capiTone(lead.metaCapiStatus)}>CAPI {lead.metaCapiStatus}</Tag>
                      </span>
                    </button>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

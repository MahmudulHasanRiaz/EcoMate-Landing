import { ArrowRight, DollarSign, PenLine, Plus, Upload } from 'lucide-react';
import type { Lead } from '../../../types/api';
import { Avatar, Card, CardHeader, EmptyState, StatCell, Tag } from '../ui';

export interface DashboardTabProps {
  leads: Lead[];
  pricingModeLabel: string;
  onSwitchPricingMode: () => void;
  sectionCount: number;
  untranslatedCount: number | null;
  articleCount: number;
  overdueCount: number;
  recentLeads: Lead[];
  onOpenLeads: () => void;
  onOpenContent: () => void;
  onOpenLead: (lead: Lead) => void;
  onStatusChange: (id: number, status: Lead['status']) => void;
  onAddSection: () => void;
  onWriteArticle: () => void;
  onUploadMedia: () => void;
}

const LEAD_STATUSES: Lead['status'][] = ['New', 'Contacted', 'Qualified', 'Demo Scheduled', 'Won', 'Lost'];

function initialsOf(name: string): string {
  const picked = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join('');
  return (picked || '?').toUpperCase();
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  leads,
  pricingModeLabel,
  onSwitchPricingMode,
  sectionCount,
  untranslatedCount,
  articleCount,
  overdueCount,
  recentLeads,
  onOpenLeads,
  onOpenContent,
  onOpenLead,
  onStatusChange,
  onAddSection,
  onWriteArticle,
  onUploadMedia,
}) => {
  const pendingCount = leads.filter((l) => l.status === 'New').length;
  const translatedCount = sectionCount - (untranslatedCount ?? 0);
  const banglaPct =
    untranslatedCount === null || sectionCount <= 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((translatedCount / sectionCount) * 100)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="m-0 text-[26px] font-semibold tracking-[-0.015em] text-[#14171c] dark:text-[#ededf3]">
          Operations &amp; Marketing Hub
        </h1>
        <p className="mt-1.5 max-w-[640px] text-[15px] text-[#667085] dark:text-[#8e8ea4]">
          Real-time visibility into inbound enterprise leads, CMS content status, and external integration dispatches.
        </p>
      </div>

      {/* KPI strip: 5 cells, hairline dividers */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[#e4e7ec] bg-[#e4e7ec] dark:border-[#232331] dark:bg-[#232331] sm:grid-cols-3 lg:grid-cols-5">
        <StatCell
          label="Total Inbound Leads"
          value={leads.length}
          sub={
            <span>
              {pendingCount} pending follow-up ·{' '}
              <button
                type="button"
                onClick={onOpenLeads}
                className={`font-semibold hover:underline cursor-pointer ${
                  overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {overdueCount} overdue follow-up{overdueCount === 1 ? '' : 's'}
              </button>
            </span>
          }
        />
        <StatCell
          label="Pricing Mode Active"
          value={pricingModeLabel}
          sub={
            <button
              type="button"
              onClick={onSwitchPricingMode}
              className="inline-flex items-center gap-1.5 font-medium text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
            >
              Switch mode <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        />
        <StatCell label="CMS Landing Sections" value={sectionCount} sub={<span>Fully database-configured</span>} />
        <StatCell
          label="Untranslated Sections (BN)"
          value={untranslatedCount ?? '—'}
          sub={
            <button
              type="button"
              onClick={onOpenContent}
              className="font-medium text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
            >
              {untranslatedCount !== null && untranslatedCount === 0
                ? 'Every section has Bangla copy'
                : 'Bangla falls back to English until translated'}
            </button>
          }
        />
        <StatCell
          label="Blog / SEO Content"
          value={articleCount}
          sub={<span>Indexable problem-first articles</span>}
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_336px]">
        {/* Recent leads */}
        <Card>
          <CardHeader
            title="Recent Inbound Consultation Leads"
            action={
              <button
                type="button"
                onClick={onOpenLeads}
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
              >
                View all leads <ArrowRight className="h-3.5 w-3.5" />
              </button>
            }
          />
          {recentLeads.length === 0 ? (
            <EmptyState>No inbound leads yet. New demo bookings will appear here.</EmptyState>
          ) : (
            <div>
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3.5 border-t border-[#eceef1] px-5 py-4 transition-colors first:border-t-0 hover:bg-[#f8f9fb] dark:border-[#1e1e2a] dark:hover:bg-white/[0.02]"
                >
                  <Avatar initials={initialsOf(lead.name)} size="md" />
                  <button
                    type="button"
                    onClick={() => onOpenLead(lead)}
                    className="min-w-0 text-left cursor-pointer"
                    title="Open the full timeline"
                  >
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <b className="text-[14.5px] font-semibold text-[#14171c] dark:text-[#ededf3]">{lead.name}</b>
                      <code className="font-mono text-[12.5px] text-[#667085] dark:text-[#8e8ea4]">{lead.phone}</code>
                      <Tag>{lead.dailyVolume}</Tag>
                    </span>
                    <span className="mt-1 line-clamp-1 block text-[13.5px] leading-[1.5] text-[#667085] dark:text-[#8e8ea4]">
                      {lead.note || 'No specific note provided.'}
                    </span>
                  </button>
                  <select
                    value={lead.status}
                    aria-label={`Status for ${lead.name}`}
                    onChange={(e) => onStatusChange(lead.id, e.target.value as Lead['status'])}
                    className="min-h-[34px] cursor-pointer rounded-md border border-[#d5d9e0] bg-white px-2 py-1 text-[12.5px] font-medium text-[#1f242b] dark:border-[#2a2a3a] dark:bg-[#12121a] dark:text-[#e2e2ec]"
                  >
                    {LEAD_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right rail */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Content health" />
            <div className="pb-1">
              <div className="px-5 pt-3.5">
                <div className="mb-2 flex justify-between gap-2.5 text-[13.5px] text-[#566070] dark:text-[#a2a2b6]">
                  <span>Landing sections configured</span>
                  <b className="font-medium text-[#14171c] dark:text-[#ededf3]">
                    {sectionCount} / {sectionCount}
                  </b>
                </div>
                <div className="h-1 overflow-hidden rounded-sm bg-[#eceef1] dark:bg-[#1e1e2a]">
                  <i
                    className="block h-full rounded-sm bg-[#0f766e] dark:bg-teal-300"
                    style={{ width: sectionCount > 0 ? '100%' : '0%' }}
                  />
                </div>
              </div>
              <div className="px-5 pt-3.5">
                <div className="mb-2 flex justify-between gap-2.5 text-[13.5px] text-[#566070] dark:text-[#a2a2b6]">
                  <span>Bangla copy coverage</span>
                  <b className="font-medium text-[#14171c] dark:text-[#ededf3]">
                    {untranslatedCount === null ? '—' : `${banglaPct}%`}
                  </b>
                </div>
                <div className="h-1 overflow-hidden rounded-sm bg-[#eceef1] dark:bg-[#1e1e2a]">
                  <i
                    className="block h-full rounded-sm bg-[#0f766e] dark:bg-teal-300"
                    style={{ width: `${banglaPct}%` }}
                  />
                </div>
              </div>
              <div className="px-5 pt-3.5 pb-[18px]">
                <div className="mb-2 flex justify-between gap-2.5 text-[13.5px] text-[#566070] dark:text-[#a2a2b6]">
                  <span>Articles published</span>
                  <b className="font-medium text-[#14171c] dark:text-[#ededf3]">{articleCount}</b>
                </div>
                <div className="h-1 overflow-hidden rounded-sm bg-[#eceef1] dark:bg-[#1e1e2a]">
                  <i
                    className="block h-full rounded-sm bg-[#0f766e] dark:bg-teal-300"
                    style={{ width: articleCount > 0 ? '100%' : '0%' }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Quick actions" />
            <div>
              <button
                type="button"
                onClick={onAddSection}
                className="group flex min-h-[44px] w-full cursor-pointer items-center gap-3 border-t border-[#eceef1] px-5 font-medium text-[#1f242b] transition-colors first:border-t-0 hover:bg-[#f1f3f5] dark:border-[#1e1e2a] dark:text-[#e2e2ec] dark:hover:bg-[#1a1a26]"
              >
                <span className="text-[#667085] dark:text-[#8e8ea4]">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="flex-1 text-left text-[13.5px]">Add landing section</span>
                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-[#0f766e] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 dark:text-teal-300" />
              </button>
              <button
                type="button"
                onClick={onWriteArticle}
                className="group flex min-h-[44px] w-full cursor-pointer items-center gap-3 border-t border-[#eceef1] px-5 font-medium text-[#1f242b] transition-colors first:border-t-0 hover:bg-[#f1f3f5] dark:border-[#1e1e2a] dark:text-[#e2e2ec] dark:hover:bg-[#1a1a26]"
              >
                <span className="text-[#667085] dark:text-[#8e8ea4]">
                  <PenLine className="h-4 w-4" />
                </span>
                <span className="flex-1 text-left text-[13.5px]">Write an article</span>
                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-[#0f766e] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 dark:text-teal-300" />
              </button>
              <button
                type="button"
                onClick={onUploadMedia}
                className="group flex min-h-[44px] w-full cursor-pointer items-center gap-3 border-t border-[#eceef1] px-5 font-medium text-[#1f242b] transition-colors first:border-t-0 hover:bg-[#f1f3f5] dark:border-[#1e1e2a] dark:text-[#e2e2ec] dark:hover:bg-[#1a1a26]"
              >
                <span className="text-[#667085] dark:text-[#8e8ea4]">
                  <Upload className="h-4 w-4" />
                </span>
                <span className="flex-1 text-left text-[13.5px]">Upload media</span>
                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-[#0f766e] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 dark:text-teal-300" />
              </button>
              <button
                type="button"
                onClick={onSwitchPricingMode}
                className="group flex min-h-[44px] w-full cursor-pointer items-center gap-3 border-t border-[#eceef1] px-5 font-medium text-[#1f242b] transition-colors first:border-t-0 hover:bg-[#f1f3f5] dark:border-[#1e1e2a] dark:text-[#e2e2ec] dark:hover:bg-[#1a1a26]"
              >
                <span className="text-[#667085] dark:text-[#8e8ea4]">
                  <DollarSign className="h-4 w-4" />
                </span>
                <span className="flex-1 text-left text-[13.5px]">Switch pricing mode</span>
                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-[#0f766e] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 dark:text-teal-300" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

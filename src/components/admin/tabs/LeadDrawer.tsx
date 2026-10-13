import { useEffect } from 'react';
import { Calendar, Copy, History, Mail, Phone, RefreshCw, Upload, X } from 'lucide-react';
import type { Lead, LeadActivity } from '../../../types/api';
import { AsyncButton, Skeleton } from '@/hooks/useAsyncAction';
import { Avatar, GhostButton, IconButton, Tag } from '../ui';

export interface LeadDrawerProps {
  lead: Lead;
  activities: LeadActivity[];
  isLoadingTimeline: boolean;
  /** Shared panel mutation pending flag (AdminPanel `mutation.pending`). */
  mutating: boolean;
  operators: { id: number; email: string }[];
  /**
   * Follow-up draft lives in AdminPanel (lifted value + setter, no new logic here):
   * `handleOpenLead` seeds it from `lead.followUpAt` and `handleSaveFollowUp`
   * persists it — this component only renders the input.
   */
  followUpDraft: string;
  onFollowUpDraftChange: (value: string) => void;
  onClose: () => void;
  onStatusChange: (id: number, status: Lead['status']) => void;
  onAssign: (leadId: number, assignedToId: number | null) => void;
  onSaveFollowUp: (lead: Lead) => void;
  onRetryCapi: (id: number) => void;
  onRetryPortal: (id: number) => void;
  onNotify: (message: string) => void;
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

function portalTone(status: string): 'teal' | 'amber' | 'red' | 'slate' {
  if (status === 'Synced') return 'teal';
  if (status === 'Failed') return 'red';
  if (status === 'Skipped') return 'slate';
  return 'amber';
}

function capiTone(status: string): 'teal' | 'amber' | 'red' | 'slate' {
  if (status === 'Sent') return 'teal';
  if (status === 'Failed') return 'red';
  if (status === 'Skipped') return 'slate';
  return 'amber';
}

/**
 * Lead drawer in artifact style (`.dp` 420px right rail): header avatar-lg + name
 * + close, body sections, footer Retry CAPI / Sync Portal / History.
 *
 * Behavior matches the previous `renderLeadDrawer` — outside-click + Escape close,
 * assignment + follow-up through the existing AdminPanel handlers, timeline newest
 * first — plus artifact sections the old drawer lacked (Stage select, Contact rows
 * with copy buttons, Order volume, Notes, footer Retry CAPI / Sync Portal /
 * History scroll-to-timeline). No handler logic changed.
 */
export const LeadDrawer: React.FC<LeadDrawerProps> = ({
  lead,
  activities,
  isLoadingTimeline,
  mutating,
  operators,
  followUpDraft,
  onFollowUpDraftChange,
  onClose,
  onStatusChange,
  onAssign,
  onSaveFollowUp,
  onRetryCapi,
  onRetryPortal,
  onNotify,
}) => {
  const isOverdue =
    lead.followUpAt !== null &&
    lead.followUpAt !== undefined &&
    new Date(lead.followUpAt).getTime() < Date.now() &&
    lead.status !== 'Won' &&
    lead.status !== 'Lost';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyText = async (text: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      onNotify(`${label} copied`);
    } catch {
      onNotify('Copy failed — select and copy manually');
    }
  };

  const scrollToTimeline = (): void => {
    document.getElementById('lead-drawer-timeline')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={`Lead ${lead.name} — details and follow-up`}
      onClick={(e) => {
        // Click-outside to close, but not a click that started inside the panel: a text
        // selection inside the timeline must not dismiss it.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-[420px] max-w-full flex-col overflow-hidden border-l border-[#e4e7ec] bg-white shadow-2xl dark:border-[#2a2a3a] dark:bg-[#14141c]">
        <header className="flex items-center gap-3 border-b border-[#eceef1] px-5 py-4 dark:border-[#1e1e2a]">
          <Avatar initials={initialsOf(lead.name)} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col">
            <b className="truncate text-base font-semibold text-[#14171c] dark:text-[#ededf3]">
              {lead.name}
            </b>
            <span className="truncate text-[12.5px] text-[#667085] dark:text-[#8e8ea4]">
              {new Date(lead.createdAt).toLocaleDateString()} ·{' '}
              <code className="font-mono text-[12px]">{lead.source}</code>
            </span>
          </div>
          <IconButton label="Close details" title="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-1">
          {/* Anonymised by the retention cron: the timeline is history, but the contact
              details below it are gone and re-entering them would undo a compliance action. */}
          {lead.anonymizedAt && (
            <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Personal data on this lead was anonymised on{' '}
              {new Date(lead.anonymizedAt).toLocaleDateString()} under the retention policy.
              Status history is preserved.
            </p>
          )}

          {/* Stage */}
          <section className="flex flex-col gap-2 border-b border-[#eceef1] py-4 last:border-b-0 dark:border-[#1e1e2a]">
            <span className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#667085] dark:text-[#8e8ea4]">
              Stage
            </span>
            <select
              value={lead.status}
              aria-label={`Stage for ${lead.name}`}
              disabled={mutating}
              onChange={(e) => onStatusChange(lead.id, e.target.value as Lead['status'])}
              className="min-h-[38px] w-full cursor-pointer rounded-md border border-[#d5d9e0] bg-white px-2.5 text-[13.5px] font-medium text-[#1f242b] dark:border-[#2a2a3a] dark:bg-[#12121a] dark:text-[#e2e2ec]"
            >
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </section>

          {/* Assignment (existing operator picker, kept verbatim in behavior) */}
          <section className="flex flex-col gap-2 border-b border-[#eceef1] py-4 last:border-b-0 dark:border-[#1e1e2a]">
            <span className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#667085] dark:text-[#8e8ea4]">
              Assignment
            </span>
            <div className="flex items-center gap-2">
              <select
                value={lead.assignedToId ?? ''}
                disabled={mutating}
                onChange={(e) => {
                  const raw = e.target.value;
                  onAssign(lead.id, raw === '' ? null : Number(raw));
                }}
                aria-label="Assign this lead to an operator"
                className="min-h-[36px] flex-1 cursor-pointer rounded-md border border-[#d5d9e0] bg-white px-2.5 text-[13px] text-[#1f242b] dark:border-[#2a2a3a] dark:bg-[#12121a] dark:text-[#e2e2ec]"
              >
                <option value="">Unassigned</option>
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.email}
                  </option>
                ))}
              </select>
              {/* The legacy free-text column, shown because it is what the rest of the
                  pipeline has historically displayed. */}
              {lead.assignedTo !== '' && (
                <span className="shrink-0 rounded-[5px] border border-[#e6e8ec] bg-[#f1f3f5] px-2 py-[1px] text-[11.5px] font-medium text-[#566070] dark:border-[#2a2a3a] dark:bg-[#1c1c2c] dark:text-[#a2a2b6]">
                  {lead.assignedTo}
                </span>
              )}
            </div>
          </section>

          {/* Contact */}
          <section className="flex flex-col gap-2 border-b border-[#eceef1] py-4 last:border-b-0 dark:border-[#1e1e2a]">
            <span className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#667085] dark:text-[#8e8ea4]">
              Contact
            </span>
            <div className="flex items-center gap-2.5 text-[13.5px] text-[#1f242b] dark:text-[#e2e2ec]">
              <Phone className="h-[15px] w-[15px] flex-none text-[#667085] dark:text-[#8e8ea4]" />
              <span className="min-w-0 flex-1 font-mono text-[13px]">{lead.phone}</span>
              <IconButton
                label="Copy phone"
                title="Copy"
                onClick={() => void copyText(lead.phone, 'Phone number')}
                className="h-[26px] w-[26px] border-transparent bg-transparent"
              >
                <Copy className="h-3.5 w-3.5" />
              </IconButton>
            </div>
            <div className="flex items-center gap-2.5 text-[13.5px] text-[#1f242b] dark:text-[#e2e2ec]">
              <Mail className="h-[15px] w-[15px] flex-none text-[#667085] dark:text-[#8e8ea4]" />
              <span className="min-w-0 flex-1 truncate">{lead.email !== '' ? lead.email : 'N/A'}</span>
              {lead.email !== '' && (
                <IconButton
                  label="Copy email"
                  title="Copy"
                  onClick={() => void copyText(lead.email, 'Email')}
                  className="h-[26px] w-[26px] border-transparent bg-transparent"
                >
                  <Copy className="h-3.5 w-3.5" />
                </IconButton>
              )}
            </div>
          </section>

          {/* Order volume */}
          <section className="flex flex-col gap-2 border-b border-[#eceef1] py-4 last:border-b-0 dark:border-[#1e1e2a]">
            <span className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#667085] dark:text-[#8e8ea4]">
              Order volume
            </span>
            <span className="self-start">
              <Tag>{lead.dailyVolume}</Tag>
            </span>
          </section>

          {/* Notes */}
          <section className="flex flex-col gap-2 border-b border-[#eceef1] py-4 last:border-b-0 dark:border-[#1e1e2a]">
            <span className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#667085] dark:text-[#8e8ea4]">
              Notes
            </span>
            <p className="m-0 text-[13.5px] leading-[1.55] text-[#2b313b] dark:text-[#c6c6d4]">
              {lead.note !== '' ? lead.note : 'No notes recorded.'}
            </p>
          </section>

          {/* Follow-up */}
          <section className="flex flex-col gap-2 border-b border-[#eceef1] py-4 last:border-b-0 dark:border-[#1e1e2a]">
            <label
              htmlFor="lead-drawer-follow-up"
              className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#667085] dark:text-[#8e8ea4]"
            >
              Follow-up date
            </label>
            <div className="flex items-center gap-2">
              <span className="relative flex flex-1 items-center">
                <Calendar className="pointer-events-none absolute left-[11px] h-[15px] w-[15px] text-[#667085] dark:text-[#8e8ea4]" />
                <input
                  id="lead-drawer-follow-up"
                  type="date"
                  value={followUpDraft}
                  onChange={(e) => onFollowUpDraftChange(e.target.value)}
                  aria-label="Scheduled follow-up date"
                  className="min-h-[36px] w-full rounded-md border border-[#d5d9e0] bg-white py-0 pl-[34px] pr-3 text-[13.5px] text-[#1f242b] dark:border-[#2a2a3a] dark:bg-[#12121a] dark:text-[#e2e2ec]"
                />
              </span>
              <AsyncButton
                onClick={() => onSaveFollowUp(lead)}
                loading={mutating}
                className="inline-flex items-center gap-2 min-h-[34px] px-3 rounded-md border bg-[#0f766e] border-[#0f766e] text-white text-[13.5px] font-medium cursor-pointer transition-colors hover:bg-[#115e59] hover:border-[#115e59] disabled:opacity-50 disabled:cursor-wait"
              >
                Save
              </AsyncButton>
            </div>
            {isOverdue && (
              <p className="m-0 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                Overdue — the promised follow-up date has passed.
              </p>
            )}
          </section>

          {/* Sync status */}
          <section className="flex flex-col gap-2 border-b border-[#eceef1] py-4 last:border-b-0 dark:border-[#1e1e2a]">
            <span className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#667085] dark:text-[#8e8ea4]">
              Sync status
            </span>
            <div className="flex flex-col rounded-lg border border-[#e4e7ec] dark:border-[#232331]">
              <div className="flex items-center justify-between gap-2.5 px-3 py-2.5">
                <span>
                  <b className="block text-[13.5px] font-medium text-[#14171c] dark:text-[#ededf3]">
                    License Portal
                  </b>
                  <small className="text-[12.5px] text-[#667085] dark:text-[#8e8ea4]">
                    {lead.licensePortalError ?? 'Not yet synced'}
                  </small>
                </span>
                <Tag tone={portalTone(lead.licensePortalStatus)}>{lead.licensePortalStatus}</Tag>
              </div>
              <div className="flex items-center justify-between gap-2.5 border-t border-[#e4e7ec] px-3 py-2.5 dark:border-[#232331]">
                <span>
                  <b className="block text-[13.5px] font-medium text-[#14171c] dark:text-[#ededf3]">
                    Meta CAPI
                  </b>
                  <small className="text-[12.5px] text-[#667085] dark:text-[#8e8ea4]">
                    {lead.metaCapiError ?? 'Event not delivered'}
                  </small>
                </span>
                <Tag tone={capiTone(lead.metaCapiStatus)}>{lead.metaCapiStatus}</Tag>
              </div>
            </div>
          </section>

          {/* Activity */}
          <section
            id="lead-drawer-timeline"
            className="flex scroll-mt-2 flex-col gap-2 border-b border-[#eceef1] py-4 last:border-b-0 dark:border-[#1e1e2a]"
          >
            <span className="flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#667085] dark:text-[#8e8ea4]">
              <History className="h-3.5 w-3.5" />
              Activity
            </span>
            {isLoadingTimeline ? (
              <div aria-busy="true" aria-label="Loading activity history">
                <Skeleton lines={3} />
              </div>
            ) : activities.length === 0 ? (
              <p className="m-0 text-[13px] text-[#667085] dark:text-[#8e8ea4]">
                No recorded activity yet. Every status change and assignment from here on is
                logged with the operator who made it.
              </p>
            ) : (
              <ol className="m-0 flex list-none flex-col p-0">
                {activities.map((activity) => (
                  <li key={activity.id} className="relative flex gap-3 pb-3.5 last:pb-0">
                    {activity.id !== activities[activities.length - 1]?.id && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-[4px] top-3 w-px bg-[#e4e7ec] dark:bg-[#232331]"
                      />
                    )}
                    <i
                      aria-hidden="true"
                      className="mt-[5px] h-[9px] w-[9px] flex-none rounded-full border-[1.5px] border-[#0f766e] bg-[#0f766e]"
                    />
                    <span>
                      <b className="block text-[13.5px] font-medium text-[#14171c] dark:text-[#ededf3]">
                        {activity.fromStatus !== '' &&
                        activity.toStatus !== '' &&
                        activity.fromStatus !== activity.toStatus
                          ? `${activity.fromStatus} → ${activity.toStatus}`
                          : activity.toStatus !== ''
                            ? activity.toStatus
                            : 'Activity'}
                      </b>
                      {activity.note !== '' && (
                        <span className="block text-[12.5px] text-[#566070] dark:text-[#a2a2b6]">
                          {activity.note}
                        </span>
                      )}
                      <small className="text-[12.5px] text-[#667085] dark:text-[#8e8ea4]">
                        {new Date(activity.createdAt).toLocaleString()}
                        {/* A null actor is either system-initiated (lead captured) or an operator
                            who has since been deleted — both are worth distinguishing from
                            "an operator did this" rather than leaving the field blank. */}
                        {activity.actorId === null ? ' · system' : ` · operator #${activity.actorId}`}
                      </small>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <footer className="flex gap-2 border-t border-[#eceef1] bg-white px-5 py-3.5 dark:border-[#1e1e2a] dark:bg-[#14141c]">
          <AsyncButton
            onClick={() => onRetryCapi(lead.id)}
            loading={mutating}
            className="flex-1 justify-center whitespace-nowrap inline-flex items-center gap-2 min-h-[34px] px-3 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px] font-medium cursor-pointer transition-colors hover:bg-[#f1f3f5] dark:hover:bg-[#1a1a26] disabled:opacity-50 disabled:cursor-wait"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry CAPI
          </AsyncButton>
          <AsyncButton
            onClick={() => onRetryPortal(lead.id)}
            loading={mutating}
            className="flex-1 justify-center whitespace-nowrap inline-flex items-center gap-2 min-h-[34px] px-3 rounded-md border bg-[#0f766e] border-[#0f766e] text-white text-[13.5px] font-medium cursor-pointer transition-colors hover:bg-[#115e59] hover:border-[#115e59] disabled:opacity-50 disabled:cursor-wait"
          >
            <Upload className="h-3.5 w-3.5" />
            Sync Portal
          </AsyncButton>
          <GhostButton type="button" onClick={scrollToTimeline} className="flex-1 justify-center whitespace-nowrap">
            <History className="h-3.5 w-3.5" />
            History
          </GhostButton>
        </footer>
      </div>
    </div>
  );
};

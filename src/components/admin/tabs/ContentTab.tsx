import { Save } from 'lucide-react';
import type { I18nReport, LandingContentRow } from '../../../types/api';
import * as api from '../../../services/api';
import { CONTENT_KEY_GROUPS } from '@/lib/contentKeys';
import { AsyncButton, Skeleton } from '@/hooks/useAsyncAction';
import { Card, GhostButton } from '../ui';

export interface ContentTabProps {
  i18nReport: I18nReport | null;
  editingSectionKey: string | null;
  onEditingSectionKeyChange: React.Dispatch<React.SetStateAction<string | null>>;
  editorRows: { en: LandingContentRow | null; bn: LandingContentRow | null };
  onEditorRowsChange: React.Dispatch<
    React.SetStateAction<{ en: LandingContentRow | null; bn: LandingContentRow | null }>
  >;
  editorDraft: { en: string; bn: string };
  onEditorDraftChange: React.Dispatch<React.SetStateAction<{ en: string; bn: string }>>;
  editorErrors: { en: string; bn: string };
  editorConflict: { locale: 'en' | 'bn'; serverRow: LandingContentRow } | null;
  onEditorConflictChange: React.Dispatch<
    React.SetStateAction<{ locale: 'en' | 'bn'; serverRow: LandingContentRow } | null>
  >;
  revisionHistory: { locale: 'en' | 'bn'; rows: api.ContentRevision[] } | null;
  isLoadingHistory: boolean;
  isSavingEditor: boolean;
  onOpenSection: (key: string) => void;
  onSaveLocale: (locale: 'en' | 'bn') => void;
  onPublishLocale: (locale: 'en' | 'bn') => void;
  onLoadHistory: (locale: 'en' | 'bn') => void;
  onRestoreRevision: (locale: 'en' | 'bn', version: number) => void;
  diffKeysOf: (serverContent: unknown, localRaw: string) => string[];
}

export const ContentTab: React.FC<ContentTabProps> = ({
  i18nReport,
  editingSectionKey,
  onEditingSectionKeyChange,
  editorRows,
  onEditorRowsChange,
  editorDraft,
  onEditorDraftChange,
  editorErrors,
  editorConflict,
  onEditorConflictChange,
  revisionHistory,
  isLoadingHistory,
  isSavingEditor,
  onOpenSection,
  onSaveLocale,
  onPublishLocale,
  onLoadHistory,
  onRestoreRevision,
  diffKeysOf,
}) => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[#14171c] dark:text-[#ededf3]">
        Bilingual Landing Content
      </h2>
      <p className="text-xs sm:text-sm text-[#667085] dark:text-[#8e8ea4] mt-0.5">
        One payload per locale, edited side by side. <strong>Fallback chain: a section with
        no Bangla payload renders the English one</strong> — the page is never blank.
      </p>
    </div>
    {editingSectionKey && (
      <GhostButton
        onClick={() => onEditingSectionKeyChange(null)}
        className="self-start"
      >
        Close editor
      </GhostButton>
    )}
  </div>

  {/* Translation-gap worklist */}
  <Card className="p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h3 className="text-sm font-bold text-[#14171c] dark:text-[#ededf3]">
        Missing Bangla translations
      </h3>
      <span className="text-[11px] font-mono text-[#667085] dark:text-[#8e8ea4]">
        {i18nReport
          ? `${i18nReport.translatedSectionCount}/${i18nReport.englishSectionCount} sections translated`
          : 'Report unavailable for this role'}
      </span>
    </div>

    {!i18nReport ? (
      <p className="text-xs text-[#667085] dark:text-[#8e8ea4]">
        Loading translation report…
      </p>
    ) : i18nReport.gaps.length === 0 ? (
      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
        Every English section has a published, non-empty Bangla payload.
      </p>
    ) : (
      <ul className="flex flex-wrap gap-2">
        {i18nReport.gaps.map((gap) => (
          <li key={gap.sectionKey}>
            <button
              onClick={() => void onOpenSection(gap.sectionKey)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
            >
              {gap.sectionKey}
              <span className="opacity-70">{gap.reason}</span>
            </button>
          </li>
        ))}
      </ul>
    )}

    {i18nReport && i18nReport.orphans.length > 0 && (
      <p className="mt-3 text-[11px] text-rose-700 dark:text-rose-300">
        Bangla rows with no English source (check the section key):{' '}
        <span className="font-mono">{i18nReport.orphans.join(', ')}</span>
      </p>
    )}
  </Card>

  {/* Section browser: every CMS key in page order, grouped so new keys
      (dock, walkthrough, videoSection) are found where they render. */}
  <Card className="p-4 sm:p-5">
    <h3 className="text-sm font-bold text-[#14171c] dark:text-[#ededf3] mb-3">
      All sections (page order)
    </h3>
    <div className="space-y-3">
      {CONTENT_KEY_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085] dark:text-[#8e8ea4] mb-1.5">
            {group.title}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {group.keys.map((key) => {
              const gap = i18nReport?.gaps.find((entry) => entry.sectionKey === key);
              return (
                <li key={key}>
                  <button
                    onClick={() => void onOpenSection(key)}
                    title={gap ? `Missing Bangla (${gap.reason}) — open to translate` : `Open ${key} in the editor`}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold cursor-pointer ${
                      editingSectionKey === key
                        ? 'border-[#0f766e] bg-[#e6f2f0] text-teal-700 dark:border-[#1f4f4a] dark:bg-[#12302e] dark:text-teal-300'
                        : gap
                          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                          : 'border-[#d5d9e0] text-[#566070] hover:bg-[#f1f3f5] dark:border-[#2a2a3a] dark:text-[#a2a2b6] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {key}
                    {gap && <span className="opacity-70">· {gap.reason}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  </Card>

  {/* EN | BN editor */}
  {editingSectionKey ? (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(['en', 'bn'] as const).map((locale) => {
          const row = editorRows[locale];
          const error = editorErrors[locale];
          const conflict = editorConflict?.locale === locale ? editorConflict : null;
          const diffKeys = conflict
            ? diffKeysOf(conflict.serverRow.content, editorDraft[locale])
            : [];
          return (
            <Card
              key={locale}
              className="p-4"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-[#1f242b] dark:text-[#e2e2ec]">
                  {locale === 'en' ? 'English (en)' : 'বাংলা (bn)'}
                  <span className="ml-2 font-mono font-normal text-[11px] text-[#667085] dark:text-[#8e8ea4]">
                    {row
                      ? `${row.status} · v${row.version}`
                      : 'no row'}
                  </span>
                </h4>
                <div className="flex items-center gap-1.5">
                  <AsyncButton
                    onClick={() => void onPublishLocale(locale)}
                    loading={isSavingEditor}
                    disabled={!row}
                    title="Promote staged drafts to the live page immediately"
                    className="inline-flex items-center gap-1.5 rounded-md min-h-[34px] bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  >
                    Publish {locale.toUpperCase()}
                  </AsyncButton>
                  <AsyncButton
                    onClick={() => void onSaveLocale(locale)}
                    loading={isSavingEditor}
                    className="inline-flex items-center gap-2 min-h-[34px] px-3 rounded-md border bg-[#0f766e] border-[#0f766e] text-white text-[13.5px] font-medium cursor-pointer transition-colors hover:bg-[#115e59] hover:border-[#115e59] disabled:opacity-50 disabled:cursor-wait"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save {locale.toUpperCase()}
                  </AsyncButton>
                </div>
              </div>

              {/* Optimistic-locking conflict (Task 19 §5). The operator's draft
                  is untouched in the textarea below — loading their version is
                  explicit, never automatic, so a click cannot discard work. */}
              {conflict && (
                <div
                  role="alert"
                  className="mb-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                >
                  <p className="font-bold">
                    Someone else saved this section at{' '}
                    {new Date(conflict.serverRow.updatedAt).toLocaleString()} (version{' '}
                    {conflict.serverRow.version}). Your edits are still in the editor
                    below — nothing was lost.
                  </p>
                  {diffKeys.length > 0 && (
                    <p className="mt-1">
                      Fields they changed:{' '}
                      <span className="font-mono font-semibold">{diffKeys.join(', ')}</span>
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onEditorRowsChange((prev) => ({ ...prev, [locale]: conflict.serverRow }));
                        onEditorDraftChange((prev) => ({
                          ...prev,
                          [locale]: JSON.stringify(conflict.serverRow.content, null, 2),
                        }));
                        onEditorConflictChange(null);
                      }}
                      className="rounded-lg bg-amber-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-800 cursor-pointer"
                    >
                      Load their version
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditorConflictChange(null)}
                      className="rounded-lg border border-amber-400 px-2.5 py-1 text-[11px] font-semibold hover:bg-amber-100 dark:hover:bg-amber-500/20 cursor-pointer"
                    >
                      Keep editing mine
                    </button>
                  </div>
                </div>
              )}

              <textarea
                value={editorDraft[locale]}
                onChange={(e) =>
                  onEditorDraftChange((prev) => ({ ...prev, [locale]: e.target.value }))
                }
                spellCheck={false}
                rows={18}
                placeholder={locale === 'bn' ? 'অনুবাদ করলে এখানে JSON বসান…' : '{"headline": "..."}'}
                className={`w-full rounded-md bg-white dark:bg-[#12121a] border p-3 font-mono text-[11px] leading-relaxed text-[#1f242b] dark:text-[#e2e2ec] ${
                  error ? 'border-rose-400' : 'border-[#d5d9e0] dark:border-[#2a2a3a]'
                } ${locale === 'bn' ? 'font-bangla' : ''}`}
              />

              {error && (
                <p className="mt-2 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                  {error}
                </p>
              )}
              {!row && !error && (
                <p className="mt-2 text-[11px] text-[#667085] dark:text-[#8e8ea4]">
                  No {locale.toUpperCase()} row yet. Saving creates it.
                </p>
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-[11px] text-[#667085] dark:text-[#8e8ea4]">
        Saving a published section stages a <strong>draft</strong> — the live page
        keeps the old copy until you press <strong>Publish</strong>. Payload shape
        must match the static copy in{' '}
        <span className="font-mono">src/data/landingContent.ts</span> — keys the
        payload omits keep their English value on merge.
      </p>

      {/* Revision history + forward-only rollback (Task 19 §4) */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-[#1f242b] dark:text-[#e2e2ec]">
            Revision history
          </h4>
          {(['en', 'bn'] as const).map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => void onLoadHistory(locale)}
              disabled={isLoadingHistory}
              className="rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#1f242b] dark:text-[#e2e2ec] hover:bg-[#f1f3f5] dark:hover:bg-white/[0.04] disabled:opacity-50 cursor-pointer"
            >
              {locale.toUpperCase()}
            </button>
          ))}
          {isLoadingHistory && (
            <div className="mt-2" aria-busy="true" aria-label="Loading revision history">
              <Skeleton lines={2} />
            </div>
          )}
        </div>
        {revisionHistory && (
          <div className="mt-3">
            <p className="text-[11px] text-[#667085] dark:text-[#8e8ea4]">
              {revisionHistory.locale.toUpperCase()} — newest first. Restoring
              applies the old copy as a <strong>new</strong> version; history is
              never deleted.
            </p>
            {revisionHistory.rows.length === 0 ? (
              <p className="mt-1 text-[11px] text-[#667085] dark:text-[#8e8ea4]">No revisions yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[#eceef1] dark:divide-[#1e1e2a]">
                {revisionHistory.rows.map((revision) => (
                  <li
                    key={revision.version}
                    className="flex items-center justify-between gap-3 py-1.5 text-[11px]"
                  >
                    <span className="font-mono text-[#1f242b] dark:text-[#e2e2ec]">
                      v{revision.version} · {revision.status}
                      {revision.note ? ` · ${revision.note}` : ''} ·{' '}
                      {new Date(revision.createdAt).toLocaleString()}
                    </span>
                    <AsyncButton
                      onClick={() =>
                        void onRestoreRevision(revisionHistory.locale, revision.version)
                      }
                      loading={isSavingEditor}
                      className="rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] px-2 py-0.5 font-semibold text-[#1f242b] dark:text-[#e2e2ec] hover:bg-[#f1f3f5] dark:hover:bg-white/[0.04] disabled:opacity-50 cursor-pointer"
                    >
                      Restore this
                    </AsyncButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  ) : (
    <p className="text-xs text-[#667085] dark:text-[#8e8ea4]">
      Pick a section above to edit both locales, or open one from the gap list.
    </p>
  )}

    </div>
  );
};

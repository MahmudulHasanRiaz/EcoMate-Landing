import * as api from '../../../services/api';
import type { LandingSection } from '../../../types/api';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Card } from '../ui';

export interface SectionsTabProps {
  sections: LandingSection[];
  onSectionsChange: React.Dispatch<React.SetStateAction<LandingSection[]>>;
  onNotify: (msg: string) => void;
}

export const SectionsTab: React.FC<SectionsTabProps> = ({ sections, onSectionsChange, onNotify }) => {
  // Self-contained mutation island: its three autosaves call the API directly, so it
  // owns the shared primitive (pending → disabled + aria-busy, error → toast, settle →
  // re-enable). Previously these awaits had no try/catch at all — a failure was an
  // unhandled rejection with zero operator feedback.
  const mutation = useAsyncAction();

  const runSectionUpdate = (label: string, work: () => Promise<void>): void => {
    void mutation.run(async () => {
      try {
        await work();
      } catch (err) {
        onNotify(err instanceof Error ? err.message : `${label} failed`);
      }
    }, { errorPrefix: label });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" aria-busy={mutation.pending}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#14171c] dark:text-[#ededf3]">
          Landing Page Sections CMS
        </h2>
        <p className="text-xs sm:text-sm text-[#667085] dark:text-[#8e8ea4] mt-0.5">
          Control section headlines, subtitles, language translations, ordering and live visibility without code changes.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((sec) => (
          <Card key={sec.id} className="p-5">
            <div className="flex items-center justify-between border-b border-[#eceef1] dark:border-[#1e1e2a] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-300">
                  #{sec.sortOrder} · {sec.sectionKey}
                </span>
                <span className="text-xs text-[#667085] dark:text-[#8e8ea4]">({sec.eyebrowEn})</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-[#14171c] dark:text-[#ededf3]">
                  <input
                    type="checkbox"
                    checked={sec.isVisible}
                    disabled={mutation.pending}
                    aria-busy={mutation.pending}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      void runSectionUpdate('Visibility update failed', async () => {
                        const updated = await api.updateSection(sec.id, { isVisible: checked });
                        onSectionsChange((prev) => prev.map((s) => (s.id === sec.id ? updated : s)));
                        onNotify(`Section visibility updated`);
                      });
                    }}
                    className="rounded accent-[#0f766e]"
                  />
                  <span>Visible</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#667085] dark:text-[#8e8ea4] mb-1 font-medium">English Headline</label>
                <input
                  type="text"
                  value={sec.titleEn}
                  disabled={mutation.pending}
                  aria-busy={mutation.pending}
                  onChange={(e) => {
                    const val = e.target.value;
                    onSectionsChange((prev) => prev.map((s) => (s.id === sec.id ? { ...s, titleEn: val } : s)));
                  }}
                  onBlur={() => {
                    const titleEn = sec.titleEn;
                    void runSectionUpdate('Headline save failed', async () => {
                      await api.updateSection(sec.id, { titleEn });
                      onNotify('Headline saved');
                    });
                  }}
                  className="w-full px-3 min-h-[34px] py-1.5 rounded-md bg-white dark:bg-[#12121a] border border-[#d5d9e0] dark:border-[#2a2a3a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px]"
                />
              </div>

              <div>
                <label className="block text-[#667085] dark:text-[#8e8ea4] mb-1 font-medium">Bangla Headline (বাংলা)</label>
                <input
                  type="text"
                  value={sec.titleBn}
                  disabled={mutation.pending}
                  aria-busy={mutation.pending}
                  onChange={(e) => {
                    const val = e.target.value;
                    onSectionsChange((prev) => prev.map((s) => (s.id === sec.id ? { ...s, titleBn: val } : s)));
                  }}
                  onBlur={() => {
                    const titleBn = sec.titleBn;
                    void runSectionUpdate('Bangla headline save failed', async () => {
                      await api.updateSection(sec.id, { titleBn });
                      onNotify('Bangla headline saved');
                    });
                  }}
                  className="w-full px-3 min-h-[34px] py-1.5 rounded-md bg-white dark:bg-[#12121a] border border-[#d5d9e0] dark:border-[#2a2a3a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px] font-bangla"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

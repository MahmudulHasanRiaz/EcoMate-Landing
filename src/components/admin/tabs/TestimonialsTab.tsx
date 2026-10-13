import { Edit2, Plus, Trash2 } from 'lucide-react';
import type { CaseStudy, Testimonial } from '../../../types/api';
import type { FieldErrors } from '../fieldErrors';
import { TestimonialForm } from '../TestimonialForm';
import { CaseStudyEditor } from '../CaseStudyEditor';
import { TestimonialCard } from '../../TestimonialCard';
import { Card, PrimaryButton } from '../ui';

export interface TestimonialsTabProps {
  testimonials: Testimonial[];
  caseStudies: CaseStudy[];
  testimonialDraft: Partial<Testimonial> | null;
  onTestimonialDraftChange: React.Dispatch<React.SetStateAction<Partial<Testimonial> | null>>;
  testimonialErrors: FieldErrors;
  onTestimonialErrorsChange: (errors: FieldErrors) => void;
  testimonialSaving: boolean;
  caseStudyDraft: Partial<CaseStudy> | null;
  onCaseStudyDraftChange: React.Dispatch<React.SetStateAction<Partial<CaseStudy> | null>>;
  caseStudyErrors: FieldErrors;
  onCaseStudyErrorsChange: (errors: FieldErrors) => void;
  caseStudySaving: boolean;
  onSaveTestimonial: (data: Partial<Testimonial>) => void;
  onDeleteTestimonial: (id: number) => void;
  onSaveCaseStudy: (data: Partial<CaseStudy>) => void;
  onDeleteCaseStudy: (id: number | string) => void;
}

export const TestimonialsTab: React.FC<TestimonialsTabProps> = ({
  testimonials,
  caseStudies,
  testimonialDraft,
  onTestimonialDraftChange,
  testimonialErrors,
  onTestimonialErrorsChange,
  testimonialSaving,
  caseStudyDraft,
  onCaseStudyDraftChange,
  caseStudyErrors,
  onCaseStudyErrorsChange,
  caseStudySaving,
  onSaveTestimonial,
  onDeleteTestimonial,
  onSaveCaseStudy,
  onDeleteCaseStudy,
}) => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#14171c] dark:text-[#ededf3]">
            Proof & Case Studies CMS
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] dark:text-[#8e8ea4] mt-0.5">
            Manage verifiable client testimonials, video interviews, and quantified ROI case studies.
          </p>
        </div>
        {!testimonialDraft && (
          <PrimaryButton
            onClick={() => {
              onTestimonialDraftChange({ format: 'text', isPublished: false, sortOrder: 0 });
              onTestimonialErrorsChange({});
            }}
          >
            <Plus className="h-4 w-4" />
            <span>New Testimonial</span>
          </PrimaryButton>
        )}
      </div>

      {testimonialDraft && (
        <TestimonialForm
          initial={testimonialDraft}
          errors={testimonialErrors}
          saving={testimonialSaving}
          onSubmit={onSaveTestimonial}
          onCancel={() => onTestimonialDraftChange(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t) => (
          <div key={t.id} className="relative">
            {!t.isPublished && (
              <span className="absolute -top-2 left-4 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                Draft
              </span>
            )}
            <TestimonialCard data={t} locale="en" />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  onTestimonialDraftChange({ ...t });
                  onTestimonialErrorsChange({});
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] text-[11px] font-semibold text-[#1f242b] dark:text-[#e2e2ec] hover:bg-[#f1f3f5] dark:hover:bg-white/[0.04] cursor-pointer"
              >
                <Edit2 className="h-3 w-3" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => onDeleteTestimonial(t.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-rose-200 dark:border-rose-900/40 text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#eceef1] dark:border-[#1e1e2a]">
        <div>
          <h3 className="text-lg font-bold text-[#14171c] dark:text-[#ededf3]">Case Studies</h3>
          <p className="text-xs text-[#667085] dark:text-[#8e8ea4] mt-0.5">
            Long-form proof pages. A blank slug is generated from the title.
          </p>
        </div>
        {!caseStudyDraft && (
          <PrimaryButton
            onClick={() => {
              onCaseStudyDraftChange({ isPublished: false });
              onCaseStudyErrorsChange({});
            }}
          >
            <Plus className="h-4 w-4" />
            <span>New Case Study</span>
          </PrimaryButton>
        )}
      </div>

      {caseStudyDraft && (
        <CaseStudyEditor
          initial={caseStudyDraft}
          errors={caseStudyErrors}
          saving={caseStudySaving}
          onSubmit={onSaveCaseStudy}
          onCancel={() => onCaseStudyDraftChange(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {caseStudies.map((cs) => (
          <Card key={cs.id} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="font-bold text-[#14171c] dark:text-[#ededf3] text-sm">{cs.title}</span>
                {!cs.isPublished && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-xs text-[#667085] dark:text-[#8e8ea4]">
                {cs.client} · <span className="font-mono">/{cs.slug}</span>
              </p>
              <p className="mt-2 text-xs text-[#1f242b] dark:text-[#e2e2ec] line-clamp-2">
                {cs.problemOverview}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#eceef1] dark:border-[#1e1e2a] flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  onCaseStudyDraftChange({ ...cs });
                  onCaseStudyErrorsChange({});
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] text-[11px] font-semibold text-[#1f242b] dark:text-[#e2e2ec] hover:bg-[#f1f3f5] dark:hover:bg-white/[0.04] cursor-pointer"
              >
                <Edit2 className="h-3 w-3" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => onDeleteCaseStudy(cs.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-rose-200 dark:border-rose-900/40 text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

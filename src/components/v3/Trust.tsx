'use client';

/**
 * v3 trust section (mockup §11): selectable story cards + featured panel with
 * a video stub that opens the existing case-study modal.
 *
 * Published DB testimonials render first (mapped onto the story shape);
 * otherwise the CMS `proof.caseStudies` fallback stories render.
 */
import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { useLanding } from '@/components/shell/useLanding';
import type { PublicTestimonial } from '@/lib/content';
import type { CaseStudy, Locale } from '@/src/types/landing';
import { CaseStudyVideoModal } from '@/src/components/CaseStudyVideoModal';
import { youtubeEmbedUrl } from '@/lib/contact';
import { SectionHead, SectionShell } from './SectionHead';

interface Story {
  id: string;
  businessName: string;
  roleLine: string;
  quote: string;
  website: string;
  videoDuration: string;
  videoTitle: string;
  modal: CaseStudy;
}

function storyFromCaseStudy(study: CaseStudy): Story {
  return {
    id: study.id,
    businessName: study.businessName,
    roleLine: study.role,
    quote: study.quote,
    website: study.website,
    videoDuration: study.videoDuration ?? '',
    videoTitle: study.videoTitle ?? 'Customer story',
    modal: study,
  };
}

function storyFromTestimonial(row: PublicTestimonial, locale: Locale): Story {
  const modal: CaseStudy = {
    id: String(row.id),
    businessName: row.companyName,
    category: '',
    location: '',
    founderName: row.clientName,
    role: row.clientRole,
    website: '',
    quote: locale === 'bn' ? row.quoteBn : row.quoteEn,
    metrics: [],
    challenge: '',
    solution: '',
    videoDuration: row.videoDuration ?? '',
    videoTitle: 'Customer story',
  };
  return {
    id: `db-${row.id}`,
    businessName: row.companyName,
    roleLine: `${row.clientName} · ${row.clientRole}`,
    quote: locale === 'bn' ? row.quoteBn : row.quoteEn,
    website: '',
    videoDuration: row.videoDuration ?? '',
    videoTitle: 'Customer story',
    modal,
  };
}

export function MkTrust() {
  const { content, locale, testimonials } = useLanding();
  const proof = content.proof;

  const dbStories = Array.isArray(testimonials)
    ? testimonials
        .filter((row) => (locale === 'bn' ? row.quoteBn : row.quoteEn).trim().length > 0)
        .map((row) => storyFromTestimonial(row, locale))
    : [];
  const stories = dbStories.length > 0 ? dbStories : proof.caseStudies.map(storyFromCaseStudy);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const selected = stories.find((story) => story.id === (selectedId ?? stories[0]?.id)) ?? stories[0];
  // Real embed when the CMS video URL is set; the illustrated stub otherwise.
  const embedUrl = youtubeEmbedUrl(content.videoSection.youtubeUrl);

  return (
    <SectionShell id="proof">
      <SectionHead
        index="11"
        eyebrow={proof.eyebrow}
        title={proof.heading}
        sub={proof.subheading}
      />
      {selected && (
        <div className="mk-proof-grid">
          <div role="listbox" aria-label={proof.heading}>
            {stories.map((story) => (
              <button
                key={story.id}
                type="button"
                role="option"
                aria-selected={story.id === selected.id}
                data-on={story.id === selected.id}
                className="mk-tcard"
                onClick={() => setSelectedId(story.id)}
              >
                <b>{story.businessName}</b>
                <span>{story.roleLine}</span>
              </button>
            ))}
          </div>
          <div className="mk-pn" aria-live="polite">
            {embedUrl ? (
              <div className="mk-vid-frame">
                <iframe
                  src={embedUrl}
                  title={`${selected.videoTitle}: ${selected.businessName}`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="mk-vid">
                <span className="mk-vid-tag">
                  {proof.chrome.featuredBadge} · {selected.videoDuration}
                </span>
                <button
                  type="button"
                  className="mk-vid-play"
                  onClick={() => setVideoOpen(true)}
                  aria-label={`${proof.chrome.watchInterview}: ${selected.businessName}`}
                >
                  <Play size={22} aria-hidden="true" />
                </button>
              </div>
            )}
            <p className="mk-quote">“{selected.quote}”</p>
            <p className="mk-strip">
              {selected.businessName}
              {selected.website.trim().length > 0 && ` · ${selected.website}`}
            </p>
            <a href="#demo" className="mk-demo-link">
              {proof.chrome.watchCaseStudy}
            </a>
          </div>
        </div>
      )}
      <CaseStudyVideoModal caseStudy={videoOpen && selected ? selected.modal : null} onClose={() => setVideoOpen(false)} />
    </SectionShell>
  );
}

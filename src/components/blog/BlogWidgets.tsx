'use client';

/**
 * Blog detail islands: share buttons and the dependency-free gallery lightbox.
 *
 * Share targets are computed links (X / Facebook / LinkedIn) plus a
 * clipboard copy — no SDKs, no tracking. The lightbox is local state only:
 * Escape, backdrop click, or the close button dismisses it, and arrows step
 * through the gallery. Focus returns to the invoking thumbnail on close.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { absoluteUrl } from '@/lib/seo';

export function ShareButtons({ url, title, shareLabel, copiedLabel }: { url: string; title: string; shareLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);
  const targets = [
    { name: 'X', href: `https://x.com/intent/post?url=${encoded}&text=${text}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}` },
  ];

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="inline-flex items-center gap-2" role="group" aria-label={shareLabel}>
      <span className="mk-strip" style={{ marginTop: 0 }}>
        {shareLabel}
      </span>
      {targets.map((target) => (
        <a
          key={target.name}
          href={target.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${shareLabel}: ${target.name}`}
          className="mk-tab"
          style={{ textDecoration: 'none' }}
        >
          {target.name}
        </a>
      ))}
      <button
        type="button"
        className="mk-tab"
        onClick={() => void copy()}
        aria-live="polite"
        aria-label={copied ? copiedLabel : `${shareLabel} URL`}
        title={copied ? copiedLabel : `${shareLabel} URL`}
      >
        {copied ? (
          <span className="inline-flex items-center gap-1">
            <Check size={13} aria-hidden="true" />
            {copiedLabel}
          </span>
        ) : (
          <Link2 size={13} aria-hidden="true" />
        )}
      </button>
    </span>
  );
}

export function GalleryLightbox({ images, label }: { images: string[]; label: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpenIndex(null);
    opener.current?.focus();
  }, []);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));
      if (event.key === 'ArrowLeft') setOpenIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openIndex, images.length, close]);

  if (images.length === 0) return null;

  return (
    <section aria-label={label} style={{ marginTop: 32 }}>
      <p className="mk-eyebrow">{label}</p>
      <div className="mk-g mk-c3" style={{ marginTop: 12 }}>
        {images.map((src, index) => (
          <button
            key={`${index}-${src}`}
            type="button"
            onClick={(event) => {
              opener.current = event.currentTarget;
              setOpenIndex(index);
            }}
            aria-label={`${label} ${index + 1}`}
            style={{ padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={absoluteUrl(src)}
              alt=""
              loading="lazy"
              className="w-full rounded-md object-cover"
              style={{ aspectRatio: '4/3', border: '1px solid var(--mk-bd)' }}
            />
          </button>
        ))}
      </div>

      {openIndex !== null && images[openIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${label} ${openIndex + 1}`}
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="mk-btn"
            style={{ position: 'absolute', top: 16, right: 16 }}
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={absoluteUrl(images[openIndex] as string)}
            alt=""
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 6 }}
          />
        </div>
      )}
    </section>
  );
}

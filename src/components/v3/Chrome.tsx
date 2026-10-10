'use client';

/**
 * v3 site chrome: floating nav pill, footer, mobile dock + desktop FAB.
 *
 * Copy comes from `useLanding()` (header/footer/dock keys + DB menus); contact
 * URLs are CMS data in the `dock` key, not hardcoded links.
 */
import React, { useState } from 'react';
import { MessageCircle, Moon, Phone, Sun } from 'lucide-react';
import { useLanding } from '@/components/shell/useLanding';

export function MkHeader() {
  const { content, locale, menu, toggleLocale, toggleTheme, theme } = useLanding();
  const header = content.header;
  const nav = menu ?? header.nav;

  return (
    <header className="mk-nav">
      <div className="mk-nav-bar">
        <a href="#top" className="mk-logo" aria-label="EcoMate">
          <span className="mk-logo-mark" aria-hidden="true">
            E
          </span>
          EcoMate
        </a>
        <nav className="mk-nav-links" aria-label="Primary">
          {nav.slice(0, 4).map((item) => (
            <a key={`${item.label}-${item.href}`} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mk-nav-right">
          <button
            type="button"
            className="mk-lang"
            data-active={locale}
            onClick={toggleLocale}
            aria-label={locale === 'en' ? 'Switch to Bangla' : 'Switch to English'}
          >
            <span className="mk-lang-thumb" aria-hidden="true" />
            <span className="mk-lang-opt" data-on={locale === 'bn'}>
              বাং
            </span>
            <span className="mk-lang-opt" data-on={locale === 'en'}>
              EN
            </span>
          </button>
          <button
            type="button"
            className="mk-icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
          </button>
          <a href="/admin/login" className="mk-signin">
            {header.signInLabel}
          </a>
          <a href="#demo" className="mk-btn mk-btn-primary mk-btn-sm">
            {header.ctaBookDemo}
          </a>
        </div>
      </div>
    </header>
  );
}

export function MkFooter() {
  const { content, footerMenu } = useLanding();
  const footer = content.footer;
  const platform = footerMenu ?? footer.capabilities;

  return (
    <footer className="mk-footer">
      <div className="mk-w">
        <div className="mk-foot-grid">
          <div>
            <b>EcoMate</b>
            <p>{footer.tagline}</p>
          </div>
          <div>
            <b>{footer.linksTitle}</b>
            {platform.map((item) => (
              <a key={`${item.label}-${item.href}`} href={item.href}>
                {item.label}
              </a>
            ))}
          </div>
          <div>
            <b>{footer.contactTitle}</b>
            <a href={`tel:${footer.phone.replace(/[^+0-9]/g, '')}`}>{footer.phone}</a>
            <a href={`mailto:${footer.email}`}>{footer.email}</a>
            <a href="#demo">{content.header.ctaBookDemo}</a>
          </div>
        </div>
        <div className="mk-foot-base">
          {footer.copyright} · {footer.privacyLabel} · {footer.termsLabel}
        </div>
      </div>
    </footer>
  );
}

function MessengerIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.91 1.56 5.5 4 7.24V22l3.66-2.01c.98.27 2.02.42 3.1.42h.24c5.52 0 10-4.14 10-9.25S17.52 2 12 2zm5.2 9.4-2.5 3.97c-.4.63-1.27.83-1.94.45l-2.5-1.87a.75.75 0 0 0-.9 0l-3.43 2.6c-.5.38-1.2-.17-.93-.73l2.5-3.97c.4-.63 1.27-.83 1.94-.45l2.5 1.87c.25.19.6.19.9 0l3.43-2.6c.5-.38 1.2.17.93.73z" />
    </svg>
  );
}

export function MkDock() {
  const { content } = useLanding();
  const dock = content.dock;
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: FAB with fan-out contact actions. */}
      <div className="mk-fab" data-open={open}>
        <a
          href={dock.demoUrl}
          className="mk-fab-item mk-fab-item-demo"
          style={{ ['--x' as string]: '-52px', ['--y' as string]: '-6px' }}
          aria-label={dock.demoLabel}
          tabIndex={open ? 0 : -1}
        >
          <MessageCircle size={17} aria-hidden="true" />
        </a>
        <a
          href={dock.whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mk-fab-item mk-fab-item-wa"
          style={{ ['--x' as string]: '-6px', ['--y' as string]: '-52px' }}
          aria-label="WhatsApp"
          tabIndex={open ? 0 : -1}
        >
          <Phone size={17} aria-hidden="true" />
        </a>
        <a
          href={dock.messengerUrl}
          target="_blank"
          rel="noreferrer"
          className="mk-fab-item mk-fab-item-ms"
          style={{ ['--x' as string]: '-46px', ['--y' as string]: '-46px' }}
          aria-label="Messenger"
          tabIndex={open ? 0 : -1}
        >
          <MessengerIcon />
        </a>
        <button
          type="button"
          className="mk-fab-main"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={dock.demoLabel}
        >
          <MessageCircle size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Mobile: bottom dock with help text + demo CTA. */}
      <div className="mk-dock">
        <span>{dock.helpLabel}</span>
        <a href={dock.demoUrl} className="mk-btn mk-btn-primary">
          {dock.demoLabel}
        </a>
      </div>
    </>
  );
}

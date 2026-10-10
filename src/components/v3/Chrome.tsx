'use client';

/**
 * v3 site chrome: floating nav pill, footer, mobile dock + desktop FAB.
 *
 * Copy comes from `useLanding()` (header/footer/dock keys + DB menus); contact
 * URLs are CMS data in the `dock` key, not hardcoded links.
 */
import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useLanding } from '@/components/shell/useLanding';
import { buildHttpUrl, buildTelUrl, buildWhatsAppUrl } from '@/lib/contact';
import {
  CalendarIcon,
  CallIcon,
  ChatIcon,
  CloseIcon,
  MessengerIcon,
  WhatsAppIcon,
} from './BrandIcons';

export function MkHeader() {
  const { content, locale, menu, branding, toggleLocale, prefetchLocale, toggleTheme, theme } = useLanding();
  const header = content.header;
  const nav = menu ?? header.nav;
  const logoUrl = branding?.logoUrl.trim() ?? '';
  const brandName = branding?.siteName.trim() || 'EcoMate';

  return (
    <header className="mk-nav">
      <div className="mk-nav-bar">
        <a href="#top" className="mk-logo" aria-label={brandName}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brandName}
              width={26}
              height={26}
              className="mk-logo-img"
              loading="eager"
              decoding="async"
            />
          ) : (
            <span className="mk-logo-mark" aria-hidden="true">
              E
            </span>
          )}
          {brandName}
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
            onMouseEnter={prefetchLocale}
            onFocus={prefetchLocale}
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

export function MkDock() {
  const { content } = useLanding();
  const dock = content.dock;
  const [open, setOpen] = useState(false);

  // All four endpoints resolve through the contact builders: a blank or
  // unparseable CMS value hides that action instead of linking nowhere.
  const callUrl = buildTelUrl(dock.callNumber);
  const whatsappUrl = buildWhatsAppUrl(dock.whatsapp);
  const messengerUrl = buildHttpUrl(dock.messengerUrl);

  const fan = (x: string, y: string, delay: string): React.CSSProperties =>
    ({ '--x': x, '--y': y, '--d': delay }) as React.CSSProperties;

  return (
    <>
      {/* Desktop: FAB with a four-icon quarter-circle fan-out (mockup-exact
          offsets and stagger). Hidden icons stay out of the tab order. */}
      <div className="mk-fab" data-open={open}>
        <a
          href={dock.demoUrl}
          className="mk-fab-item mk-fab-item-demo"
          style={fan('-0px', '-96px', '.18s')}
          aria-label={dock.demoLabel}
          title={dock.demoLabel}
          tabIndex={open ? 0 : -1}
        >
          <CalendarIcon size={17} />
        </a>
        {callUrl && (
          <a
            href={callUrl}
            className="mk-fab-item"
            style={fan('-48px', '-83px', '.12s')}
            aria-label={dock.callLabel}
            title={dock.callLabel}
            tabIndex={open ? 0 : -1}
          >
            <CallIcon size={17} />
          </a>
        )}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mk-fab-item mk-fab-item-wa"
            style={fan('-83px', '-48px', '.06s')}
            aria-label={dock.whatsappLabel}
            title={dock.whatsappLabel}
            tabIndex={open ? 0 : -1}
          >
            <WhatsAppIcon size={17} />
          </a>
        )}
        {messengerUrl && (
          <a
            href={messengerUrl}
            target="_blank"
            rel="noreferrer"
            className="mk-fab-item mk-fab-item-ms"
            style={fan('-96px', '0px', '0s')}
            aria-label={dock.messengerLabel}
            title={dock.messengerLabel}
            tabIndex={open ? 0 : -1}
          >
            <MessengerIcon size={17} />
          </a>
        )}
        <button
          type="button"
          className="mk-fab-main"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={dock.fabLabel}
        >
          {open ? <CloseIcon size={20} /> : <ChatIcon size={20} />}
        </button>
      </div>

      {/* Mobile: help text + big demo button + three icon actions in a row. */}
      <div className="mk-dock">
        <span className="mk-dock-help">
          <span className="mk-pulse-dot" aria-hidden="true" />
          {dock.helpLabel}
        </span>
        <a href={dock.demoUrl} className="mk-btn mk-btn-primary">
          <CalendarIcon size={18} />
          {dock.demoLabel}
        </a>
        {callUrl && (
          <a href={callUrl} className="mk-dock-icon" aria-label={dock.callLabel} title={dock.callLabel}>
            <CallIcon size={17} />
          </a>
        )}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mk-dock-icon mk-dock-icon-wa"
            aria-label={dock.whatsappLabel}
            title={dock.whatsappLabel}
          >
            <WhatsAppIcon size={19} />
          </a>
        )}
        {messengerUrl && (
          <a
            href={messengerUrl}
            target="_blank"
            rel="noreferrer"
            className="mk-dock-icon mk-dock-icon-ms"
            aria-label={dock.messengerLabel}
            title={dock.messengerLabel}
          >
            <MessengerIcon size={19} />
          </a>
        )}
      </div>
    </>
  );
}

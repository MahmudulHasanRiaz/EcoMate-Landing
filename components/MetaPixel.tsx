'use client';

/**
 * Meta browser pixel (Task 13 §4, Task 20 §5 consent gate).
 *
 * The base snippet loads the pixel and fires `PageView` once. The conversion itself is
 * fired later by the lead form — with the **same** `event_id` the server sends to the
 * Conversions API, which is what lets Meta collapse the browser and server events into one
 * deduplicated Lead instead of double-counting it.
 *
 * Consent gate: `fbevents.js` is neither loaded nor is `PageView` fired until the
 * visitor accepts tracking (`ecomate_consent` cookie = accepted). Essential-only
 * visitors never load the pixel at all. `trackBrowserLead` is a no-op without
 * consent, so the CAPI pair cannot be completed from the browser side either —
 * and the server refuses non-consented leads independently (`lib/leadDispatch.ts`).
 *
 * `next/script` with an explicit `id` is required under the App Router: an inline script
 * without an id cannot be deduplicated across renders or navigations.
 */
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { getConsentChoice, type ConsentChoice } from '@/lib/consent';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function MetaPixel() {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const pathname = usePathname();
  const [consented, setConsented] = useState(false);
  // M-28: the inline snippet fires PageView on first mount; client-side navigations
  // re-fire it here. The ref skips the mount (already fired) so the landing view is
  // not double-counted.
  const mountedPath = useRef<string | null>(null);

  useEffect(() => {
    setConsented(getConsentChoice() === 'accepted');
    const onChange = (event: Event) => {
      const choice = (event as CustomEvent<ConsentChoice>).detail;
      setConsented(choice === 'accepted' || getConsentChoice() === 'accepted');
    };
    window.addEventListener('ecomate-consent-changed', onChange);
    return () => window.removeEventListener('ecomate-consent-changed', onChange);
  }, []);

  useEffect(() => {
    if (!id || !consented || pathname === null) return;
    if (mountedPath.current === null) {
      mountedPath.current = pathname;
      return;
    }
    if (mountedPath.current === pathname) return;
    mountedPath.current = pathname;
    try {
      if (getConsentChoice() === 'accepted') window.fbq?.('track', 'PageView');
    } catch {
      // An ad-blocked pixel must never break navigation.
    }
  }, [id, consented, pathname]);

  if (!id || !consented) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${id}'); fbq('track','PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}

/**
 * Fire the browser half of the deduplicated conversion. Safe to call when the pixel is
 * not configured, blocked by an extension, or not consented: `fbq` is simply undefined
 * or the consent check below refuses.
 *
 * H-1/Decision 14: `eventName` selects which half this is — `'Lead'` in instant mode
 * (pre-2b behavior), the configured instant name in validated mode. The server sends
 * the same name with the same `event_id`, which is what lets Meta collapse the pair.
 */
export function trackBrowserLead(eventId: string, eventName = 'Lead'): void {
  if (typeof window === 'undefined') return;
  // Consent gate: never fire a conversion for an opted-out visitor, even if the
  // form was submitted (the server independently refuses non-consented leads).
  try {
    if (getConsentChoice() !== 'accepted') return;
  } catch {
    return;
  }
  window.fbq?.('track', eventName, {}, { eventId });
}

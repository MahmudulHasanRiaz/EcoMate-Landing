'use client';

/**
 * Cloudflare Turnstile widget for the lead form (Task 14 §2).
 *
 * The script and the widget are loaded/rendered **on submit**, not on page load: an
 * `appearance: 'interaction-only'` widget stays hidden for every visitor who does not need
 * a challenge, so the form keeps its mobile layout until the moment it is actually
 * submitted. `getToken()` resolves with a fresh token, or `null` when the challenge could
 * not be completed (error, timeout, blocked script) — the caller surfaces a retry message.
 *
 * When `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset (local dev), the component renders nothing
 * and `getToken()` resolves `''`; the server skips verification for the same reason.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

export interface TurnstileHandle {
  /** Resolve a fresh token, `''` when Turnstile is not configured, `null` on failure. */
  getToken(): Promise<string | null>;
}

interface TurnstileRenderParams {
  sitekey: string;
  appearance?: 'always' | 'execute' | 'interaction-only';
  theme?: 'auto' | 'light' | 'dark';
  callback?: (token: string) => void;
  'error-callback'?: () => boolean | void;
  'timeout-callback'?: () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, params: TurnstileRenderParams): string;
  reset(widgetId?: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TOKEN_TIMEOUT_MS = 20_000;

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Turnstile requires a browser'));
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    const script = existing instanceof HTMLScriptElement ? existing : document.createElement('script');
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        scriptPromise = null;
        script.remove();
        reject(new Error('Turnstile script failed to load'));
      },
      { once: true },
    );
    if (!(existing instanceof HTMLScriptElement)) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
  return scriptPromise;
}

export const Turnstile = forwardRef<TurnstileHandle, { className?: string }>(function Turnstile(
  { className },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const resolveRef = useRef<((token: string | null) => void) | null>(null);

  // `process.env.NEXT_PUBLIC_*` is inlined by Next at build time.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

  const getToken = useCallback(async (): Promise<string | null> => {
    if (siteKey === '') return '';

    try {
      await loadTurnstileScript();
    } catch (error) {
      console.warn('[turnstile] script unavailable:', error);
      return null;
    }

    const api = window.turnstile;
    const container = containerRef.current;
    if (!api || !container) return null;

    return new Promise<string | null>((resolve) => {
      const wrapper = (token: string | null): void => {
        window.clearTimeout(timeout);
        resolveRef.current = null;
        resolve(token);
      };
      const timeout = window.setTimeout(() => wrapper(null), TOKEN_TIMEOUT_MS);
      resolveRef.current = wrapper;

      if (widgetIdRef.current === null) {
        widgetIdRef.current = api.render(container, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          callback: (token) => resolveRef.current?.(token),
          'error-callback': () => {
            resolveRef.current?.(null);
            return true;
          },
          'timeout-callback': () => resolveRef.current?.(null),
        });
      } else {
        // A solved token is single-use: force a fresh challenge for this submission.
        api.reset(widgetIdRef.current);
      }
    });
  }, [siteKey]);

  useImperativeHandle(ref, () => ({ getToken }), [getToken]);

  useEffect(
    () => () => {
      const api = window.turnstile;
      if (api && widgetIdRef.current !== null) {
        try {
          api.remove(widgetIdRef.current);
        } catch {
          // The widget is already gone (script unloaded, navigation): nothing to clean up.
        }
      }
      widgetIdRef.current = null;
      resolveRef.current = null;
    },
    [],
  );

  if (siteKey === '') return null;
  return <div ref={containerRef} className={className} />;
});

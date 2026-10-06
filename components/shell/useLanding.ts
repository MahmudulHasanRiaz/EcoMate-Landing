'use client';

/**
 * Read the locale/theme/content shell. Must render inside `LocaleThemeProvider`
 * (`app/[locale]/layout.tsx` seeds it; `/` seeds it via `LandingPage`).
 */

import { useContext } from 'react';
import { ShellContext } from './LocaleThemeProvider';

export function useLanding() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useLanding must be used inside LocaleThemeProvider');
  return ctx;
}

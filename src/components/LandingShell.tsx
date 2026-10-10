'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The interactive marketing composition, reading everything from the shell context.
 *
 * v3 renders `LandingV3` (mockup-faithful dark design). Data seeding is unchanged:
 * `src/components/LandingPage.tsx` (self-contained `/`) and
 * `app/[locale]/layout.tsx` (`/en`, `/bn`) fetch through the cached
 * `lib/content.ts` helpers and seed `LocaleThemeProvider`; locale/theme state
 * and the resolved content all come from `useLanding()`.
 */
import React from 'react';
import { LandingV3 } from '@/src/components/v3/LandingV3';

export function LandingShell() {
  return <LandingV3 />;
}

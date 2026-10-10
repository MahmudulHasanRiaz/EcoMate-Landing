/**
 * v3 landing composition — a visual replacement matching `draft/Main.dc.html`.
 *
 * Section order, ids, spacing and the dark-first system mirror the mockup.
 * Every string renders from `useLanding()` content (static fallback merged
 * with `landing_content` rows per locale). Interactive demos hold local state
 * only; the lead form keeps the existing `/api/leads` contract.
 */
import React from 'react';
import { useLanding } from '@/components/shell/useLanding';
import { MkDock, MkFooter, MkHeader } from './Chrome';
import { MkHero } from './Hero';
import {
  MkAdDefense,
  MkFragmented,
  MkLogistics,
  MkPacking,
  MkRevenue,
  MkStores,
} from './Ops';
import {
  MkFinance,
  MkGettingStarted,
  MkInfra,
  MkOmnichannel,
  MkTeam,
} from './Growth';
import { MkTrust } from './Trust';
import { MkPricing } from './Pricing';
import { MkFaq, MkLeadForm } from './Closing';

export function LandingV3() {
  const { locale } = useLanding();

  return (
    <div className={`mk-page min-h-screen ${locale === 'bn' ? 'font-bangla' : ''}`}>
      <MkHeader />
      <main>
        <MkHero />
        <MkFragmented />
        <MkPacking />
        <MkRevenue />
        <MkLogistics />
        <MkAdDefense />
        <MkStores />
        <MkOmnichannel />
        <MkFinance />
        <MkTeam />
        <MkInfra />
        <MkGettingStarted />
        <MkTrust />
        <MkPricing />
        <MkFaq />
        <MkLeadForm />
      </main>
      <MkFooter />
      <MkDock />
    </div>
  );
}

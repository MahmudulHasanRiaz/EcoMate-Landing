/**
 * Landing redesign v2 sections.
 *
 * Every string renders from `useLanding()` content (static fallback merged with
 * `landing_content` rows per locale) — no hardcoded marketing copy. Interactive
 * behaviour lives in the `*Demo` components; these shells are presentational.
 */
import React from 'react';
import { useLanding } from '@/components/shell/useLanding';
import { ArrowRight, Building2, ListChecks, Rocket, Sparkles } from 'lucide-react';
import { PackingScanDemo } from '@/src/components/PackingScanDemo';
import { PolicyTogglesDemo } from '@/src/components/PolicyTogglesDemo';
import { CourierBookingDemo } from '@/src/components/CourierBookingDemo';
import { CapiModeSelectorDemo } from '@/src/components/CapiModeSelectorDemo';
import { StoreSwitchDemo } from '@/src/components/StoreSwitchDemo';

function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-10">
      <p className="v2-eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-balance sm:text-4xl" style={{ color: 'var(--v2-text)' }}>
        {title}
      </h2>
      <p className="mt-2.5 text-sm leading-relaxed text-balance sm:text-lg v2-muted">{sub}</p>
    </div>
  );
}

function SectionShell({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="relative py-14 md:py-20" style={{ backgroundColor: 'var(--v2-bg)' }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

export const StatsBarSection: React.FC = () => {
  const { content } = useLanding();
  const stats = content.statsBar;
  return (
    <section id="stats" aria-label="stats" className="relative border-y py-8" style={{ backgroundColor: 'var(--v2-bg-2)', borderColor: 'var(--v2-line)' }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.items.map((item) => (
            <div key={item.label} className="text-center sm:text-left">
              <dt className="order-2 mt-1 block text-xs v2-muted">{item.label}</dt>
              <dd className="font-mono-numbers order-1 text-xl font-bold sm:text-2xl" style={{ color: 'var(--v2-text)' }}>
                {item.value}
              </dd>
              <dd className="font-mono-numbers mt-0.5 text-[10px] v2-muted">{item.trend}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-center text-[11px] v2-muted">{stats.note}</p>
      </div>
    </section>
  );
};

export const TrustedBySection: React.FC = () => {
  const { content } = useLanding();
  const trusted = content.trustedBy;
  return (
    <section id="trusted-by" className="relative py-10 md:py-14" style={{ backgroundColor: 'var(--v2-bg)' }}>
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
        <p className="v2-eyebrow">{trusted.eyebrow}</p>
        <h2 className="mt-2 text-lg font-bold sm:text-xl" style={{ color: 'var(--v2-text)' }}>
          {trusted.heading}
        </h2>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {trusted.brands.map((brand) => (
            <li
              key={brand.name}
              title={brand.detail}
              className="v2-surface inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
            >
              <Building2 className="h-3.5 w-3.5" style={{ color: 'var(--v2-accent)' }} aria-hidden="true" />
              {brand.name}
              <span className="font-normal v2-muted">· {brand.detail}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] v2-muted">{trusted.note}</p>
      </div>
    </section>
  );
};

export const PackingWorkspaceSection: React.FC = () => {
  const { content } = useLanding();
  const packing = content.packingWorkspace;
  return (
    <SectionShell id="packing-workspace">
      <SectionHead eyebrow={packing.eyebrow} title={packing.heading} sub={packing.subheading} />
      <div className="mx-auto max-w-3xl">
        <PackingScanDemo copy={packing} />
      </div>
    </SectionShell>
  );
};

export const RevenueProtectionSection: React.FC = () => {
  const { content, locale } = useLanding();
  const revenue = content.revenueProtection;
  return (
    <SectionShell id="revenue-protection">
      <SectionHead eyebrow={revenue.eyebrow} title={revenue.heading} sub={revenue.subheading} />
      <div className="mx-auto max-w-3xl">
        <PolicyTogglesDemo copy={revenue} locale={locale} />
      </div>
    </SectionShell>
  );
};

export const LogisticsAutomationSection: React.FC = () => {
  const { content } = useLanding();
  const logistics = content.logisticsAutomation;
  return (
    <SectionShell id="logistics">
      <SectionHead eyebrow={logistics.eyebrow} title={logistics.heading} sub={logistics.subheading} />
      <div className="mx-auto max-w-3xl">
        <CourierBookingDemo copy={logistics} />
      </div>
    </SectionShell>
  );
};

export const AdBudgetDefenseSection: React.FC = () => {
  const { content } = useLanding();
  const defense = content.adBudgetDefense;
  return (
    <SectionShell id="ad-defense">
      <SectionHead eyebrow={defense.eyebrow} title={defense.heading} sub={defense.subheading} />
      <div className="mx-auto max-w-3xl">
        <CapiModeSelectorDemo copy={defense} />
      </div>
    </SectionShell>
  );
};

export const StoreSwitchesSection: React.FC = () => {
  const { content } = useLanding();
  const stores = content.storeSwitches;
  return (
    <SectionShell id="multi-store-switches">
      <SectionHead eyebrow={stores.eyebrow} title={stores.heading} sub={stores.subheading} />
      <div className="mx-auto max-w-3xl">
        <StoreSwitchDemo copy={stores} />
      </div>
    </SectionShell>
  );
};

export const WhyDifferentSection: React.FC = () => {
  const { content } = useLanding();
  const showcase = content.productShowcase;
  return (
    <SectionShell id="why-different">
      <SectionHead eyebrow={showcase.eyebrow} title={showcase.heading} sub={showcase.subheading} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {showcase.modules.map((module) => (
          <li key={module.id} className="v2-surface rounded-2xl p-5">
            {module.badge && (
              <p className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: 'var(--v2-accent-soft)', color: 'var(--v2-accent)' }}>
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {module.badge}
              </p>
            )}
            <p className="mt-2 text-sm font-bold" style={{ color: 'var(--v2-text)' }}>
              {module.name}
            </p>
            <p className="mt-1 text-xs leading-relaxed v2-muted">{module.shortDesc}</p>
            <p className="mt-2 flex gap-1.5 text-[11px] leading-relaxed v2-muted">
              <ListChecks className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--v2-ok)' }} aria-hidden="true" />
              {module.keyCapability}
            </p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
};

export const GettingStartedSection: React.FC = () => {
  const { content } = useLanding();
  const getting = content.gettingStarted;

  const scrollToLead = (e: React.MouseEvent) => {
    e.preventDefault();
    document.querySelector('#lead-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <SectionShell id="getting-started">
      <SectionHead eyebrow={getting.eyebrow} title={getting.heading} sub={getting.subheading} />
      <ol className="grid gap-3 md:grid-cols-3">
        {getting.steps.map((step) => (
          <li key={step.stepNumber} className="v2-surface rounded-2xl p-5 sm:p-6">
            <p className="font-mono-numbers text-2xl font-bold" style={{ color: 'var(--v2-accent)' }}>
              {step.stepNumber}
            </p>
            <p className="mt-2 text-sm font-bold" style={{ color: 'var(--v2-text)' }}>
              {step.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed v2-muted">{step.detail}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 text-center">
        <a
          href="#lead-form"
          onClick={scrollToLead}
          className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: 'var(--v2-accent)' }}
        >
          <Rocket className="h-4 w-4" aria-hidden="true" />
          {getting.ctaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </SectionShell>
  );
};

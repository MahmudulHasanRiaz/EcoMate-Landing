'use client';

/** v3 pricing (mockup §12): monthly-order tier selector highlighting one plan. */
import React, { useState } from 'react';
import { useLanding } from '@/components/shell/useLanding';
import { SectionHead, SectionShell } from './SectionHead';

export function MkPricing() {
  const { content, locale, isPricingVisible } = useLanding();
  const pricing = content.pricing;
  const tiers = content.volumeTiers;
  const plans = pricing.visiblePricing.plans;

  const [tierId, setTierId] = useState(tiers.tiers[0]?.id ?? '');
  const tier = tiers.tiers.find((t) => t.id === tierId) ?? tiers.tiers[0];
  const highlighted = Math.min(tier?.planIndex ?? 0, Math.max(0, plans.length - 1));

  if (!isPricingVisible) return null;

  const formatPrice = (value: number): string =>
    `${pricing.visiblePricing.plans[0]?.currency ?? '৳'}${new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-US').format(value)}`;

  const scrollToLead = (e: React.MouseEvent) => {
    e.preventDefault();
    document.querySelector('#demo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <SectionShell id="pricing">
      <SectionHead
        index="12"
        eyebrow={pricing.eyebrow}
        title={pricing.heading}
        sub={pricing.subheading}
      />
      <p className="mk-pt">{tiers.label}</p>
      <div className="mk-tabs" role="radiogroup" aria-label={tiers.label} style={{ marginBottom: 16 }}>
        {tiers.tiers.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={t.id === tierId}
            data-on={t.id === tierId}
            className="mk-tab"
            onClick={() => setTierId(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mk-g mk-c3">
        {plans.map((plan, i) => (
          <div key={plan.id} className={`mk-pn${i === highlighted ? ' mk-pn-hl' : ''}`} data-testid={`plan-${plan.id}`}>
            <p style={{ fontWeight: 700, fontSize: 17 }}>
              {plan.name}
              {plan.popular && <span className="mk-suggest">{pricing.visiblePricing.labels.popularBadge}</span>}
            </p>
            <p className="mk-big">
              {formatPrice(plan.monthlyPrice)}{' '}
              <small>
                / {locale === 'bn' ? 'মাস' : 'mo'}
              </small>
            </p>
            <div className="mk-row">
              <span>{pricing.visiblePricing.labels.volumeLabel}</span>
              <strong>{plan.orderVolume}</strong>
            </div>
            <ul className="mk-check" style={{ marginTop: 8 }}>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <a
              href="#demo"
              onClick={scrollToLead}
              className={`mk-btn${i === highlighted ? ' mk-btn-primary' : ''} mk-btn-block`}
              style={{ marginTop: 12 }}
            >
              {plan.ctaLabel}
            </a>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

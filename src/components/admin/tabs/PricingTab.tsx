import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import type { PricingPlan } from '../../../types/api';
import { Card, Tag } from '../ui';

export interface PricingTabProps {
  pricing: { isPricingVisible: boolean; plans: PricingPlan[] };
  onTogglePricingMode: () => void;
}

export const PricingTab: React.FC<PricingTabProps> = ({ pricing, onTogglePricingMode }) => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#14171c] dark:text-[#ededf3]">
            Dynamic Pricing Manager
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] dark:text-[#8e8ea4] mt-0.5">
            Toggle between Visible Tiered Pricing and Contact Sales / Custom Architecture mode.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePricingMode}
            className={`min-h-[34px] px-3 rounded-md text-[13.5px] font-medium transition-all cursor-pointer flex items-center gap-2 ${
              pricing.isPricingVisible ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}
          >
            {pricing.isPricingVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span>{pricing.isPricingVisible ? 'Mode: Tiered Visible' : 'Mode: Hidden / Contact'}</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pricing.plans.map((plan) => (
          <Card key={plan.id} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-base text-[#14171c] dark:text-[#ededf3]">{plan.nameEn}</span>
                {plan.isPopular && <Tag>Popular</Tag>}
              </div>

              <div className="text-2xl font-mono font-extrabold text-[#14171c] dark:text-[#ededf3] mb-2">
                {plan.currency} {plan.monthlyPrice.toLocaleString()}{' '}
                <span className="text-xs font-normal text-[#667085] dark:text-[#8e8ea4]">/ mo</span>
              </div>
              <p className="text-xs text-[#667085] dark:text-[#8e8ea4] mb-4">{plan.tierSubtitleEn}</p>

              <div className="space-y-1.5 text-xs text-[#1f242b] dark:text-[#e2e2ec] border-t border-[#eceef1] dark:border-[#1e1e2a] pt-3">
                {plan.featuresEn.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0 dark:text-emerald-400" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-[#eceef1] dark:border-[#1e1e2a] flex items-center justify-between text-xs text-[#667085] dark:text-[#8e8ea4]">
              <span>Order Limit: {plan.orderVolume}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

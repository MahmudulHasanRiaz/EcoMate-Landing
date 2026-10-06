import React from 'react';
import { useLanding } from '@/components/shell/useLanding';
import { Users, Shield, Check, Lock, Clock, Award } from 'lucide-react';

export const TeamOperationsSection: React.FC = () => {
  const { content } = useLanding();
  return (
    <section id="team" className="relative py-14 md:py-24 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#080910] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2 sm:mb-3">
            <Users className="h-3.5 w-3.5" />
            <span>{content.team.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.team.heading}
          </h2>
          <p className="mt-2.5 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.team.subheading}
          </p>
        </div>

        {/* 4 Role-Based Governance Cards */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {content.team.roles.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0C0E1B] p-5 sm:p-6 flex flex-col justify-between hover:border-amber-300 dark:hover:border-amber-500/30 transition-all shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400">
                    <Shield className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-mono text-slate-600 dark:text-slate-300 font-medium">Role #{idx + 1}</span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2">{item.role}</h3>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-600 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider block">
                      Responsibilities
                    </span>
                    <p className="text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed">
                      {item.responsibilities}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-600 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider block">
                      Enforced Boundary
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {item.accessControl}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 font-medium">
                <Lock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                <span>Audited activity log recorded</span>
              </div>
            </div>
          ))}
        </div>

        {/* HR, Payroll & Commission Ecosystem Bar */}
        <div className="mt-6 sm:mt-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0D19] p-5 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-xs">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">Shift Attendance & Overtime</h4>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Track showroom cashier shifts and warehouse packing hours with automated late and overtime calculation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 sm:gap-3">
              <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">Automated Sales Commissions</h4>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Calculate showroom floor staff sales incentives automatically based on non-returned completed invoices.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 sm:gap-3">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">Cryptographic Audit Trail</h4>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Every inventory manual adjustment, price override, and discount application is tied to an employee ID.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

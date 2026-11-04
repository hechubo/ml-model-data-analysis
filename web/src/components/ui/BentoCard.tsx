import React from 'react';
import { Sparkles } from 'lucide-react';

interface BentoCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: 'cyan' | 'violet' | 'emerald' | 'rose' | 'amber';
  insight?: string;
  headerRight?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const BADGE_STYLES: Record<NonNullable<BentoCardProps['badgeTone']>, string> = {
  cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export const BentoCard: React.FC<BentoCardProps> = ({
  title,
  subtitle,
  badge,
  badgeTone = 'cyan',
  insight,
  headerRight,
  className = '',
  children,
}) => {
  return (
    <section
      className={`relative rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl p-5 shadow-[0_16px_40px_rgba(0,0,0,0.45)] flex flex-col justify-between overflow-hidden transition-colors hover:border-slate-700/90 ${className}`}
    >
      {/* Subtle top highlight line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent" />

      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-semibold tracking-tight text-slate-100">
                {title}
              </h3>
              {badge && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${BADGE_STYLES[badgeTone]}`}
                >
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </div>

        {insight && (
          <div className="mb-4 rounded-xl bg-slate-950/75 border border-cyan-500/20 px-3.5 py-2.5 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-cyan-300 mr-1.5">
                数据分析洞察 → 工程决策:
              </span>
              {insight}
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
};

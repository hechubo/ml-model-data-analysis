import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricTickerCardProps {
  label: string;
  value: string;
  deltaLabel: string;
  deltaPositive?: boolean;
  subtext: string;
  accent?: 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose';
  icon?: React.ReactNode;
}

const ACCENT_RING: Record<NonNullable<MetricTickerCardProps['accent']>, string> = {
  cyan: 'from-cyan-500/20 to-transparent border-cyan-500/30 text-cyan-300',
  emerald: 'from-emerald-500/20 to-transparent border-emerald-500/30 text-emerald-300',
  violet: 'from-violet-500/20 to-transparent border-violet-500/30 text-violet-300',
  amber: 'from-amber-500/20 to-transparent border-amber-500/30 text-amber-300',
  rose: 'from-rose-500/20 to-transparent border-rose-500/30 text-rose-300',
};

export const MetricTickerCard: React.FC<MetricTickerCardProps> = ({
  label,
  value,
  deltaLabel,
  deltaPositive = true,
  subtext,
  accent = 'cyan',
  icon,
}) => {
  return (
    <div className="relative rounded-2xl bg-slate-900/75 border border-slate-800/85 p-4 backdrop-blur-xl overflow-hidden group hover:border-slate-700 transition-all">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 w-28 h-28 rounded-full bg-gradient-to-bl ${ACCENT_RING[accent]} blur-2xl opacity-60`}
      />
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span className="font-medium tracking-wide">{label}</span>
        {icon && <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{icon}</span>}
      </div>
      <div className="flex items-baseline justify-between gap-2 my-1">
        <span className="text-2xl font-bold font-mono tabular-nums tracking-tight text-slate-50">
          {value}
        </span>
        <span
          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border ${
            deltaPositive
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}
        >
          {deltaPositive ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )}
          {deltaLabel}
        </span>
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">{subtext}</p>
    </div>
  );
};

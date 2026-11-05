import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Circle,
  Lightbulb,
} from 'lucide-react';

export interface DerivationStep {
  id: string;
  label: string;
  question: string;
  narrative: string;
  formula?: string;
  metric?: string;
}

export interface AnalysisDimension {
  id: string;
  label: string;
  hint?: string;
}

interface PresentationStageProps {
  chapter: string;
  kicker: string;
  title: string;
  subtitle: string;
  accent?: 'cyan' | 'rose' | 'amber' | 'violet' | 'emerald' | 'sky';
  steps: DerivationStep[];
  activeStep: number;
  onStepChange: (idx: number) => void;
  dimensions?: AnalysisDimension[];
  activeDimension?: string;
  onDimensionChange?: (id: string) => void;
  insight?: string;
  stageMeta?: React.ReactNode;
  children: React.ReactNode;
  aside?: React.ReactNode;
}

const ACCENT: Record<
  NonNullable<PresentationStageProps['accent']>,
  { ring: string; soft: string; text: string; bar: string }
> = {
  cyan: {
    ring: 'border-cyan-400/40',
    soft: 'bg-cyan-500/10',
    text: 'text-cyan-300',
    bar: 'from-cyan-400 to-sky-400',
  },
  rose: {
    ring: 'border-rose-400/40',
    soft: 'bg-rose-500/10',
    text: 'text-rose-300',
    bar: 'from-rose-400 to-amber-400',
  },
  amber: {
    ring: 'border-amber-400/40',
    soft: 'bg-amber-500/10',
    text: 'text-amber-300',
    bar: 'from-amber-400 to-emerald-400',
  },
  violet: {
    ring: 'border-violet-400/40',
    soft: 'bg-violet-500/10',
    text: 'text-violet-300',
    bar: 'from-violet-400 to-fuchsia-400',
  },
  emerald: {
    ring: 'border-emerald-400/40',
    soft: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    bar: 'from-emerald-400 to-cyan-400',
  },
  sky: {
    ring: 'border-sky-400/40',
    soft: 'bg-sky-500/10',
    text: 'text-sky-300',
    bar: 'from-sky-400 to-indigo-400',
  },
};

export const PresentationStage: React.FC<PresentationStageProps> = ({
  chapter,
  kicker,
  title,
  subtitle,
  accent = 'cyan',
  steps,
  activeStep,
  onStepChange,
  dimensions,
  activeDimension,
  onDimensionChange,
  insight,
  stageMeta,
  children,
  aside,
}) => {
  const tone = ACCENT[accent];
  const step = steps[Math.min(activeStep, steps.length - 1)];
  const progress = ((activeStep + 1) / steps.length) * 100;

  // Presentation remote: Space / custom event advances derivation within the chapter
  useEffect(() => {
    const onAdvance = () => {
      if (activeStep < steps.length - 1) {
        onStepChange(activeStep + 1);
      }
    };
    window.addEventListener('ames:step-forward', onAdvance);
    return () => window.removeEventListener('ames:step-forward', onAdvance);
  }, [activeStep, steps.length, onStepChange]);

  return (
    <div className="pb-20 space-y-5">
      {/* Chapter title — presentation headline */}
      <header className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[#0A1020]/75 backdrop-blur-xl px-6 sm:px-8 py-6">
        <div
          className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${tone.bar}`}
        />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-4xl space-y-2">
            <div className="flex items-center gap-3">
              <span
                className={`font-mono text-[11px] tracking-[0.22em] uppercase ${tone.text}`}
              >
                Chapter {chapter}
              </span>
              <span className="h-px w-8 bg-white/15" />
              <span className="text-[12px] text-slate-400">{kicker}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[2.15rem] font-semibold tracking-tight text-white leading-tight">
              {title}
            </h1>
            <p className="text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-3xl">
              {subtitle}
            </p>
          </div>
          {stageMeta}
        </div>

        {/* Chapter progress filmstrip */}
        <div className="mt-5 h-1 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${tone.bar}`}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-[62vh]">
        {/* Left: guided derivation rail */}
        <aside className="xl:col-span-4 flex flex-col gap-4">
          <div className="rounded-[24px] border border-white/8 bg-[#0A1020]/70 backdrop-blur-xl p-4 sm:p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-mono tracking-[0.18em] uppercase text-slate-500">
                循序推导
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {activeStep + 1} / {steps.length}
              </div>
            </div>

            <ol className="space-y-2">
              {steps.map((s, idx) => {
                const isActive = idx === activeStep;
                const isDone = idx < activeStep;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onStepChange(idx)}
                      className={`w-full text-left rounded-2xl px-3.5 py-3 border transition-all ${
                        isActive
                          ? `${tone.soft} ${tone.ring} bg-opacity-100`
                          : isDone
                          ? 'bg-white/[0.03] border-emerald-500/20 hover:border-emerald-400/35'
                          : 'bg-transparent border-white/5 hover:border-white/12 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isActive ? (
                            <div
                              className={`w-4 h-4 rounded-full bg-gradient-to-br ${tone.bar} shadow-[0_0_12px_rgba(56,189,248,0.45)]`}
                            />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-500">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span
                              className={`text-[13px] font-medium truncate ${
                                isActive ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {s.label}
                            </span>
                          </div>
                          {isActive && (
                            <p className="mt-1 text-[12px] text-slate-400 leading-relaxed">
                              {s.question}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={activeStep <= 0}
                onClick={() => onStepChange(Math.max(0, activeStep - 1))}
                className="flex-1 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 disabled:opacity-30 hover:bg-white/[0.06] transition"
              >
                上一步
              </button>
              <button
                type="button"
                disabled={activeStep >= steps.length - 1}
                onClick={() =>
                  onStepChange(Math.min(steps.length - 1, activeStep + 1))
                }
                className={`flex-[1.4] rounded-xl px-3 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r ${tone.bar} disabled:opacity-30 hover:brightness-110 transition flex items-center justify-center gap-1.5`}
              >
                下一步推导
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Live narrative card for current beat */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className={`rounded-[24px] border ${tone.ring} bg-[#0A1020]/80 p-5`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className={`w-4 h-4 ${tone.text}`} />
                <span className={`text-[11px] font-mono uppercase tracking-wider ${tone.text}`}>
                  这一步在讲什么
                </span>
              </div>
              <p className="text-[13px] text-slate-200 leading-relaxed">
                {step.narrative}
              </p>
              {step.formula && (
                <div className="mt-3 rounded-xl bg-black/35 border border-white/8 px-3 py-2 font-mono text-[12px] text-cyan-100 overflow-x-auto">
                  {step.formula}
                </div>
              )}
              {step.metric && (
                <div className="mt-3 text-[12px] font-mono text-emerald-300">
                  {step.metric}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {aside}
        </aside>

        {/* Right: interactive stage canvas */}
        <section className="xl:col-span-8 flex flex-col gap-4">
          {dimensions && dimensions.length > 0 && onDimensionChange && (
            <div className="rounded-[20px] border border-white/8 bg-[#0A1020]/65 backdrop-blur-xl px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-slate-500 mr-1">
                  分析维度
                </span>
                {dimensions.map((d) => {
                  const on = d.id === activeDimension;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      title={d.hint}
                      onClick={() => onDimensionChange(d.id)}
                      className={`rounded-full px-3.5 py-1.5 text-[12px] border transition-all ${
                        on
                          ? `${tone.soft} ${tone.ring} text-white`
                          : 'border-white/8 text-slate-400 hover:text-slate-200 hover:border-white/15'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative flex-1 rounded-[28px] border border-white/8 bg-[#0A1020]/72 backdrop-blur-xl p-4 sm:p-5 min-h-[480px] overflow-hidden">
            <div
              className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r ${tone.bar} opacity-50`}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={`${step.id}-${activeDimension || 'default'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          {insight && (
            <div className="rounded-[20px] border border-white/8 bg-gradient-to-r from-white/[0.04] to-transparent px-5 py-3.5 flex items-start gap-3">
              <ChevronRight className={`w-4 h-4 mt-0.5 shrink-0 ${tone.text}`} />
              <p className="text-[13px] text-slate-300 leading-relaxed">
                <span className={`font-medium ${tone.text} mr-2`}>核心发现</span>
                {insight}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

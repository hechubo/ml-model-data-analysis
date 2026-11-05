import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Play } from 'lucide-react';
import { AnalyticsPayload } from '../../types/analytics';
import {
  AnalysisDimension,
  DerivationStep,
  PresentationStage,
} from '../ui/PresentationStage';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { CHART_COLORS, ECHARTS_DARK_TOOLTIP } from '../../theme/chartTheme';

interface Page3Props {
  payload: AnalyticsPayload;
}

const STEPS: DerivationStep[] = [
  {
    id: 'see-skew',
    label: '看见右偏',
    question: '原始房价长什么样？',
    narrative:
      'SalePrice 等面积类特征严重右偏：多数房子挤在左侧，少数豪宅把均值和残差「拽」向右边。线性模型假设残差近似正态、同方差——右偏直接违背这一点。',
    formula: 'γ₁(SalePrice) ≈ 1.81  ·  理想高斯 γ₁ ≈ 0',
  },
  {
    id: 'why-hurt',
    label: '偏态如何伤模型',
    question: '为什么不能「假装没看见」？',
    narrative:
      '高价房残差被放大，低价房被压缩，导致置信区间失真、对豪宅欠拟合。Q-Q 图上两端翘起，就是同方差假设在抗议。',
    metric: '症状：Q-Q 两端偏离 45° 线 · 高价段残差异方差',
  },
  {
    id: 'morph',
    label: '拖动 λ 变形',
    question: '变换之后，分布如何收敛？',
    narrative:
      '选择特征，拖动变形进度（或一键播放）。直方图长尾被压回中心，KDE 变成对称钟形，偏度 γ₁ 向 0 靠近——这是 Box-Cox / Log1p 的直观证据。',
    formula: 'y(λ) = (x^λ − 1)/λ   (λ→0 时退化为 log)',
  },
  {
    id: 'qq-proof',
    label: '用 Q-Q 验收',
    question: '怎样才算「够正态」？',
    narrative:
      '把视图切到 Q-Q：点越贴近对角线，越接近高斯基准。这一步单独贡献约 −$1,570 CV RMSE——仍然只是分布校准，还没加领域特征。',
    metric: 'Skewness surgery  ·  ΔRMSE ≈ −$1,570',
  },
];

export const Page3SkewnessMorphLab: React.FC<Page3Props> = ({ payload }) => {
  const { skewness_lab } = payload;
  const featureKeys = Object.keys(skewness_lab);
  const [step, setStep] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState(
    featureKeys.includes('SalePrice') ? 'SalePrice' : featureKeys[0]
  );
  const [morphProgress, setMorphProgress] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [viewDim, setViewDim] = useState<'hist' | 'qq'>('hist');

  const item = skewness_lab[selectedFeature];

  // Sync morph with derivation beats
  useEffect(() => {
    if (step === 0) {
      setMorphProgress(0);
      setViewDim('hist');
    } else if (step === 1) {
      setMorphProgress(0);
      setViewDim('qq');
    } else if (step === 2) {
      setViewDim('hist');
      setIsAutoPlaying(true);
    } else if (step === 3) {
      setMorphProgress(1);
      setViewDim('qq');
      setIsAutoPlaying(false);
    }
  }, [step]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    let raf = 0;
    const start = performance.now();
    const duration = 2000;
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
      setMorphProgress(Number(eased.toFixed(3)));
      if (t < 1) raf = requestAnimationFrame(animate);
      else setIsAutoPlaying(false);
    };
    setMorphProgress(0);
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [isAutoPlaying]);

  const dims: AnalysisDimension[] = useMemo(
    () =>
      featureKeys.map((k) => ({
        id: k,
        label: k,
        hint: `原始偏度 γ₁ = ${skewness_lab[k].raw_skew}`,
      })),
    [featureKeys, skewness_lab]
  );

  const morphed = useMemo(() => {
    if (!item) return null;
    const t = morphProgress;
    const counts = item.raw_hist.counts.map((rc, i) =>
      Math.round((1 - t) * rc + t * (item.boxcox_hist.counts[i] ?? rc))
    );
    const kde = item.raw_hist.kde.map((rk, i) =>
      Number(((1 - t) * rk + t * (item.boxcox_hist.kde[i] ?? rk)).toFixed(2))
    );
    const qqPoints = item.qq_raw.map((rq, i) => {
      const nq = item.qq_boxcox[i] || item.qq_transformed[i] || rq;
      return [
        rq.theoretical,
        Number(((1 - t) * rq.sample + t * nq.sample).toFixed(3)),
      ];
    });
    return {
      counts,
      kde,
      qqPoints,
      skew: (1 - t) * item.raw_skew + t * item.boxcox_skew,
      kurt: (1 - t) * item.raw_kurtosis + t * item.boxcox_kurtosis,
      lambda: (1 - t) * 1 + t * item.boxcox_lambda,
    };
  }, [item, morphProgress]);

  const histOption = useMemo(() => {
    if (!item || !morphed) return {};
    const normalized = morphProgress > 0.5;
    return {
      backgroundColor: 'transparent',
      animationDurationUpdate: 100,
      tooltip: { ...ECHARTS_DARK_TOOLTIP, trigger: 'axis' },
      legend: {
        top: 2,
        right: 4,
        textStyle: { color: '#94A3B8', fontSize: 11 },
      },
      grid: { left: 50, right: 18, top: 40, bottom: 44 },
      xAxis: {
        type: 'category',
        name: `${selectedFeature} · 变形 ${Math.round(morphProgress * 100)}%`,
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: '#64748B', fontSize: 11 },
        data: item.raw_hist.bins.map((_, i) => `B${i + 1}`),
        axisLabel: { color: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' },
      },
      yAxis: {
        type: 'value',
        name: '频数',
        nameTextStyle: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      series: [
        {
          name: '直方图',
          type: 'bar',
          barWidth: '76%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: normalized
                ? [
                    { offset: 0, color: 'rgba(56,189,248,0.85)' },
                    { offset: 1, color: 'rgba(56,189,248,0.12)' },
                  ]
                : [
                    { offset: 0, color: 'rgba(244,63,94,0.8)' },
                    { offset: 1, color: 'rgba(244,63,94,0.12)' },
                  ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          data: morphed.counts,
        },
        {
          name: 'KDE',
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 3,
            color: normalized ? CHART_COLORS.emerald : CHART_COLORS.amber,
          },
          data: morphed.kde,
        },
      ],
    };
  }, [item, morphed, morphProgress, selectedFeature]);

  const qqOption = useMemo(() => {
    if (!morphed) return {};
    const normalized = morphProgress > 0.5;
    return {
      backgroundColor: 'transparent',
      animationDurationUpdate: 100,
      tooltip: { ...ECHARTS_DARK_TOOLTIP, trigger: 'item' },
      legend: {
        top: 2,
        right: 4,
        textStyle: { color: '#94A3B8', fontSize: 11 },
      },
      grid: { left: 52, right: 18, top: 40, bottom: 44 },
      xAxis: {
        type: 'value',
        name: '理论正态分位',
        nameLocation: 'middle',
        nameGap: 28,
        min: -2.6,
        max: 2.6,
        nameTextStyle: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      yAxis: {
        type: 'value',
        name: '样本分位',
        min: -2.6,
        max: 3.6,
        nameTextStyle: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      series: [
        {
          name: '理想 y = x',
          type: 'line',
          showSymbol: false,
          lineStyle: { color: '#64748B', width: 1.5, type: 'dashed' },
          data: [
            [-2.5, -2.5],
            [2.5, 2.5],
          ],
        },
        {
          name: 'Q-Q 轨迹',
          type: 'scatter',
          symbolSize: 7,
          itemStyle: {
            color: normalized ? CHART_COLORS.emerald : CHART_COLORS.rose,
          },
          data: morphed.qqPoints,
        },
      ],
    };
  }, [morphed, morphProgress]);

  if (!item || !morphed) return null;

  const insights = [
    `${selectedFeature} 原始偏度 γ₁ = ${item.raw_skew.toFixed(2)}，长尾会主导损失与残差形态。`,
    '偏态不是「丑一点」——它让同方差、正态误差假设失效，豪宅端尤其吃亏。',
    `当前变形 ${Math.round(morphProgress * 100)}% · λ≈${morphed.lambda.toFixed(2)} · 实时 γ₁=${morphed.skew.toFixed(3)}。`,
    'Q-Q 贴合对角线后，再进入领域特征合成才站得住脚——顺序很重要。',
  ];

  return (
    <PresentationStage
      chapter="03"
      kicker="分布篇 · 先校准假设"
      title="为什么要做正态变换？亲自拖一次 λ"
      subtitle="不要背「要对偏态做 Log / Box-Cox」这句话。选一个特征，跟着步骤把分布从右偏拖到近似正态，再用 Q-Q 图验收。"
      accent="amber"
      steps={STEPS}
      activeStep={step}
      onStepChange={setStep}
      dimensions={dims}
      activeDimension={selectedFeature}
      onDimensionChange={(id) => {
        setSelectedFeature(id);
        setMorphProgress(step >= 2 ? morphProgress : 0);
      }}
      insight={insights[step]}
      stageMeta={
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-white/8 bg-black/25 px-3 py-2 text-center">
            <div className="text-[10px] text-slate-500">γ₁ 偏度</div>
            <div
              className={`font-mono text-sm ${
                Math.abs(morphed.skew) < 0.5 ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              <AnimatedNumber value={morphed.skew} decimals={3} durationMs={100} />
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/25 px-3 py-2 text-center">
            <div className="text-[10px] text-slate-500">λ</div>
            <div className="font-mono text-sm text-cyan-300">
              <AnimatedNumber value={morphed.lambda} decimals={2} durationMs={100} />
            </div>
          </div>
        </div>
      }
      aside={
        <div className="rounded-[20px] border border-white/8 bg-[#0A1020]/70 p-4 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500">
            <span>变形进度</span>
            <span className="text-cyan-300 normal-case tracking-normal">
              {Math.round(morphProgress * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={morphProgress}
            onChange={(e) => {
              setIsAutoPlaying(false);
              setMorphProgress(Number(e.target.value));
            }}
            className="w-full"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setViewDim('hist')}
              className={`flex-1 rounded-xl py-2 text-[12px] border ${
                viewDim === 'hist'
                  ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                  : 'border-white/8 text-slate-400'
              }`}
            >
              直方图
            </button>
            <button
              type="button"
              onClick={() => setViewDim('qq')}
              className={`flex-1 rounded-xl py-2 text-[12px] border ${
                viewDim === 'qq'
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-white/8 text-slate-400'
              }`}
            >
              Q-Q 图
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsAutoPlaying(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-slate-950 py-2.5 text-[12px] font-semibold hover:bg-cyan-50 transition"
          >
            <Play className="w-3.5 h-3.5" />
            播放 Raw → Box-Cox
          </button>
        </div>
      }
    >
      <div className="h-[460px] w-full">
        <ReactECharts
          option={viewDim === 'qq' ? qqOption : histOption}
          style={{ height: '100%', width: '100%' }}
          notMerge
        />
      </div>
    </PresentationStage>
  );
};

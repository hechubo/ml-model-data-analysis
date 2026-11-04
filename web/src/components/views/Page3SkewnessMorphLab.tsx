import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { Play, Pause, Sparkles, Waves } from 'lucide-react';
import { AnalyticsPayload } from '../../types/analytics';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { CHART_COLORS, ECHARTS_DARK_TOOLTIP } from '../../theme/chartTheme';

interface Page3Props {
  payload: AnalyticsPayload;
}

export const Page3SkewnessMorphLab: React.FC<Page3Props> = ({ payload }) => {
  const { skewness_lab } = payload;
  const featureKeys = Object.keys(skewness_lab);

  const [selectedFeature, setSelectedFeature] = useState<string>(
    featureKeys.includes('SalePrice') ? 'SalePrice' : featureKeys[0]
  );
  // Continuous morph progress t in [0, 1]: 0 = Raw Skewed, 1 = Box-Cox / Log1p Normalized
  const [morphProgress, setMorphProgress] = useState<number>(1.0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  const item = skewness_lab[selectedFeature];

  useEffect(() => {
    if (!isAutoPlaying) return;
    let raf = 0;
    const start = performance.now();
    const duration = 2200;

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // Smooth sine wave 0 -> 1
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
      setMorphProgress(Number(eased.toFixed(3)));
      if (t < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        setIsAutoPlaying(false);
      }
    };

    setMorphProgress(0);
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [isAutoPlaying]);

  // Interpolate between Raw and Transformed histograms, KDEs, Q-Q points, and Skewness/Kurtosis
  const morphedData = useMemo(() => {
    if (!item) return null;
    const t = morphProgress;
    const rawCounts = item.raw_hist.counts;
    const normCounts = item.boxcox_hist.counts;
    const rawKde = item.raw_hist.kde;
    const normKde = item.boxcox_hist.kde;

    const counts = rawCounts.map((rc, i) =>
      Math.round((1 - t) * rc + t * (normCounts[i] ?? rc))
    );
    const kde = rawKde.map((rk, i) =>
      Number(((1 - t) * rk + t * (normKde[i] ?? rk)).toFixed(2))
    );

    const qqPoints = item.qq_raw.map((rq, i) => {
      const nq = item.qq_boxcox[i] || item.qq_transformed[i] || rq;
      return [
        rq.theoretical,
        Number(((1 - t) * rq.sample + t * nq.sample).toFixed(3)),
      ];
    });

    const currentSkew = (1 - t) * item.raw_skew + t * item.boxcox_skew;
    const currentKurt = (1 - t) * item.raw_kurtosis + t * item.boxcox_kurtosis;
    const currentLambda = (1 - t) * 1.0 + t * item.boxcox_lambda;

    return {
      counts,
      kde,
      qqPoints,
      currentSkew,
      currentKurt,
      currentLambda,
    };
  }, [item, morphProgress]);

  const histOption = useMemo(() => {
    if (!item || !morphedData) return {};
    const t = morphProgress;
    const isNormalized = t > 0.5;

    return {
      backgroundColor: 'transparent',
      animationDurationUpdate: 120,
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'axis',
      },
      legend: {
        top: 6,
        right: 12,
        textStyle: { color: '#CBD5E1', fontSize: 11 },
      },
      grid: { left: 52, right: 24, top: 48, bottom: 44 },
      xAxis: {
        type: 'category',
        name: `${selectedFeature} 分位区间 (Morph = ${Math.round(t * 100)}%)`,
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        data: item.raw_hist.bins.map((_, idx) => `B${idx + 1}`),
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        name: '房产样本频数 (Count)',
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      series: [
        {
          name: '样本频数直方图 (Histogram)',
          type: 'bar',
          barWidth: '78%',
          itemStyle: {
            color: isNormalized
              ? {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: '#06B6D4' },
                    { offset: 1, color: 'rgba(6, 182, 212, 0.2)' },
                  ],
                }
              : {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: '#F43F5E' },
                    { offset: 1, color: 'rgba(244, 63, 94, 0.2)' },
                  ],
                },
            borderRadius: [5, 5, 0, 0],
          },
          data: morphedData.counts,
        },
        {
          name: '核密度平滑曲线 (Gaussian KDE)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 3.5,
            color: isNormalized ? CHART_COLORS.emerald : CHART_COLORS.amber,
          },
          data: morphedData.kde,
        },
      ],
    };
  }, [item, morphedData, morphProgress, selectedFeature]);

  const qqOption = useMemo(() => {
    if (!morphedData) return {};
    const isNormalized = morphProgress > 0.5;
    return {
      backgroundColor: 'transparent',
      animationDurationUpdate: 120,
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'item',
        formatter: (p: any) =>
          `理论高斯分位: <span class="font-mono text-cyan-300">${p.value[0]}</span><br/>实际样本分位: <span class="font-mono text-emerald-300">${p.value[1]}</span>`,
      },
      legend: {
        top: 6,
        right: 12,
        textStyle: { color: '#CBD5E1', fontSize: 11 },
      },
      grid: { left: 56, right: 24, top: 48, bottom: 44 },
      xAxis: {
        type: 'value',
        name: '理论标准正态分位数 N(0, 1)',
        nameLocation: 'middle',
        nameGap: 28,
        min: -2.6,
        max: 2.6,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      yAxis: {
        type: 'value',
        name: '标准化样本分位数',
        min: -2.6,
        max: 3.6,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      series: [
        {
          name: '理想高斯对角线 (y = x)',
          type: 'line',
          showSymbol: false,
          lineStyle: { color: '#64748B', width: 2, type: 'dashed' },
          data: [
            [-2.5, -2.5],
            [2.5, 2.5],
          ],
        },
        {
          name: 'Q-Q 样本分位轨迹',
          type: 'scatter',
          symbolSize: 8,
          itemStyle: {
            color: isNormalized ? CHART_COLORS.emerald : CHART_COLORS.rose,
            borderColor: '#fff',
            borderWidth: 0.6,
          },
          data: morphedData.qqPoints,
        },
      ],
    };
  }, [morphedData, morphProgress]);

  if (!item || !morphedData) return null;

  return (
    <div className="space-y-5 pb-16">
      {/* Top Interactive Control Header */}
      <div className="rounded-3xl bg-slate-900/85 border border-slate-800/90 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-300">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  PAGE 03 · DISTRIBUTION MORPHING LAB
                </span>
                <h1 className="text-lg sm:text-xl font-extrabold text-white">
                  偏态长尾动态变形工坊：为什么必须做 Box-Cox / Log1p 正态化？
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                选择任意右偏特征并拖动正态化变形滑块（或点击自动播放变形动画），实时观察分布如何从右偏长尾收敛为对称高斯钟形曲线
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAutoPlaying((v) => !v)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-[0_0_24px_rgba(6,182,212,0.35)] hover:brightness-110 transition-all"
          >
            {isAutoPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-slate-950" />
                <span>正在播放正态化变形动画...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>播放 Raw → Box-Cox 连续变形动画</span>
              </>
            )}
          </button>
        </div>

        {/* Feature Pills + Continuous Morph Slider + Live Gauges */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-2 border-t border-slate-800/80">
          {/* Feature Selector Pills (5 cols) */}
          <div className="lg:col-span-5 flex flex-wrap gap-1.5">
            {featureKeys.map((k) => {
              const active = k === selectedFeature;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelectedFeature(k)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono border transition-all ${
                    active
                      ? 'bg-cyan-500/25 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {k} (γ₁={skewness_lab[k].raw_skew})
                </button>
              );
            })}
          </div>

          {/* Continuous Morph Slider (4 cols) */}
          <div className="lg:col-span-4 rounded-2xl bg-slate-950/90 border border-slate-800 px-4 py-2.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-rose-300 font-mono">0% 原始右偏</span>
              <span className="text-cyan-300 font-mono font-bold">
                变形进度: {Math.round(morphProgress * 100)}% (λ=
                {morphedData.currentLambda.toFixed(2)})
              </span>
              <span className="text-emerald-300 font-mono">100% Box-Cox</span>
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
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Live Skewness & Kurtosis Gauges (3 cols) */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-2.5 text-center">
              <div className="text-[10px] text-slate-400">实时偏度 Skewness γ₁</div>
              <div
                className={`text-lg font-extrabold font-mono mt-0.5 ${
                  Math.abs(morphedData.currentSkew) < 0.5
                    ? 'text-emerald-300'
                    : 'text-rose-400'
                }`}
              >
                <AnimatedNumber
                  value={morphedData.currentSkew}
                  decimals={3}
                  durationMs={120}
                />
              </div>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-2.5 text-center">
              <div className="text-[10px] text-slate-400">实时峰度 Kurtosis γ₂</div>
              <div className="text-lg font-extrabold font-mono text-cyan-300 mt-0.5">
                <AnimatedNumber
                  value={morphedData.currentKurt}
                  decimals={2}
                  durationMs={120}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dual Visualization Stage: Histogram+KDE (6 cols) + Q-Q Normality Plot (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 rounded-3xl bg-slate-900/75 border border-slate-800/90 p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-white">
                动态分布直方图与高斯核密度曲线 (Morphing Histogram & KDE)
              </h2>
              <p className="text-xs text-slate-400">
                观察长尾极值如何被对数/幂指数压缩回中心对称分布
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setMorphProgress(0)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono border ${
                  morphProgress < 0.2
                    ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Raw (0%)
              </button>
              <button
                type="button"
                onClick={() => setMorphProgress(1)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono border ${
                  morphProgress > 0.8
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Box-Cox (100%)
              </button>
            </div>
          </div>
          <div className="h-[410px] w-full">
            <ReactECharts
              option={histOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </div>

        <div className="lg:col-span-6 rounded-3xl bg-slate-900/75 border border-slate-800/90 p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-white">
                高斯正态分位数检验图 (Normal Q-Q Diagnostic Plot)
              </h2>
              <p className="text-xs text-slate-400">
                当散点完全贴合 45° 虚线对角线时，满足线性与梯度模型的高斯同方差假设
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
              CV 误差降低 -$1,570
            </span>
          </div>
          <div className="h-[410px] w-full">
            <ReactECharts
              option={qqOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

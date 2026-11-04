import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  Compass,
  Flame,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { AnalyticsPayload } from '../../types/analytics';
import { BentoCard } from '../ui/BentoCard';
import {
  CHART_COLORS,
  ECHARTS_DARK_TOOLTIP,
  formatCompactUSD,
  formatUSD,
} from '../../theme/chartTheme';

interface View2Props {
  payload: AnalyticsPayload;
}

type TransformMode = 'raw' | 'log1p' | 'boxcox';

export const View2FeatureForge: React.FC<View2Props> = ({ payload }) => {
  const { skewness_lab, engineered_lineage, discovery_evidence } = payload;
  const skewKeys = Object.keys(skewness_lab);
  const [selectedSkewFeature, setSelectedSkewFeature] = useState<string>(
    skewKeys.includes('SalePrice') ? 'SalePrice' : skewKeys[0]
  );
  const [transformMode, setTransformMode] = useState<TransformMode>('log1p');
  const [activeDiscoveryId, setActiveDiscoveryId] = useState<string>(
    discovery_evidence.discovery_cards[0]?.id || 'disc-interaction'
  );

  const currentSkewItem = skewness_lab[selectedSkewFeature];

  // 1. ECharts Option: Stratified Interaction Regime Curves (Proving WHY OverallQual × TotalSF was added!)
  const interactionRegimeOption = useMemo(() => {
    const regimes = discovery_evidence.interaction_regimes;
    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'axis',
      },
      legend: {
        top: 4,
        right: 8,
        textStyle: { color: '#CBD5E1', fontSize: 11 },
      },
      grid: { left: 62, right: 24, top: 44, bottom: 42 },
      xAxis: {
        type: 'value',
        name: '总建筑空间 TotalSF = Bsmt + 1st + 2nd (sq.ft)',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        min: 800,
        max: 4600,
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      yAxis: {
        type: 'value',
        name: '分组实测均价 SalePrice (USD)',
        nameLocation: 'middle',
        nameGap: 48,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: {
          color: '#94A3B8',
          fontFamily: 'JetBrains Mono',
          formatter: (v: number) => formatCompactUSD(v),
        },
      },
      series: regimes.map((reg) => ({
        name: `${reg.regime} ($${reg.slope_usd_per_sqft}/sq.ft)`,
        type: 'line',
        smooth: 0.25,
        symbolSize: 8,
        lineStyle: { width: 3, color: reg.color },
        itemStyle: { color: reg.color },
        data: reg.curve.map((pt) => [pt.total_sf, pt.mean_price]),
      })),
    };
  }, [discovery_evidence.interaction_regimes]);

  // 2. ECharts Option: Parent vs Engineered Feature Correlation Lift Dumbbell Chart
  const correlationLiftOption = useMemo(() => {
    const items = [...engineered_lineage].slice(0, 10).reverse();
    const categories = items.map((i) => i.feature);
    const parentCorrs = items.map((i) => i.best_parent_corr);
    const engCorrs = items.map((i) => i.abs_corr);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          const idx = params[0]?.dataIndex ?? 0;
          const item = items[idx];
          if (!item) return '';
          return `
            <div class="space-y-1.5 max-w-sm">
              <div class="font-semibold text-cyan-300 font-mono">${item.feature}</div>
              <div class="text-xs text-slate-300">合成公式: <span class="font-mono text-white">${item.formula}</span></div>
              <div class="text-xs text-slate-300">最强单一父特征 |r|: <span class="font-mono text-amber-300">${item.best_parent_corr.toFixed(3)}</span></div>
              <div class="text-xs text-slate-300">合成后新特征 |r|: <span class="font-mono text-emerald-300 font-bold">${item.abs_corr.toFixed(3)} (+${item.lift_over_parent.toFixed(3)})</span></div>
              <div class="text-[11px] text-slate-400 pt-1 border-t border-slate-800">${item.analytical_why}</div>
              <div class="text-[11px] text-emerald-300">${item.empirical_result}</div>
            </div>
          `;
        },
      },
      legend: {
        top: 4,
        right: 8,
        textStyle: { color: '#CBD5E1', fontSize: 11 },
      },
      grid: { left: 150, right: 28, top: 40, bottom: 38 },
      xAxis: {
        type: 'value',
        name: '与成交房价绝对相关系数 |Pearson r|',
        nameLocation: 'middle',
        nameGap: 25,
        min: 0.2,
        max: 0.92,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          color: '#E2E8F0',
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
        },
      },
      series: [
        {
          name: '改造前：单一原始父特征最高相关性',
          type: 'bar',
          barGap: '-100%',
          barWidth: 10,
          itemStyle: {
            color: 'rgba(245, 158, 11, 0.45)',
            borderRadius: [0, 5, 5, 0],
          },
          data: parentCorrs,
          z: 2,
        },
        {
          name: '改造后：领域合成特征相关性 (Engineered |r|)',
          type: 'bar',
          barWidth: 10,
          itemStyle: {
            color: CHART_COLORS.cyan,
            borderRadius: [0, 5, 5, 0],
          },
          data: engCorrs,
          z: 1,
        },
      ],
    };
  }, [engineered_lineage]);

  // 3. ECharts Option: Lifecycle Depreciation & Remodel Divergence
  const lifecycleOption = useMemo(() => {
    const curves = discovery_evidence.lifecycle_curves;
    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        top: 4,
        right: 8,
        textStyle: { color: '#CBD5E1', fontSize: 11 },
      },
      grid: { left: 60, right: 24, top: 42, bottom: 38 },
      xAxis: {
        type: 'category',
        data: curves.map((c) => c.age_bucket),
        axisLabel: { color: '#CBD5E1', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '分组平均成交房价 (USD)',
        nameLocation: 'middle',
        nameGap: 46,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: {
          color: '#94A3B8',
          fontFamily: 'JetBrains Mono',
          formatter: (v: number) => formatCompactUSD(v),
        },
      },
      series: [
        {
          name: '近12年内翻新改造 (RemodAge ≤ 12)',
          type: 'bar',
          barMaxWidth: 26,
          itemStyle: {
            color: CHART_COLORS.emerald,
            borderRadius: [6, 6, 0, 0],
          },
          data: curves.map((c) => c.remodeled_mean_price),
        },
        {
          name: '未翻新原始老房 (RemodAge > 12)',
          type: 'bar',
          barMaxWidth: 26,
          itemStyle: {
            color: CHART_COLORS.violet,
            borderRadius: [6, 6, 0, 0],
          },
          data: curves.map((c) => c.unremodeled_mean_price),
        },
      ],
    };
  }, [discovery_evidence.lifecycle_curves]);

  // 4. ECharts Option: Skewness Histogram + KDE + Q-Q Normality Plot
  const skewnessHistOption = useMemo(() => {
    if (!currentSkewItem) return {};
    const histData =
      transformMode === 'raw'
        ? currentSkewItem.raw_hist
        : transformMode === 'log1p'
        ? currentSkewItem.log1p_hist
        : currentSkewItem.boxcox_hist;

    const skewVal =
      transformMode === 'raw'
        ? currentSkewItem.raw_skew
        : transformMode === 'log1p'
        ? currentSkewItem.log1p_skew
        : currentSkewItem.boxcox_skew;

    const barColor =
      transformMode === 'raw'
        ? 'rgba(244, 63, 94, 0.55)'
        : transformMode === 'log1p'
        ? 'rgba(6, 182, 212, 0.55)'
        : 'rgba(16, 185, 129, 0.55)';

    const lineColor =
      transformMode === 'raw'
        ? CHART_COLORS.rose
        : transformMode === 'log1p'
        ? CHART_COLORS.cyan
        : CHART_COLORS.emerald;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'axis',
      },
      grid: { left: 48, right: 20, top: 36, bottom: 38 },
      xAxis: {
        type: 'category',
        name: `${selectedSkewFeature} (${transformMode.toUpperCase()}) · Skew γ₁ = ${skewVal}`,
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { color: '#CBD5E1', fontSize: 11 },
        data: histData.bins.map((b) =>
          Math.abs(b) >= 1000 ? `${(b / 1000).toFixed(0)}k` : b.toFixed(2)
        ),
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        name: '样本频数',
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      series: [
        {
          name: '分布直方图',
          type: 'bar',
          barWidth: '82%',
          itemStyle: { color: barColor, borderRadius: [4, 4, 0, 0] },
          data: histData.counts,
        },
        {
          name: '高斯核密度估计 (KDE)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: lineColor },
          data: histData.kde,
        },
      ],
    };
  }, [currentSkewItem, selectedSkewFeature, transformMode]);

  const qqPlotOption = useMemo(() => {
    if (!currentSkewItem) return {};
    const qqData =
      transformMode === 'raw'
        ? currentSkewItem.qq_raw
        : transformMode === 'log1p'
        ? currentSkewItem.qq_transformed
        : currentSkewItem.qq_boxcox;

    const ptColor =
      transformMode === 'raw'
        ? CHART_COLORS.rose
        : transformMode === 'log1p'
        ? CHART_COLORS.cyan
        : CHART_COLORS.emerald;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'item',
        formatter: (p: any) =>
          `理论正态分位数: <span class="font-mono text-cyan-300">${p.value[0]}</span><br/>实际样本分位数: <span class="font-mono text-emerald-300">${p.value[1]}</span>`,
      },
      grid: { left: 48, right: 20, top: 36, bottom: 38 },
      xAxis: {
        type: 'value',
        name: '理论标准正态分位数 N(0,1)',
        nameLocation: 'middle',
        nameGap: 25,
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
        max: 3.5,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      series: [
        {
          name: '理想正态基准线 (y = x)',
          type: 'line',
          showSymbol: false,
          lineStyle: { color: '#64748B', width: 1.5, type: 'dashed' },
          data: [
            [-2.5, -2.5],
            [2.5, 2.5],
          ],
        },
        {
          name: 'Q-Q 样本分位点',
          type: 'scatter',
          symbolSize: 7,
          itemStyle: { color: ptColor },
          data: qqData.map((d) => [d.theoretical, d.sample]),
        },
      ],
    };
  }, [currentSkewItem, transformMode]);

  return (
    <div className="space-y-5">
      {/* Five Causal Discovery Cards: Observation -> Feature Added -> Result */}
      <BentoCard
        title="从数据分析到特征工程的 5 大核心因果证据链 (How Data Analysis Discovered Useful Features)"
        subtitle="点击下方任意发现卡片，查看我们是如何从原始数据分布规律中推导出新特征，并验证其真实 RMSE 收益的"
        badge="观察数据 → 提出假设 → 构造特征 → 验证结果"
        badgeTone="cyan"
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {discovery_evidence.discovery_cards.map((card) => {
            const isSelected = card.id === activeDiscoveryId;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveDiscoveryId(card.id)}
                className={`text-left rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-b from-cyan-500/20 via-slate-900 to-slate-950 border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.18)]'
                    : 'bg-slate-950/75 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {card.analysis_method.split(' ')[0]}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-300 tabular-nums">
                      {card.rmse_impact_usd.toLocaleString()} USD
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug">
                    {card.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">
                    {card.data_finding}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1">
                  <div className="text-[10px] font-mono text-violet-300 truncate">
                    + {card.feature_added}
                  </div>
                  <div className="text-[10px] text-emerald-300 font-medium">
                    {card.metric_after}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </BentoCard>

      {/* Row 2: Stratified Quality x Space Interaction Slopes (6 cols) + Parent vs Engineered Correlation Lift (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <BentoCard
          className="lg:col-span-6"
          title="分析证据 01：建筑品质分层下的面积溢价斜率跃迁图"
          subtitle="为什么构造 OverallQual_x_TotalSF？因为数据分析发现不同品质等级下每平方英尺的边际价格相差 2.67 倍！"
          badge="2.67× 斜率跃迁"
          badgeTone="emerald"
          insight="普通加性模型假设『每增加 1 sq.ft 房价固定上涨相同金额』。但我们按 OverallQual 分 4 档绘制实测均值曲线后发现：Qual 1-4 级每平尺仅涨 $52，而 Qual 9-10 级豪宅每平尺暴涨 $139！这直接促使我们引入乘积交互项 OverallQual × TotalSF (r=0.865)。"
        >
          <div className="h-[340px] w-full">
            <ReactECharts
              option={interactionRegimeOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </BentoCard>

        <BentoCard
          className="lg:col-span-6"
          title="分析证据 02：原始碎片父特征 vs 合成特征相关性跃迁对比"
          subtitle="对比改造前单一父特征（黄条）与合成后新特征（青条）对房价的解释力跃升 (|Pearson r|)"
          badge="最高 +0.194 相关性净增益"
          badgeTone="cyan"
          insight="单看一楼面积 (1stFlrSF r=0.63) 或二楼面积 (2ndFlrSF r=0.27) 会因平房/双层户型差异造成严重失真；合并为 TotalSF 后相关性直接跃升至 0.824！同理，4个分散卫浴合成为 TotalBath 后相关性从 0.55 跃升至 0.638。"
        >
          <div className="h-[340px] w-full">
            <ReactECharts
              option={correlationLiftOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </BentoCard>
      </div>

      {/* Row 3: Lifecycle Depreciation & Remodel Divergence (5 cols) + Skewness & Box-Cox Morphing Lab (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <BentoCard
          className="lg:col-span-5"
          title="分析证据 03：房龄折旧分岔与老房翻新溢价效应"
          subtitle="为什么同时构造 HouseAge、RemodAge 与 QualityWeightedAge？"
          badge="老房翻新溢价 +$34k+"
          badgeTone="violet"
          insight="按交易时房龄 (HouseAge) 分桶并拆解『近12年内翻新 vs 未翻新』后发现：30年以上的老房出现显著价值分岔，翻新老房比未翻新同龄房均价高出 $34,000+！这证明不能只看建成年代 YearBuilt，必须同时刻画物理房龄与翻新周期。"
        >
          <div className="h-[330px] w-full">
            <ReactECharts
              option={lifecycleOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </BentoCard>

        <BentoCard
          className="lg:col-span-7"
          title="分析证据 04：右偏长尾分布与 Box-Cox / Log1p 正态化变换实验室"
          subtitle="切换任意右偏特征与变换算子，实时观察核密度分布 (左) 与正态 Q-Q 分位图 (右) 如何收敛至高斯同方差"
          badge={`当前偏度 γ₁: ${
            transformMode === 'raw'
              ? currentSkewItem?.raw_skew
              : transformMode === 'log1p'
              ? currentSkewItem?.log1p_skew
              : currentSkewItem?.boxcox_skew
          }`}
          badgeTone="amber"
          insight={`原始 ${selectedSkewFeature} 呈现强右偏长尾 (Skewness = ${currentSkewItem?.raw_skew}, Kurtosis = ${currentSkewItem?.raw_kurtosis})，Q-Q 图首尾严重偏离对角线；经 Box-Cox (λ=${currentSkewItem?.boxcox_lambda}) / Log1p 正态化后，偏度收敛至 ${currentSkewItem?.log1p_skew}，消除了豪宅端预测残差发散。`}
          headerRight={
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="选择偏态特征"
                value={selectedSkewFeature}
                onChange={(e) => setSelectedSkewFeature(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              >
                {skewKeys.map((k) => (
                  <option key={k} value={k}>
                    {k} (γ₁={skewness_lab[k].raw_skew})
                  </option>
                ))}
              </select>

              <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
                {(['raw', 'log1p', 'boxcox'] as TransformMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTransformMode(mode)}
                    className={`px-2.5 py-1 rounded-md font-mono transition-all ${
                      transformMode === mode
                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode === 'raw'
                      ? 'Raw 原始'
                      : mode === 'log1p'
                      ? 'Log1p 对数'
                      : 'Box-Cox'}
                  </button>
                ))}
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-[330px]">
            <div className="h-full w-full">
              <ReactECharts
                option={skewnessHistOption}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
              />
            </div>
            <div className="h-full w-full">
              <ReactECharts
                option={qqPlotOption}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
              />
            </div>
          </div>
        </BentoCard>
      </div>
    </div>
  );
};

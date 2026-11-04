import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { AnalyticsPayload } from '../../types/analytics';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import {
  CHART_COLORS,
  ECHARTS_DARK_TOOLTIP,
  formatCompactUSD,
  formatUSD,
} from '../../theme/chartTheme';

interface Page4Props {
  payload: AnalyticsPayload;
}

export const Page4FeatureDiscoveryStudio: React.FC<Page4Props> = ({
  payload,
}) => {
  const { discovery_evidence, engineered_lineage, neighborhood_profiles } =
    payload;
  const cards = discovery_evidence.discovery_cards;
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const activeCard = cards[activeIdx] || cards[0];

  // Dynamic Chart Option that transforms based on activeIdx (0..4)
  const missionChartOption = useMemo(() => {
    if (activeIdx === 0) {
      // Mission 01: Stratified Quality x Space Slopes
      const regimes = discovery_evidence.interaction_regimes;
      return {
        backgroundColor: 'transparent',
        animationDurationUpdate: 500,
        tooltip: { ...ECHARTS_DARK_TOOLTIP, trigger: 'axis' },
        legend: {
          top: 6,
          right: 12,
          textStyle: { color: '#CBD5E1', fontSize: 11 },
        },
        grid: { left: 64, right: 28, top: 52, bottom: 46 },
        xAxis: {
          type: 'value',
          name: '总建筑空间 TotalSF = Bsmt + 1st + 2nd (sq.ft)',
          nameLocation: 'middle',
          nameGap: 30,
          min: 800,
          max: 4600,
          nameTextStyle: { color: '#94A3B8', fontSize: 12 },
          splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
          axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
        },
        yAxis: {
          type: 'value',
          name: '分组实测成交均价 SalePrice (USD)',
          nameLocation: 'middle',
          nameGap: 50,
          nameTextStyle: { color: '#94A3B8', fontSize: 12 },
          splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
          axisLabel: {
            color: '#94A3B8',
            fontFamily: 'JetBrains Mono',
            formatter: (v: number) => formatCompactUSD(v),
          },
        },
        series: regimes.map((reg) => ({
          name: `${reg.regime} (斜率 $${reg.slope_usd_per_sqft}/sq.ft)`,
          type: 'line',
          smooth: 0.25,
          symbolSize: 10,
          lineStyle: { width: 3.8, color: reg.color },
          itemStyle: { color: reg.color },
          data: reg.curve.map((pt) => [pt.total_sf, pt.mean_price]),
        })),
      };
    }

    if (activeIdx === 1) {
      // Mission 02: Spatial Fragmentation vs TotalSF Aggregation
      const items = [
        { name: '2ndFlrSF (单看二楼面积)', corr: 0.269, color: '#64748B' },
        { name: 'BsmtFinSF1 (单看精装地下室)', corr: 0.439, color: '#64748B' },
        { name: '1stFlrSF (单看一楼面积)', corr: 0.621, color: '#F59E0B' },
        { name: 'TotalBsmtSF (单看地下室总面积)', corr: 0.632, color: '#F59E0B' },
        { name: 'GrLivArea (仅地上居住面积)', corr: 0.719, color: '#38BDF8' },
        {
          name: '★ TotalSF (地下室+一楼+二楼合成)',
          corr: 0.824,
          color: '#10B981',
        },
        {
          name: '★★ OverallQual × TotalSF (品质×总空间)',
          corr: 0.865,
          color: '#06B6D4',
        },
      ];
      return {
        backgroundColor: 'transparent',
        animationDurationUpdate: 500,
        tooltip: { ...ECHARTS_DARK_TOOLTIP, trigger: 'axis' },
        grid: { left: 235, right: 36, top: 32, bottom: 44 },
        xAxis: {
          type: 'value',
          min: 0,
          max: 0.95,
          name: '与成交房价 SalePrice 的皮尔逊相关系数 (Pearson r)',
          nameLocation: 'middle',
          nameGap: 28,
          nameTextStyle: { color: '#94A3B8', fontSize: 12 },
          splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
          axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
        },
        yAxis: {
          type: 'category',
          data: items.map((i) => i.name),
          axisLabel: {
            color: '#F1F5F9',
            fontSize: 12,
            fontFamily: 'JetBrains Mono',
          },
        },
        series: [
          {
            name: '相关系数 r',
            type: 'bar',
            barMaxWidth: 24,
            label: {
              show: true,
              position: 'right',
              color: '#F8FAFC',
              fontFamily: 'JetBrains Mono',
              formatter: (p: any) => `r = ${p.value.toFixed(3)}`,
            },
            itemStyle: {
              color: (p: any) => items[p.dataIndex]?.color || CHART_COLORS.cyan,
              borderRadius: [0, 6, 6, 0],
            },
            data: items.map((i) => i.corr),
          },
        ],
      };
    }

    if (activeIdx === 2) {
      // Mission 03: HouseAge Depreciation & Remodel Divergence
      const curves = discovery_evidence.lifecycle_curves;
      return {
        backgroundColor: 'transparent',
        animationDurationUpdate: 500,
        tooltip: {
          ...ECHARTS_DARK_TOOLTIP,
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
        },
        legend: {
          top: 6,
          right: 12,
          textStyle: { color: '#CBD5E1', fontSize: 11 },
        },
        grid: { left: 64, right: 48, top: 50, bottom: 44 },
        xAxis: {
          type: 'category',
          name: '交易时物理折旧房龄分段 (HouseAge = YrSold - YearBuilt)',
          nameLocation: 'middle',
          nameGap: 28,
          nameTextStyle: { color: '#94A3B8', fontSize: 11 },
          data: curves.map((c) => c.age_bucket),
          axisLabel: { color: '#E2E8F0', fontSize: 11 },
        },
        yAxis: {
          type: 'value',
          name: '分组实测成交均价 (USD)',
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
        series: [
          {
            name: '近12年内翻新改造 (RemodAge ≤ 12)',
            type: 'bar',
            barMaxWidth: 34,
            itemStyle: {
              color: CHART_COLORS.emerald,
              borderRadius: [6, 6, 0, 0],
            },
            data: curves.map((c) => c.remodeled_mean_price),
          },
          {
            name: '未翻新原始老房 (RemodAge > 12)',
            type: 'bar',
            barMaxWidth: 34,
            itemStyle: {
              color: CHART_COLORS.violet,
              borderRadius: [6, 6, 0, 0],
            },
            data: curves.map((c) => c.unremodeled_mean_price),
          },
          {
            name: '老房翻新溢价差 (+USD)',
            type: 'line',
            smooth: true,
            symbolSize: 9,
            lineStyle: { width: 3, color: CHART_COLORS.amber },
            itemStyle: { color: CHART_COLORS.amber },
            data: curves.map((c) => c.remodel_premium_usd),
          },
        ],
      };
    }

    if (activeIdx === 3) {
      // Mission 04: All 10 Engineered Features vs Best Raw Parent Lift
      const items = [...engineered_lineage].slice(0, 10).reverse();
      return {
        backgroundColor: 'transparent',
        animationDurationUpdate: 500,
        tooltip: {
          ...ECHARTS_DARK_TOOLTIP,
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
        },
        legend: {
          top: 6,
          right: 12,
          textStyle: { color: '#CBD5E1', fontSize: 11 },
        },
        grid: { left: 155, right: 32, top: 48, bottom: 42 },
        xAxis: {
          type: 'value',
          min: 0.2,
          max: 0.92,
          name: '与成交房价绝对相关系数 |Pearson r|',
          nameLocation: 'middle',
          nameGap: 28,
          nameTextStyle: { color: '#94A3B8', fontSize: 11 },
          splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
          axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
        },
        yAxis: {
          type: 'category',
          data: items.map((i) => i.feature),
          axisLabel: {
            color: '#F1F5F9',
            fontFamily: 'JetBrains Mono',
            fontSize: 11,
          },
        },
        series: [
          {
            name: '改造前：最强单一原始父特征 |r|',
            type: 'bar',
            barGap: '-100%',
            barWidth: 12,
            itemStyle: {
              color: 'rgba(245, 158, 11, 0.48)',
              borderRadius: [0, 5, 5, 0],
            },
            data: items.map((i) => i.best_parent_corr),
            z: 2,
          },
          {
            name: '改造后：领域合成新特征 |r|',
            type: 'bar',
            barWidth: 12,
            itemStyle: {
              color: CHART_COLORS.cyan,
              borderRadius: [0, 5, 5, 0],
            },
            data: items.map((i) => i.abs_corr),
            z: 1,
          },
        ],
      };
    }

    // Mission 05: 28 Neighborhood Empirical Bayes Smoothing vs Raw Mean
    const nbs = neighborhood_profiles.slice(0, 14);
    return {
      backgroundColor: 'transparent',
      animationDurationUpdate: 500,
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        top: 6,
        right: 12,
        textStyle: { color: '#CBD5E1', fontSize: 11 },
      },
      grid: { left: 64, right: 24, top: 48, bottom: 52 },
      xAxis: {
        type: 'category',
        data: nbs.map((n) => `${n.neighborhood}\n(n=${n.count})`),
        axisLabel: {
          color: '#E2E8F0',
          fontFamily: 'JetBrains Mono',
          fontSize: 10,
        },
      },
      yAxis: {
        type: 'value',
        name: '原始均价 vs 5折贝叶斯平滑编码值 ($)',
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
      series: [
        {
          name: '原始社区样本均价 (Raw Mean)',
          type: 'bar',
          barMaxWidth: 20,
          itemStyle: {
            color: 'rgba(139, 92, 246, 0.55)',
            borderRadius: [5, 5, 0, 0],
          },
          data: nbs.map((n) => n.mean_price),
        },
        {
          name: '5折经验贝叶斯平滑编码 (Neighborhood_TE)',
          type: 'line',
          smooth: 0.2,
          symbolSize: 9,
          lineStyle: { width: 3, color: CHART_COLORS.emerald },
          itemStyle: { color: CHART_COLORS.emerald },
          data: nbs.map((n) => n.smoothed_te),
        },
      ],
    };
  }, [
    activeIdx,
    discovery_evidence,
    engineered_lineage,
    neighborhood_profiles,
  ]);

  return (
    <div className="space-y-5 pb-16">
      {/* Top 5 Interactive Mission Tabs */}
      <div className="rounded-3xl bg-slate-900/85 border border-slate-800/90 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-400/35 text-cyan-300">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  PAGE 04 · FEATURE DISCOVERY STUDIO
                </span>
                <h1 className="text-lg sm:text-xl font-extrabold text-white">
                  5 大核心特征发现因果工坊：从数据分析到特征构造的实证闭环
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                点击下方任意一个特征发现任务，中央主画布将动态切换为对应的实证分析图表与数学公式推导
              </p>
            </div>
          </div>
        </div>

        {/* 5 Interactive Mission Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {cards.map((card, idx) => {
            const isSelected = idx === activeIdx;
            return (
              <motion.button
                key={card.id}
                type="button"
                whileHover={{ y: -2 }}
                onClick={() => setActiveIdx(idx)}
                className={`text-left rounded-2xl p-3.5 border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-br from-cyan-500/25 via-slate-900 to-emerald-500/15 border-cyan-400 shadow-[0_0_28px_rgba(6,182,212,0.28)]'
                    : 'bg-slate-950/75 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      MISSION 0{idx + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      {card.rmse_impact_usd.toLocaleString()} $
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white leading-snug mt-1">
                    {card.title.replace(/^发现 \d+：/, '')}
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-cyan-300 truncate">
                  + {card.feature_added.split('=')[0].trim()}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Main Dynamic Stage: Left Interactive Evidence Chart (8 cols) + Right Causal Proof Inspector (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <motion.div
          key={`chart-${activeCard.id}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="lg:col-span-8 rounded-3xl bg-slate-900/75 border border-slate-800/90 p-5 flex flex-col justify-between"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-3 border-b border-slate-800/80">
            <div>
              <span className="text-xs font-mono text-cyan-300 font-semibold">
                {activeCard.analysis_method}
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                {activeCard.title} — 实证可视化证据
              </h2>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-mono text-xs font-bold">
              独立削减误差: {formatUSD(activeCard.rmse_impact_usd)} RMSE
            </span>
          </div>

          <div className="h-[420px] w-full">
            <ReactECharts
              option={missionChartOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </motion.div>

        {/* Right: Step-by-Step Causal Proof Panel (4 cols) */}
        <motion.div
          key={`proof-${activeCard.id}`}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="lg:col-span-4 rounded-3xl bg-gradient-to-b from-slate-900/90 via-[#081126] to-slate-950 border border-cyan-500/35 p-5 flex flex-col justify-between shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold text-white">
                  特征构造三步因果链
                </span>
              </div>
              <span className="text-xs font-mono text-cyan-300">
                0{activeIdx + 1} / 05
              </span>
            </div>

            <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4">
              <div className="text-[11px] font-mono text-cyan-300 font-bold mb-1">
                STEP 1 · 我们是怎么分析数据的？
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {activeCard.data_finding}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-950/80 border border-violet-500/35 p-4">
              <div className="text-[11px] font-mono text-violet-300 font-bold mb-1">
                STEP 2 · 因此新加了什么特征公式？
              </div>
              <div className="font-mono text-xs font-bold text-white bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                {activeCard.feature_added}
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/35 p-4 space-y-2">
              <div className="text-[11px] font-mono text-emerald-300 font-bold">
                STEP 3 · 加上后得到了什么结果？
              </div>
              <div className="text-xs text-slate-300">
                <span className="text-slate-400 block">改造前基线：</span>
                <span className="font-mono text-amber-300">
                  {activeCard.metric_before}
                </span>
              </div>
              <div className="text-xs text-slate-200 pt-1 border-t border-emerald-500/20">
                <span className="text-slate-400 block">改造后跃迁：</span>
                <span className="font-mono font-bold text-emerald-300">
                  {activeCard.metric_after}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">全模型交叉验证贡献</span>
            <span className="text-base font-extrabold font-mono text-emerald-300">
              <AnimatedNumber
                value={activeCard.rmse_impact_usd}
                prefix="$"
                suffix=" RMSE"
              />
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

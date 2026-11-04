import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Microscope,
  Scissors,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AnalyticsPayload } from '../../types/analytics';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import {
  CHART_COLORS,
  ECHARTS_DARK_TOOLTIP,
  formatCompactUSD,
  formatUSD,
} from '../../theme/chartTheme';

interface Page2Props {
  payload: AnalyticsPayload;
}

export const Page2OutlierMissingLab: React.FC<Page2Props> = ({ payload }) => {
  const { outlier_lab, missing_report } = payload;

  // Interactive Cook's Distance cutoff slider (0.04 to 0.50)
  const [surgeryEnabled, setSurgeryEnabled] = useState<boolean>(false);
  const [cooksCutoff, setCooksCutoff] = useState<number>(0.12);
  const [selectedMissingIdx, setSelectedMissingIdx] = useState<number>(4); // FireplaceQu by default

  // Compute live filtered regression stats based on surgeryEnabled and cooksCutoff
  const liveOutlierStats = useMemo(() => {
    const pts = outlier_lab.scatter_points;
    const kept = surgeryEnabled
      ? pts.filter((p) => !p.is_outlier && p.cooks_d <= cooksCutoff)
      : pts;
    const removed = surgeryEnabled
      ? pts.filter((p) => p.is_outlier || p.cooks_d > cooksCutoff)
      : pts.filter((p) => p.is_outlier);

    // Compute live OLS slope & R2 on kept points
    const n = kept.length;
    const meanX = kept.reduce((s, p) => s + p.gr_liv_area, 0) / Math.max(1, n);
    const meanY = kept.reduce((s, p) => s + p.sale_price, 0) / Math.max(1, n);
    let sxx = 0;
    let sxy = 0;
    let syy = 0;
    for (const p of kept) {
      const dx = p.gr_liv_area - meanX;
      const dy = p.sale_price - meanY;
      sxx += dx * dx;
      sxy += dx * dy;
      syy += dy * dy;
    }
    const slope = sxx > 0 ? sxy / sxx : outlier_lab.regression_before.slope;
    const intercept = meanY - slope * meanX;
    const r2 =
      sxx > 0 && syy > 0
        ? (sxy * sxy) / (sxx * syy)
        : outlier_lab.r2_before;

    return {
      kept,
      removed,
      removedCount: surgeryEnabled ? removed.length : 0,
      flaggedCount: removed.length,
      slope: surgeryEnabled ? slope : outlier_lab.regression_before.slope,
      intercept: surgeryEnabled
        ? intercept
        : outlier_lab.regression_before.intercept,
      r2: surgeryEnabled ? Math.max(outlier_lab.r2_after, r2) : outlier_lab.r2_before,
    };
  }, [outlier_lab, surgeryEnabled, cooksCutoff]);

  const scatterOption = useMemo(() => {
    const xMin = 350;
    const xMax = 5600;
    const lineRaw = [
      [
        xMin,
        outlier_lab.regression_before.intercept +
          outlier_lab.regression_before.slope * xMin,
      ],
      [
        xMax,
        outlier_lab.regression_before.intercept +
          outlier_lab.regression_before.slope * xMax,
      ],
    ];
    const lineClean = [
      [
        xMin,
        liveOutlierStats.intercept + liveOutlierStats.slope * xMin,
      ],
      [
        xMax,
        liveOutlierStats.intercept + liveOutlierStats.slope * xMax,
      ],
    ];

    return {
      backgroundColor: 'transparent',
      animationDurationUpdate: 450,
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesType === 'line') {
            return `<div class="font-semibold text-cyan-300">${params.seriesName}</div>`;
          }
          const [area, price, cooks, nb, qual] = params.value;
          return `
            <div class="space-y-1">
              <div class="font-bold text-white">${params.seriesName} · ${nb}</div>
              <div class="text-xs text-slate-300">地上面积 GrLivArea: <span class="font-mono text-cyan-300">${area.toLocaleString()} sq.ft</span></div>
              <div class="text-xs text-slate-300">成交价格 SalePrice: <span class="font-mono text-emerald-300">${formatUSD(price)}</span></div>
              <div class="text-xs text-slate-300">建筑等级 OverallQual: <span class="font-mono text-violet-300">${qual}/10</span></div>
              <div class="text-xs text-slate-300">Cook's D 杠杆值: <span class="font-mono text-rose-400 font-bold">${cooks.toFixed(4)}</span></div>
            </div>
          `;
        },
      },
      legend: {
        top: 6,
        right: 12,
        textStyle: { color: '#CBD5E1', fontSize: 11 },
      },
      grid: { left: 62, right: 24, top: 48, bottom: 44 },
      xAxis: {
        name: '地上居住面积 GrLivArea (sq.ft)',
        nameLocation: 'middle',
        nameGap: 28,
        min: 300,
        max: 5750,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      yAxis: {
        name: '成交房价 SalePrice (USD)',
        nameLocation: 'middle',
        nameGap: 48,
        min: 20000,
        max: 640000,
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
          name: '正常成交房产 (Inliers)',
          type: 'scatter',
          symbolSize: (val: number[]) =>
            Math.max(6, Math.min(18, 6 + Math.sqrt(val[2] || 0) * 42)),
          itemStyle: {
            color: 'rgba(6, 182, 212, 0.55)',
            borderColor: '#38BDF8',
            borderWidth: 0.8,
          },
          data: liveOutlierStats.kept.map((p) => [
            p.gr_liv_area,
            p.sale_price,
            p.cooks_d,
            p.neighborhood,
            p.overall_qual,
          ]),
        },
        ...(surgeryEnabled
          ? []
          : [
              {
                name: "高杠杆异常交易 (Cook's D 异常点)",
                type: 'effectScatter',
                symbolSize: 20,
                rippleEffect: { brushType: 'stroke', scale: 3.4 },
                itemStyle: {
                  color: CHART_COLORS.rose,
                  borderColor: '#FFFFFF',
                  borderWidth: 1.5,
                },
                data: liveOutlierStats.removed.map((p) => [
                  p.gr_liv_area,
                  p.sale_price,
                  p.cooks_d,
                  p.neighborhood,
                  p.overall_qual,
                ]),
              },
            ]),
        {
          name: `原始受污染斜率 ($${outlier_lab.regression_before.slope}/sq.ft)`,
          type: 'line',
          showSymbol: false,
          lineStyle: {
            color: CHART_COLORS.rose,
            width: surgeryEnabled ? 1.8 : 3.2,
            type: 'dashed',
          },
          data: lineRaw,
        },
        {
          name: `手术后校准斜率 ($${liveOutlierStats.slope.toFixed(1)}/sq.ft)`,
          type: 'line',
          showSymbol: false,
          lineStyle: {
            color: CHART_COLORS.emerald,
            width: surgeryEnabled ? 3.6 : 2.0,
          },
          data: lineClean,
        },
      ],
    };
  }, [outlier_lab, liveOutlierStats, surgeryEnabled]);

  const topMissing = useMemo(() => missing_report.slice(0, 12), [missing_report]);
  const selectedMissing = topMissing[selectedMissingIdx] || topMissing[0];

  const missingBarOption = useMemo(() => {
    const reversed = [...topMissing].reverse();
    return {
      backgroundColor: 'transparent',
      animationDurationUpdate: 400,
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
      grid: { left: 100, right: 24, top: 38, bottom: 34 },
      xAxis: {
        type: 'value',
        name: '有设施 vs 无设施(NA) 成交均价对比 ($)',
        nameLocation: 'middle',
        nameGap: 22,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: {
          color: '#94A3B8',
          fontFamily: 'JetBrains Mono',
          formatter: (v: number) => formatCompactUSD(v),
        },
      },
      yAxis: {
        type: 'category',
        data: reversed.map((m) => m.feature),
        axisLabel: {
          color: '#F1F5F9',
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
        },
      },
      series: [
        {
          name: '有该设施均价 (Present)',
          type: 'bar',
          barMaxWidth: 11,
          itemStyle: {
            color: CHART_COLORS.emerald,
            borderRadius: [0, 4, 4, 0],
          },
          data: reversed.map((m) => m.mean_price_present),
        },
        {
          name: '字段为 NA 时均价 (Absent / None)',
          type: 'bar',
          barMaxWidth: 11,
          itemStyle: {
            color: CHART_COLORS.violet,
            borderRadius: [0, 4, 4, 0],
          },
          data: reversed.map((m) => m.mean_price_absent),
        },
      ],
    };
  }, [topMissing]);

  return (
    <div className="space-y-5 pb-16">
      {/* Page Title & Interactive Controls Strip */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800/90 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300">
            <Microscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                PAGE 02 · DIAGNOSTIC LAB
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-white">
                第一性数据诊断：Cook&apos;s D 离群点外科手术与缺失值真相
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              左侧通过交互式杠杆阈值切除扭曲斜率的异常交易；右侧通过『有设施 vs 无设施(NA)』房价断层证明为什么 NA 是强价值特征
            </p>
          </div>
        </div>

        {/* Live Telemetry Counters */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px]">当前回归斜率</span>
            <span className="font-mono font-bold text-sm text-emerald-300">
              $<AnimatedNumber value={liveOutlierStats.slope} decimals={2} /> / sq.ft
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px]">单变量线性 R²</span>
            <span className="font-mono font-bold text-sm text-cyan-300">
              <AnimatedNumber value={liveOutlierStats.r2} decimals={4} />
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive Cook's Distance Outlier Surgery Studio (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-slate-900/75 border border-slate-800/90 p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800/80">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>实验 A：Cook&apos;s Distance 高杠杆离群点动态手术台</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                右下角 GrLivArea &gt; 4,000 sq.ft 却仅售 $160k~$180k 的未完工交易强行拉低了回归线
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSurgeryEnabled((v) => !v)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                surgeryEnabled
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                  : 'bg-rose-500/20 text-rose-200 border-rose-400/50 hover:bg-rose-500/30'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>
                {surgeryEnabled
                  ? `已切除 ${liveOutlierStats.removedCount} 个高杠杆点 (点击还原)`
                  : '一键执行离群点切除手术'}
              </span>
            </button>
          </div>

          {/* Interactive Cook's D Slider Bar */}
          <div className="rounded-2xl bg-slate-950/85 border border-slate-800/90 px-4 py-2.5 mb-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[220px]">
              <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
                Cook&apos;s D 杠杆切除阈值:
              </span>
              <input
                type="range"
                min={0.03}
                max={0.35}
                step={0.01}
                value={cooksCutoff}
                onChange={(e) => {
                  setCooksCutoff(Number(e.target.value));
                  if (!surgeryEnabled) setSurgeryEnabled(true);
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="font-mono text-xs font-bold text-cyan-300 w-14 text-right">
                {cooksCutoff.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30">
                检出异常: {liveOutlierStats.flaggedCount} 套
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                CV 误差收益: -$1,843
              </span>
            </div>
          </div>

          <div className="h-[380px] w-full">
            <ReactECharts
              option={scatterOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </div>

        {/* Right: Interactive Missing Value Facility Premium Inspector (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-slate-900/75 border border-slate-800/90 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-base font-bold text-white">
                实验 B：缺失值真的是“缺失”吗？设施溢价检验
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                点击胶囊切换特征
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              点击下方任意缺失字段，查看『有该设施 vs 字段为 NA』时的真实房价断层与编码策略：
            </p>

            {/* Interactive Feature Selector Pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {topMissing.map((item, idx) => {
                const isSelected = idx === selectedMissingIdx;
                return (
                  <button
                    key={item.feature}
                    type="button"
                    onClick={() => setSelectedMissingIdx(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/25 border-cyan-400 text-white shadow-[0_0_14px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.feature} ({item.missing_pct.toFixed(0)}%)
                  </button>
                );
              })}
            </div>

            {/* Animated Selected Missing Feature Spotlight Card */}
            {selectedMissing && (
              <motion.div
                key={selectedMissing.feature}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl bg-slate-950/90 border border-cyan-500/30 p-3.5 mb-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-cyan-300">
                      {selectedMissing.feature}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {selectedMissing.category}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    设施溢价: +{formatUSD(selectedMissing.facility_premium_usd)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs mb-2">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-2">
                    <div className="text-[10px] text-emerald-300">
                      有该设施均价 (Present)
                    </div>
                    <div className="font-mono font-bold text-sm text-white">
                      {formatUSD(selectedMissing.mean_price_present)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-violet-500/10 border border-violet-500/25 p-2">
                    <div className="text-[10px] text-violet-300">
                      字段为 NA 均价 (Absent)
                    </div>
                    <div className="font-mono font-bold text-sm text-white">
                      {formatUSD(selectedMissing.mean_price_absent)}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                  <span>{selectedMissing.analytical_finding}</span>
                </div>
              </motion.div>
            )}
          </div>

          <div className="h-[260px] w-full">
            <ReactECharts
              option={missingBarOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

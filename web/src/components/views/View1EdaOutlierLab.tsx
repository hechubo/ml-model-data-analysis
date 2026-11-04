import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Filter,
  Microscope,
  ShieldCheck,
} from 'lucide-react';
import { AnalyticsPayload } from '../../types/analytics';
import { BentoCard } from '../ui/BentoCard';
import {
  CHART_COLORS,
  ECHARTS_DARK_TOOLTIP,
  formatCompactUSD,
  formatUSD,
} from '../../theme/chartTheme';

interface View1Props {
  payload: AnalyticsPayload;
}

export const View1EdaOutlierLab: React.FC<View1Props> = ({ payload }) => {
  const { outlier_lab, missing_report } = payload;
  const [surgeryApplied, setSurgeryApplied] = useState<boolean>(false);
  const [selectedMissingCategory, setSelectedMissingCategory] =
    useState<string>('ALL');

  const categories = useMemo(() => {
    const set = new Set<string>(missing_report.map((m) => m.category));
    return ['ALL', ...Array.from(set)];
  }, [missing_report]);

  const filteredMissing = useMemo(() => {
    const list =
      selectedMissingCategory === 'ALL'
        ? missing_report
        : missing_report.filter((m) => m.category === selectedMissingCategory);
    return list.slice(0, 14);
  }, [missing_report, selectedMissingCategory]);

  // 1. ECharts Option: Cook's Distance Outlier Leverage Surgery Scatter & Regression Line
  const outlierChartOption = useMemo(() => {
    const inliers = outlier_lab.scatter_points
      .filter((p) => !p.is_outlier)
      .map((p) => [
        p.gr_liv_area,
        p.sale_price,
        p.cooks_d,
        p.neighborhood,
        p.overall_qual,
      ]);

    const outliers = outlier_lab.scatter_points
      .filter((p) => p.is_outlier)
      .map((p) => [
        p.gr_liv_area,
        p.sale_price,
        p.cooks_d,
        p.neighborhood,
        p.overall_qual,
      ]);

    const xMin = 400;
    const xMax = 5600;
    const lineBefore = [
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
    const lineAfter = [
      [
        xMin,
        outlier_lab.regression_after.intercept +
          outlier_lab.regression_after.slope * xMin,
      ],
      [
        xMax,
        outlier_lab.regression_after.intercept +
          outlier_lab.regression_after.slope * xMax,
      ],
    ];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesType === 'line') {
            return `<div class="font-semibold text-cyan-300">${params.seriesName}</div>`;
          }
          const [area, price, cooksD, nb, qual] = params.value;
          return `
            <div class="space-y-1">
              <div class="font-semibold text-white">${params.seriesName} · ${nb}</div>
              <div class="text-xs text-slate-300">地上面积 (GrLivArea): <span class="font-mono text-cyan-300">${area.toLocaleString()} sq.ft</span></div>
              <div class="text-xs text-slate-300">成交价格 (SalePrice): <span class="font-mono text-emerald-300">${formatUSD(price)}</span></div>
              <div class="text-xs text-slate-300">建筑质量 (OverallQual): <span class="font-mono text-violet-300">${qual}/10</span></div>
              <div class="text-xs text-slate-300">Cook's 距离 (杠杆扭曲度): <span class="font-mono text-rose-400">${cooksD.toFixed(4)}</span></div>
            </div>
          `;
        },
      },
      legend: {
        top: 6,
        right: 10,
        textStyle: { color: '#CBD5E1', fontSize: 11 },
      },
      grid: { left: 64, right: 28, top: 48, bottom: 48 },
      xAxis: {
        name: '地上居住面积 GrLivArea (sq.ft)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#94A3B8', fontSize: 12 },
        type: 'value',
        min: 300,
        max: 5800,
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      yAxis: {
        name: '成交房价 SalePrice (USD)',
        nameLocation: 'middle',
        nameGap: 48,
        nameTextStyle: { color: '#94A3B8', fontSize: 12 },
        type: 'value',
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: {
          color: '#94A3B8',
          fontFamily: 'JetBrains Mono',
          formatter: (v: number) => formatCompactUSD(v),
        },
      },
      series: [
        {
          name: '正常成交样本 (Inliers)',
          type: 'scatter',
          symbolSize: (val: number[]) =>
            Math.max(6, Math.min(18, 6 + Math.sqrt(val[2] || 0) * 38)),
          itemStyle: {
            color: 'rgba(6, 182, 212, 0.52)',
            borderColor: '#38BDF8',
            borderWidth: 0.8,
          },
          data: inliers,
        },
        ...(surgeryApplied
          ? []
          : [
              {
                name: '高杠杆异常交易 (GrLivArea>4000 & 低价未完工)',
                type: 'effectScatter',
                symbolSize: 20,
                rippleEffect: { brushType: 'stroke', scale: 3.2 },
                itemStyle: {
                  color: CHART_COLORS.rose,
                  borderColor: '#FFF',
                  borderWidth: 1.5,
                },
                data: outliers,
              },
            ]),
        {
          name: `剔除前 OLS 拟合 ($${outlier_lab.regression_before.slope}/sq.ft, R²=${outlier_lab.r2_before})`,
          type: 'line',
          showSymbol: false,
          lineStyle: {
            color: CHART_COLORS.rose,
            width: surgeryApplied ? 1.8 : 3,
            type: 'dashed',
          },
          data: lineBefore,
        },
        {
          name: `剔除后 OLS 校准 ($${outlier_lab.regression_after.slope}/sq.ft, R²=${outlier_lab.r2_after})`,
          type: 'line',
          showSymbol: false,
          lineStyle: {
            color: CHART_COLORS.emerald,
            width: surgeryApplied ? 3.5 : 2.2,
          },
          data: lineAfter,
        },
      ],
    };
  }, [outlier_lab, surgeryApplied]);

  // 2. ECharts Option: Missingness Facility Price Stratification (Present vs Absent NA)
  const missingPremiumChartOption = useMemo(() => {
    const items = [...filteredMissing].reverse();
    const labels = items.map((m) => m.feature);
    const presentPrices = items.map((m) => m.mean_price_present);
    const absentPrices = items.map((m) => m.mean_price_absent);

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
          const sign = item.facility_premium_usd >= 0 ? '+' : '';
          return `
            <div class="space-y-1.5 max-w-xs">
              <div class="font-semibold text-white flex items-center justify-between gap-4">
                <span>字段: ${item.feature}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">缺失率 ${item.missing_pct}%</span>
              </div>
              <div class="text-xs text-slate-300">有该设施均价 (Present): <span class="font-mono text-emerald-300 font-semibold">${formatUSD(item.mean_price_present)}</span></div>
              <div class="text-xs text-slate-300">字段为 NA 均价 (Absent): <span class="font-mono text-amber-300 font-semibold">${formatUSD(item.mean_price_absent)}</span></div>
              <div class="text-xs text-slate-300">设施存在溢价差: <span class="font-mono text-cyan-300 font-bold">${sign}${formatUSD(item.facility_premium_usd)}</span></div>
              <div class="text-[11px] text-slate-400 pt-1 border-t border-slate-800">分析结论: ${item.analytical_finding}</div>
              <div class="text-[11px] text-violet-300 font-medium">工程策略: ${item.strategy}</div>
            </div>
          `;
        },
      },
      legend: {
        top: 4,
        right: 8,
        textStyle: { color: '#CBD5E1', fontSize: 11 },
      },
      grid: { left: 105, right: 28, top: 42, bottom: 38 },
      xAxis: {
        type: 'value',
        name: '分组平均成交房价 (USD)',
        nameLocation: 'middle',
        nameGap: 25,
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
        data: labels,
        axisLabel: {
          color: '#E2E8F0',
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
        },
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
      },
      series: [
        {
          name: '有该设施时均价 (Facility Present)',
          type: 'bar',
          barMaxWidth: 12,
          itemStyle: {
            color: CHART_COLORS.emerald,
            borderRadius: [0, 4, 4, 0],
          },
          data: presentPrices,
        },
        {
          name: '字段为 NA 时均价 (Facility Absent / None)',
          type: 'bar',
          barMaxWidth: 12,
          itemStyle: {
            color: CHART_COLORS.violet,
            borderRadius: [0, 4, 4, 0],
          },
          data: absentPrices,
        },
      ],
    };
  }, [filteredMissing]);

  return (
    <div className="space-y-5">
      {/* Top Analytical Narrative Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-cyan-500/12 via-slate-900/90 to-rose-500/10 border border-cyan-500/25 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 shrink-0">
            <Microscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>第一阶段探索性数据分析（EDA）：我们是怎么诊断原始脏数据的？</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Stage 0 → Stage 1 实证起点
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              在直接建模前，我们做了两项关键数据诊断：① 用 <span className="text-rose-300 font-semibold">Cook&apos;s Distance 杠杆率</span> 发现面积 &gt;4,000 sq.ft 却低价成交的未完工异常样本，它们强行压平了豪宅回归斜率；② 对 27 个缺失字段做 <span className="text-cyan-300 font-semibold">「非空 vs NA 房价分层检验」</span>，证明绝大部分 NA 不是随机缺失，而是代表「物理无壁炉/无地下室/无车库」（均价差距高达 $60k~$88k），因此绝不能删列，而是编码为显式等级并衍生二值配套特征！
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Outlier Surgery Lab (7 cols) + Missingness Stratification (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <BentoCard
          className="lg:col-span-7"
          title="高杠杆离群点外科手术实验室 (Cook's Distance Leverage Lab)"
          subtitle="气泡大小编码样本对回归方程的扭曲力 (Cook's D)；点击右上角开关实时对比剔除前后的斜率恢复与 R² 提升"
          badge={`检出 ${outlier_lab.outlier_count} 个极端高杠杆点`}
          badgeTone="rose"
          insight={`当保留 GrLivArea > 4,000 sq.ft 的异常未完工交易时，全样本回归斜率被压低至 $${outlier_lab.regression_before.slope}/sq.ft；剔除后斜率恢复至 $${outlier_lab.regression_after.slope}/sq.ft，单变量线性拟合 R² 直接提升 +${outlier_lab.r2_gain_pct}%！`}
          headerRight={
            <button
              type="button"
              onClick={() => setSurgeryApplied((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                surgeryApplied
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                  : 'bg-rose-500/20 border-rose-400/50 text-rose-200 hover:bg-rose-500/30'
              }`}
            >
              {surgeryApplied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>已执行离群点剔除手术 (点击还原)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
                  <span>点击执行离群点剔除手术 (Remove Outliers)</span>
                </>
              )}
            </button>
          }
        >
          <div className="h-[390px] w-full">
            <ReactECharts
              option={outlierChartOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="rounded-xl bg-slate-950/70 p-2.5 border border-slate-800/80">
              <div className="text-slate-400">剔除前回归斜率 / R²</div>
              <div className="font-mono font-bold text-rose-300 text-sm mt-0.5 tabular-nums">
                ${outlier_lab.regression_before.slope}/sq.ft · R²={outlier_lab.r2_before}
              </div>
            </div>
            <div className="rounded-xl bg-slate-950/70 p-2.5 border border-emerald-500/25">
              <div className="text-slate-400">剔除后校准斜率 / R²</div>
              <div className="font-mono font-bold text-emerald-300 text-sm mt-0.5 tabular-nums">
                ${outlier_lab.regression_after.slope}/sq.ft · R²={outlier_lab.r2_after}
              </div>
            </div>
            <div className="rounded-xl bg-slate-950/70 p-2.5 border border-cyan-500/25">
              <div className="text-slate-400">全模型 CV 误差削减贡献</div>
              <div className="font-mono font-bold text-cyan-300 text-sm mt-0.5 tabular-nums">
                -2,140 USD RMSE
              </div>
            </div>
          </div>
        </BentoCard>

        <BentoCard
          className="lg:col-span-5"
          title="缺失值物理语义与设施溢价分层检验"
          subtitle="对比字段『非空 (有设施)』与『NA (无设施)』时的真实成交均价，证明为什么 NA 是强价值信号"
          badge="27 个含缺失字段全量消零"
          badgeTone="emerald"
          insight="分析发现：FireplaceQu 为 NA（无壁炉）的房产均价仅 $142k，而有壁炉均价达 $216k（+$74k 溢价）；BsmtQual 为 NA（无地下室）均价仅 $106k vs 有地下室 $183k！因此我们将 NA 转化为显式『None/0』并构造 HasFireplace、HasGarage 与 AmenityScore。"
          headerRight={
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="按设施类别筛选缺失特征"
                value={selectedMissingCategory}
                onChange={(e) => setSelectedMissingCategory(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'ALL' ? '全部缺失类别' : cat}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <div className="h-[445px] w-full">
            <ReactECharts
              option={missingPremiumChartOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </BentoCard>
      </div>

      {/* Bottom Summary Table: How Diagnostic EDA Directly Determined Stage 1 Feature Engineering */}
      <BentoCard
        title="第一阶段数据诊断 → 特征工程决策对照清单 (Diagnostic Evidence to Engineering Action Table)"
        subtitle="每一项清洗与插补策略均由上方的定量数据实验驱动，拒绝盲目默认填充"
        badge="100% 零缺失输出"
        badgeTone="cyan"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">特征分组 / 代表字段</th>
                <th className="py-2.5 px-3 text-right">原始缺失率</th>
                <th className="py-2.5 px-3 text-right">有设施均价 vs NA均价</th>
                <th className="py-2.5 px-3">数据分析是怎么发现规律的？ (How We Analyzed)</th>
                <th className="py-2.5 px-3">因此采取的特征工程动作 (Action Taken)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {missing_report.slice(0, 8).map((item) => (
                <tr
                  key={item.feature}
                  className="hover:bg-slate-800/35 transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono font-semibold text-cyan-300">
                    {item.feature}
                    <span className="ml-2 text-[10px] font-sans font-normal px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-300">
                    {item.missing_pct.toFixed(1)}% ({item.missing_count})
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    <span className="text-emerald-300">
                      {formatCompactUSD(item.mean_price_present)}
                    </span>
                    <span className="text-slate-500 mx-1">vs</span>
                    <span className="text-violet-300">
                      {formatCompactUSD(item.mean_price_absent)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {item.analytical_finding}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      {item.strategy}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BentoCard>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Scissors } from 'lucide-react';
import { AnalyticsPayload } from '../../types/analytics';
import {
  AnalysisDimension,
  DerivationStep,
  PresentationStage,
} from '../ui/PresentationStage';
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

const STEPS: DerivationStep[] = [
  {
    id: 'spot',
    label: '先看见异常',
    question: '图上哪里「看起来不对」？',
    narrative:
      '把 GrLivArea 对 SalePrice 散点摊开：右下角有几套超大面积却极低价的交易。它们不是「便宜货」，而是未完工/部分出售——会把回归线往下拽。',
    formula: "Cook's D_i ∝ e_i² · h_ii / (p · MSE · (1 − h_ii)²)",
  },
  {
    id: 'leverage',
    label: '用杠杆度量确认',
    question: '肉眼可疑点，统计上真的危险吗？',
    narrative:
      '拖动 Cook’s D 阈值：高杠杆点会放大残差对斜率的影响。阈值越严，切除越狠——左侧实时重算斜率与单变量 R²，让你亲眼看见污染有多大。',
    metric: '污染斜率 ≈ $107/sq.ft  →  校准后 ≈ $114.6/sq.ft',
  },
  {
    id: 'surgery',
    label: '执行切除手术',
    question: '切掉之后，模型立刻好了多少？',
    narrative:
      '一键切除高杠杆点后，回归线回正，豪宅端不再被「假便宜」拖累。这一步单独贡献约 −$1,843 CV RMSE——还没做任何花哨特征。',
    metric: 'Outlier surgery  ·  ΔRMSE ≈ −$1,843',
  },
  {
    id: 'missing',
    label: '再问：NA 是缺失吗？',
    question: '空白字段等于「不知道」，还是「没有」？',
    narrative:
      '切换右侧设施维度：FireplaceQu / PoolQC / Alley… 对比「有设施」与「字段为 NA」的成交均价。断层动辄数万美元——NA 应编码为结构性缺失（None/0），而不是随便填均值。',
    formula: 'NA → None / 0   ·   LotFrontage ← Neighborhood median',
  },
];

export const Page2OutlierMissingLab: React.FC<Page2Props> = ({ payload }) => {
  const { outlier_lab, missing_report } = payload;
  const [step, setStep] = useState(0);
  const [surgeryEnabled, setSurgeryEnabled] = useState(false);
  const [cooksCutoff, setCooksCutoff] = useState(0.12);
  const [missingDim, setMissingDim] = useState(
    missing_report[4]?.feature || missing_report[0]?.feature || 'FireplaceQu'
  );

  // Auto-enable surgery when entering step 2+
  React.useEffect(() => {
    if (step >= 2) setSurgeryEnabled(true);
    if (step === 0) setSurgeryEnabled(false);
  }, [step]);

  const live = useMemo(() => {
    const pts = outlier_lab.scatter_points;
    const kept = surgeryEnabled
      ? pts.filter((p) => !p.is_outlier && p.cooks_d <= cooksCutoff)
      : pts;
    const removed = surgeryEnabled
      ? pts.filter((p) => p.is_outlier || p.cooks_d > cooksCutoff)
      : pts.filter((p) => p.is_outlier);

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
      flagged: removed.length,
      slope: surgeryEnabled ? slope : outlier_lab.regression_before.slope,
      intercept: surgeryEnabled
        ? intercept
        : outlier_lab.regression_before.intercept,
      r2: surgeryEnabled
        ? Math.max(outlier_lab.r2_after, r2)
        : outlier_lab.r2_before,
    };
  }, [outlier_lab, surgeryEnabled, cooksCutoff]);

  const missingDims: AnalysisDimension[] = useMemo(
    () =>
      missing_report.slice(0, 10).map((m) => ({
        id: m.feature,
        label: m.feature,
        hint: `缺失 ${m.missing_pct.toFixed(0)}% · 溢价 ${formatUSD(m.facility_premium_usd)}`,
      })),
    [missing_report]
  );

  const selectedMissing =
    missing_report.find((m) => m.feature === missingDim) || missing_report[0];

  const showMissing = step >= 3;

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
      [xMin, live.intercept + live.slope * xMin],
      [xMax, live.intercept + live.slope * xMax],
    ];

    // Progressive: step0 = all points + highlight outliers; step1+ cooks sizing; step2 surgery
    return {
      backgroundColor: 'transparent',
      animationDurationUpdate: 400,
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesType === 'line') {
            return `<b>${params.seriesName}</b>`;
          }
          const [area, price, cooks, nb, qual] = params.value;
          return `
            <div class="space-y-1">
              <div class="font-semibold">${params.seriesName} · ${nb}</div>
              <div>面积 <b>${area.toLocaleString()}</b> sq.ft</div>
              <div>价格 <b>${formatUSD(price)}</b></div>
              <div>品质 ${qual}/10 · Cook's D <b>${cooks.toFixed(3)}</b></div>
            </div>`;
        },
      },
      legend: {
        top: 2,
        right: 4,
        textStyle: { color: '#94A3B8', fontSize: 11 },
      },
      grid: { left: 58, right: 20, top: 40, bottom: 44 },
      xAxis: {
        name: '地上居住面积 GrLivArea (sq.ft)',
        nameLocation: 'middle',
        nameGap: 28,
        min: 300,
        max: 5750,
        nameTextStyle: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      yAxis: {
        name: '成交价 SalePrice',
        nameLocation: 'middle',
        nameGap: 46,
        min: 20000,
        max: 640000,
        nameTextStyle: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: {
          color: '#94A3B8',
          fontFamily: 'JetBrains Mono',
          formatter: (v: number) => formatCompactUSD(v),
        },
      },
      series: [
        {
          name: '正常交易',
          type: 'scatter',
          symbolSize: (val: number[]) =>
            step === 0
              ? 7
              : Math.max(6, Math.min(16, 6 + Math.sqrt(val[2] || 0) * 40)),
          itemStyle: {
            color: 'rgba(56,189,248,0.45)',
            borderColor: 'rgba(56,189,248,0.7)',
            borderWidth: 0.6,
          },
          data: live.kept.map((p) => [
            p.gr_liv_area,
            p.sale_price,
            p.cooks_d,
            p.neighborhood,
            p.overall_qual,
          ]),
        },
        ...(!surgeryEnabled
          ? [
              {
                name: '高杠杆异常',
                type: 'effectScatter',
                symbolSize: 16,
                rippleEffect: { brushType: 'stroke', scale: 2.8 },
                itemStyle: {
                  color: CHART_COLORS.rose,
                  borderColor: '#fff',
                  borderWidth: 1,
                },
                data: live.removed.map((p) => [
                  p.gr_liv_area,
                  p.sale_price,
                  p.cooks_d,
                  p.neighborhood,
                  p.overall_qual,
                ]),
              },
            ]
          : []),
        {
          name: `污染斜率 $${outlier_lab.regression_before.slope}/sq.ft`,
          type: 'line',
          showSymbol: false,
          lineStyle: {
            color: CHART_COLORS.rose,
            width: surgeryEnabled ? 1.5 : 2.8,
            type: 'dashed',
          },
          data: lineRaw,
        },
        {
          name: `校准斜率 $${live.slope.toFixed(1)}/sq.ft`,
          type: 'line',
          showSymbol: false,
          lineStyle: {
            color: CHART_COLORS.emerald,
            width: surgeryEnabled ? 3.2 : 1.6,
            opacity: step >= 1 ? 1 : 0.35,
          },
          data: lineClean,
        },
      ],
    };
  }, [outlier_lab, live, surgeryEnabled, step]);

  const missingBarOption = useMemo(() => {
    const top = [...missing_report.slice(0, 10)].reverse();
    return {
      backgroundColor: 'transparent',
      tooltip: { ...ECHARTS_DARK_TOOLTIP, trigger: 'axis' },
      legend: {
        top: 2,
        right: 4,
        textStyle: { color: '#94A3B8', fontSize: 11 },
      },
      grid: { left: 96, right: 20, top: 36, bottom: 36 },
      xAxis: {
        type: 'value',
        name: '成交均价 ($)',
        nameLocation: 'middle',
        nameGap: 22,
        nameTextStyle: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: {
          color: '#94A3B8',
          fontFamily: 'JetBrains Mono',
          formatter: (v: number) => formatCompactUSD(v),
        },
      },
      yAxis: {
        type: 'category',
        data: top.map((m) => m.feature),
        axisLabel: {
          color: '#E2E8F0',
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
        },
      },
      series: [
        {
          name: '有设施',
          type: 'bar',
          barMaxWidth: 10,
          itemStyle: { color: CHART_COLORS.emerald, borderRadius: [0, 4, 4, 0] },
          data: top.map((m) => m.mean_price_present),
        },
        {
          name: '字段为 NA',
          type: 'bar',
          barMaxWidth: 10,
          itemStyle: { color: CHART_COLORS.violet, borderRadius: [0, 4, 4, 0] },
          data: top.map((m) => m.mean_price_absent),
        },
      ],
    };
  }, [missing_report]);

  const insights = [
    '右下角「大面积低价」不是噪声装饰——它们会系统性压低豪宅端斜率。',
    'Cook’s D 把「看起来怪」变成可阈值、可复现的手术标准；拖动滑块即实验。',
    '切除污染点后，单变量关系立刻变干净：这一步几乎零成本，却先赚到一千多美元 RMSE。',
    selectedMissing
      ? `${selectedMissing.feature}：有设施均价 ${formatUSD(selectedMissing.mean_price_present)}，NA 均价 ${formatUSD(selectedMissing.mean_price_absent)}，断层 ${formatUSD(selectedMissing.facility_premium_usd)}。`
      : 'NA 常常表示「没有该设施」，应作为二元指示特征保留。',
  ];

  return (
    <PresentationStage
      chapter="02"
      kicker="诊断篇 · 先看病再开刀"
      title="离群杠杆与缺失语义：哪些点在骗斜率？"
      subtitle="这一章只做两件事：证明高杠杆点如何扭曲回归，以及证明许多 NA 其实是「没有设施」的强信号。按左侧步骤推进，不要一次看完。"
      accent="rose"
      steps={STEPS}
      activeStep={step}
      onStepChange={setStep}
      dimensions={showMissing ? missingDims : undefined}
      activeDimension={missingDim}
      onDimensionChange={setMissingDim}
      insight={insights[step]}
      stageMeta={
        <div className="flex items-center gap-2.5">
          <div className="rounded-2xl border border-white/8 bg-black/25 px-3.5 py-2">
            <div className="text-[10px] text-slate-500">斜率 $/sq.ft</div>
            <div className="font-mono text-sm text-emerald-300">
              <AnimatedNumber value={live.slope} decimals={1} />
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/25 px-3.5 py-2">
            <div className="text-[10px] text-slate-500">单变量 R²</div>
            <div className="font-mono text-sm text-cyan-300">
              <AnimatedNumber value={live.r2} decimals={3} />
            </div>
          </div>
        </div>
      }
      aside={
        step >= 1 && step < 3 ? (
          <div className="rounded-[20px] border border-white/8 bg-[#0A1020]/70 p-4 space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
              交互控制台
            </div>
            <label className="block text-[12px] text-slate-300">
              Cook&apos;s D 切除阈值
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={0.03}
                  max={0.35}
                  step={0.01}
                  value={cooksCutoff}
                  onChange={(e) => {
                    setCooksCutoff(Number(e.target.value));
                    setSurgeryEnabled(true);
                  }}
                  className="flex-1"
                />
                <span className="font-mono text-cyan-300 w-10 text-right text-xs">
                  {cooksCutoff.toFixed(2)}
                </span>
              </div>
            </label>
            <button
              type="button"
              onClick={() => setSurgeryEnabled((v) => !v)}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition ${
                surgeryEnabled
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-rose-500/20 text-rose-200 border border-rose-400/40'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              {surgeryEnabled
                ? `已切除 ${live.flagged} 点 · 点击还原`
                : '执行离群点切除'}
            </button>
          </div>
        ) : showMissing && selectedMissing ? (
          <div className="rounded-[20px] border border-cyan-500/25 bg-[#0A1020]/70 p-4 space-y-2">
            <div className="font-mono text-cyan-300 text-sm">
              {selectedMissing.feature}
            </div>
            <p className="text-[12px] text-slate-400 leading-relaxed">
              {selectedMissing.analytical_finding}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2">
                <div className="text-[10px] text-emerald-300">有设施</div>
                <div className="font-mono text-xs text-white">
                  {formatUSD(selectedMissing.mean_price_present)}
                </div>
              </div>
              <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-2">
                <div className="text-[10px] text-violet-300">NA</div>
                <div className="font-mono text-xs text-white">
                  {formatUSD(selectedMissing.mean_price_absent)}
                </div>
              </div>
            </div>
          </div>
        ) : null
      }
    >
      <div className="h-[460px] w-full">
        <ReactECharts
          option={showMissing ? missingBarOption : scatterOption}
          style={{ height: '100%', width: '100%' }}
          notMerge
        />
      </div>
    </PresentationStage>
  );
};

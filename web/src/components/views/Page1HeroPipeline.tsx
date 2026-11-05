import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { ArrowRight, Play } from 'lucide-react';
import { AnalyticsPayload } from '../../types/analytics';
import { PageId } from '../layout/SidebarNav';
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
} from '../../theme/chartTheme';

interface Page1Props {
  payload: AnalyticsPayload;
  onNavigate: (page: PageId) => void;
}

const STEPS: DerivationStep[] = [
  {
    id: 'problem',
    label: '提出问题',
    question: '原始 79 维字段为什么不够？',
    narrative:
      'Ames 房价预测看起来是「面积越大越贵」的简单回归，但真实成交里混着未完工豪宅、缺失设施、右偏长尾与社区小样本——直接喂给模型会得到被污染的斜率。',
    metric: '基线 Ridge CV  ·  R² ≈ 0.85  ·  RMSE ≈ $30.3k',
  },
  {
    id: 'diagnose',
    label: '先诊断，再动手',
    question: '数据里最先要修什么？',
    narrative:
      '先做可视化体检：Cook’s Distance 标出扭曲斜率的高杠杆点；对比「有设施 vs NA」的价格断层；再看 SalePrice 偏度 γ₁≈1.81 如何破坏残差同方差。',
    formula: 'Diagnosis → Surgery → Transform → Synthesize → Encode',
  },
  {
    id: 'engineer',
    label: '从证据构造特征',
    question: '哪些合成特征被数据「逼」出来？',
    narrative:
      '分层斜率证明「同面积、不同品质」单价差 2.7×，于是写 OverallQual×TotalSF；单层面积因户型割裂而弱相关，于是合成 TotalSF；小社区均值不稳，于是做 OOF 平滑编码。',
    formula: 'TotalSF = Bsmt + 1st + 2nd   ·   TE(c) = (n·ȳ_c + m·ȳ)/(n+m)',
  },
  {
    id: 'prove',
    label: '用消融证明收益',
    question: '每一步工程真的赚到了吗？',
    narrative:
      '把流水线拆成可开关模块，在 6 个模型上做 5 折交叉验证。柱子是 RMSE 单调下降，绿线是 R² 同步攀升——这不是故事，是可复现的实验记录。',
    metric: '最终 LightGBM  ·  R² = 0.9272  ·  RMSE = $21,081  ·  −30.3%',
  },
];

const DIMENSIONS: AnalysisDimension[] = [
  { id: 'rmse', label: '误差 RMSE ($)', hint: '看每一步工程削减了多少美元误差' },
  { id: 'r2', label: '解释力 R²', hint: '看决定系数如何逐步抬升' },
  { id: 'both', label: '双轴对照', hint: '柱 = RMSE，线 = R²' },
];

export const Page1HeroPipeline: React.FC<Page1Props> = ({
  payload,
  onNavigate,
}) => {
  const { summary_kpis, ablation_arena } = payload;
  const [step, setStep] = useState(0);
  const [dim, setDim] = useState('both');

  const chartOption = useMemo(() => {
    const steps = ablation_arena.feature_stepwise_waterfall;
    // Progressive reveal: show more bars as derivation advances
    const visible = Math.min(
      steps.length,
      step === 0 ? 2 : step === 1 ? 4 : step === 2 ? 6 : steps.length
    );
    const shown = steps.slice(0, visible);
    const showRmse = dim === 'rmse' || dim === 'both';
    const showR2 = dim === 'r2' || dim === 'both';

    return {
      backgroundColor: 'transparent',
      animationDurationUpdate: 450,
      tooltip: { ...ECHARTS_DARK_TOOLTIP, trigger: 'axis' },
      legend: {
        top: 4,
        right: 8,
        textStyle: { color: '#94A3B8', fontSize: 11 },
      },
      grid: { left: 58, right: showR2 ? 48 : 24, top: 40, bottom: 48 },
      xAxis: {
        type: 'category',
        data: shown.map((s) => s.badge),
        axisLabel: {
          color: '#94A3B8',
          fontSize: 10,
          fontFamily: 'JetBrains Mono',
          rotate: 18,
        },
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
      },
      yAxis: [
        {
          type: 'value',
          show: showRmse,
          name: showRmse ? 'RMSE ($)' : '',
          min: 18000,
          max: 32000,
          nameTextStyle: { color: '#64748B', fontSize: 11 },
          splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
          axisLabel: {
            color: '#94A3B8',
            fontFamily: 'JetBrains Mono',
            formatter: (v: number) => formatCompactUSD(v),
          },
        },
        {
          type: 'value',
          show: showR2,
          name: showR2 ? 'R² (%)' : '',
          min: 83,
          max: 94,
          nameTextStyle: { color: '#10B981', fontSize: 11 },
          splitLine: { show: false },
          axisLabel: {
            color: '#10B981',
            fontFamily: 'JetBrains Mono',
            formatter: (v: number) => `${v}%`,
          },
        },
      ],
      series: [
        ...(showRmse
          ? [
              {
                name: 'CV RMSE ($)',
                type: 'bar',
                barMaxWidth: 26,
                itemStyle: {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: 'rgba(56,189,248,0.85)' },
                      { offset: 1, color: 'rgba(56,189,248,0.12)' },
                    ],
                  },
                  borderRadius: [6, 6, 0, 0],
                },
                data: shown.map((s) => s.rmse_after_usd),
              },
            ]
          : []),
        ...(showR2
          ? [
              {
                name: 'R² (%)',
                type: 'line',
                yAxisIndex: 1,
                smooth: 0.35,
                symbolSize: 8,
                lineStyle: { width: 3, color: '#34D399' },
                itemStyle: { color: '#34D399' },
                areaStyle: {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: 'rgba(52,211,153,0.22)' },
                      { offset: 1, color: 'rgba(52,211,153,0)' },
                    ],
                  },
                },
                data: shown.map((s) => Number((s.r2_after * 100).toFixed(2))),
              },
            ]
          : []),
      ],
    };
  }, [ablation_arena.feature_stepwise_waterfall, step, dim]);

  const insights = [
    '问题不是「模型不够强」，而是原始字段里混着杠杆污染、语义缺失与分布失真。',
    '正确顺序：先可视化诊断，再决定切除、变换还是编码——而不是一上来堆模型。',
    '最强信号往往不是单列字段，而是被数据证据「逼」出来的合成项与平滑编码。',
    '最终 R² 从 0.85 → 0.927，RMSE −30%——每一步都可以在消融实验里单独核算。',
  ];

  return (
    <PresentationStage
      chapter="01"
      kicker="序章 · 建立问题意识"
      title="为什么要从「数据分析」出发做特征工程？"
      subtitle="本演示用七个章节，把 Ames 房价从脏数据推到可解释估值。先别急着看最终分数——跟着左侧步骤，一次只推进一个论点。"
      accent="cyan"
      steps={STEPS}
      activeStep={step}
      onStepChange={setStep}
      dimensions={DIMENSIONS}
      activeDimension={dim}
      onDimensionChange={setDim}
      insight={insights[step]}
      stageMeta={
        <div className="grid grid-cols-2 gap-2.5 min-w-[220px]">
          <div className="rounded-2xl border border-white/8 bg-black/25 px-3.5 py-2.5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              特征维数
            </div>
            <div className="font-mono text-lg text-white">
              79 → <AnimatedNumber value={summary_kpis.engineered_feature_count} />
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5">
            <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider">
              最终 R²
            </div>
            <div className="font-mono text-lg text-emerald-300">
              <AnimatedNumber value={summary_kpis.r2_final} decimals={4} />
            </div>
          </div>
        </div>
      }
      aside={
        <div className="rounded-[20px] border border-white/8 bg-[#0A1020]/70 p-4 space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
            快速跳转到实验章
          </div>
          <button
            type="button"
            onClick={() => onNavigate('page-2-outlier-missing')}
            className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] text-slate-200 hover:bg-white/[0.04] border border-transparent hover:border-white/10 transition"
          >
            <span className="flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-rose-300" />
              从诊断实验开始
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('page-4-feature-discovery')}
            className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] text-slate-200 hover:bg-white/[0.04] border border-transparent hover:border-white/10 transition"
          >
            <span className="flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-cyan-300" />
              直接看五个特征发现
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      }
    >
      <div className="h-[460px] w-full">
        <ReactECharts
          option={chartOption}
          style={{ height: '100%', width: '100%' }}
          notMerge
        />
      </div>
    </PresentationStage>
  );
};

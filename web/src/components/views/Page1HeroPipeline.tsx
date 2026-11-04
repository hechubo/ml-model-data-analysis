import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  Box,
  Compass,
  Database,
  Flame,
  Microscope,
  Play,
  Sliders,
  Sparkles,
  TrendingDown,
  Waves,
  Zap,
} from 'lucide-react';
import { AnalyticsPayload } from '../../types/analytics';
import { PageId } from '../layout/SidebarNav';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import {
  CHART_COLORS,
  ECHARTS_DARK_TOOLTIP,
  formatCompactUSD,
  formatUSD,
} from '../../theme/chartTheme';

interface Page1Props {
  payload: AnalyticsPayload;
  onNavigate: (page: PageId) => void;
}

interface PipelineNodeSpec {
  id: string;
  stageNum: string;
  title: string;
  subtitle: string;
  targetPage: PageId;
  color: string;
  borderGlow: string;
  icon: React.ReactNode;
  howAnalyzed: string;
  usefulFeatures: string[];
  resultImpact: string;
  r2After: number;
  rmseAfter: number;
  rmseDelta: string;
}

export const Page1HeroPipeline: React.FC<Page1Props> = ({
  payload,
  onNavigate,
}) => {
  const { summary_kpis, ablation_arena } = payload;
  const [selectedNodeIdx, setSelectedNodeIdx] = useState<number>(2);

  const pipelineNodes: PipelineNodeSpec[] = useMemo(
    () => [
      {
        id: 'node-1',
        stageNum: 'STAGE 01',
        title: '高杠杆离群手术与缺失语义',
        subtitle: "Cook's D 诊断 + 27维 NA 设施溢价",
        targetPage: 'page-2-outlier-missing',
        color: '#F43F5E',
        borderGlow: 'border-rose-500/50 shadow-[0_0_28px_rgba(244,63,94,0.25)]',
        icon: <Microscope className="w-5 h-5 text-rose-400" />,
        howAnalyzed:
          "计算单变量回归 Cook's Distance 定位 >4,000 sq.ft 却低价成交的异常未完工样本；对比 27 个含缺失字段在『非空 vs NA』时的成交均价。",
        usefulFeatures: [
          'Outlier Leverage Mask',
          'HasFireplace (+74k USD)',
          'HasBasement (+77k USD)',
          'Neighborhood LotFrontage',
        ],
        resultImpact:
          '豪宅端回归斜率从 $107/sq.ft 恢复至 $114.6/sq.ft，首轮预测误差直接下降 $1,843！',
        r2After: 0.876,
        rmseAfter: 28411,
        rmseDelta: '-$1,843 RMSE',
      },
      {
        id: 'node-2',
        stageNum: 'STAGE 02',
        title: '偏态长尾与 Box-Cox 变形',
        subtitle: 'Q-Q 正态分位诊断 + 幂变换校准',
        targetPage: 'page-3-skewness-morph',
        color: '#F59E0B',
        borderGlow:
          'border-amber-500/50 shadow-[0_0_28px_rgba(245,158,11,0.25)]',
        icon: <Waves className="w-5 h-5 text-amber-400" />,
        howAnalyzed:
          '对 SalePrice 及 8 个核心面积特征做偏度(γ₁)与峰度(γ₂)检验，发现原始房价 γ₁=1.81 严重右偏，导致高价房残差异方差发散。',
        usefulFeatures: [
          'SalePrice_Log1p (γ₁→0.07)',
          'LotArea_BoxCox (λ=0.02)',
          'GrLivArea_Log1p',
          'TotalBsmtSF_BoxCox',
        ],
        resultImpact:
          '消除右偏长尾后，Q-Q 分位点紧密贴合 45° 高斯基准线，再削减 $1,570 预测误差！',
        r2After: 0.8965,
        rmseAfter: 26841,
        rmseDelta: '-$1,570 RMSE',
      },
      {
        id: 'node-3',
        stageNum: 'STAGE 03',
        title: '领域特征发现与乘性合成',
        subtitle: '分层斜率拆解 + 空间/折旧/精装合成',
        targetPage: 'page-4-feature-discovery',
        color: '#06B6D4',
        borderGlow: 'border-cyan-400/60 shadow-[0_0_32px_rgba(6,182,212,0.3)]',
        icon: <Flame className="w-5 h-5 text-cyan-400" />,
        howAnalyzed:
          '按建筑品质分4档回归发现：9-10级豪宅每平尺单价($139)是普通房($52)的 2.67 倍；单层面积因平房/双层户型割裂导致相关性失真；30年老房翻新溢价达 +$34k。',
        usefulFeatures: [
          'OverallQual_x_TotalSF (r=0.865)',
          'TotalSF (r=0.824)',
          'AmenityScore (r=0.812)',
          'QualityWeightedAge (r=0.742)',
        ],
        resultImpact:
          '新构造特征包揽全模型相关性前 5 名！CV 误差大幅狂降 -$3,960 USD，R² 突破 0.916！',
        r2After: 0.9162,
        rmseAfter: 22881,
        rmseDelta: '-$3,960 RMSE',
      },
      {
        id: 'node-4',
        stageNum: 'STAGE 04',
        title: '3D 响应曲面与特征血缘拓扑',
        subtitle: 'WebGL 三维非线性验证 + 桑基流向',
        targetPage: 'page-5-topology-3d',
        color: '#8B5CF6',
        borderGlow:
          'border-violet-500/50 shadow-[0_0_28px_rgba(139,92,246,0.25)]',
        icon: <Box className="w-5 h-5 text-violet-400" />,
        howAnalyzed:
          '在三维空间构建 (TotalSF × OverallQual → SalePrice) 响应曲面，验证高阶交互项在右上角豪宅象限的超线性曲面翘起。',
        usefulFeatures: [
          '3D Non-Linear Synergy Surface',
          'Sankey Information Flux',
          'SpaceEfficiency',
          'BsmtFinRatio',
        ],
        resultImpact:
          '直观揭示 6 大原始特征域如何通过 5 类工程算子汇聚为高信息增益特征簇。',
        r2After: 0.9205,
        rmseAfter: 22120,
        rmseDelta: '超线性曲面验证',
      },
      {
        id: 'node-5',
        stageNum: 'STAGE 05',
        title: '28社区经验贝叶斯与平行坐标',
        subtitle: 'OOF Target Encoding + 7维刷选',
        targetPage: 'page-6-spatial-parallel',
        color: '#38BDF8',
        borderGlow: 'border-sky-400/50 shadow-[0_0_28px_rgba(56,189,248,0.25)]',
        icon: <Compass className="w-5 h-5 text-sky-400" />,
        howAnalyzed:
          'ANOVA 方差分析发现 28 个社区解释 54%+ 房价方差，但 Blueste 等小社区样本 <10 套，直接 One-Hot 极易过拟合。',
        usefulFeatures: [
          'Neighborhood_TE (r=0.746)',
          'Qual_x_Neighborhood_TE (r=0.838)',
          'Neighborhood_Tier (1~4)',
        ],
        resultImpact:
          '5 折交叉经验贝叶斯平滑编码消除小样本方差陷阱，模型 R² 跃升至最终 0.9272！',
        r2After: 0.9272,
        rmseAfter: 21081,
        rmseDelta: '-$1,800 RMSE',
      },
      {
        id: 'node-6',
        stageNum: 'STAGE 06',
        title: '自选消融沙盒与 SHAP 模拟器',
        subtitle: '实时特征开关实验 + 美元级瀑布归因',
        targetPage: 'page-7-ablation-shap',
        color: '#10B981',
        borderGlow:
          'border-emerald-400/60 shadow-[0_0_32px_rgba(16,185,129,0.3)]',
        icon: <Sliders className="w-5 h-5 text-emerald-400" />,
        howAnalyzed:
          '在 6 种机器学习模型上执行严格 4 阶段消融与 7 步增量拆解，并用加性 SHAP 将单套房产估值拆解到每一个特征的美元贡献。',
        usefulFeatures: [
          'Interactive Ablation Toggle',
          'Live What-If Simulator',
          'Additive SHAP Waterfall ($)',
        ],
        resultImpact:
          '累计消减 -30.3% 预测误差 (-$9,173/套)，实现从『黑盒预测』到『透明美元归因』的跨越。',
        r2After: 0.9272,
        rmseAfter: 21081,
        rmseDelta: '最终 R² = 0.9272',
      },
    ],
    []
  );

  const activeNode = pipelineNodes[selectedNodeIdx];

  // ECharts Trajectory Preview Chart
  const trajectoryChartOption = useMemo(() => {
    const steps = ablation_arena.feature_stepwise_waterfall;
    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'axis',
      },
      grid: { left: 56, right: 52, top: 36, bottom: 44 },
      xAxis: {
        type: 'category',
        data: steps.map((s) => s.badge),
        axisLabel: {
          color: '#CBD5E1',
          fontSize: 10,
          fontFamily: 'JetBrains Mono',
          rotate: 15,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'RMSE 误差 ($)',
          min: 18000,
          max: 32000,
          nameTextStyle: { color: '#94A3B8', fontSize: 11 },
          splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
          axisLabel: {
            color: '#94A3B8',
            fontFamily: 'JetBrains Mono',
            formatter: (v: number) => formatCompactUSD(v),
          },
        },
        {
          type: 'value',
          name: 'R² (%)',
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
        {
          name: 'CV 预测误差 RMSE ($)',
          type: 'bar',
          barMaxWidth: 28,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#06B6D4' },
                { offset: 1, color: 'rgba(6, 182, 212, 0.2)' },
              ],
            },
            borderRadius: [6, 6, 0, 0],
          },
          data: steps.map((s) => s.rmse_after_usd),
        },
        {
          name: '决定系数 R² (%)',
          type: 'line',
          yAxisIndex: 1,
          smooth: 0.3,
          symbolSize: 9,
          lineStyle: { width: 3.5, color: '#10B981' },
          itemStyle: { color: '#10B981' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.28)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.0)' },
              ],
            },
          },
          data: steps.map((s) => Number((s.r2_after * 100).toFixed(2))),
        },
      ],
    };
  }, [ablation_arena.feature_stepwise_waterfall]);

  return (
    <div className="space-y-6 pb-16">
      {/* Hero Banner with Giant Animated Telemetry */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900/90 via-[#080F22]/95 to-slate-950/90 border border-slate-800/90 p-6 sm:p-8 overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute -top-24 right-12 w-96 h-96 rounded-full bg-cyan-500/15 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-emerald-500/10 blur-[110px]" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-cyan-300 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DATA ANALYSIS → FEATURE ENGINEERING → ABLATION → XAI</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.18]">
              不仅展示结果，更完整呈现{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-300 bg-clip-text text-transparent">
                「如何从数据分析中发现高价值特征」
              </span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              基于经典 <strong className="text-white">Ames Housing</strong>{' '}
              数据集（2,762 套真实房产交易，79 维原始特征），本系统通过{' '}
              <strong className="text-cyan-300">7 个全屏交互式实验页</strong>，完整还原从{' '}
              <span className="text-rose-300">离群点杠杆手术</span>、
              <span className="text-amber-300">Box-Cox 偏态动态变形</span>、
              <span className="text-cyan-300">5大因果特征发现</span>、
              <span className="text-violet-300">WebGL 3D 响应曲面</span> 到{' '}
              <span className="text-emerald-300">自选特征消融沙盒与 SHAP 实时估值</span>{' '}
              的全过程。
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('page-4-feature-discovery')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:brightness-110 transition-all"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>立即进入：5大特征发现因果工坊 (Page 04)</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('page-7-ablation-shap')}
                className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all"
              >
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>体验自选特征消融沙盒 & SHAP 模拟器 (Page 07)</span>
              </button>
            </div>
          </div>

          {/* Right 2x2 Giant Animated Telemetry Cards */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
            <div className="rounded-2xl bg-slate-950/80 border border-cyan-500/30 p-4 shadow-inner">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>特征空间工程扩张</span>
                <Flame className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white mt-1.5">
                79 → <AnimatedNumber value={summary_kpis.engineered_feature_count} /> 维
              </div>
              <div className="text-[11px] text-cyan-300 font-mono mt-1">
                最强衍生项 OverallQual×TotalSF (r=0.865)
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950/80 border border-emerald-500/30 p-4 shadow-inner">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>5折交叉验证 R² 跃升</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-300 mt-1.5">
                <AnimatedNumber value={summary_kpis.r2_final} decimals={4} />
              </div>
              <div className="text-[11px] text-emerald-400/90 font-mono mt-1">
                基线 0.8501 → 净提升 +{(summary_kpis.r2_lift * 100).toFixed(2)}%
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950/80 border border-amber-500/30 p-4 shadow-inner">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>预测误差 RMSE 削减</span>
                <TrendingDown className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-300 mt-1.5">
                -<AnimatedNumber value={summary_kpis.rmse_reduction_pct} decimals={1} suffix="%" />
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-1">
                从 $30,254 降至 $21,081 (-$9,173/套)
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950/80 border border-violet-500/30 p-4 shadow-inner">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>高质清洗房产样本</span>
                <Database className="w-4 h-4 text-violet-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-violet-300 mt-1.5">
                <AnimatedNumber value={summary_kpis.clean_transactions} /> 套
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-1">
                27 个缺失字段 100% 物理语义消零
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 6-Node Pipeline Explorer + Live Stage Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive 6-Stage Pipeline Selector (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-slate-900/75 border border-slate-800/90 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-white">
                  交互式特征工程六阶流水线 (Interactive Pipeline)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  点击任意阶段节点，右侧实时预览该阶段的数据分析方法、新特征与模型收益
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                点击节点切换
              </span>
            </div>

            <div className="space-y-2.5 mt-3">
              {pipelineNodes.map((node, idx) => {
                const isSelected = idx === selectedNodeIdx;
                return (
                  <motion.button
                    key={node.id}
                    type="button"
                    whileHover={{ x: 4 }}
                    onClick={() => setSelectedNodeIdx(idx)}
                    className={`w-full text-left rounded-2xl p-3.5 border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? `bg-slate-950/95 ${node.borderGlow}`
                        : 'bg-slate-950/45 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                        {node.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-cyan-400">
                            {node.stageNum}
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            {node.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {node.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-emerald-300">
                        {node.rmseDelta}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        R²={node.r2After.toFixed(4)}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Active Stage Deep Spotlight + Stepwise Gain Chart (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Active Node Causal Spotlight Card */}
          <motion.div
            key={activeNode.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-gradient-to-br from-slate-900/95 via-[#091228] to-slate-950 border border-cyan-500/35 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700">
                  {activeNode.icon}
                </div>
                <div>
                  <div className="text-xs font-mono text-cyan-300 font-bold">
                    {activeNode.stageNum} · 阶段因果深度透视
                  </div>
                  <h3 className="text-lg font-extrabold text-white">
                    {activeNode.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate(activeNode.targetPage)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:brightness-110 transition-all"
              >
                <span>进入该交互实验页</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="rounded-2xl bg-slate-950/75 border border-slate-800/90 p-3.5">
                <div className="text-[11px] font-mono text-cyan-300 font-semibold mb-1">
                  01 / 怎么分析数据的？
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeNode.howAnalyzed}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950/75 border border-slate-800/90 p-3.5">
                <div className="text-[11px] font-mono text-violet-300 font-semibold mb-1.5">
                  02 / 看出哪些特征有用？
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeNode.usefulFeatures.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-1 rounded-lg bg-violet-500/15 border border-violet-500/30 text-[11px] font-mono text-violet-200"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950/75 border border-emerald-500/30 p-3.5">
                <div className="text-[11px] font-mono text-emerald-300 font-semibold mb-1">
                  03 / 得到了什么结果？
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {activeNode.resultImpact}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-300 font-bold">
                    R² = {activeNode.r2After.toFixed(4)}
                  </span>
                  <span className="text-amber-300 font-bold">
                    RMSE = {formatUSD(activeNode.rmseAfter)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bottom Stepwise Trajectory Chart */}
          <div className="rounded-3xl bg-slate-900/75 border border-slate-800/90 p-5 flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  全链路 7 步特征工程增量收益轨迹 (Stepwise RMSE Drop & R² Climb)
                </h3>
                <p className="text-xs text-slate-400">
                  柱状图展示每加入一组特征后 CV RMSE 的单调下降，绿线展示解释方差 R² 的同步攀升
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                总计削减 -$9,173 RMSE
              </span>
            </div>
            <div className="h-[250px] w-full">
              <ReactECharts
                option={trajectoryChartOption}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

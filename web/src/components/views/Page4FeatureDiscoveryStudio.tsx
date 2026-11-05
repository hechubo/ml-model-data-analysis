import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
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

interface Page4Props {
  payload: AnalyticsPayload;
}

/** Within each discovery mission: observe → hypothesize → evidence → formula → gain */
const BEAT_LABELS = [
  '观察现象',
  '提出假设',
  '验证证据',
  '写出公式',
  '量化收益',
] as const;

export const Page4FeatureDiscoveryStudio: React.FC<Page4Props> = ({
  payload,
}) => {
  const { discovery_evidence, engineered_lineage, neighborhood_profiles } =
    payload;
  const cards = discovery_evidence.discovery_cards;
  const [missionIdx, setMissionIdx] = useState(0);
  const [beat, setBeat] = useState(0);

  const activeCard = cards[missionIdx] || cards[0];

  const missionDims: AnalysisDimension[] = cards.map((c, i) => ({
    id: String(i),
    label: `发现 ${i + 1}`,
    hint: c.title,
  }));

  const steps: DerivationStep[] = useMemo(() => {
    if (!activeCard) return [];
    return [
      {
        id: 'observe',
        label: BEAT_LABELS[0],
        question: '数据里最先看见什么？',
        narrative: activeCard.data_finding,
      },
      {
        id: 'hypothesize',
        label: BEAT_LABELS[1],
        question: '这暗示了怎样的机制？',
        narrative: `分析方法：${activeCard.analysis_method}。我们假设：原始字段各自为政，忽略了品质×空间、总面积合成、翻新折旧或社区平滑——因此需要新特征把机制写进模型。`,
      },
      {
        id: 'evidence',
        label: BEAT_LABELS[2],
        question: '图上的证据支持假设吗？',
        narrative: `改造前：${activeCard.metric_before}。右侧主画布展示该发现对应的分层斜率 / 相关梯子 / 生命周期 / 编码平滑——点一下维度可切换其它发现。`,
        metric: activeCard.metric_before,
      },
      {
        id: 'formula',
        label: BEAT_LABELS[3],
        question: '因此我们写出什么特征？',
        narrative: '把机制落成可计算公式，而不是「感觉应该有用」的黑盒列。',
        formula: activeCard.feature_added,
      },
      {
        id: 'gain',
        label: BEAT_LABELS[4],
        question: '加上之后，误差掉了多少？',
        narrative: `改造后：${activeCard.metric_after}。这一发现在交叉验证里可单独核算贡献。`,
        metric: `独立削减 RMSE  ${formatUSD(activeCard.rmse_impact_usd)}`,
      },
    ];
  }, [activeCard]);

  const chartOption = useMemo(() => {
    // Progressive opacity / emphasis based on beat
    const emphasizeEngineered = beat >= 3;

    if (missionIdx === 0) {
      const regimes = discovery_evidence.interaction_regimes;
      return {
        backgroundColor: 'transparent',
        animationDurationUpdate: 450,
        tooltip: { ...ECHARTS_DARK_TOOLTIP, trigger: 'axis' },
        legend: {
          top: 4,
          right: 8,
          textStyle: { color: '#94A3B8', fontSize: 11 },
        },
        grid: { left: 60, right: 24, top: 44, bottom: 46 },
        xAxis: {
          type: 'value',
          name: 'TotalSF (sq.ft)',
          nameLocation: 'middle',
          nameGap: 30,
          min: 800,
          max: 4600,
          nameTextStyle: { color: '#64748B', fontSize: 11 },
          splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
          axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
        },
        yAxis: {
          type: 'value',
          name: '分组均价 ($)',
          nameLocation: 'middle',
          nameGap: 48,
          nameTextStyle: { color: '#64748B', fontSize: 11 },
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
          symbolSize: beat >= 2 ? 9 : 6,
          lineStyle: {
            width: beat >= 2 ? 3.4 : 2,
            color: reg.color,
            opacity: beat === 0 ? 0.45 : 1,
          },
          itemStyle: { color: reg.color },
          data: reg.curve.map((pt) => [pt.total_sf, pt.mean_price]),
        })),
      };
    }

    if (missionIdx === 1) {
      const items = [
        { name: '2ndFlrSF', corr: 0.269, color: '#64748B' },
        { name: 'BsmtFinSF1', corr: 0.439, color: '#64748B' },
        { name: '1stFlrSF', corr: 0.621, color: '#F59E0B' },
        { name: 'TotalBsmtSF', corr: 0.632, color: '#F59E0B' },
        { name: 'GrLivArea', corr: 0.719, color: '#38BDF8' },
        { name: '★ TotalSF', corr: 0.824, color: '#10B981' },
        { name: '★★ Qual×TotalSF', corr: 0.865, color: '#06B6D4' },
      ];
      const visible = beat <= 1 ? 5 : items.length;
      const shown = items.slice(0, visible);
      return {
        backgroundColor: 'transparent',
        animationDurationUpdate: 450,
        tooltip: { ...ECHARTS_DARK_TOOLTIP, trigger: 'axis' },
        grid: { left: 130, right: 36, top: 28, bottom: 40 },
        xAxis: {
          type: 'value',
          min: 0,
          max: 0.95,
          name: '与 SalePrice 的 Pearson r',
          nameLocation: 'middle',
          nameGap: 26,
          nameTextStyle: { color: '#64748B', fontSize: 11 },
          splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
          axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
        },
        yAxis: {
          type: 'category',
          data: shown.map((i) => i.name),
          axisLabel: {
            color: '#F1F5F9',
            fontSize: 12,
            fontFamily: 'JetBrains Mono',
          },
        },
        series: [
          {
            type: 'bar',
            barMaxWidth: 22,
            label: {
              show: beat >= 2,
              position: 'right',
              color: '#F8FAFC',
              fontFamily: 'JetBrains Mono',
              formatter: (p: { value: number }) => `r=${p.value.toFixed(3)}`,
            },
            itemStyle: {
              color: (p: { dataIndex: number }) =>
                shown[p.dataIndex]?.color || CHART_COLORS.cyan,
              borderRadius: [0, 5, 5, 0],
              opacity: emphasizeEngineered ? 1 : 0.85,
            },
            data: shown.map((i) => i.corr),
          },
        ],
      };
    }

    if (missionIdx === 2) {
      const curves = discovery_evidence.lifecycle_curves;
      return {
        backgroundColor: 'transparent',
        animationDurationUpdate: 450,
        tooltip: { ...ECHARTS_DARK_TOOLTIP, trigger: 'axis' },
        legend: {
          top: 4,
          right: 8,
          textStyle: { color: '#94A3B8', fontSize: 11 },
        },
        grid: { left: 60, right: 40, top: 44, bottom: 44 },
        xAxis: {
          type: 'category',
          data: curves.map((c) => c.age_bucket),
          name: '房龄分段',
          nameLocation: 'middle',
          nameGap: 28,
          nameTextStyle: { color: '#64748B', fontSize: 11 },
          axisLabel: { color: '#E2E8F0', fontSize: 11 },
        },
        yAxis: {
          type: 'value',
          name: '均价 / 溢价 ($)',
          nameLocation: 'middle',
          nameGap: 46,
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
            name: '近12年翻新',
            type: 'bar',
            barMaxWidth: 28,
            itemStyle: {
              color: CHART_COLORS.emerald,
              borderRadius: [5, 5, 0, 0],
              opacity: beat >= 1 ? 1 : 0.5,
            },
            data: curves.map((c) => c.remodeled_mean_price),
          },
          {
            name: '未翻新',
            type: 'bar',
            barMaxWidth: 28,
            itemStyle: {
              color: CHART_COLORS.violet,
              borderRadius: [5, 5, 0, 0],
              opacity: beat >= 1 ? 1 : 0.5,
            },
            data: curves.map((c) => c.unremodeled_mean_price),
          },
          ...(beat >= 2
            ? [
                {
                  name: '翻新溢价',
                  type: 'line',
                  smooth: true,
                  symbolSize: 8,
                  lineStyle: { width: 2.8, color: CHART_COLORS.amber },
                  itemStyle: { color: CHART_COLORS.amber },
                  data: curves.map((c) => c.remodel_premium_usd),
                },
              ]
            : []),
        ],
      };
    }

    if (missionIdx === 3) {
      const items = [...engineered_lineage].slice(0, 10).reverse();
      return {
        backgroundColor: 'transparent',
        animationDurationUpdate: 450,
        tooltip: { ...ECHARTS_DARK_TOOLTIP, trigger: 'axis' },
        legend: {
          top: 4,
          right: 8,
          textStyle: { color: '#94A3B8', fontSize: 11 },
        },
        grid: { left: 140, right: 28, top: 40, bottom: 40 },
        xAxis: {
          type: 'value',
          min: 0.2,
          max: 0.92,
          name: '|Pearson r|',
          nameLocation: 'middle',
          nameGap: 26,
          nameTextStyle: { color: '#64748B', fontSize: 11 },
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
            name: '最强原始父特征',
            type: 'bar',
            barGap: '-100%',
            barWidth: 11,
            itemStyle: {
              color: 'rgba(245,158,11,0.45)',
              borderRadius: [0, 4, 4, 0],
            },
            data: items.map((i) => i.best_parent_corr),
            z: 2,
          },
          {
            name: '合成新特征',
            type: 'bar',
            barWidth: 11,
            itemStyle: {
              color: CHART_COLORS.cyan,
              borderRadius: [0, 4, 4, 0],
              opacity: emphasizeEngineered ? 1 : 0.55,
            },
            data: items.map((i) => i.abs_corr),
            z: 1,
          },
        ],
      };
    }

    const nbs = neighborhood_profiles.slice(0, 14);
    return {
      backgroundColor: 'transparent',
      animationDurationUpdate: 450,
      tooltip: { ...ECHARTS_DARK_TOOLTIP, trigger: 'axis' },
      legend: {
        top: 4,
        right: 8,
        textStyle: { color: '#94A3B8', fontSize: 11 },
      },
      grid: { left: 58, right: 20, top: 40, bottom: 52 },
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
        name: '均价 / 平滑 TE ($)',
        nameLocation: 'middle',
        nameGap: 46,
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
          name: '原始社区均价',
          type: 'bar',
          barMaxWidth: 18,
          itemStyle: {
            color: 'rgba(139,92,246,0.5)',
            borderRadius: [4, 4, 0, 0],
          },
          data: nbs.map((n) => n.mean_price),
        },
        ...(beat >= 2
          ? [
              {
                name: 'OOF 贝叶斯平滑 TE',
                type: 'line',
                smooth: 0.2,
                symbolSize: 8,
                lineStyle: { width: 2.8, color: CHART_COLORS.emerald },
                itemStyle: { color: CHART_COLORS.emerald },
                data: nbs.map((n) => n.smoothed_te),
              },
            ]
          : []),
      ],
    };
  }, [
    missionIdx,
    beat,
    discovery_evidence,
    engineered_lineage,
    neighborhood_profiles,
  ]);

  const handleStepChange = (idx: number) => setBeat(idx);

  const handleMissionChange = (id: string) => {
    setMissionIdx(Number(id));
    setBeat(0);
  };

  if (!activeCard) return null;

  return (
    <PresentationStage
      chapter="04"
      kicker="发现篇 · 五个因果闭环"
      title={activeCard.title.replace(/^发现\s*\d+[：:]\s*/, '')}
      subtitle="每个发现都走完同一条推导链：观察 → 假设 → 证据 → 公式 → 收益。上方切换「发现 1–5」，左侧用 Space 或按钮推进本发现的推导节拍。"
      accent="cyan"
      steps={steps}
      activeStep={beat}
      onStepChange={handleStepChange}
      dimensions={missionDims}
      activeDimension={String(missionIdx)}
      onDimensionChange={handleMissionChange}
      insight={`${activeCard.analysis_method} · 独立贡献 ${formatUSD(activeCard.rmse_impact_usd)} RMSE`}
      stageMeta={
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-right">
          <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider">
            本发现 ΔRMSE
          </div>
          <div className="font-mono text-lg text-emerald-300">
            <AnimatedNumber
              value={activeCard.rmse_impact_usd}
              prefix="$"
            />
          </div>
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

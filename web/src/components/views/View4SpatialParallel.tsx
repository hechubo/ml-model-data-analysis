import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { ResponsiveRadar } from '@nivo/radar';
import { AnalyticsPayload } from '../../types/analytics';
import {
  AnalysisDimension,
  DerivationStep,
  PresentationStage,
} from '../ui/PresentationStage';
import {
  CHART_COLORS,
  ECHARTS_DARK_TOOLTIP,
  NIVO_DARK_THEME,
  formatCompactUSD,
  formatUSD,
} from '../../theme/chartTheme';

const STEPS: DerivationStep[] = [
  {
    id: 'bubbles',
    label: '看见社区断层',
    question: '28 个社区差在哪？',
    narrative:
      '气泡图把社区摊在「平均面积 × 平滑编码价」平面上：Tier 1 豪宅区与 Tier 4 入口区在估值轴上拉开巨大断层。社区解释了房价方差的一半以上。',
    metric: 'Neighborhood 解释 ≈ 54%+ 房价方差',
  },
  {
    id: 'why-te',
    label: '为何不能 One-Hot',
    question: '小样本社区怎么编码？',
    narrative:
      'Blueste、GrnHill 等社区样本不足 10 套，直接 One-Hot / 原始均值极易过拟合。因此改用 5 折经验贝叶斯平滑：小样本向全局均值收缩。',
    formula: 'TE(c) = (n_c·ȳ_c + m·ȳ) / (n_c + m)',
  },
  {
    id: 'parallel',
    label: '平行坐标刷选',
    question: '高价房在多维上长什么样？',
    narrative:
      '切换到 7 轴平行坐标，按社会经济层级过滤，再在 SalePrice 轴上刷选。你会看到高价轨迹在 TotalSF、OverallQual、AmenityScore 上束状收敛。',
  },
  {
    id: 'radar',
    label: '雷达画像对比',
    question: '任意社区六维差异？',
    narrative:
      '点选最多 4 个社区，比较平滑估值、空间、品质、精装、新颖度与单价。演示时建议对照 NoRidge vs OldTown。',
  },
];

interface View4Props {
  payload: AnalyticsPayload;
}

const TIER_COLORS: Record<number, string> = {
  4: '#10B981', // Tier 1 Luxury
  3: '#06B6D4', // Tier 2 Upper-Mid
  2: '#8B5CF6', // Tier 3 Core Family
  1: '#F59E0B', // Tier 4 Historic & Entry
};

export const View4SpatialParallel: React.FC<View4Props> = ({ payload }) => {
  const { neighborhood_profiles, shap_xai } = payload;
  const { parallel_coords } = shap_xai;

  const [step, setStep] = useState(0);
  const [viewDim, setViewDim] = useState<'bubbles' | 'parallel' | 'radar'>(
    'bubbles'
  );
  const [selectedTierFilter, setSelectedTierFilter] = useState<number | 'ALL'>(
    'ALL'
  );
  const [radarNeighborhoods, setRadarNeighborhoods] = useState<string[]>([
    'NoRidge',
    'NridgHt',
    'CollgCr',
    'OldTown',
  ]);

  useEffect(() => {
    if (step <= 1) setViewDim('bubbles');
    else if (step === 2) setViewDim('parallel');
    else setViewDim('radar');
  }, [step]);

  const dims: AnalysisDimension[] = [
    { id: 'bubbles', label: '社区气泡', hint: 'OOF TE 空间矩阵' },
    { id: 'parallel', label: '平行坐标', hint: '7 维刷选' },
    { id: 'radar', label: '雷达画像', hint: '最多 4 社区对比' },
  ];

  // 1. ECharts Option: 28-Neighborhood OOF Target Encoding & Socioeconomic Tier Bubble Matrix
  const neighborhoodBubbleOption = useMemo(() => {
    const tierGroups = [4, 3, 2, 1].map((tNum) => {
      const items = neighborhood_profiles.filter((n) => n.tier_num === tNum);
      const tierLabel = items[0]?.tier || `Tier ${5 - tNum}`;
      return {
        name: tierLabel,
        type: 'scatter',
        symbolSize: (val: any[]) =>
          Math.max(12, Math.min(42, Math.sqrt(val[3]) * 2.4)),
        itemStyle: {
          color: TIER_COLORS[tNum],
          opacity: 0.82,
          borderColor: '#F8FAFC',
          borderWidth: 1,
        },
        label: {
          show: true,
          formatter: (p: any) => p.value[4],
          position: 'top',
          color: '#E2E8F0',
          fontSize: 10,
          fontFamily: 'JetBrains Mono',
        },
        data: items.map((n) => [
          n.mean_total_sf,
          n.smoothed_te,
          n.price_per_sqft,
          n.count,
          n.neighborhood,
          n.mean_qual,
          n.mean_price,
        ]),
      };
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'item',
        formatter: (params: any) => {
          const [sf, te, ppsf, cnt, nb, qual, rawMean] = params.value;
          return `
            <div class="space-y-1">
              <div class="font-bold text-white flex items-center justify-between gap-3">
                <span>社区: ${nb}</span>
                <span class="text-xs text-cyan-300">${params.seriesName}</span>
              </div>
              <div class="text-xs text-slate-300">样本交易量: <span class="font-mono text-white">${cnt} 套</span></div>
              <div class="text-xs text-slate-300">原始样本均价: <span class="font-mono text-slate-200">${formatUSD(rawMean)}</span></div>
              <div class="text-xs text-slate-300">5折贝叶斯平滑编码 (Neighborhood_TE): <span class="font-mono text-emerald-300 font-bold">${formatUSD(te)}</span></div>
              <div class="text-xs text-slate-300">平均总面积 / 单价: <span class="font-mono text-cyan-300">${sf.toLocaleString()} sq.ft · $${ppsf}/sq.ft</span></div>
              <div class="text-xs text-slate-300">平均建筑品质: <span class="font-mono text-violet-300">${qual}/10</span></div>
            </div>
          `;
        },
      },
      legend: {
        top: 4,
        right: 8,
        textStyle: { color: '#CBD5E1', fontSize: 11 },
      },
      grid: { left: 64, right: 28, top: 48, bottom: 44 },
      xAxis: {
        type: 'value',
        name: '社区平均总建筑面积 Mean TotalSF (sq.ft)',
        nameLocation: 'middle',
        nameGap: 28,
        min: 1400,
        max: 3900,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      yAxis: {
        type: 'value',
        name: '5折平滑目标编码值 Neighborhood_TE (USD)',
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
      series: tierGroups,
    };
  }, [neighborhood_profiles]);

  // 2. ECharts Option: 7-Axis Brushable Parallel Coordinates Explorer
  const parallelOption = useMemo(() => {
    const filtered =
      selectedTierFilter === 'ALL'
        ? parallel_coords
        : parallel_coords.filter((d) => d.tier === selectedTierFilter);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'item',
      },
      parallelAxis: [
        {
          dim: 0,
          name: 'TotalSF\n(总面积)',
          min: 700,
          max: 5200,
        },
        {
          dim: 1,
          name: 'OverallQual\n(建筑品质)',
          min: 2,
          max: 10,
        },
        {
          dim: 2,
          name: 'HouseAge\n(折旧房龄)',
          min: 0,
          max: 110,
          inverse: true,
        },
        {
          dim: 3,
          name: 'TotalBath\n(加权卫浴)',
          min: 1,
          max: 5,
        },
        {
          dim: 4,
          name: 'AmenityScore\n(精装指数)',
          min: 6,
          max: 32,
        },
        {
          dim: 5,
          name: 'LotArea\n(地块面积)',
          min: 1500,
          max: 35000,
        },
        {
          dim: 6,
          name: 'SalePrice\n(成交房价 $)',
          min: 40000,
          max: 550000,
        },
      ],
      parallel: {
        left: 48,
        right: 56,
        top: 52,
        bottom: 28,
        parallelAxisDefault: {
          type: 'value',
          nameLocation: 'start',
          nameGap: 18,
          nameTextStyle: {
            color: '#CBD5E1',
            fontSize: 11,
            fontFamily: 'JetBrains Mono',
          },
          axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.35)' } },
          axisTick: { lineStyle: { color: 'rgba(148, 163, 184, 0.35)' } },
          splitLine: { show: false },
          axisLabel: {
            color: '#94A3B8',
            fontSize: 10,
            fontFamily: 'JetBrains Mono',
          },
        },
      },
      visualMap: {
        show: true,
        min: 60000,
        max: 420000,
        dimension: 6,
        orient: 'horizontal',
        right: 16,
        top: 4,
        itemWidth: 10,
        itemHeight: 90,
        text: ['高房价', '低房价'],
        textStyle: { color: '#94A3B8', fontSize: 10 },
        inRange: {
          color: ['#F59E0B', '#8B5CF6', '#06B6D4', '#10B981'],
        },
      },
      series: [
        {
          name: '房产多维平行坐标轨迹',
          type: 'parallel',
          smooth: true,
          lineStyle: {
            width: 1.4,
            opacity: 0.42,
          },
          emphasis: {
            lineStyle: {
              width: 3.2,
              opacity: 1,
            },
          },
          data: filtered.map((d) => [
            d.total_sf,
            d.overall_qual,
            d.house_age,
            d.total_bath,
            d.amenity_score,
            Math.min(35000, d.lot_area),
            d.sale_price,
          ]),
        },
      ],
    };
  }, [parallel_coords, selectedTierFilter]);

  // 3. Nivo Radar Data: Normalized 0-100 across 6 dimensions for selected neighborhoods
  const radarData = useMemo(() => {
    const selectedProfiles = neighborhood_profiles.filter((n) =>
      radarNeighborhoods.includes(n.neighborhood)
    );
    const metrics = [
      {
        metric: '平滑估值 (TE)',
        calc: (n: (typeof neighborhood_profiles)[0]) =>
          Math.round(Math.min(100, (n.smoothed_te / 340000) * 100)),
      },
      {
        metric: '建筑总空间 (TotalSF)',
        calc: (n: (typeof neighborhood_profiles)[0]) =>
          Math.round(Math.min(100, (n.mean_total_sf / 3600) * 100)),
      },
      {
        metric: '建筑品质 (OverallQual)',
        calc: (n: (typeof neighborhood_profiles)[0]) =>
          Math.round(Math.min(100, (n.mean_qual / 9.0) * 100)),
      },
      {
        metric: '精装配套 (Amenity)',
        calc: (n: (typeof neighborhood_profiles)[0]) =>
          Math.round(Math.min(100, (n.mean_amenity / 24.0) * 100)),
      },
      {
        metric: '建筑新颖度 (Newness)',
        calc: (n: (typeof neighborhood_profiles)[0]) =>
          Math.round(Math.max(10, Math.min(100, 100 - n.mean_age * 1.1))),
      },
      {
        metric: '每平尺单价 ($/SqFt)',
        calc: (n: (typeof neighborhood_profiles)[0]) =>
          Math.round(Math.min(100, (n.price_per_sqft / 95) * 100)),
      },
    ];

    return metrics.map((m) => {
      const row: Record<string, any> = { metric: m.metric };
      for (const prof of selectedProfiles) {
        row[prof.neighborhood] = m.calc(prof);
      }
      return row;
    });
  }, [neighborhood_profiles, radarNeighborhoods]);

  const toggleNeighborhoodRadar = (nb: string) => {
    setRadarNeighborhoods((prev) => {
      if (prev.includes(nb)) {
        return prev.length > 1 ? prev.filter((item) => item !== nb) : prev;
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), nb];
      }
      return [...prev, nb];
    });
  };

  const insights = [
    '社区不是「标签噪声」——它系统性地抬升或压低整条估值曲线。',
    '小样本社区必须向全局收缩：这是 Neighborhood_TE 存在的唯一理由。',
    '平行坐标刷选让「高价房长什么样」变成可操作的多维证据，而不是口头描述。',
    '雷达图适合演讲收尾：点名两个社区，六维断层一目了然。',
  ];

  return (
    <PresentationStage
      chapter="06"
      kicker="空间篇 · 编码与刷选"
      title="社区异质性：从气泡断层到多维轨迹"
      subtitle="先建立社区价差的直觉，再解释为什么要做平滑目标编码，最后用平行坐标与雷达把「房源画像」交给观众亲手刷选。"
      accent="sky"
      steps={STEPS}
      activeStep={step}
      onStepChange={setStep}
      dimensions={dims}
      activeDimension={viewDim}
      onDimensionChange={(id) => {
        setViewDim(id as 'bubbles' | 'parallel' | 'radar');
        if (id === 'bubbles') setStep(0);
        if (id === 'parallel') setStep(2);
        if (id === 'radar') setStep(3);
      }}
      insight={insights[step]}
      aside={
        viewDim === 'parallel' ? (
          <div className="rounded-[20px] border border-white/8 bg-[#0A1020]/70 p-3.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">
              层级过滤
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'ALL' as const, label: '全部' },
                  { id: 4 as const, label: 'Tier1' },
                  { id: 3 as const, label: 'Tier2' },
                  { id: 2 as const, label: 'Tier3' },
                  { id: 1 as const, label: 'Tier4' },
                ] as const
              ).map((item) => (
                <button
                  key={String(item.id)}
                  type="button"
                  onClick={() => setSelectedTierFilter(item.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] border ${
                    selectedTierFilter === item.id
                      ? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
                      : 'border-white/8 text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : viewDim === 'radar' ? (
          <div className="rounded-[20px] border border-white/8 bg-[#0A1020]/70 p-3.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">
              选择社区（最多 4）
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {neighborhood_profiles.slice(0, 16).map((n) => {
                const active = radarNeighborhoods.includes(n.neighborhood);
                return (
                  <button
                    key={n.neighborhood}
                    type="button"
                    onClick={() => toggleNeighborhoodRadar(n.neighborhood)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono border ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                        : 'border-white/8 text-slate-500'
                    }`}
                  >
                    {n.neighborhood}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null
      }
    >
      <div className="h-[460px] w-full">
        {viewDim === 'bubbles' && (
          <ReactECharts
            option={neighborhoodBubbleOption}
            style={{ height: '100%', width: '100%' }}
            notMerge
          />
        )}
        {viewDim === 'parallel' && (
          <ReactECharts
            option={parallelOption}
            style={{ height: '100%', width: '100%' }}
            notMerge
          />
        )}
        {viewDim === 'radar' && (
          <ResponsiveRadar
            data={radarData}
            keys={radarNeighborhoods}
            indexBy="metric"
            maxValue={100}
            margin={{ top: 40, right: 72, bottom: 40, left: 72 }}
            curve="linearClosed"
            borderWidth={2}
            borderColor={{ from: 'color' }}
            gridLevels={4}
            gridShape="circular"
            gridLabelOffset={14}
            enableDots
            dotSize={7}
            dotColor={{ theme: 'background' }}
            dotBorderWidth={2}
            colors={['#06B6D4', '#10B981', '#8B5CF6', '#F59E0B']}
            fillOpacity={0.22}
            blendMode="normal"
            theme={NIVO_DARK_THEME}
          />
        )}
      </div>
    </PresentationStage>
  );
};

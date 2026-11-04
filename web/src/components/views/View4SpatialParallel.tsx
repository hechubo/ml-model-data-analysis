import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { ResponsiveRadar } from '@nivo/radar';
import { Compass, Layers, MapPin } from 'lucide-react';
import { AnalyticsPayload } from '../../types/analytics';
import { BentoCard } from '../ui/BentoCard';
import {
  CHART_COLORS,
  ECHARTS_DARK_TOOLTIP,
  NIVO_DARK_THEME,
  formatCompactUSD,
  formatUSD,
} from '../../theme/chartTheme';

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

  const [selectedTierFilter, setSelectedTierFilter] = useState<number | 'ALL'>(
    'ALL'
  );
  const [radarNeighborhoods, setRadarNeighborhoods] = useState<string[]>([
    'NoRidge',
    'NridgHt',
    'CollgCr',
    'OldTown',
  ]);

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

  return (
    <div className="space-y-5">
      {/* Row 1: 28-Neighborhood OOF Target Encoding Bubble Matrix (7 cols) + Nivo Radar (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <BentoCard
          className="lg:col-span-7"
          title="28 个社区空间异质性与 5 折经验贝叶斯平滑目标编码矩阵"
          subtitle="气泡大小代表样本交易量；纵轴为 5 折交叉验证经验贝叶斯平滑编码值 Neighborhood_TE，颜色区分 4 大社会经济层级"
          badge="OOF Empirical Bayes TE"
          badgeTone="emerald"
          insight="数据分析发现：NoRidge / NridgHt / StoneBr 等顶级社区均价突破 $310k+，而 MeadowV / BrDale 仅 $95k~$105k（社区解释了 54%+ 的房价方差）。但 Blueste、GrnHill 等小社区样本不足 10 套，因此我们构造 5 折经验贝叶斯平滑编码 Neighborhood_TE (r=0.746)，有效抑制小样本过拟合。"
        >
          <div className="h-[395px] w-full">
            <ReactECharts
              option={neighborhoodBubbleOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </BentoCard>

        <BentoCard
          className="lg:col-span-5"
          title="多社区六维衍生特征画像雷达对比 (@nivo/radar)"
          subtitle="点击下方社区胶囊切换对比对象（最多同时对比 4 个社区在 6 大工程化指标上的归一化得分）"
          badge="@nivo/radar"
          badgeTone="violet"
          insight="对比 NoRidge（高档新贵区）与 OldTown（历史老城区）可见：二者不仅在总面积上拉开差距，在『建筑新颖度』与『精装配套指数 (AmenityScore)』上更是形成鲜明的六边形断层。"
        >
          <div className="flex flex-wrap gap-1.5 mb-2">
            {neighborhood_profiles.slice(0, 12).map((n) => {
              const active = radarNeighborhoods.includes(n.neighborhood);
              return (
                <button
                  key={n.neighborhood}
                  type="button"
                  onClick={() => toggleNeighborhoodRadar(n.neighborhood)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono border transition-all ${
                    active
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {n.neighborhood}
                </button>
              );
            })}
          </div>
          <div className="h-[335px] w-full">
            <ResponsiveRadar
              data={radarData}
              keys={radarNeighborhoods}
              indexBy="metric"
              maxValue={100}
              margin={{ top: 36, right: 68, bottom: 36, left: 68 }}
              curve="linearClosed"
              borderWidth={2}
              borderColor={{ from: 'color' }}
              gridLevels={4}
              gridShape="circular"
              gridLabelOffset={14}
              enableDots={true}
              dotSize={7}
              dotColor={{ theme: 'background' }}
              dotBorderWidth={2}
              colors={['#06B6D4', '#10B981', '#8B5CF6', '#F59E0B']}
              fillOpacity={0.22}
              blendMode="normal"
              theme={NIVO_DARK_THEME}
              legends={[
                {
                  anchor: 'top-left',
                  direction: 'column',
                  translateX: -50,
                  translateY: -24,
                  itemWidth: 70,
                  itemHeight: 18,
                  itemTextColor: '#CBD5E1',
                  symbolSize: 10,
                  symbolShape: 'circle',
                },
              ]}
            />
          </div>
        </BentoCard>
      </div>

      {/* Row 2: Brushable 7-Axis Parallel Coordinates Explorer */}
      <BentoCard
        title="高维特征平行坐标刷选探索器 (ECharts Brushable Parallel Coordinates)"
        subtitle="鼠标可在任意坐标轴上垂直拖拽刷选（Brush）区间，实时过滤并追踪高价值房产在 7 个工程化维度上的协同轨迹"
        badge="320 套分层抽样房产 × 7 维工程特征"
        badgeTone="cyan"
        insight="在最后一根 SalePrice 坐标轴上框选 >$300k 的高价房轨迹，可以看到左端 TotalSF (>2,800 sq.ft)、OverallQual (≥8)、TotalBath (≥3.0) 与 AmenityScore (>20) 呈现高度一致的束状收敛。"
        headerRight={
          <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
            {[
              { id: 'ALL', label: '全部层级' },
              { id: 4, label: 'Tier 1 豪宅区' },
              { id: 3, label: 'Tier 2 改善区' },
              { id: 2, label: 'Tier 3 刚需区' },
              { id: 1, label: 'Tier 4 老城区' },
            ].map((item) => (
              <button
                key={String(item.id)}
                type="button"
                onClick={() => setSelectedTierFilter(item.id as any)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  selectedTierFilter === item.id
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="h-[380px] w-full">
          <ReactECharts
            option={parallelOption}
            style={{ height: '100%', width: '100%' }}
            notMerge={true}
          />
        </div>
      </BentoCard>
    </div>
  );
};

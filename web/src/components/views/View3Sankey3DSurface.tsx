import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import 'echarts-gl';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { Box, GitBranch, Grid, Sparkles } from 'lucide-react';
import { AnalyticsPayload } from '../../types/analytics';
import { BentoCard } from '../ui/BentoCard';
import {
  CHART_COLORS,
  ECHARTS_DARK_TOOLTIP,
  NIVO_DARK_THEME,
  formatCompactUSD,
  formatUSD,
} from '../../theme/chartTheme';

interface View3Props {
  payload: AnalyticsPayload;
}

export const View3Sankey3DSurface: React.FC<View3Props> = ({ payload }) => {
  const { shap_xai, engineered_lineage } = payload;
  const { sankey_lineage, surface_3d, correlation_heatmap } = shap_xai;
  const [showScatterOverlay, setShowScatterOverlay] = useState<boolean>(true);

  // 1. ECharts Sankey Feature Lineage Diagram
  const sankeyOption = useMemo(() => {
    const categoryColorMap: Record<string, string> = {
      'Raw Input': '#38BDF8',
      'Engineering Operator': '#8B5CF6',
      'Engineered Feature': '#10B981',
      'Model Target': '#F59E0B',
    };

    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'item',
        triggerOn: 'mousemove',
      },
      series: [
        {
          type: 'sankey',
          left: 16,
          right: 175,
          top: 16,
          bottom: 16,
          nodeWidth: 16,
          nodeGap: 12,
          layoutIterations: 32,
          emphasis: { focus: 'adjacency' },
          data: sankey_lineage.nodes.map((n) => ({
            name: n.name,
            itemStyle: {
              color: categoryColorMap[n.category] || CHART_COLORS.cyan,
              borderColor: 'rgba(255,255,255,0.25)',
              borderWidth: 1,
            },
          })),
          links: sankey_lineage.links,
          lineStyle: {
            color: 'gradient',
            curveness: 0.48,
            opacity: 0.36,
          },
          label: {
            color: '#F1F5F9',
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
          },
        },
      ],
    };
  }, [sankey_lineage]);

  // 2. ECharts-GL 3D Non-Linear Response Surface (OverallQual × TotalSF × SalePrice)
  const surface3DOption = useMemo(() => {
    const scatterData = surface_3d.scatter_points.map((pt) => [
      pt.total_sf,
      pt.overall_qual,
      pt.sale_price,
      pt.neighborhood,
    ]);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        formatter: (params: any) => {
          const v = params.value;
          if (!Array.isArray(v)) return '';
          return `
            <div class="space-y-1">
              <div class="font-semibold text-cyan-300">${params.seriesName}</div>
              <div class="text-xs text-slate-200">总面积 TotalSF: <span class="font-mono text-white">${v[0].toLocaleString()} sq.ft</span></div>
              <div class="text-xs text-slate-200">建筑质量 OverallQual: <span class="font-mono text-violet-300">${v[1]}/10</span></div>
              <div class="text-xs text-slate-200">估值/成交价 SalePrice: <span class="font-mono text-emerald-300 font-bold">${formatUSD(v[2])}</span></div>
            </div>
          `;
        },
      },
      visualMap: {
        show: true,
        dimension: 2,
        min: 75000,
        max: 520000,
        right: 8,
        bottom: 16,
        itemWidth: 12,
        itemHeight: 110,
        text: ['高溢价 ($520k+)', '低价 ($75k)'],
        textStyle: { color: '#94A3B8', fontSize: 10 },
        inRange: {
          color: ['#1E3A8A', '#06B6D4', '#10B981', '#F59E0B', '#F43F5E'],
        },
      },
      xAxis3D: {
        name: 'TotalSF (sq.ft)',
        type: 'value',
        min: 800,
        max: 4600,
        nameTextStyle: { color: '#38BDF8', fontSize: 11 },
        axisLabel: { color: '#94A3B8', fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.35)' } },
      },
      yAxis3D: {
        name: 'OverallQual (3-10)',
        type: 'value',
        min: 3,
        max: 10,
        nameTextStyle: { color: '#A78BFA', fontSize: 11 },
        axisLabel: { color: '#94A3B8', fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.35)' } },
      },
      zAxis3D: {
        name: 'SalePrice ($)',
        type: 'value',
        min: 50000,
        max: 580000,
        nameTextStyle: { color: '#34D399', fontSize: 11 },
        axisLabel: {
          color: '#94A3B8',
          fontSize: 10,
          formatter: (v: number) => formatCompactUSD(v),
        },
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.35)' } },
      },
      grid3D: {
        boxWidth: 115,
        boxDepth: 95,
        boxHeight: 80,
        viewControl: {
          projection: 'perspective',
          autoRotate: false,
          alpha: 24,
          beta: -42,
          distance: 215,
        },
        light: {
          main: { intensity: 1.25, shadow: true },
          ambient: { intensity: 0.45 },
        },
      },
      series: [
        {
          name: 'GBDT 响应曲面 (OverallQual × TotalSF)',
          type: 'surface',
          wireframe: {
            show: true,
            lineStyle: { color: 'rgba(255,255,255,0.18)', width: 0.8 },
          },
          shading: 'realistic',
          itemStyle: { opacity: 0.84 },
          data: surface_3d.surface_points,
        },
        ...(showScatterOverlay
          ? [
              {
                name: '真实交易样本点 (Real Transactions)',
                type: 'scatter3D',
                symbolSize: 5,
                itemStyle: {
                  color: '#F8FAFC',
                  opacity: 0.85,
                },
                data: scatterData,
              },
            ]
          : []),
      ],
    };
  }, [surface_3d, showScatterOverlay]);

  return (
    <div className="space-y-5">
      {/* Row 1: Sankey Feature Lineage (7 cols) + 3D Response Surface (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <BentoCard
          className="lg:col-span-7"
          title="全链路特征工程血缘桑基图 (ECharts Feature Lineage Sankey)"
          subtitle="直观展示 6 大原始特征域 → 5 类特征工程算子 → 核心衍生特征簇 → 最终估值模型贡献度的完整拓扑流向"
          badge="Apache ECharts 5 Sankey"
          badgeTone="cyan"
          insight="通过桑基图的流量宽度可以清晰看到：由『空间聚合』与『非线性交互』算子生成的 OverallQual × TotalSF 和 TotalSF 贡献了最大的模型预测信息通量，直观解释了特征工程是如何将分散的原始信号汇聚为强预测因子的。"
        >
          <div className="h-[430px] w-full">
            <ReactECharts
              option={sankeyOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </BentoCard>

        <BentoCard
          className="lg:col-span-5"
          title="3D 交互响应曲面：品质 × 空间超线性溢价 (ECharts-GL WebGL)"
          subtitle="按住鼠标拖拽旋转 3D 视角，观察 TotalSF 与 OverallQual 同时升高时的曲面陡峭翘起效应"
          badge="ECharts-GL 3D Surface"
          badgeTone="violet"
          insight="3D 响应曲面并非平面，而是在高 OverallQual (>8) 且大 TotalSF (>3000 sq.ft) 象限呈现剧烈的超线性向上弯曲（红色峰值区突破 $480k+），三维立体印证了构造乘积交互特征的必要性。"
          headerRight={
            <button
              type="button"
              onClick={() => setShowScatterOverlay((v) => !v)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-cyan-300 hover:border-cyan-400 transition-colors"
            >
              {showScatterOverlay ? '隐藏真实样本点' : '叠加真实样本点'}
            </button>
          }
        >
          <div className="h-[430px] w-full">
            <ReactECharts
              option={surface3DOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </BentoCard>
      </div>

      {/* Row 2: Nivo 10x10 Correlation Matrix Heatmap (6 cols) + Engineered Formula Dictionary (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <BentoCard
          className="lg:col-span-6"
          title="核心原始与合成特征相关性矩阵热力图 (Nivo Heatmap)"
          subtitle="基于开源 @nivo/heatmap 渲染 SalePrice 与 9 大核心原始/合成特征之间的皮尔逊相关系数矩阵"
          badge="@nivo/heatmap"
          badgeTone="emerald"
          insight="热力图第一行/第一列直观显示：排名前三的强相关特征依次是合成特征 OverallQual_x_TotalSF (0.865)、TotalSF (0.824) 与 AmenityScore (0.812)，全部超越原始特征 OverallQual (0.799) 与 GrLivArea (0.719)！"
        >
          <div className="h-[410px] w-full">
            <ResponsiveHeatMap
              data={correlation_heatmap}
              margin={{ top: 68, right: 24, bottom: 28, left: 130 }}
              valueFormat=">-.2f"
              axisTop={{
                tickSize: 4,
                tickPadding: 5,
                tickRotation: -32,
              }}
              axisLeft={{
                tickSize: 4,
                tickPadding: 6,
                tickRotation: 0,
              }}
              colors={{
                type: 'diverging',
                scheme: 'red_yellow_blue',
                divergeAt: 0.4,
                minValue: -0.6,
                maxValue: 1.0,
              }}
              emptyColor="#0f172a"
              borderRadius={4}
              borderWidth={1}
              borderColor="rgba(15, 23, 42, 0.9)"
              labelTextColor="#050811"
              theme={NIVO_DARK_THEME}
            />
          </div>
        </BentoCard>

        <BentoCard
          className="lg:col-span-6"
          title="合成特征数学定义、发现原因与实证增益总表"
          subtitle="完整记录 12 项核心合成特征的数学表达式、父特征基线以及加入后的真实相关性跃升"
          badge="12 Core Engineered Features"
          badgeTone="cyan"
        >
          <div className="overflow-y-auto max-h-[410px] pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="py-2 px-2.5">衍生特征名称</th>
                  <th className="py-2 px-2.5">数学构造公式</th>
                  <th className="py-2 px-2.5 text-right">父特征 |r|</th>
                  <th className="py-2 px-2.5 text-right">新特征 |r|</th>
                  <th className="py-2 px-2.5 text-right">净提升 Δ|r|</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {engineered_lineage.map((item) => (
                  <tr
                    key={item.feature}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-2.5">
                      <div className="font-mono font-semibold text-cyan-300">
                        {item.feature}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.group}
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 font-mono text-[11px] text-slate-300">
                      {item.formula}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-amber-300">
                      {item.best_parent_corr.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-bold tabular-nums text-emerald-300">
                      {item.abs_corr.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          item.lift_over_parent >= 0
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.lift_over_parent >= 0 ? '+' : ''}
                        {item.lift_over_parent.toFixed(3)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BentoCard>
      </div>
    </div>
  );
};

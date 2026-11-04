import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import 'echarts-gl';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { Box, GitBranch, Grid, RotateCw } from 'lucide-react';
import { AnalyticsPayload } from '../../types/analytics';
import {
  CHART_COLORS,
  ECHARTS_DARK_TOOLTIP,
  NIVO_DARK_THEME,
  formatCompactUSD,
  formatUSD,
} from '../../theme/chartTheme';

interface Page5Props {
  payload: AnalyticsPayload;
}

export const Page5Topology3DSankey: React.FC<Page5Props> = ({ payload }) => {
  const { shap_xai, engineered_lineage } = payload;
  const { sankey_lineage, surface_3d, correlation_heatmap } = shap_xai;

  const [autoRotate3D, setAutoRotate3D] = useState<boolean>(true);
  const [showScatter3D, setShowScatter3D] = useState<boolean>(true);
  const [bottomMode, setBottomMode] = useState<'sankey' | 'heatmap'>('sankey');

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
              <div class="text-xs text-slate-200">TotalSF (总空间): <span class="font-mono text-white">${v[0].toLocaleString()} sq.ft</span></div>
              <div class="text-xs text-slate-200">OverallQual (品质): <span class="font-mono text-violet-300">${v[1]}/10</span></div>
              <div class="text-xs text-slate-200">SalePrice (估值): <span class="font-mono text-emerald-300 font-bold">${formatUSD(v[2])}</span></div>
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
        text: ['$520k+', '$75k'],
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
        boxHeight: 82,
        viewControl: {
          projection: 'perspective',
          autoRotate: autoRotate3D,
          autoRotateSpeed: 8,
          alpha: 24,
          beta: -42,
          distance: 205,
        },
        light: {
          main: { intensity: 1.3, shadow: true },
          ambient: { intensity: 0.45 },
        },
      },
      series: [
        {
          name: 'GBDT 3D 响应曲面 (OverallQual × TotalSF)',
          type: 'surface',
          wireframe: {
            show: true,
            lineStyle: { color: 'rgba(255,255,255,0.2)', width: 0.8 },
          },
          shading: 'realistic',
          itemStyle: { opacity: 0.86 },
          data: surface_3d.surface_points,
        },
        ...(showScatter3D
          ? [
              {
                name: '真实交易房产散点',
                type: 'scatter3D',
                symbolSize: 5.5,
                itemStyle: { color: '#F8FAFC', opacity: 0.88 },
                data: scatterData,
              },
            ]
          : []),
      ],
    };
  }, [surface_3d, autoRotate3D, showScatter3D]);

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
          right: 170,
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
            opacity: 0.4,
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

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header Strip */}
      <div className="rounded-3xl bg-slate-900/85 border border-slate-800/90 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-violet-500/15 border border-violet-500/35 text-violet-300">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">
                PAGE 05 · 3D TOPOLOGY & FEATURE LINEAGE
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-white">
                WebGL 3D 超线性响应曲面与全链路特征血缘桑基图
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              左侧通过 ECharts-GL 3D 旋转曲面立体呈现 OverallQual × TotalSF 的超线性溢价翘起；右侧追踪从原始字段到最终模型的信息通量
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRotate3D((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
              autoRotate3D
                ? 'bg-violet-500/25 border-violet-400 text-violet-200'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${autoRotate3D ? 'animate-spin' : ''}`}
            />
            <span>{autoRotate3D ? '3D 自动旋转中' : '开启 3D 旋转'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowScatter3D((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              showScatter3D
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            {showScatter3D ? '已叠加真实交易散点' : '显示真实散点'}
          </button>
        </div>
      </div>

      {/* Main Split Stage: 3D Surface (6 cols) + Sankey / Nivo Correlation Switcher (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 rounded-3xl bg-slate-900/75 border border-slate-800/90 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-white">
                WebGL 3D 交互响应曲面 (OverallQual × TotalSF → SalePrice)
              </h2>
              <p className="text-xs text-slate-400">
                可按住鼠标左键任意旋转视角、滚轮缩放；右上角红色峰区展示豪宅超线性溢价
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/30">
              ECharts-GL 3D
            </span>
          </div>
          <div className="h-[460px] w-full">
            <ReactECharts
              option={surface3DOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </div>

        <div className="lg:col-span-6 rounded-3xl bg-slate-900/75 border border-slate-800/90 p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <h2 className="text-base font-bold text-white">
                {bottomMode === 'sankey'
                  ? '全链路特征血缘桑基图 (Feature Lineage Sankey)'
                  : '10×10 原始 vs 衍生特征相关性矩阵 (@nivo/heatmap)'}
              </h2>
              <p className="text-xs text-slate-400">
                {bottomMode === 'sankey'
                  ? '鼠标悬停任意节点高亮整条特征合成链路与模型贡献权重'
                  : '合成特征 OverallQual_x_TotalSF (0.87) 与 TotalSF (0.82) 稳居相关性榜首'}
              </p>
            </div>

            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setBottomMode('sankey')}
                className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                  bottomMode === 'sankey'
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>桑基血缘拓扑</span>
              </button>
              <button
                type="button"
                onClick={() => setBottomMode('heatmap')}
                className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                  bottomMode === 'heatmap'
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Nivo 相关热力矩阵</span>
              </button>
            </div>
          </div>

          <div className="h-[460px] w-full">
            {bottomMode === 'sankey' ? (
              <ReactECharts
                option={sankeyOption}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
              />
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

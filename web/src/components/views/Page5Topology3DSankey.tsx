import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import 'echarts-gl';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { RotateCw } from 'lucide-react';
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

interface Page5Props {
  payload: AnalyticsPayload;
}

const STEPS: DerivationStep[] = [
  {
    id: 'surface',
    label: '看见超线性',
    question: '为什么交互项不是多余的？',
    narrative:
      '在 3D 曲面上，TotalSF × OverallQual → SalePrice 不是平面。右上角豪宅象限明显翘起——同面积，高品质的溢价加速度更大。这就是 OverallQual×TotalSF 的几何直觉。',
    formula: 'Price ≈ f(TotalSF, OverallQual)  非线性 · 可旋转检视',
  },
  {
    id: 'scatter',
    label: '叠上真实成交',
    question: '曲面是模型幻觉，还是数据支持？',
    narrative:
      '打开真实交易散点：点云沿曲面分布，高品质大面积落在红色高峰区。拖动旋转，确认「翘起」不是渲染假象。',
  },
  {
    id: 'sankey',
    label: '追溯特征血缘',
    question: '这些强信号从哪几列「长」出来？',
    narrative:
      '桑基图把 Raw → 算子 → 工程特征 → 模型目标 的信息通量摊开。悬停任一节点，高亮整条合成链路——展示用的是证据链，不是黑盒列名。',
  },
  {
    id: 'heatmap',
    label: '相关矩阵对照',
    question: '合成特征是否真压过原始父特征？',
    narrative:
      '切换热力矩阵：OverallQual_x_TotalSF、TotalSF 稳居与房价相关前列。这是「发现篇」相关梯子在拓扑空间的复述。',
    metric: 'OverallQual×TotalSF  r ≈ 0.87  ·  TotalSF  r ≈ 0.82',
  },
];

export const Page5Topology3DSankey: React.FC<Page5Props> = ({ payload }) => {
  const { shap_xai } = payload;
  const { sankey_lineage, surface_3d, correlation_heatmap } = shap_xai;

  const [step, setStep] = useState(0);
  const [autoRotate3D, setAutoRotate3D] = useState(true);
  const [showScatter3D, setShowScatter3D] = useState(false);
  const [viewDim, setViewDim] = useState<'3d' | 'sankey' | 'heatmap'>('3d');

  useEffect(() => {
    if (step === 0) {
      setViewDim('3d');
      setShowScatter3D(false);
      setAutoRotate3D(true);
    } else if (step === 1) {
      setViewDim('3d');
      setShowScatter3D(true);
    } else if (step === 2) {
      setViewDim('sankey');
    } else {
      setViewDim('heatmap');
    }
  }, [step]);

  const dims: AnalysisDimension[] = [
    { id: '3d', label: '3D 响应曲面', hint: 'OverallQual × TotalSF' },
    { id: 'sankey', label: '桑基血缘', hint: '特征信息通量' },
    { id: 'heatmap', label: '相关热力', hint: '原始 vs 衍生' },
  ];

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
        formatter: (params: { seriesName: string; value: number[] }) => {
          const v = params.value;
          if (!Array.isArray(v)) return '';
          return `<div><b>${params.seriesName}</b><br/>TotalSF ${v[0].toLocaleString()} · Qual ${v[1]} · ${formatUSD(v[2])}</div>`;
        },
      },
      visualMap: {
        show: true,
        dimension: 2,
        min: 75000,
        max: 520000,
        right: 8,
        bottom: 16,
        itemWidth: 10,
        itemHeight: 100,
        text: ['高价', '低价'],
        textStyle: { color: '#94A3B8', fontSize: 10 },
        inRange: {
          color: ['#1E3A8A', '#06B6D4', '#10B981', '#F59E0B', '#F43F5E'],
        },
      },
      xAxis3D: {
        name: 'TotalSF',
        type: 'value',
        min: 800,
        max: 4600,
        nameTextStyle: { color: '#38BDF8', fontSize: 11 },
        axisLabel: { color: '#94A3B8', fontSize: 10 },
      },
      yAxis3D: {
        name: 'OverallQual',
        type: 'value',
        min: 3,
        max: 10,
        nameTextStyle: { color: '#A78BFA', fontSize: 11 },
        axisLabel: { color: '#94A3B8', fontSize: 10 },
      },
      zAxis3D: {
        name: 'SalePrice',
        type: 'value',
        min: 50000,
        max: 580000,
        nameTextStyle: { color: '#34D399', fontSize: 11 },
        axisLabel: {
          color: '#94A3B8',
          fontSize: 10,
          formatter: (v: number) => formatCompactUSD(v),
        },
      },
      grid3D: {
        boxWidth: 115,
        boxDepth: 95,
        boxHeight: 82,
        viewControl: {
          projection: 'perspective',
          autoRotate: autoRotate3D,
          autoRotateSpeed: 7,
          alpha: 24,
          beta: -42,
          distance: 205,
        },
        light: {
          main: { intensity: 1.25, shadow: true },
          ambient: { intensity: 0.45 },
        },
      },
      series: [
        {
          name: '响应曲面',
          type: 'surface',
          wireframe: {
            show: true,
            lineStyle: { color: 'rgba(255,255,255,0.18)', width: 0.7 },
          },
          shading: 'realistic',
          itemStyle: { opacity: 0.86 },
          data: surface_3d.surface_points,
        },
        ...(showScatter3D
          ? [
              {
                name: '真实成交',
                type: 'scatter3D',
                symbolSize: 5,
                itemStyle: { color: '#F8FAFC', opacity: 0.85 },
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
      tooltip: { ...ECHARTS_DARK_TOOLTIP, trigger: 'item' },
      series: [
        {
          type: 'sankey',
          left: 12,
          right: 150,
          top: 12,
          bottom: 12,
          nodeWidth: 14,
          nodeGap: 10,
          layoutIterations: 32,
          emphasis: { focus: 'adjacency' },
          data: sankey_lineage.nodes.map((n) => ({
            name: n.name,
            itemStyle: {
              color: categoryColorMap[n.category] || CHART_COLORS.cyan,
            },
          })),
          links: sankey_lineage.links,
          lineStyle: { color: 'gradient', curveness: 0.48, opacity: 0.38 },
          label: { color: '#E2E8F0', fontSize: 11 },
        },
      ],
    };
  }, [sankey_lineage]);

  const insights = [
    '曲面右上角翘起 = 交互项的几何证明：品质越高，每增加一平尺的边际溢价越大。',
    '散点贴合曲面，说明超线性不是过拟合纹样，而是真实成交结构。',
    '桑基图把「特征从哪来」讲清楚——演示时应悬停高亮一条完整血缘链。',
    '热力矩阵再次确认：合成特征在相关结构上系统性压过零散原始列。',
  ];

  return (
    <PresentationStage
      chapter="05"
      kicker="拓扑篇 · 几何与血缘"
      title="交互项为什么有效：先转曲面，再追血缘"
      subtitle="这一章用空间直觉说服观众：不是「多乘了一列」，而是房价响应对品质与面积的联合曲面本就弯曲。"
      accent="violet"
      steps={STEPS}
      activeStep={step}
      onStepChange={setStep}
      dimensions={dims}
      activeDimension={viewDim}
      onDimensionChange={(id) => {
        setViewDim(id as '3d' | 'sankey' | 'heatmap');
        if (id === '3d') setStep(showScatter3D ? 1 : 0);
        if (id === 'sankey') setStep(2);
        if (id === 'heatmap') setStep(3);
      }}
      insight={insights[step]}
      aside={
        viewDim === '3d' ? (
          <div className="rounded-[20px] border border-white/8 bg-[#0A1020]/70 p-4 space-y-2">
            <button
              type="button"
              onClick={() => setAutoRotate3D((v) => !v)}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] border ${
                autoRotate3D
                  ? 'border-violet-400/40 bg-violet-500/15 text-violet-100'
                  : 'border-white/8 text-slate-400'
              }`}
            >
              <RotateCw
                className={`w-3.5 h-3.5 ${autoRotate3D ? 'animate-spin' : ''}`}
              />
              {autoRotate3D ? '自动旋转中' : '开启自动旋转'}
            </button>
            <button
              type="button"
              onClick={() => setShowScatter3D((v) => !v)}
              className={`w-full rounded-xl py-2.5 text-[12px] border ${
                showScatter3D
                  ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
                  : 'border-white/8 text-slate-400'
              }`}
            >
              {showScatter3D ? '已叠加真实散点' : '显示真实成交散点'}
            </button>
          </div>
        ) : null
      }
    >
      <div className="h-[480px] w-full">
        {viewDim === '3d' && (
          <ReactECharts
            option={surface3DOption}
            style={{ height: '100%', width: '100%' }}
            notMerge
          />
        )}
        {viewDim === 'sankey' && (
          <ReactECharts
            option={sankeyOption}
            style={{ height: '100%', width: '100%' }}
            notMerge
          />
        )}
        {viewDim === 'heatmap' && (
          <ResponsiveHeatMap
            data={correlation_heatmap}
            margin={{ top: 64, right: 20, bottom: 24, left: 120 }}
            valueFormat=">-.2f"
            axisTop={{ tickSize: 4, tickPadding: 5, tickRotation: -32 }}
            axisLeft={{ tickSize: 4, tickPadding: 6, tickRotation: 0 }}
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
    </PresentationStage>
  );
};

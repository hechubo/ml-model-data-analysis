import React from 'react';
import {
  Activity,
  Compass,
  Cpu,
  Database,
  Flame,
  GitBranch,
  Layers,
  Sliders,
} from 'lucide-react';
import { SummaryKpis } from '../../types/analytics';

export type WorkbenchTabId =
  | 'tab1-eda-outlier'
  | 'tab2-feature-discovery'
  | 'tab3-sankey-3d'
  | 'tab4-spatial-parallel'
  | 'tab5-ablation-shap';

interface TopNavHeaderProps {
  activeTab: WorkbenchTabId;
  onSelectTab: (tab: WorkbenchTabId) => void;
  kpis: SummaryKpis;
  apiOnline: boolean;
}

const TABS: {
  id: WorkbenchTabId;
  step: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'tab1-eda-outlier',
    step: 'STAGE 01',
    label: '异常诊断与缺失值语义',
    sub: "Cook's D 手术 & 设施溢价检验",
    icon: <Database className="w-4 h-4" />,
  },
  {
    id: 'tab2-feature-discovery',
    step: 'STAGE 02',
    label: '特征发现与偏态修正工坊',
    sub: '为什么加这些特征？斜率/折旧/Box-Cox',
    icon: <Flame className="w-4 h-4" />,
  },
  {
    id: 'tab3-sankey-3d',
    step: 'STAGE 03',
    label: '特征血缘桑基图与 3D 曲面',
    sub: 'ECharts-GL 3D 交互响应 & 相关矩阵',
    icon: <GitBranch className="w-4 h-4" />,
  },
  {
    id: 'tab4-spatial-parallel',
    step: 'STAGE 04',
    label: '28社区编码与高维平行坐标',
    sub: '经验贝叶斯平滑 & Nivo 雷达画像',
    icon: <Compass className="w-4 h-4" />,
  },
  {
    id: 'tab5-ablation-shap',
    step: 'STAGE 05',
    label: '4阶段消融验证与 SHAP 模拟器',
    sub: '7步增量瀑布 + 实时 What-If 估值',
    icon: <Sliders className="w-4 h-4" />,
  },
];

export const TopNavHeader: React.FC<TopNavHeaderProps> = ({
  activeTab,
  onSelectTab,
  kpis,
  apiOnline,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/85 bg-[#050811]/85 backdrop-blur-2xl">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/25 via-violet-500/20 to-emerald-500/20 border border-cyan-400/40 flex items-center justify-center shadow-inner">
              <Layers className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  AmesChronicle
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  FEATURE ENGINEERING & XAI LAB
                </span>
              </div>
              <p className="text-xs text-slate-400">
                从探索性数据诊断 → 领域特征构造 → 4阶段交叉验证消融 → SHAP 美元级归因全链路工作台
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">样本规模:</span>
              <span className="text-slate-100 font-semibold tabular-nums">
                {kpis.total_transactions.toLocaleString()} 套房产 × {kpis.raw_feature_count}→{kpis.engineered_feature_count} 维特征
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">消融 R² 跃迁:</span>
              <span className="text-emerald-300 font-semibold tabular-nums">
                {kpis.r2_baseline.toFixed(4)} → {kpis.r2_final.toFixed(4)} (-{kpis.rmse_reduction_pct}% RMSE)
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'
                }`}
              />
              <span className="text-slate-300">
                {apiOnline ? 'FastAPI 实时推理引擎已连接' : '内置校准 SHAP 引擎就绪'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Stage Tabs */}
        <nav
          aria-label="Analytical Stages"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-3"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`group text-left rounded-xl px-3.5 py-2.5 border transition-all flex items-start gap-3 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 via-slate-900/90 to-violet-500/15 border-cyan-400/50 shadow-[0_0_24px_rgba(6,182,212,0.18)]'
                    : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700'
                }`}
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-lg border ${
                    isActive
                      ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                      : 'bg-slate-800/70 border-slate-700/60 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {tab.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-mono font-semibold tracking-wider ${
                        isActive ? 'text-cyan-300' : 'text-slate-500'
                      }`}
                    >
                      {tab.step}
                    </span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    )}
                  </div>
                  <div
                    className={`text-xs font-semibold truncate mt-0.5 ${
                      isActive ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {tab.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

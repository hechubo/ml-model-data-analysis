import React from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Compass,
  Flame,
  Layers,
  Microscope,
  Rocket,
  Sliders,
  Sparkles,
  Waves,
} from 'lucide-react';
import { SummaryKpis } from '../../types/analytics';

export type PageId =
  | 'page-1-hero'
  | 'page-2-outlier-missing'
  | 'page-3-skewness-morph'
  | 'page-4-feature-discovery'
  | 'page-5-topology-3d'
  | 'page-6-spatial-parallel'
  | 'page-7-ablation-shap';

export interface PageSpec {
  id: PageId;
  num: string;
  shortTitle: string;
  fullTitle: string;
  subtitle: string;
  accent: string;
  icon: React.ReactNode;
}

export const PAGES: PageSpec[] = [
  {
    id: 'page-1-hero',
    num: '01',
    shortTitle: '全链路总览与流水线',
    fullTitle: '序章：从原始脏数据到 R²=0.9272 的特征工程全景',
    subtitle: '点击交互式五阶段流水线节点，追踪每一次数据诊断如何转化为模型性能跃迁',
    accent: 'from-cyan-400 to-sky-500',
    icon: <Rocket className="w-4 h-4" />,
  },
  {
    id: 'page-2-outlier-missing',
    num: '02',
    shortTitle: '离群点手术与缺失真相',
    fullTitle: '诊断篇：Cook’s D 高杠杆动态手术与 27 维缺失值设施溢价',
    subtitle: '拖动 Cook’s D 阈值滑块实时切除异常交易，点击缺失字段剖析『有设施 vs 无设施』的价格断层',
    accent: 'from-rose-400 to-amber-500',
    icon: <Microscope className="w-4 h-4" />,
  },
  {
    id: 'page-3-skewness-morph',
    num: '03',
    shortTitle: '偏态长尾动态变形记',
    fullTitle: '分布篇：连续拖拽幂指数 λ，实时体验 Box-Cox / Log1p 正态化变形',
    subtitle: '直观展示为什么要对右偏特征做正态变换：实时观察核密度曲线与 Q-Q 图如何收敛至对角线',
    accent: 'from-amber-400 to-emerald-400',
    icon: <Waves className="w-4 h-4" />,
  },
  {
    id: 'page-4-feature-discovery',
    num: '04',
    shortTitle: '5大特征发现因果工坊',
    fullTitle: '发现篇：我们是怎么从数据分析中看出哪些新特征有用的？',
    subtitle: '切换 5 大核心实证发现，对比『改造前原始特征』与『改造后衍生特征』的斜率跃迁与相关性暴涨',
    accent: 'from-cyan-400 to-emerald-400',
    icon: <Flame className="w-4 h-4" />,
  },
  {
    id: 'page-5-topology-3d',
    num: '05',
    shortTitle: '3D响应曲面与桑基拓扑',
    fullTitle: '拓扑篇：WebGL 3D 超线性响应曲面、特征血缘桑基图与相关矩阵',
    subtitle: '三维立体旋转检视 OverallQual × TotalSF 超线性翘起效应，追踪从原始字段到最终估值的信号通量',
    accent: 'from-violet-400 to-fuchsia-500',
    icon: <Box className="w-4 h-4" />,
  },
  {
    id: 'page-6-spatial-parallel',
    num: '06',
    shortTitle: '28社区编码与平行坐标',
    fullTitle: '空间篇：经验贝叶斯社区平滑编码、Nivo 六维雷达与 7 轴平行坐标刷选',
    subtitle: '点击气泡动态对比任意社区六维画像，在平行坐标轴上框选追踪豪宅与高性价比房源轨迹',
    accent: 'from-sky-400 to-indigo-500',
    icon: <Compass className="w-4 h-4" />,
  },
  {
    id: 'page-7-ablation-shap',
    num: '07',
    shortTitle: '消融沙盒与SHAP模拟器',
    fullTitle: '决胜篇：交互式特征开关消融沙盒与 SHAP 美元级实时估值模拟器',
    subtitle: '亲手勾选/关闭任意特征工程模块实时重算模型误差，拖动房源滑块生成实时 SHAP 瀑布归因图',
    accent: 'from-emerald-400 to-cyan-400',
    icon: <Sliders className="w-4 h-4" />,
  },
];

interface TopStageStepperProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  kpis: SummaryKpis;
  apiOnline: boolean;
}

export const TopStageStepper: React.FC<TopStageStepperProps> = ({
  activePage,
  onSelectPage,
  kpis,
  apiOnline,
}) => {
  const activeIdx = PAGES.findIndex((p) => p.id === activePage);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#04070F]/80 backdrop-blur-2xl">
      <div className="max-w-[1640px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <button
          type="button"
          onClick={() => onSelectPage('page-1-hero')}
          className="flex items-center gap-3 text-left group shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-violet-500 to-emerald-400 p-[1px] shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <div className="w-full h-full bg-[#060A16] rounded-[11px] flex items-center justify-center">
              <Layers className="w-4 h-4 text-cyan-300 group-hover:rotate-12 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white">
                AmesChronicle
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                7-PAGE INTERACTIVE LAB
              </span>
            </div>
            <div className="text-[11px] text-slate-400 hidden md:block">
              数据诊断 → 特征构造 → 消融验证 → SHAP 归因
            </div>
          </div>
        </button>

        {/* Center 7-Page Stepper Pills */}
        <nav
          aria-label="Multi-page presentation navigation"
          className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 no-scrollbar"
        >
          {PAGES.map((page, idx) => {
            const isActive = page.id === activePage;
            const isPassed = idx < activeIdx;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => onSelectPage(page.id)}
                className={`relative px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'text-white bg-slate-800/90 border border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.22)]'
                    : isPassed
                    ? 'text-slate-300 bg-slate-900/50 border border-emerald-500/25 hover:bg-slate-800/60'
                    : 'text-slate-400 bg-slate-900/30 border border-slate-800/70 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    isActive
                      ? 'bg-cyan-400 text-slate-950'
                      : isPassed
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {page.num}
                </span>
                <span className="hidden xl:inline">{page.shortTitle}</span>
                {isActive && (
                  <motion.div
                    layoutId="activePageUnderline"
                    className="absolute inset-x-2 -bottom-[1px] h-[2px] rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Live Telemetry Badge */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0 text-xs font-mono">
          <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>R² {kpis.r2_baseline.toFixed(2)}→{kpis.r2_final.toFixed(4)}</span>
          </div>
          <div
            title={apiOnline ? 'FastAPI Backend Connected' : 'Local Calibrated Engine'}
            className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10B981]"
          />
        </div>
      </div>
    </header>
  );
};

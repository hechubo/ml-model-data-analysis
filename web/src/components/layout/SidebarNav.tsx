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
    shortTitle: '总览',
    fullTitle: '为什么要从「数据分析」出发做特征工程？',
    subtitle: '先建立问题意识：79 维原始字段里，哪些信号被埋没，哪些噪声在拖累模型',
    accent: 'from-cyan-400 to-sky-500',
    icon: <Rocket className="w-3.5 h-3.5" />,
  },
  {
    id: 'page-2-outlier-missing',
    num: '02',
    shortTitle: '诊断',
    fullTitle: '先看病再开刀：离群杠杆与缺失语义',
    subtitle: '一步步证明：哪些点在扭曲斜率，哪些 NA 其实是「没有设施」的强特征',
    accent: 'from-rose-400 to-amber-500',
    icon: <Microscope className="w-3.5 h-3.5" />,
  },
  {
    id: 'page-3-skewness-morph',
    num: '03',
    shortTitle: '分布',
    fullTitle: '为什么要做正态变换？偏态如何伤害回归',
    subtitle: '拖动 λ，亲自看直方图与 Q-Q 图如何从「右偏长尾」收敛到高斯基准线',
    accent: 'from-amber-400 to-emerald-400',
    icon: <Waves className="w-3.5 h-3.5" />,
  },
  {
    id: 'page-4-feature-discovery',
    num: '04',
    shortTitle: '发现',
    fullTitle: '五个发现：我们如何看出哪些新特征有用',
    subtitle: '每个发现都走完：观察现象 → 提出假设 → 验证证据 → 写出公式 → 量化收益',
    accent: 'from-cyan-400 to-emerald-400',
    icon: <Flame className="w-3.5 h-3.5" />,
  },
  {
    id: 'page-5-topology-3d',
    num: '05',
    shortTitle: '拓扑',
    fullTitle: '交互项为什么有效：3D 曲面与特征血缘',
    subtitle: '在三维空间里看见超线性溢价，再沿桑基图追溯信号从哪来、流向哪里',
    accent: 'from-violet-400 to-fuchsia-500',
    icon: <Box className="w-3.5 h-3.5" />,
  },
  {
    id: 'page-6-spatial-parallel',
    num: '06',
    shortTitle: '空间',
    fullTitle: '社区与多维画像：编码与刷选',
    subtitle: '交互切换社区维度，用平行坐标刷出豪宅与高性价比房源的轨迹差异',
    accent: 'from-sky-400 to-indigo-500',
    icon: <Compass className="w-3.5 h-3.5" />,
  },
  {
    id: 'page-7-ablation-shap',
    num: '07',
    shortTitle: '验证',
    fullTitle: '消融证明 + SHAP：特征工程是否真的赚到了',
    subtitle: '开关每一组工程模块，实时看误差变化；再把单套估值拆成美元级归因',
    accent: 'from-emerald-400 to-cyan-400',
    icon: <Sliders className="w-3.5 h-3.5" />,
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
}) => {
  const activeIdx = PAGES.findIndex((p) => p.id === activePage);
  const active = PAGES[activeIdx];

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#060A14]/78 backdrop-blur-2xl">
      <div className="max-w-[1680px] mx-auto px-5 sm:px-7 h-[68px] flex items-center justify-between gap-5">
        <button
          type="button"
          onClick={() => onSelectPage('page-1-hero')}
          className="flex items-center gap-3 text-left group shrink-0"
        >
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-400/90 to-emerald-400/80 p-[1px]">
            <div className="w-full h-full rounded-[15px] bg-[#070B16] flex items-center justify-center">
              <Layers className="w-4 h-4 text-cyan-300" />
            </div>
          </div>
          <div>
            <div className="text-[13px] font-semibold tracking-tight text-white">
              AmesChronicle
            </div>
            <div className="text-[11px] text-slate-500 hidden sm:block">
              演示讲稿 · 逐步推导
            </div>
          </div>
        </button>

        {/* Compact chapter rail — presentation filmstrip */}
        <nav
          aria-label="演示章节"
          className="flex-1 flex items-center justify-center gap-1 overflow-x-auto no-scrollbar py-1"
        >
          {PAGES.map((page, idx) => {
            const isActive = page.id === activePage;
            const isPassed = idx < activeIdx;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => onSelectPage(page.id)}
                title={page.fullTitle}
                className={`relative flex items-center gap-2 rounded-full px-2.5 sm:px-3 py-1.5 text-[12px] transition-all shrink-0 ${
                  isActive
                    ? 'bg-white/[0.08] text-white border border-white/15'
                    : isPassed
                    ? 'text-emerald-300/90 border border-transparent hover:bg-white/[0.04]'
                    : 'text-slate-500 border border-transparent hover:text-slate-300 hover:bg-white/[0.03]'
                }`}
              >
                <span
                  className={`font-mono text-[10px] ${
                    isActive
                      ? 'text-cyan-300'
                      : isPassed
                      ? 'text-emerald-400/80'
                      : 'text-slate-600'
                  }`}
                >
                  {page.num}
                </span>
                <span className="hidden lg:inline">{page.shortTitle}</span>
                {isActive && (
                  <motion.span
                    layoutId="chapterDot"
                    className="absolute inset-x-3 -bottom-[7px] h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-mono">
              Live R²
            </div>
            <div className="font-mono text-[13px] text-emerald-300">
              {kpis.r2_baseline.toFixed(2)} → {kpis.r2_final.toFixed(4)}
            </div>
          </div>
        </div>
      </div>

      {/* Subtle chapter context line under header */}
      <div className="border-t border-white/[0.04] bg-black/20">
        <div className="max-w-[1680px] mx-auto px-5 sm:px-7 py-2 flex items-center gap-3 text-[12px] text-slate-400">
          <span className="font-mono text-cyan-400/90">{active?.num}</span>
          <span className="text-white/90 font-medium truncate">
            {active?.fullTitle}
          </span>
          <span className="hidden xl:inline text-slate-600">·</span>
          <span className="hidden xl:inline truncate text-slate-500">
            {active?.subtitle}
          </span>
          <span className="ml-auto font-mono text-[10px] text-slate-600 hidden sm:inline">
            ← → 翻页 · Space 推进本页推导
          </span>
        </div>
      </div>
    </header>
  );
};

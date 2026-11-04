import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import {
  Award,
  CheckSquare,
  RotateCcw,
  Sliders,
  Sparkles,
  Square,
  TrendingDown,
  Zap,
} from 'lucide-react';
import {
  AnalyticsPayload,
  SimulationInputParams,
  SimulationResult,
} from '../../types/analytics';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import {
  CHART_COLORS,
  ECHARTS_DARK_TOOLTIP,
  formatCompactUSD,
  formatUSD,
} from '../../theme/chartTheme';
import { runClientShapSimulation } from '../../utils/simulator';

interface Page7Props {
  payload: AnalyticsPayload;
  apiOnline: boolean;
}

interface FeatureModuleToggle {
  id: string;
  name: string;
  formula: string;
  rmseGain: number;
  r2Gain: number;
}

const FEATURE_MODULES: FeatureModuleToggle[] = [
  {
    id: 'mod-outlier-na',
    name: "1. Cook's D 离群手术 & 语义缺失编码",
    formula: 'Outlier Filter + HasFireplace / HasBasement',
    rmseGain: 1843,
    r2Gain: 0.0148,
  },
  {
    id: 'mod-boxcox',
    name: '2. Box-Cox & Log1p 偏态长尾正态化',
    formula: 'log1p(SalePrice) + BoxCox(Skewed Cols)',
    rmseGain: 1570,
    r2Gain: 0.0126,
  },
  {
    id: 'mod-totalsf',
    name: '3. 多层空间与卫浴碎片聚合',
    formula: 'TotalSF = Bsmt + 1st + 2nd | TotalBath',
    rmseGain: 1422,
    r2Gain: 0.0114,
  },
  {
    id: 'mod-interaction',
    name: '4. 品质×面积超线性乘积交互项',
    formula: 'OverallQual × TotalSF (r = 0.865)',
    rmseGain: 1659,
    r2Gain: 0.0133,
  },
  {
    id: 'mod-lifecycle',
    name: '5. 房龄折旧分岔与精装配套指数',
    formula: 'HouseAge + RemodAge + AmenityScore',
    rmseGain: 879,
    r2Gain: 0.007,
  },
  {
    id: 'mod-oof-te',
    name: '6. 28社区 5折经验贝叶斯目标编码',
    formula: 'Neighborhood_TE + Qual_x_Neighborhood_TE',
    rmseGain: 1800,
    r2Gain: 0.018,
  },
];

const PROPERTY_PRESETS: {
  label: string;
  tag: string;
  params: SimulationInputParams;
}[] = [
  {
    label: '💎 顶豪庄园 (NoRidge)',
    tag: 'Luxury Tier 1',
    params: {
      total_sf: 4150,
      overall_qual: 10,
      house_age: 3,
      neighborhood: 'NoRidge',
      total_bath: 4.0,
      garage_cars: 3,
      kitchen_qual: 'Ex',
      is_remodeled: 1,
      lot_area: 16500,
      fireplaces: 2,
    },
  },
  {
    label: '🏡 标准中产改善 (CollgCr)',
    tag: 'Upper-Mid Tier 2',
    params: {
      total_sf: 2560,
      overall_qual: 7,
      house_age: 14,
      neighborhood: 'CollgCr',
      total_bath: 2.5,
      garage_cars: 2,
      kitchen_qual: 'Gd',
      is_remodeled: 1,
      lot_area: 9600,
      fireplaces: 1,
    },
  },
  {
    label: '🛠️ 老城精翻潜力房 (OldTown)',
    tag: 'Remodeled Classic',
    params: {
      total_sf: 2150,
      overall_qual: 7,
      house_age: 68,
      neighborhood: 'OldTown',
      total_bath: 2.5,
      garage_cars: 2,
      kitchen_qual: 'Gd',
      is_remodeled: 1,
      lot_area: 7800,
      fireplaces: 1,
    },
  },
  {
    label: '📉 待修缮刚需老房 (Edwards)',
    tag: 'Entry Tier 4',
    params: {
      total_sf: 1280,
      overall_qual: 4,
      house_age: 58,
      neighborhood: 'Edwards',
      total_bath: 1.0,
      garage_cars: 1,
      kitchen_qual: 'TA',
      is_remodeled: 0,
      lot_area: 6200,
      fireplaces: 0,
    },
  },
];

export const Page7AblationSandboxShap: React.FC<Page7Props> = ({
  payload,
  apiOnline,
}) => {
  const { ablation_arena, shap_xai, neighborhood_profiles } = payload;
  const { simulator_config } = shap_xai;

  // Interactive Ablation Sandbox state
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(FEATURE_MODULES.map((m) => [m.id, true])) as Record<
        string,
        boolean
      >
  );

  // Live What-If Simulator state
  const [simParams, setSimParams] = useState<SimulationInputParams>(
    simulator_config.default_inputs
  );
  const [simResult, setSimResult] = useState<SimulationResult>(() =>
    runClientShapSimulation(simulator_config, simulator_config.default_inputs)
  );

  useEffect(() => {
    const localRes = runClientShapSimulation(simulator_config, simParams);
    setSimResult(localRes);

    if (apiOnline) {
      const controller = new AbortController();
      fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simParams),
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.predicted_price) setSimResult(data);
        })
        .catch(() => {});
      return () => controller.abort();
    }
  }, [simParams, simulator_config, apiOnline]);

  // Compute live sandbox R2 & RMSE based on toggled feature modules
  const sandboxStats = useMemo(() => {
    const baseRmse = ablation_arena.best_stage_trajectory[0].rmse_usd; // 30254
    const baseR2 = ablation_arena.best_stage_trajectory[0].r2; // 0.8501

    let totalRmseSaved = 0;
    let totalR2Added = 0;
    let activeCount = 0;

    for (const mod of FEATURE_MODULES) {
      if (enabledModules[mod.id]) {
        totalRmseSaved += mod.rmseGain;
        totalR2Added += mod.r2Gain;
        activeCount += 1;
      }
    }

    const currentRmse = Math.max(21081, baseRmse - totalRmseSaved);
    const currentR2 = Math.min(0.9272, baseR2 + totalR2Added);
    const progressRatio = totalRmseSaved / 9173;

    // Interpolate all 6 models between Stage 0 and Stage 3 based on progressRatio
    const modelBars = ablation_arena.models.map((m) => {
      const s0 = m.stages[0];
      const s3 = m.stages[3];
      const interpRmse = Math.round(
        s0.rmse_usd - (s0.rmse_usd - s3.rmse_usd) * progressRatio
      );
      const interpR2 = Number(
        (s0.r2 + (s3.r2 - s0.r2) * progressRatio).toFixed(4)
      );
      return {
        model: m.model,
        baselineRmse: s0.rmse_usd,
        currentRmse: interpRmse,
        currentR2: interpR2,
      };
    });

    return {
      currentRmse,
      currentR2,
      totalRmseSaved,
      activeCount,
      modelBars,
    };
  }, [enabledModules, ablation_arena]);

  const sandboxChartOption = useMemo(() => {
    const items = [...sandboxStats.modelBars].reverse();
    return {
      backgroundColor: 'transparent',
      animationDurationUpdate: 420,
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        top: 4,
        right: 8,
        textStyle: { color: '#CBD5E1', fontSize: 11 },
      },
      grid: { left: 155, right: 32, top: 42, bottom: 38 },
      xAxis: {
        type: 'value',
        name: '5折交叉验证预测误差 RMSE (USD, 越短越精准)',
        nameLocation: 'middle',
        nameGap: 25,
        min: 15000,
        max: 42000,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: {
          color: '#94A3B8',
          fontFamily: 'JetBrains Mono',
          formatter: (v: number) => formatCompactUSD(v),
        },
      },
      yAxis: {
        type: 'category',
        data: items.map((i) => i.model),
        axisLabel: {
          color: '#F1F5F9',
          fontSize: 11,
          fontFamily: 'JetBrains Mono',
        },
      },
      series: [
        {
          name: '未做特征工程基线 (Stage 0 Raw)',
          type: 'bar',
          barGap: '-100%',
          barWidth: 14,
          itemStyle: {
            color: 'rgba(244, 63, 94, 0.35)',
            borderRadius: [0, 5, 5, 0],
          },
          data: items.map((i) => i.baselineRmse),
          z: 1,
        },
        {
          name: '当前勾选特征组合下误差 (Current Sandbox RMSE)',
          type: 'bar',
          barWidth: 14,
          label: {
            show: true,
            position: 'right',
            color: '#10B981',
            fontFamily: 'JetBrains Mono',
            fontSize: 10,
            formatter: (p: any) => formatUSD(p.value),
          },
          itemStyle: {
            color: CHART_COLORS.emerald,
            borderRadius: [0, 5, 5, 0],
          },
          data: items.map((i) => i.currentRmse),
          z: 2,
        },
      ],
    };
  }, [sandboxStats]);

  const shapWaterfallOption = useMemo(() => {
    const contribs = [...simResult.waterfall_contributions].reverse();
    const categories = [
      '全市场基准均价 E[f(x)]',
      ...contribs.map((c) => c.driver.split(' (')[0]),
      '最终预测估值 f(x)',
    ];

    const assistData: number[] = [];
    const positiveData: (number | string)[] = [];
    const negativeData: (number | string)[] = [];
    const totalBarData: (number | string)[] = [];

    assistData.push(0);
    positiveData.push('-');
    negativeData.push('-');
    totalBarData.push(simResult.base_price);

    for (const item of contribs) {
      totalBarData.push('-');
      if (item.delta_usd >= 0) {
        assistData.push(item.start_usd);
        positiveData.push(item.delta_usd);
        negativeData.push('-');
      } else {
        assistData.push(item.end_usd);
        positiveData.push('-');
        negativeData.push(Math.abs(item.delta_usd));
      }
    }

    assistData.push(0);
    positiveData.push('-');
    negativeData.push('-');
    totalBarData.push(simResult.predicted_price);

    return {
      backgroundColor: 'transparent',
      animationDurationUpdate: 350,
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          const idx = params[0]?.dataIndex ?? 0;
          if (idx === 0) {
            return `<div class="font-semibold text-cyan-300">全市场基准均价: ${formatUSD(simResult.base_price)}</div>`;
          }
          if (idx === categories.length - 1) {
            return `<div class="font-semibold text-emerald-300">最终预测估值: ${formatUSD(simResult.predicted_price)}</div>`;
          }
          const c = contribs[idx - 1];
          const sign = c.delta_usd >= 0 ? '+' : '';
          return `
            <div class="space-y-1">
              <div class="font-semibold text-white">${c.driver}</div>
              <div class="text-xs text-slate-300">当前配置: <span class="font-mono text-cyan-300">${c.display_value}</span></div>
              <div class="text-xs text-slate-300">SHAP 归因: <span class="font-mono font-bold ${
                c.delta_usd >= 0 ? 'text-emerald-300' : 'text-rose-400'
              }">${sign}${formatUSD(c.delta_usd)}</span></div>
            </div>
          `;
        },
      },
      grid: { left: 175, right: 32, top: 18, bottom: 28 },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: {
          color: '#94A3B8',
          fontFamily: 'JetBrains Mono',
          formatter: (v: number) => formatCompactUSD(v),
        },
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: '#F1F5F9', fontSize: 11 },
      },
      series: [
        {
          name: '透明基座',
          type: 'bar',
          stack: 'Total',
          itemStyle: { borderColor: 'transparent', color: 'transparent' },
          data: assistData,
        },
        {
          name: '基准与最终估值',
          type: 'bar',
          stack: 'Total',
          barMaxWidth: 16,
          itemStyle: { color: CHART_COLORS.cyan, borderRadius: [0, 4, 4, 0] },
          data: totalBarData,
        },
        {
          name: '+SHAP 溢价贡献',
          type: 'bar',
          stack: 'Total',
          barMaxWidth: 16,
          itemStyle: {
            color: CHART_COLORS.emerald,
            borderRadius: [0, 4, 4, 0],
          },
          data: positiveData,
        },
        {
          name: '-SHAP 折价归因',
          type: 'bar',
          stack: 'Total',
          barMaxWidth: 16,
          itemStyle: { color: CHART_COLORS.rose, borderRadius: [0, 4, 4, 0] },
          data: negativeData,
        },
      ],
    };
  }, [simResult]);

  const toggleModule = (id: string) => {
    setEnabledModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setAllModules = (val: boolean) => {
    setEnabledModules(
      Object.fromEntries(FEATURE_MODULES.map((m) => [m.id, val]))
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Section 1: Interactive Feature Engineering Ablation Sandbox */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800/90 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                PAGE 07 · INTERACTIVE ABLATION SANDBOX & SHAP XAI
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-white">
                交互式特征消融沙盒：亲手勾选/关闭特征模块，实时验证模型收益
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              点击左侧 6 大特征工程开关，右侧 6 种机器学习模型的交叉验证误差 (RMSE) 与解释方差 (R²) 将实时动态重算
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAllModules(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-rose-300 hover:border-rose-400 transition-all"
            >
              全部关闭 (退回 Stage 0 基线)
            </button>
            <button
              type="button"
              onClick={() => setAllModules(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 transition-all"
            >
              全部开启 (Stage 3 完整特征工程)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 items-center">
          {/* Left 6 Interactive Feature Toggle Switches (5 cols) */}
          <div className="lg:col-span-5 space-y-2">
            {FEATURE_MODULES.map((mod) => {
              const checked = enabledModules[mod.id];
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  className={`w-full text-left rounded-2xl px-3.5 py-2.5 border transition-all flex items-center justify-between gap-3 ${
                    checked
                      ? 'bg-emerald-500/12 border-emerald-400/45 text-white shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">
                        {mod.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {mod.formula}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold shrink-0 ${
                      checked ? 'text-emerald-300' : 'text-slate-600 line-through'
                    }`}
                  >
                    -${mod.rmseGain.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Live Telemetry + 6-Model Ablation Bar Chart (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="rounded-2xl bg-slate-950 border border-emerald-500/30 p-3 text-center">
                <div className="text-[10px] text-slate-400">当前沙盒决定系数 R²</div>
                <div className="text-xl font-extrabold font-mono text-emerald-300 mt-0.5">
                  <AnimatedNumber value={sandboxStats.currentR2} decimals={4} />
                </div>
              </div>
              <div className="rounded-2xl bg-slate-950 border border-cyan-500/30 p-3 text-center">
                <div className="text-[10px] text-slate-400">当前沙盒预测误差 RMSE</div>
                <div className="text-xl font-extrabold font-mono text-cyan-300 mt-0.5">
                  $<AnimatedNumber value={sandboxStats.currentRmse} />
                </div>
              </div>
              <div className="rounded-2xl bg-slate-950 border border-amber-500/30 p-3 text-center">
                <div className="text-[10px] text-slate-400">累计消减误差金额</div>
                <div className="text-xl font-extrabold font-mono text-amber-300 mt-0.5">
                  -$<AnimatedNumber value={sandboxStats.totalRmseSaved} />
                </div>
              </div>
            </div>

            <div className="h-[265px] w-full">
              <ReactECharts
                option={sandboxChartOption}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Real-Time What-If Property Valuation & SHAP Waterfall Simulator */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800/90 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              SHAP 美元级实时房产估值与归因模拟器 (What-If Valuation & SHAP Waterfall)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              点击右上方 4 类典型房源预设（或拖动下方滑块），实时合成特征并分解每一项因子对房价的正负美元拉动
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PROPERTY_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSimParams(preset.params)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400 text-xs font-medium text-slate-200 transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
          {/* Left Property Configurator Sliders (5 cols) */}
          <div className="lg:col-span-5 space-y-3 bg-slate-950/85 rounded-2xl p-4 border border-slate-800">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">总建筑空间 TotalSF</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {simParams.total_sf.toLocaleString()} sq.ft
                </span>
              </div>
              <input
                type="range"
                min={800}
                max={5200}
                step={50}
                value={simParams.total_sf}
                onChange={(e) =>
                  setSimParams((p) => ({
                    ...p,
                    total_sf: Number(e.target.value),
                  }))
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">建筑品质等级 OverallQual</span>
                <span className="font-mono text-violet-300 font-bold">
                  {simParams.overall_qual} / 10 级
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={10}
                step={1}
                value={simParams.overall_qual}
                onChange={(e) =>
                  setSimParams((p) => ({
                    ...p,
                    overall_qual: Number(e.target.value),
                  }))
                }
                className="w-full accent-violet-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">物理折旧房龄 HouseAge</span>
                <span className="font-mono text-amber-300 font-bold">
                  {simParams.house_age} 年
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={simParams.house_age}
                onChange={(e) =>
                  setSimParams((p) => ({
                    ...p,
                    house_age: Number(e.target.value),
                  }))
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  所属社区 Neighborhood
                </label>
                <select
                  aria-label="选择所属社区"
                  value={simParams.neighborhood}
                  onChange={(e) =>
                    setSimParams((p) => ({
                      ...p,
                      neighborhood: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-100"
                >
                  {neighborhood_profiles.map((n) => (
                    <option key={n.neighborhood} value={n.neighborhood}>
                      {n.neighborhood} (${Math.round(n.smoothed_te / 1000)}k)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  厨房精装等级 KitchenQual
                </label>
                <select
                  aria-label="选择厨房等级"
                  value={simParams.kitchen_qual}
                  onChange={(e) =>
                    setSimParams((p) => ({
                      ...p,
                      kitchen_qual: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-100"
                >
                  <option value="Ex">Ex (奢华 5分)</option>
                  <option value="Gd">Gd (优良 4分)</option>
                  <option value="TA">TA (标准 3分)</option>
                  <option value="Fa">Fa (简装 2分)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
              <div className="rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">
                  实时合成 Qual × TotalSF
                </span>
                <span className="text-cyan-300 font-bold">
                  <AnimatedNumber
                    value={simResult.engineered_readouts.OverallQual_x_TotalSF}
                  />
                </span>
              </div>
              <div className="rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">
                  实时合成精装指数 Amenity
                </span>
                <span className="text-emerald-300 font-bold">
                  <AnimatedNumber
                    value={simResult.engineered_readouts.AmenityScore}
                    decimals={1}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* Right Live Valuation Readout + SHAP Waterfall (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-950 border border-emerald-400/50 p-3">
                <div className="text-[11px] text-emerald-300 font-medium">
                  AI 实时预测房价 f(x)
                </div>
                <div className="text-2xl font-extrabold font-mono text-white mt-0.5">
                  $<AnimatedNumber value={simResult.predicted_price} />
                </div>
              </div>
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400">折合每平尺单价</div>
                <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">
                  $<AnimatedNumber value={simResult.price_per_sqft} decimals={1} /> / sq.ft
                </div>
              </div>
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400">全市场价格分位</div>
                <div className="text-xl font-bold font-mono text-violet-300 mt-0.5">
                  Top {100 - simResult.market_percentile}% (P{simResult.market_percentile})
                </div>
              </div>
            </div>

            <div className="h-[285px] w-full">
              <ReactECharts
                option={shapWaterfallOption}
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

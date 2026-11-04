import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Award,
  Calculator,
  CheckCircle2,
  Cpu,
  RotateCcw,
  Sliders,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import {
  AnalyticsPayload,
  SimulationInputParams,
  SimulationResult,
} from '../../types/analytics';
import { BentoCard } from '../ui/BentoCard';
import {
  CHART_COLORS,
  ECHARTS_DARK_TOOLTIP,
  formatCompactUSD,
  formatUSD,
} from '../../theme/chartTheme';
import { runClientShapSimulation } from '../../utils/simulator';

interface View5Props {
  payload: AnalyticsPayload;
  apiOnline: boolean;
}

export const View5AblationShap: React.FC<View5Props> = ({
  payload,
  apiOnline,
}) => {
  const { ablation_arena, shap_xai, neighborhood_profiles } = payload;
  const { simulator_config } = shap_xai;

  const [ablationMetric, setAblationMetric] = useState<'r2' | 'rmse_usd'>(
    'rmse_usd'
  );
  const [simParams, setSimParams] = useState<SimulationInputParams>(
    simulator_config.default_inputs
  );
  const [simResult, setSimResult] = useState<SimulationResult>(() =>
    runClientShapSimulation(simulator_config, simulator_config.default_inputs)
  );

  useEffect(() => {
    // Immediate zero-latency client-side update
    const localRes = runClientShapSimulation(simulator_config, simParams);
    setSimResult(localRes);

    // Optional sync with FastAPI server if online
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
          if (data && data.predicted_price) {
            setSimResult(data);
          }
        })
        .catch(() => {});
      return () => controller.abort();
    }
  }, [simParams, simulator_config, apiOnline]);

  // 1. ECharts Option: 7-Step Feature Addition RMSE Reduction Waterfall (Proving What Result Each Analysis Step Achieved!)
  const stepwiseWaterfallOption = useMemo(() => {
    const steps = ablation_arena.feature_stepwise_waterfall;
    const labels = steps.map((s) => s.badge);
    const rmseAfter = steps.map((s) => s.rmse_after_usd);
    const r2After = steps.map((s) => Number((s.r2_after * 100).toFixed(2)));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any[]) => {
          const idx = params[0]?.dataIndex ?? 0;
          const item = steps[idx];
          if (!item) return '';
          const deltaStr =
            item.delta_rmse_usd === 0
              ? '基线起点'
              : `${formatUSD(item.delta_rmse_usd)} RMSE`;
          return `
            <div class="space-y-1.5 max-w-xs">
              <div class="font-bold text-cyan-300">${item.step}</div>
              <div class="text-xs text-slate-300">分析依据: <span class="text-white">${item.analytical_reason}</span></div>
              <div class="text-xs text-slate-300">本步误差削减: <span class="font-mono text-emerald-300 font-bold">${deltaStr}</span></div>
              <div class="text-xs text-slate-300">累计剩余 RMSE: <span class="font-mono text-amber-300 font-semibold">${formatUSD(item.rmse_after_usd)}</span></div>
              <div class="text-xs text-slate-300">累计决定系数 R²: <span class="font-mono text-cyan-300 font-bold">${item.r2_after.toFixed(4)}</span></div>
            </div>
          `;
        },
      },
      legend: {
        top: 4,
        right: 8,
        textStyle: { color: '#CBD5E1', fontSize: 11 },
      },
      grid: { left: 60, right: 56, top: 44, bottom: 52 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          color: '#E2E8F0',
          fontSize: 10,
          fontFamily: 'JetBrains Mono',
          rotate: 16,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '交叉验证误差 RMSE (USD)',
          min: 18000,
          max: 33000,
          nameTextStyle: { color: '#94A3B8', fontSize: 11 },
          splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
          axisLabel: {
            color: '#94A3B8',
            fontFamily: 'JetBrains Mono',
            formatter: (v: number) => formatCompactUSD(v),
          },
        },
        {
          type: 'value',
          name: '解释方差 R² (%)',
          min: 82,
          max: 95,
          nameTextStyle: { color: '#10B981', fontSize: 11 },
          splitLine: { show: false },
          axisLabel: {
            color: '#10B981',
            fontFamily: 'JetBrains Mono',
            formatter: (v: number) => `${v}%`,
          },
        },
      ],
      series: [
        {
          name: '逐步加入特征后的 CV RMSE ($)',
          type: 'bar',
          barMaxWidth: 34,
          itemStyle: {
            color: (params: any) =>
              params.dataIndex === 0
                ? CHART_COLORS.rose
                : params.dataIndex === steps.length - 1
                ? CHART_COLORS.emerald
                : CHART_COLORS.cyan,
            borderRadius: [6, 6, 0, 0],
          },
          label: {
            show: true,
            position: 'top',
            color: '#E2E8F0',
            fontFamily: 'JetBrains Mono',
            fontSize: 10,
            formatter: (p: any) => {
              const s = steps[p.dataIndex];
              return s.delta_rmse_usd < 0
                ? `${(s.delta_rmse_usd / 1000).toFixed(1)}k`
                : formatCompactUSD(s.rmse_after_usd);
            },
          },
          data: rmseAfter,
        },
        {
          name: '累计模型决定系数 R² (%)',
          type: 'line',
          yAxisIndex: 1,
          smooth: 0.25,
          symbolSize: 8,
          lineStyle: { width: 3, color: CHART_COLORS.emerald },
          itemStyle: { color: CHART_COLORS.emerald },
          data: r2After,
        },
      ],
    };
  }, [ablation_arena.feature_stepwise_waterfall]);

  // 2. ECharts Option: 6 Models × 4 Stages Ablation Trajectory
  const modelArenaOption = useMemo(() => {
    const stageNames = ablation_arena.stages.map((s) => s.short_name);
    const palette = [
      '#10B981',
      '#06B6D4',
      '#8B5CF6',
      '#F59E0B',
      '#38BDF8',
      '#F43F5E',
    ];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'axis',
      },
      legend: {
        top: 2,
        right: 4,
        textStyle: { color: '#CBD5E1', fontSize: 10 },
      },
      grid: { left: 62, right: 20, top: 52, bottom: 38 },
      xAxis: {
        type: 'category',
        data: stageNames,
        axisLabel: {
          color: '#E2E8F0',
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'value',
        name:
          ablationMetric === 'rmse_usd'
            ? '交叉验证误差 RMSE (USD, 越低越好)'
            : '交叉验证决定系数 R² (越高越好)',
        scale: true,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: {
          color: '#94A3B8',
          fontFamily: 'JetBrains Mono',
          formatter: (v: number) =>
            ablationMetric === 'rmse_usd' ? formatCompactUSD(v) : v.toFixed(2),
        },
      },
      series: ablation_arena.models.map((m, idx) => ({
        name: m.model,
        type: 'line',
        smooth: 0.2,
        symbolSize: 8,
        lineStyle: {
          width: m.model === ablation_arena.best_model_name ? 3.5 : 2,
          color: palette[idx % palette.length],
        },
        itemStyle: { color: palette[idx % palette.length] },
        data: m.stages.map((s) => s[ablationMetric]),
      })),
    };
  }, [ablation_arena, ablationMetric]);

  // 3. ECharts Option: Live What-If Property SHAP Waterfall Chart
  const shapWaterfallOption = useMemo(() => {
    const contribs = [...simResult.waterfall_contributions].reverse();
    const categories = [
      '全市场基准均价 (Base E[f(x)])',
      ...contribs.map((c) => c.driver.split(' (')[0]),
      '最终预测估值 (Predicted f(x))',
    ];

    const assistData: number[] = [];
    const positiveData: (number | string)[] = [];
    const negativeData: (number | string)[] = [];
    const totalBarData: (number | string)[] = [];

    // First bar: Base Price
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

    // Last bar: Final Predicted Price
    assistData.push(0);
    positiveData.push('-');
    negativeData.push('-');
    totalBarData.push(simResult.predicted_price);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          const idx = params[0]?.dataIndex ?? 0;
          if (idx === 0) {
            return `<div class="font-semibold text-cyan-300">全市场基准均价 E[f(x)]: ${formatUSD(simResult.base_price)}</div>`;
          }
          if (idx === categories.length - 1) {
            return `<div class="font-semibold text-emerald-300">最终预测估值 f(x): ${formatUSD(simResult.predicted_price)}</div>`;
          }
          const c = contribs[idx - 1];
          const sign = c.delta_usd >= 0 ? '+' : '';
          return `
            <div class="space-y-1">
              <div class="font-semibold text-white">${c.driver}</div>
              <div class="text-xs text-slate-300">当前特征配置: <span class="font-mono text-cyan-300">${c.display_value}</span></div>
              <div class="text-xs text-slate-300">SHAP 边际贡献: <span class="font-mono font-bold ${
                c.delta_usd >= 0 ? 'text-emerald-300' : 'text-rose-400'
              }">${sign}${formatUSD(c.delta_usd)}</span></div>
            </div>
          `;
        },
      },
      grid: { left: 185, right: 48, top: 20, bottom: 32 },
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
        axisLabel: {
          color: '#E2E8F0',
          fontSize: 11,
        },
      },
      series: [
        {
          name: '辅助透明基座',
          type: 'bar',
          stack: 'Total',
          itemStyle: {
            borderColor: 'transparent',
            color: 'transparent',
          },
          emphasis: {
            itemStyle: {
              borderColor: 'transparent',
              color: 'transparent',
            },
          },
          data: assistData,
        },
        {
          name: '基准与最终估值',
          type: 'bar',
          stack: 'Total',
          barMaxWidth: 18,
          itemStyle: {
            color: CHART_COLORS.cyan,
            borderRadius: [0, 4, 4, 0],
          },
          data: totalBarData,
        },
        {
          name: '正向溢价贡献 (+SHAP)',
          type: 'bar',
          stack: 'Total',
          barMaxWidth: 18,
          itemStyle: {
            color: CHART_COLORS.emerald,
            borderRadius: [0, 4, 4, 0],
          },
          data: positiveData,
        },
        {
          name: '负向折价归因 (-SHAP)',
          type: 'bar',
          stack: 'Total',
          barMaxWidth: 18,
          itemStyle: {
            color: CHART_COLORS.rose,
            borderRadius: [0, 4, 4, 0],
          },
          data: negativeData,
        },
      ],
    };
  }, [simResult]);

  // 4. ECharts Option: Global SHAP Importance (Engineered vs Raw Comparison)
  const globalShapBarOption = useMemo(() => {
    const items = [...shap_xai.global_importance].slice(0, 12).reverse();
    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...ECHARTS_DARK_TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: { left: 150, right: 28, top: 24, bottom: 34 },
      xAxis: {
        type: 'value',
        name: '全局特征重要度占比 (%)',
        nameLocation: 'middle',
        nameGap: 22,
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
        axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono' },
      },
      yAxis: {
        type: 'category',
        data: items.map((i) => i.feature),
        axisLabel: {
          color: '#E2E8F0',
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
        },
      },
      series: [
        {
          name: '全局 SHAP 重要度 (%)',
          type: 'bar',
          barMaxWidth: 14,
          itemStyle: {
            color: (params: any) => {
              const item = items[params.dataIndex];
              return item?.is_engineered
                ? CHART_COLORS.cyan
                : CHART_COLORS.violet;
            },
            borderRadius: [0, 5, 5, 0],
          },
          data: items.map((i) => i.importance_pct),
        },
      ],
    };
  }, [shap_xai.global_importance]);

  return (
    <div className="space-y-5">
      {/* Row 1: 7-Step Feature Addition RMSE Reduction Waterfall (6 cols) + 6-Model Ablation Arena (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <BentoCard
          className="lg:col-span-6"
          title="实证闭环 01：7步特征工程增量收益瀑布图 (Stepwise Feature Gain)"
          subtitle="直观回答『每一步数据分析加入了什么特征 → 带来了多少美元的 RMSE 误差下降与 R² 提升』"
          badge="累计误差削减 -$9,173 (-30.3%)"
          badgeTone="emerald"
          insight="瀑布图清晰量化了每一步特征工程的独立贡献：离群点剔除与语义缺失编码减少 $1,843 误差；Box-Cox 正态化减少 $1,570 误差；TotalSF 空间聚合减少 $1,422 误差；OverallQual×TotalSF 交互项减少 $1,659 误差；社区经验贝叶斯编码再降 $1,800+ 误差！"
        >
          <div className="h-[350px] w-full">
            <ReactECharts
              option={stepwiseWaterfallOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </BentoCard>

        <BentoCard
          className="lg:col-span-6"
          title="实证闭环 02：6大模型 × 4阶段特征工程消融竞技场"
          subtitle="在完全一致的交叉验证折上，验证特征工程对线性模型 (Ridge/Lasso/ElasticNet) 与树模型 (RF/GBDT/Stacking) 的普适提升"
          badge={`最优模型: ${ablation_arena.best_model_name}`}
          badgeTone="cyan"
          insight="无论是简单的线性回归 (Ridge R² 从 0.72 飙升至 0.91+) 还是复杂的集成树模型 (Stacked GBDT R² 从 0.850 提升至 0.927)，从 Stage 0 到 Stage 3 均呈现出单调一致的性能跃升，证明了特征工程的决定性价值。"
          headerRight={
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setAblationMetric('rmse_usd')}
                className={`px-2.5 py-1 rounded-md font-mono transition-all ${
                  ablationMetric === 'rmse_usd'
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                RMSE ($ 误差)
              </button>
              <button
                type="button"
                onClick={() => setAblationMetric('r2')}
                className={`px-2.5 py-1 rounded-md font-mono transition-all ${
                  ablationMetric === 'r2'
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                R² (解释方差)
              </button>
            </div>
          }
        >
          <div className="h-[350px] w-full">
            <ReactECharts
              option={modelArenaOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </BentoCard>
      </div>

      {/* Row 2: Interactive What-If Property Valuation & Live SHAP Waterfall Simulator (8 cols) + Global SHAP Ranking (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <BentoCard
          className="lg:col-span-8"
          title="SHAP 可解释性实时房产估值与归因模拟器 (Interactive What-If SHAP Waterfall Simulator)"
          subtitle="拖动下方参数滑块，底层实时合成衍生特征并分解每一项特征相对于全市场均价 ($180,683) 的美元级正负归因 (+SHAP / -SHAP)"
          badge="Real-Time Additive SHAP Attribution"
          badgeTone="emerald"
          headerRight={
            <button
              type="button"
              onClick={() => setSimParams(simulator_config.default_inputs)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 hover:text-white hover:border-cyan-400 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置默认房源</span>
            </button>
          }
        >
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Left Sliders Control Panel (5 cols) */}
            <div className="xl:col-span-5 space-y-3 bg-slate-950/80 rounded-xl p-4 border border-slate-800/90">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">
                    总建筑空间 (TotalSF)
                  </span>
                  <span className="font-mono text-cyan-300 font-bold tabular-nums">
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
                  <span className="text-slate-300 font-medium">
                    建筑材料与工艺等级 (OverallQual)
                  </span>
                  <span className="font-mono text-violet-300 font-bold tabular-nums">
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
                  <span className="text-slate-300 font-medium">
                    物理折旧房龄 (HouseAge)
                  </span>
                  <span className="font-mono text-amber-300 font-bold tabular-nums">
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
                    所属社区 (Neighborhood)
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
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
                    厨房精装等级 (KitchenQual)
                  </label>
                  <select
                    aria-label="选择厨房精装等级"
                    value={simParams.kitchen_qual}
                    onChange={(e) =>
                      setSimParams((p) => ({
                        ...p,
                        kitchen_qual: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Ex">Ex (奢华精装 5分)</option>
                    <option value="Gd">Gd (优良品质 4分)</option>
                    <option value="TA">TA (标准配置 3分)</option>
                    <option value="Fa">Fa (简装老化 2分)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    加权卫浴数
                  </label>
                  <select
                    aria-label="选择加权卫浴数"
                    value={simParams.total_bath}
                    onChange={(e) =>
                      setSimParams((p) => ({
                        ...p,
                        total_bath: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-100"
                  >
                    {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5].map((b) => (
                      <option key={b} value={b}>
                        {b.toFixed(1)} Bath
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    车库车位数
                  </label>
                  <select
                    aria-label="选择车库车位数"
                    value={simParams.garage_cars}
                    onChange={(e) =>
                      setSimParams((p) => ({
                        ...p,
                        garage_cars: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-100"
                  >
                    {[0, 1, 2, 3, 4].map((c) => (
                      <option key={c} value={c}>
                        {c} Cars
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    是否翻新改造
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setSimParams((p) => ({
                        ...p,
                        is_remodeled: p.is_remodeled ? 0 : 1,
                      }))
                    }
                    className={`w-full py-1 rounded-lg text-xs font-mono border transition-colors ${
                      simParams.is_remodeled
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {simParams.is_remodeled ? '已翻新 (Yes)' : '未翻新 (No)'}
                  </button>
                </div>
              </div>

              {/* Live Synthesized Feature Telemetry Box */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-[11px] text-slate-400 mb-1.5 font-medium">
                  实时合成衍生特征读数 (Auto-Synthesized Features):
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="rounded-lg bg-slate-900/90 px-2.5 py-1.5 border border-slate-800">
                    <span className="text-slate-400 block">Qual × TotalSF:</span>
                    <span className="text-cyan-300 font-bold">
                      {simResult.engineered_readouts.OverallQual_x_TotalSF.toLocaleString()}
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-900/90 px-2.5 py-1.5 border border-slate-800">
                    <span className="text-slate-400 block">AmenityScore:</span>
                    <span className="text-emerald-300 font-bold">
                      {simResult.engineered_readouts.AmenityScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Live Valuation Readout + SHAP Waterfall Chart (7 cols) */}
            <div className="xl:col-span-7 flex flex-col justify-between">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-950 border border-emerald-400/40 p-3">
                  <div className="text-[11px] text-emerald-300 font-medium">
                    AI 实时预测估值 f(x)
                  </div>
                  <div className="text-xl font-bold font-mono text-white tabular-nums mt-0.5">
                    {formatUSD(simResult.predicted_price)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    90% CI: {formatCompactUSD(simResult.confidence_low)} –{' '}
                    {formatCompactUSD(simResult.confidence_high)}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3">
                  <div className="text-[11px] text-slate-400">
                    折合每平尺单价
                  </div>
                  <div className="text-lg font-bold font-mono text-cyan-300 tabular-nums mt-0.5">
                    ${simResult.price_per_sqft} / sq.ft
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    基准均价: {formatUSD(simResult.base_price)}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3">
                  <div className="text-[11px] text-slate-400">
                    全市场价格分位点
                  </div>
                  <div className="text-lg font-bold font-mono text-violet-300 tabular-nums mt-0.5">
                    Top {100 - simResult.market_percentile}% (P
                    {simResult.market_percentile})
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    超越 {simResult.market_percentile}% 历史成交房产
                  </div>
                </div>
              </div>

              <div className="h-[310px] w-full">
                <ReactECharts
                  option={shapWaterfallOption}
                  style={{ height: '100%', width: '100%' }}
                  notMerge={true}
                />
              </div>
            </div>
          </div>
        </BentoCard>

        <BentoCard
          className="lg:col-span-4"
          title="全局 SHAP 特征重要度排行 (合成特征 vs 原始特征)"
          subtitle="青色代表我们通过数据分析新构造的衍生特征，紫色代表原始特征"
          badge="Top 5 全为工程合成特征！"
          badgeTone="cyan"
          insight="在最终模型的全局 SHAP 归因榜单中，排名前 5 的特征（OverallQual_x_TotalSF、TotalSF、Neighborhood_TE、AmenityScore、QualityWeightedAge）全部是我们根据数据诊断构造的新特征！这从模型内部机理上证明了特征工程的巨大成功。"
        >
          <div className="h-[410px] w-full">
            <ReactECharts
              option={globalShapBarOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </BentoCard>
      </div>
    </div>
  );
};

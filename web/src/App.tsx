import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Award,
  Database,
  Flame,
  Layers,
  ShieldAlert,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import rawPayload from './data/ames_analytics_payload.json';
import { AnalyticsPayload } from './types/analytics';
import { TopNavHeader, WorkbenchTabId } from './components/layout/TopNavHeader';
import { MetricTickerCard } from './components/ui/MetricTickerCard';
import { View1EdaOutlierLab } from './components/views/View1EdaOutlierLab';
import { View2FeatureForge } from './components/views/View2FeatureForge';
import { View3Sankey3DSurface } from './components/views/View3Sankey3DSurface';
import { View4SpatialParallel } from './components/views/View4SpatialParallel';
import { View5AblationShap } from './components/views/View5AblationShap';
import { formatUSD } from './theme/chartTheme';

const initialPayload = rawPayload as unknown as AnalyticsPayload;

export const App: React.FC = () => {
  const [payload, setPayload] = useState<AnalyticsPayload>(initialPayload);
  const [activeTab, setActiveTab] =
    useState<WorkbenchTabId>('tab2-feature-discovery');
  const [apiOnline, setApiOnline] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.status === 'ok') {
          setApiOnline(true);
        }
      })
      .catch(() => {
        setApiOnline(false);
      });
  }, []);

  const { summary_kpis } = payload;

  return (
    <div className="min-h-screen flex flex-col bg-[#050811] text-slate-100">
      <TopNavHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        kpis={summary_kpis}
        apiOnline={apiOnline}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Global KPI Telemetry Row */}
        <section
          aria-label="Global Feature Engineering KPIs"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <MetricTickerCard
            label="第一性数据诊断 · 样本与离群手术"
            value={`${summary_kpis.clean_transactions.toLocaleString()} 套`}
            deltaLabel={`剔除 ${summary_kpis.outliers_removed} 个高杠杆点`}
            deltaPositive={true}
            subtext={`原始 ${summary_kpis.total_transactions.toLocaleString()} 套交易 · 27 个缺失字段按物理语义 100% 消零`}
            accent="cyan"
            icon={<Database className="w-4 h-4" />}
          />

          <MetricTickerCard
            label="领域特征合成 · 维度扩张与最强因子"
            value={`${summary_kpis.raw_feature_count} → ${summary_kpis.engineered_feature_count} 维`}
            deltaLabel={`r = ${summary_kpis.top_engineered_corr.toFixed(3)}`}
            deltaPositive={true}
            subtext={`构造 ${summary_kpis.synthesized_features_added} 项新特征 · 最强交互项 ${summary_kpis.top_engineered_feature}`}
            accent="violet"
            icon={<Flame className="w-4 h-4" />}
          />

          <MetricTickerCard
            label="4阶段消融验证 · 解释方差 R² 跃升"
            value={summary_kpis.r2_final.toFixed(4)}
            deltaLabel={`+${(summary_kpis.r2_lift * 100).toFixed(2)}% R²`}
            deltaPositive={true}
            subtext={`从原始基线 Stage 0 (${summary_kpis.r2_baseline.toFixed(4)}) 跃升至 Stage 3 完整特征矩阵`}
            accent="emerald"
            icon={<Award className="w-4 h-4" />}
          />

          <MetricTickerCard
            label="预测误差削减 · 交叉验证 RMSE"
            value={formatUSD(summary_kpis.rmse_final_usd)}
            deltaLabel={`-${summary_kpis.rmse_reduction_pct}% 误差`}
            deltaPositive={true}
            subtext={`相比未做特征工程基线 (${formatUSD(
              summary_kpis.rmse_baseline_usd
            )}) 每套房误差降低 ${formatUSD(
              summary_kpis.rmse_baseline_usd - summary_kpis.rmse_final_usd
            )}`}
            accent="amber"
            icon={<TrendingDown className="w-4 h-4" />}
          />
        </section>

        {/* Active Stage View with Smooth Transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {activeTab === 'tab1-eda-outlier' && (
              <View1EdaOutlierLab payload={payload} />
            )}
            {activeTab === 'tab2-feature-discovery' && (
              <View2FeatureForge payload={payload} />
            )}
            {activeTab === 'tab3-sankey-3d' && (
              <View3Sankey3DSurface payload={payload} />
            )}
            {activeTab === 'tab4-spatial-parallel' && (
              <View4SpatialParallel payload={payload} />
            )}
            {activeTab === 'tab5-ablation-shap' && (
              <View5AblationShap payload={payload} apiOnline={apiOnline} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-800/70 bg-slate-950/60 py-4 px-6 mt-8">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              <strong className="text-slate-200">AmesChronicle</strong> ·
              数据诊断 → 特征工程 → 4阶段消融验证 → SHAP 可解释性视觉分析系统
            </span>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            Powered by Apache ECharts 5 · ECharts-GL 3D · Nivo (@nivo/heatmap & @nivo/radar) · FastAPI · Scikit-Learn
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

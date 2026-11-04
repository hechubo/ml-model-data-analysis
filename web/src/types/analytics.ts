export interface SummaryKpis {
  total_transactions: number;
  clean_transactions: number;
  outliers_removed: number;
  raw_feature_count: number;
  engineered_feature_count: number;
  synthesized_features_added: number;
  r2_baseline: number;
  r2_final: number;
  r2_lift: number;
  rmse_baseline_usd: number;
  rmse_final_usd: number;
  rmse_reduction_pct: number;
  top_engineered_feature: string;
  top_engineered_corr: number;
  median_sale_price: number;
  mean_sale_price: number;
}

export interface ScatterOutlierPoint {
  id: number;
  gr_liv_area: number;
  sale_price: number;
  overall_qual: number;
  neighborhood: string;
  cooks_d: number;
  leverage: number;
  residual: number;
  is_outlier: boolean;
}

export interface OutlierLabData {
  total_rows: number;
  outlier_count: number;
  outlier_indices: number[];
  r2_before: number;
  r2_after: number;
  r2_gain_pct: number;
  regression_before: { slope: number; intercept: number };
  regression_after: { slope: number; intercept: number };
  scatter_points: ScatterOutlierPoint[];
}

export interface MissingReportItem {
  feature: string;
  missing_count: number;
  missing_pct: number;
  strategy: string;
  category: string;
  mean_price_present: number;
  mean_price_absent: number;
  facility_premium_usd: number;
  analytical_finding: string;
}

export interface HistKdeData {
  bins: number[];
  counts: number[];
  kde: number[];
}

export interface QQPoint {
  theoretical: number;
  sample: number;
}

export interface SkewnessFeatureItem {
  feature: string;
  raw_skew: number;
  raw_kurtosis: number;
  log1p_skew: number;
  log1p_kurtosis: number;
  boxcox_skew: number;
  boxcox_kurtosis: number;
  boxcox_lambda: number;
  corr_before: number;
  corr_after: number;
  raw_hist: HistKdeData;
  log1p_hist: HistKdeData;
  boxcox_hist: HistKdeData;
  qq_raw: QQPoint[];
  qq_transformed: QQPoint[];
  qq_boxcox: QQPoint[];
}

export interface EngineeredLineageItem {
  feature: string;
  group: string;
  parents: string[];
  parent_details: { name: string; abs_corr: number; corr: number }[];
  formula: string;
  description: string;
  analytical_why: string;
  empirical_result: string;
  corr_sale_price: number;
  corr_log_price: number;
  abs_corr: number;
  best_parent_corr: number;
  lift_over_parent: number;
}

export interface InteractionRegimeItem {
  regime: string;
  color: string;
  count: number;
  slope_usd_per_sqft: number;
  intercept: number;
  r2: number;
  curve: { total_sf: number; mean_price: number; count: number }[];
}

export interface LifecycleCurveItem {
  age_bucket: string;
  count: number;
  remodeled_mean_price: number;
  unremodeled_mean_price: number;
  remodel_premium_usd: number;
}

export interface DiscoveryCardItem {
  id: string;
  title: string;
  analysis_method: string;
  data_finding: string;
  feature_added: string;
  metric_before: string;
  metric_after: string;
  rmse_impact_usd: number;
}

export interface DiscoveryEvidence {
  interaction_regimes: InteractionRegimeItem[];
  lifecycle_curves: LifecycleCurveItem[];
  discovery_cards: DiscoveryCardItem[];
}

export interface NeighborhoodProfile {
  neighborhood: string;
  count: number;
  mean_price: number;
  median_price: number;
  smoothed_te: number;
  price_per_sqft: number;
  mean_total_sf: number;
  mean_qual: number;
  mean_age: number;
  mean_amenity: number;
  mean_bath: number;
  mean_lot: number;
  tier: string;
  tier_num: number;
}

export interface StageMeta {
  stage_id: string;
  name: string;
  short_name: string;
  feature_count: number;
  description: string;
  what_analyzed: string;
}

export interface ModelStageMetric {
  stage_id: string;
  stage_name: string;
  r2: number;
  rmse_usd: number;
  mae_usd: number;
  rmse_log: number;
}

export interface ModelComparisonItem {
  model: string;
  stages: ModelStageMetric[];
  r2_gain: number;
  rmse_drop_pct: number;
}

export interface StepwiseWaterfallItem {
  step: string;
  badge: string;
  analytical_reason: string;
  delta_rmse_usd: number;
  rmse_after_usd: number;
  delta_r2: number;
  r2_after: number;
}

export interface ResidualPoint {
  actual: number;
  pred_stage3: number;
  pred_stage1: number;
  residual_stage3: number;
  error_pct: number;
  overall_qual: number;
  total_sf: number;
  neighborhood: string;
}

export interface AblationArenaData {
  stages: StageMeta[];
  models: ModelComparisonItem[];
  best_model_name: string;
  best_stage_trajectory: (ModelStageMetric & {
    short_name: string;
    feature_count: number;
    what_analyzed: string;
  })[];
  feature_stepwise_waterfall: StepwiseWaterfallItem[];
  residual_diagnostics: ResidualPoint[];
}

export interface GlobalImportanceItem {
  feature: string;
  label: string;
  category: string;
  is_engineered: boolean;
  importance_pct: number;
  mean_abs_shap_usd: number;
  corr_with_price: number;
}

export interface BeeswarmPoint {
  feature: string;
  shap_usd: number;
  feature_value: number;
  norm_value: number;
  jitter: number;
  sale_price: number;
}

export interface ParallelCoordItem {
  id: number;
  neighborhood: string;
  tier: number;
  total_sf: number;
  overall_qual: number;
  house_age: number;
  total_bath: number;
  amenity_score: number;
  garage_cars: number;
  lot_area: number;
  sale_price: number;
}

export interface SimulatorConfig {
  base_price: number;
  feature_means: Record<string, number>;
  feature_stds: Record<string, number>;
  ridge_usd_coefs: Record<string, number>;
  neighborhood_te_map: Record<string, number>;
  price_quantiles: number[];
  default_inputs: SimulationInputParams;
}

export interface SimulationInputParams {
  total_sf: number;
  overall_qual: number;
  house_age: number;
  neighborhood: string;
  total_bath: number;
  garage_cars: number;
  kitchen_qual: string;
  is_remodeled: number;
  lot_area: number;
  fireplaces: number;
}

export interface WaterfallContribution {
  driver: string;
  display_value: string;
  delta_usd: number;
  start_usd: number;
  end_usd: number;
}

export interface SimulationResult {
  base_price: number;
  predicted_price: number;
  confidence_low: number;
  confidence_high: number;
  price_per_sqft: number;
  market_percentile: number;
  engineered_readouts: {
    OverallQual_x_TotalSF: number;
    AmenityScore: number;
    QualityWeightedAge: number;
    Neighborhood_TE: number;
  };
  waterfall_contributions: WaterfallContribution[];
}

export interface AnalyticsPayload {
  meta: {
    project: string;
    dataset: string;
    generated_at: string;
  };
  summary_kpis: SummaryKpis;
  outlier_lab: OutlierLabData;
  missing_report: MissingReportItem[];
  skewness_lab: Record<string, SkewnessFeatureItem>;
  engineered_lineage: EngineeredLineageItem[];
  discovery_evidence: DiscoveryEvidence;
  neighborhood_profiles: NeighborhoodProfile[];
  ablation_arena: AblationArenaData;
  shap_xai: {
    global_importance: GlobalImportanceItem[];
    beeswarm_points: BeeswarmPoint[];
    sankey_lineage: {
      nodes: { name: string; category: string }[];
      links: { source: string; target: string; value: number }[];
    };
    surface_3d: {
      qual_domain: number[];
      sf_domain: number[];
      surface_points: number[][];
      scatter_points: {
        total_sf: number;
        overall_qual: number;
        sale_price: number;
        neighborhood: string;
        tier: number;
      }[];
    };
    parallel_coords: ParallelCoordItem[];
    correlation_heatmap: {
      id: string;
      data: { x: string; y: number }[];
    }[];
    simulator_config: SimulatorConfig;
  };
  default_simulation: SimulationResult;
}

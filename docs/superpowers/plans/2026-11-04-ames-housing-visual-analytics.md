# AmesChronicle Feature Engineering & Interactive Visual Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an end-to-end Ames Housing data analysis, 5-stage feature engineering, 4-stage ablation modeling, SHAP explainability engine, FastAPI live inference server, reproducible Jupyter Notebook, and a flagship React 19 + ECharts 5 + ECharts-GL + Nivo + Recharts interactive visual analytics workbench.

**Architecture:** A modular Python data science backend (`src/`) fetches/caches the classic 2,930-record, 79-feature Ames Housing dataset, executes a 5-stage feature engineering pipeline (Outlier Surgery, Skewness/Box-Cox Normalization, 18+ Domain & Interaction Features, Out-of-Fold Smoothed Target Encoding, and 4-Stage Cross-Validation Ablation + SHAP Attribution), and exports rich structured JSON payloads (`data/processed/ames_analytics_payload.json` & `web/src/data/ames_analytics_payload.json`) while serving a live FastAPI valuation & What-If SHAP endpoint (`src/server.py`). The React 19 + TypeScript + Vite frontend (`web/`) renders 5 coordinated dark-glass Bento views using open-source GitHub visualization engines (`echarts`, `echarts-for-react`, `echarts-gl`, `@nivo/radar`, `@nivo/heatmap`, `recharts`, `framer-motion`, `lucide-react`).

**Tech Stack:** Python 3.12 (`pandas`, `numpy`, `scipy`, `scikit-learn`, `fastapi`, `uvicorn`, `pytest`), React 19, TypeScript, Vite, Tailwind CSS, Apache ECharts 5 + ECharts-GL, Nivo (`@nivo/core`, `@nivo/radar`, `@nivo/heatmap`), Recharts, Framer Motion, Lucide React.

## Global Constraints

- **Data Authenticity:** 100% real computations on the Ames Housing dataset (`2,930` rows, `79` raw features + `SalePrice`). Zero mocked metrics.
- **Design Contract:** Adhere strictly to `DESIGN.md` (Deep Obsidian `#070B14` theme, glassmorphic Bento cards, semantic palette Cyan `#06B6D4` / Violet `#8B5CF6` / Emerald `#10B981` / Rose `#F43F5E` / Amber `#F59E0B`, tabular monospace numeric readouts, and explicit "Key Insight / 核心发现" banners on every visual card).
- **Resilient Dual-Mode Operation:** The frontend loads precomputed real pipeline artifacts immediately for zero-latency exploration and connects to FastAPI (`http://localhost:8000/api/simulate`) with a synchronized local model-weights SHAP fallback so the interactive What-If Valuation Simulator works seamlessly both online and in static builds.

---

### Task 1: Ames Dataset Loader & 5-Stage Feature Engineering Engine (`src/data_loader.py` & `src/features.py`)

**Files:**
- Create: `requirements.txt`
- Create: `src/__init__.py`
- Create: `src/data_loader.py`
- Create: `src/features.py`
- Test: `tests/test_features.py`

**Interfaces:**
- Produces:
  - `load_ames_raw(cache_dir: Path) -> pd.DataFrame`: Fetches/loads the 2,930 × 80 Ames Housing dataset (`SalePrice` + 79 features).
  - `detect_leverage_outliers(df: pd.DataFrame) -> dict`: Identifies high-leverage anomalies (`GrLivArea > 4000` & `SalePrice < 300000`), computes Cook's distance, and returns before/after regression slope & $R^2$ diagnostics.
  - `impute_semantic_missing(df: pd.DataFrame) -> tuple[pd.DataFrame, list[dict]]`: Distinguishes structural absence (`None`/`0` for pool/alley/fence/basement/garage) from contextual missingness (`LotFrontage` imputed by `Neighborhood` median) and returns missingness anatomy metadata.
  - `transform_skewed_features(df: pd.DataFrame, skew_threshold: float = 0.75) -> tuple[pd.DataFrame, dict]`: Computes raw, `log1p`, and `boxcox`/`yeojohnson` distributions, histograms, KDE curves, and Q-Q plot coordinates for `SalePrice` and top skewed features.
  - `synthesize_domain_features(df: pd.DataFrame) -> tuple[pd.DataFrame, list[dict]]`: Creates 18+ domain-engineered and interaction features (`TotalSF`, `TotalBath`, `TotalPorchSF`, `HouseAge`, `RemodAge`, `IsRemodeled`, `IsNewBuild`, `OverallQual_x_TotalSF`, `Qual_to_Cond_Ratio`, `LivArea_to_Lot_Ratio`, `AmenityScore`, `BsmtFinRatio`, `HasPool`, `Has2ndFlr`, `HasGarage`, `HasFireplace`, `QualityWeightedAge`, `SpaceEfficiency`).
  - `apply_oof_target_encoding(df: pd.DataFrame, target_col: str = "SalePrice", smoothing: float = 10.0) -> tuple[pd.DataFrame, list[dict]]`: Computes 5-fold out-of-fold empirical Bayes smoothed target encoding for `Neighborhood` and clusters neighborhoods into 4 socioeconomic tiers.

- [ ] **Step 1: Write failing unit tests in `tests/test_features.py`**
- [ ] **Step 2: Run `pytest tests/test_features.py -v` to confirm failure**
- [ ] **Step 3: Implement `src/data_loader.py` and `src/features.py`**
- [ ] **Step 4: Run `pytest tests/test_features.py -v` and verify all tests pass**
- [ ] **Step 5: Commit Task 1**

---

### Task 2: 4-Stage Ablation Arena, SHAP Attribution Engine & Artifact Exporter (`src/models.py` & `src/pipeline.py`)

**Files:**
- Create: `src/models.py`
- Create: `src/pipeline.py`
- Test: `tests/test_models.py`

**Interfaces:**
- Consumes: `load_ames_raw`, `detect_leverage_outliers`, `impute_semantic_missing`, `transform_skewed_features`, `synthesize_domain_features`, `apply_oof_target_encoding` from Task 1.
- Produces:
  - `run_ablation_arena(df_raw: pd.DataFrame) -> dict`: Evaluates 6 models (`Ridge`, `Lasso`, `ElasticNet`, `RandomForest`, `GradientBoosting`, `HistGradientBoosting / Stacking`) across `Stage 0 (Raw Baseline)`, `Stage 1 (+Outlier & Skewness Fix)`, `Stage 2 (+Domain Synthesis & Interactions)`, and `Stage 3 (+OOF Target Encoding & Feature Selection)` with 5-fold CV (`rmse_log`, `rmse_usd`, `mae_usd`, `r2`).
  - `compute_shap_and_simulator_weights(df_engineered: pd.DataFrame) -> dict`: Computes exact Tree/Linear SHAP feature attributions (global importance, beeswarm sample points, interaction dependence curves, and exported simulator surrogate weights + neighborhood adjustments for live What-If waterfall decomposition).
  - `build_full_analytics_payload() -> dict`: Runs the complete pipeline and writes `data/processed/ames_analytics_payload.json` and `web/src/data/ames_analytics_payload.json`.

- [ ] **Step 1: Write failing unit tests in `tests/test_models.py`**
- [ ] **Step 2: Run `pytest tests/test_models.py -v` to confirm failure**
- [ ] **Step 3: Implement `src/models.py` and `src/pipeline.py` and generate `data/processed/ames_analytics_payload.json`**
- [ ] **Step 4: Run `pytest -v` and verify all pipeline & ablation tests pass ($R^2 > 0.91$ at Stage 3)**
- [ ] **Step 5: Commit Task 2**

---

### Task 3: FastAPI Live Valuation Server & Academic Jupyter Notebook (`src/server.py` & `notebooks/ames_feature_engineering_study.ipynb`)

**Files:**
- Create: `src/server.py`
- Create: `notebooks/ames_feature_engineering_study.ipynb`
- Test: `tests/test_server.py`

**Interfaces:**
- Consumes: `data/processed/ames_analytics_payload.json` and live model inference from `src/models.py`.
- Produces:
  - `GET /api/health` -> `{"status": "ok", "dataset_rows": 2930}`
  - `GET /api/payload` -> Full precomputed analytics JSON payload
  - `POST /api/simulate` -> Accepts property parameters (`total_sf`, `overall_qual`, `house_age`, `neighborhood`, `total_bath`, `garage_cars`, `kitchen_qual`, `is_remodeled`, `lot_area`, `fireplace_count`) and returns predicted `SalePrice`, confidence interval, percentile rank, and exact per-feature SHAP dollar waterfall contributions.

- [ ] **Step 1: Write failing API tests in `tests/test_server.py`**
- [ ] **Step 2: Run `pytest tests/test_server.py -v` to confirm failure**
- [ ] **Step 3: Implement `src/server.py` and generate `notebooks/ames_feature_engineering_study.ipynb`**
- [ ] **Step 4: Run `pytest -v` to verify all backend & API tests pass**
- [ ] **Step 5: Commit Task 3**

---

### Task 4: Web Frontend Scaffold, Design System Tokens & Reusable Open-Source Chart Wrappers (`web/`)

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/vite.config.ts`, `web/index.html`
- Create: `web/src/index.css`
- Create: `web/src/types/analytics.ts`
- Create: `web/src/theme/chartTheme.ts`
- Create: `web/src/components/ui/BentoCard.tsx`
- Create: `web/src/components/ui/MetricTickerCard.tsx`
- Create: `web/src/components/layout/TopNavHeader.tsx`

**Interfaces:**
- Consumes: `web/src/data/ames_analytics_payload.json`
- Produces: Typed analytics data context, unified Obsidian dark theme tokens for ECharts 5, ECharts-GL, Nivo, and Recharts, and responsive Bento layout primitives.

- [ ] **Step 1: Initialize `web/` project and install dependencies (`echarts`, `echarts-for-react`, `echarts-gl`, `@nivo/core`, `@nivo/radar`, `@nivo/heatmap`, `recharts`, `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`)**
- [ ] **Step 2: Implement `analytics.ts` types, `chartTheme.ts`, `BentoCard.tsx`, `MetricTickerCard.tsx`, and `TopNavHeader.tsx`**
- [ ] **Step 3: Verify TypeScript compilation (`npm run build` in `web/`)**
- [ ] **Step 4: Commit Task 4**

---

### Task 5: Implement the 5 Flagship Interactive Visualization Views (`web/src/components/views/`)

**Files:**
- Create: `web/src/components/views/View1EdaOutlierLab.tsx`
- Create: `web/src/components/views/View2FeatureForge.tsx`
- Create: `web/src/components/views/View3SpatialParallel.tsx`
- Create: `web/src/components/views/View4AblationArena.tsx`
- Create: `web/src/components/views/View5ShapSimulator.tsx`
- Create: `web/src/App.tsx`

**Interfaces:**
- Consumes: `AnalyticsPayload` from `web/src/data/ames_analytics_payload.json`, `BentoCard`, `MetricTickerCard`, `chartTheme`, and `/api/simulate` (with client-side exact SHAP surrogate fallback).
- Produces:
  1. `View1EdaOutlierLab`: Interactive Outlier Leverage Surgery toggle (`With Outliers` vs. `Outliers Removed` regression & Cook's Distance bubble plot) + Missingness Mechanism horizontal stacked bar & heatmap.
  2. `View2FeatureForge`: Interactive Skewness Morphing Lab (`Raw` vs. `Log1p` vs. `Box-Cox` histogram + KDE + Gaussian Q-Q Plot) + ECharts Feature Lineage Sankey Diagram + ECharts-GL 3D Interactive Response Surface (`OverallQual × TotalSF × SalePrice`).
  3. `View3SpatialParallel`: 28-Neighborhood OOF Target Encoding & Socioeconomic Tier Bubble Matrix + ECharts Brushable 8-Axis Parallel Coordinates Explorer + Nivo Multi-Neighborhood Archetype Radar & Correlation Heatmap.
  4. `View4AblationArena`: 4-Stage Feature Engineering Ablation Trajectory across 6 ML models + Raw vs. Engineered Feature Gain Comparison + Predicted vs. Actual Residual Diagnostics.
  5. `View5ShapSimulator`: Global SHAP Beeswarm & Interaction Dependence Plot + Real-Time What-If Property Valuation Simulator with live ECharts SHAP Waterfall $+ / -$ USD breakdown.

- [ ] **Step 1: Implement `View1EdaOutlierLab.tsx` and `View2FeatureForge.tsx`**
- [ ] **Step 2: Implement `View3SpatialParallel.tsx`, `View4AblationArena.tsx`, and `View5ShapSimulator.tsx`**
- [ ] **Step 3: Assemble `App.tsx` with animated tab transitions, global telemetry bar, and insight drawer**
- [ ] **Step 4: Run `npm run build` inside `web/` and fix any TypeScript or bundle warnings**
- [ ] **Step 5: Commit Task 5**

---

### Task 6: End-to-End Verification, Visual Browser Inspection & Documentation (`README.md`)

**Files:**
- Create: `README.md`
- Create: `run_workbench.sh`

- [ ] **Step 1: Run full backend test suite (`pytest -v`)**
- [ ] **Step 2: Start FastAPI backend and Vite frontend server, open in browser (`cursor-ide-browser` / Playwright), verify zero console errors, test interactive controls across all 5 views, and capture screenshots**
- [ ] **Step 3: Write comprehensive `README.md` documenting methodology, key quantitative findings, and launch instructions**
- [ ] **Step 4: Commit final verified deliverables**

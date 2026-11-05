# Design: AmesChronicle Visual Analytics Workbench

## Source of truth
- Status: Active
- Last refreshed: 2026-11-04
- Primary product surfaces: Interactive Web Analytics Workbench (`web/`), Python Feature Engineering & SHAP Pipeline (`src/`), Reproducible Research Notebook (`notebooks/`)
- Evidence reviewed: User requirements for a classic, heavy feature-engineering project (Ames Housing) with showstopper open-source GitHub data visualization components.

## Brand
- Personality: Presentation-first Guided Analytics Lecture, Quiet Editorial Dark Stage, Progressive Derivation
- Trust signals: Exact statistical metrics ($R^2$, RMSE, Skewness $\gamma_1$, Kurtosis $\gamma_2$, Cook's Distance, SHAP $\phi_i$ values in USD), transparent 4-stage ablation comparisons, zero fabricated numbers
- Avoid: Dense neon-glow dashboards that dump every chart at once, generic white Bootstrap admin templates, cluttered rainbow palettes, pie charts with >5 slices, unlabelled axes
- Presentation contract: Each chapter uses a left **循序推导** rail (observe → hypothesize → evidence → formula → gain) + right interactive canvas; analysis **维度** chips switch the evidence view; Space advances the current derivation beat; ←/→ change chapters

## Product goals
- Goals:
  - Make every step of the 5-stage feature engineering workflow visually tangible and mathematically convincing.
  - Showcase high-impact interactive visualizations (Sankey feature lineage, 3D interaction surfaces, parallel coordinates, skewness morphing Q-Q plots, SHAP waterfall simulator).
  - Serve as an exemplary, high-scoring data analysis and feature engineering project with real decision-making utility.
- Non-goals:
  - Generic CRUD property listing site or authentication/billing boilerplate.
- Success signals:
  - Immediate visual "wow" factor on first paint; seamless interactive switching across all 5 analytical tabs; verifiable cross-validation performance lift across the 4 feature engineering stages.

## Personas and jobs
- Primary personas: Data Science Instructor / Reviewer, ML Engineer, Real Estate Quantitative Analyst
- User jobs:
  - Inspect how raw dirty data (outliers, missingness, skewness) is diagnosed and repaired.
  - Explore how domain-engineered features (`TotalSF`, `OverallQual × TotalSF`, OOF Target Encoding) outperform raw features.
  - Simulate custom property configurations and audit exact dollar-level SHAP attributions.
- Key contexts of use: Desktop / widescreen presentation (1440px–2560px) and standard laptop viewports (1024px–1440px).

## Information architecture
- Primary navigation: Sticky top glassmorphic command bar with 5 structured analytical stage tabs + quick dataset/model status telemetry pills.
- Core routes/screens:
  1. `01 / EDA & Outlier Surgery` — Raw data health, missingness mechanism, interactive outlier leverage surgery
  2. `02 / Feature Engineering Forge` — Before/After skewness morphing, Q-Q plot diagnostics, Feature Lineage Sankey, 3D interaction surface
  3. `03 / Spatial & Multi-Dim Explorer` — 28-Neighborhood OOF target encoding matrix, parallel coordinates brush filter, neighborhood radar
  4. `04 / Ablation & Model Arena` — 4-Stage feature engineering ablation ladder across 6 ML models, feature importance shift, residual diagnostics
  5. `05 / SHAP XAI & Valuation Simulator` — Global SHAP beeswarm/dependence + interactive What-If property valuation & SHAP waterfall decomposition
- Content hierarchy: Top summary KPI strip → Primary interactive visual canvas (8–12 columns) → Coordinated diagnostic/detail cards (4–6 columns).

## Design principles
- Principle 1 — **Proof by Visual Contrast (Before vs. After):** Every feature engineering operation must show its "Before" and "After" state (with/without outliers, raw vs. Box-Cox skewness, raw vs. synthesized correlation, Stage 0 vs. Stage 3 ablation).
- Principle 2 — **Coordinated Multi-Engine Visualization:** Combine Apache ECharts 5 (Sankey, Parallel Coordinates, 3D Surface), Nivo (Radar, Correlation Matrix), and Recharts/Tremor primitives under a unified obsidian dark theme.
- Tradeoffs: Prioritize rich analytical density and smooth interactive transitions over minimalist marketing whitespace.

## Visual language
- Color:
  - Canvas Background: Deep Obsidian `#070B14` to `#0B1120` with subtle radial grid aura
  - Elevated Card Surface: `rgba(15, 23, 42, 0.72)` with `1px solid rgba(148, 163, 184, 0.14)` border and `backdrop-filter: blur(16px)`
  - Primary Accent (Engineered Signal): Electric Cyan `#06B6D4` / Sky `#38BDF8`
  - Secondary Accent (Interaction & Non-Linearity): Vivid Violet `#8B5CF6` / Indigo `#6366F1`
  - Positive Gain / Positive SHAP: Emerald `#10B981`
  - Anomaly / Negative SHAP / Outlier Alert: Rose `#F43F5E`
  - Baseline / Warning Reference: Amber `#F59E0B`
- Typography:
  - UI & Headings: `Inter` / `-apple-system, BlinkMacSystemFont, sans-serif`
  - Quantitative Readouts, Equations & Metrics: `JetBrains Mono` / `SFMono-Regular, monospace` with `font-variant-numeric: tabular-nums`
- Spacing/layout rhythm: 12-column responsive CSS Bento Grid (`gap: 20px`, container max-width `1600px`, card padding `20px–24px`).
- Shape/radius/elevation: `16px` (`rounded-2xl`) card radius, subtle top border highlight (`rgba(255,255,255,0.08)`), dark ambient elevation.
- Motion: Framer Motion layout transitions on tab change and metric counters; ECharts `cubicOut` 600ms morph transitions on distribution and stage switches.
- Imagery/iconography: `lucide-react` crisp 16px–20px vector icons paired with semantic color badges.

## Components
- Existing components to reuse: Open-source ecosystem packages (`echarts`, `echarts-for-react`, `echarts-gl`, `@nivo/radar`, `@nivo/heatmap`, `recharts`, `framer-motion`, `lucide-react`).
- New/changed components:
  - `BentoCard` & `MetricTickerCard` (Tremor-style KPI cards with delta badges and mini sparklines)
  - `OutlierSurgeryChart` (Interactive regression leverage + Cook's distance scatter)
  - `SkewnessMorphLab` (Raw vs. Log1p vs. Box-Cox histogram + KDE + Q-Q Plot)
  - `FeatureLineageSankey` (ECharts Sankey tracing raw → engineered → SHAP importance)
  - `InteractionSurface3D` (ECharts-GL 3D response surface for `OverallQual × TotalSF × SalePrice`)
  - `ParallelExplorer` (Multi-axis brushable parallel coordinates across 8 property dimensions)
  - `NeighborhoodRadarMatrix` (28-neighborhood socioeconomic tier heatmap + Nivo radar comparison)
  - `AblationLadderArena` (4-stage feature engineering progression across 6 models)
  - `ShapSimulator` (Interactive property sliders + live SHAP waterfall attribution chart)
- Variants and states: Active/inactive filter pills, Raw/Transformed toggle switches, stage selector tabs (`Stage 0`–`Stage 3`), hover crosshairs with formatted USD/metric tooltips.
- Token/component ownership: Unified chart theme object in `web/src/theme/chartTheme.ts` shared across ECharts, Nivo, and Recharts.

## Accessibility
- Target standard: WCAG AA contrast on dark surfaces (minimum 4.5:1 for body/labels, 3:1 for large numeric readouts and graphical marks).
- Keyboard/focus behavior: Native focusable `<button>`, `<select>`, and `<input type="range">` controls with visible cyan focus rings.
- Contrast/readability: Never rely on color alone; pair positive/negative SHAP and ablation deltas with explicit `+`/`-` signs, directional arrows, and units (`$`, `%`, `sq.ft`).
- Screen-reader semantics: Accessible `aria-label` on interactive controls and descriptive titles/subtitles on every chart card.
- Reduced motion and sensory considerations: Finite, user-triggered chart morphs; no distracting infinite background animations.

## Responsive behavior
- Supported breakpoints/devices: Ultra-wide & Desktop (`>=1280px`: 12-column Bento grid), Laptop/Tablet (`768px–1279px`: 6-column stacked grid), Mobile (`<768px`: single-column flow).
- Layout adaptations: ECharts `ResizeObserver` auto-resizing on window/container change.
- Touch/hover differences: Rich floating tooltips on pointer hover; persistent summary readouts in card headers so core insights are visible without hover.

## Interaction states
- Loading: Shimmer skeleton placeholders matching chart bounding boxes.
- Empty: Clear reset-filter CTA when parallel coordinates brush selection yields 0 properties.
- Error: Graceful fallback to bundled precomputed pipeline artifacts if the live FastAPI backend is offline.
- Success: Instant badge indicator showing whether valuation is served via `Live Python Engine` or `Precomputed Surrogate Engine`.
- Disabled: Visual dimming (`opacity-40`) with explanatory tooltip when an incompatible option is selected.

## Content voice
- Tone: Authoritative, analytical, lucid, and insight-driven (combining bilingual Chinese titles/explanations with standard English statistical/feature nomenclature).
- Terminology: Consistent feature names (`TotalSF`, `OverallQual`, `HouseAge`, `Neighborhood_TE`, `Box-Cox λ`) alongside clear Chinese domain explanations.
- Microcopy rules: Every chart card includes a **"Key Insight / 核心发现"** callout banner summarizing the quantitative takeaway in one sentence.

## Implementation constraints
- Framework/styling system: Python 3 (`pandas`, `numpy`, `scipy`, `scikit-learn`, `lightgbm`, `xgboost`, `shap`, `fastapi`) + React 19 / TypeScript / Vite / Tailwind CSS.
- Design-token constraints: All chart instances must consume the shared dark palette tokens.
- Performance constraints: Precompute heavy CV ablation and global SHAP matrices into structured JSON artifacts (`< 1.5 MB`) for instant `< 100ms` frontend rendering.
- Compatibility constraints: Must run locally with a single command and render cleanly in modern Chromium/WebKit/Firefox browsers.
- Test/screenshot expectations: Full verification of Python pipeline metrics and Playwright/browser visual verification of all 5 frontend tabs.

## Open questions
- None — all product, dataset, feature engineering, and visualization architecture decisions are locked and approved.

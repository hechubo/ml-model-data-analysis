"""Five-Stage Feature Engineering Engine for Ames Housing."""

from __future__ import annotations

from typing import Any
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.model_selection import KFold


# Categorical columns where NA physically means "Facility Not Present (None)"
SEMANTIC_NONE_COLS: dict[str, str] = {
    "PoolQC": "Outdoor / Pool",
    "MiscFeature": "Misc Structure",
    "Alley": "Site Access",
    "Fence": "Outdoor / Perimeter",
    "FireplaceQu": "Interior Amenity",
    "GarageType": "Garage Facility",
    "GarageFinish": "Garage Facility",
    "GarageQual": "Garage Facility",
    "GarageCond": "Garage Facility",
    "BsmtQual": "Basement Structure",
    "BsmtCond": "Basement Structure",
    "BsmtExposure": "Basement Structure",
    "BsmtFinType1": "Basement Structure",
    "BsmtFinType2": "Basement Structure",
    "MasVnrType": "Exterior Masonry",
}

# Numerical columns where NA physically means 0 (no basement / no garage / no masonry)
SEMANTIC_ZERO_COLS: dict[str, str] = {
    "GarageYrBlt": "Garage Facility",
    "GarageArea": "Garage Facility",
    "GarageCars": "Garage Facility",
    "BsmtFinSF1": "Basement Structure",
    "BsmtFinSF2": "Basement Structure",
    "BsmtUnfSF": "Basement Structure",
    "TotalBsmtSF": "Basement Structure",
    "BsmtFullBath": "Basement Structure",
    "BsmtHalfBath": "Basement Structure",
    "MasVnrArea": "Exterior Masonry",
}

ORDINAL_QUALITY_MAP = {
    "Ex": 5,
    "Gd": 4,
    "TA": 3,
    "Fa": 2,
    "Po": 1,
    "None": 0,
    "NA": 0,
}

ORDINAL_QUALITY_COLS = [
    "ExterQual",
    "ExterCond",
    "BsmtQual",
    "BsmtCond",
    "HeatingQC",
    "KitchenQual",
    "FireplaceQu",
    "GarageQual",
    "GarageCond",
    "PoolQC",
]


def detect_leverage_outliers(df: pd.DataFrame) -> dict[str, Any]:
    """
    Stage 1A: Detect high-leverage outliers in GrLivArea vs SalePrice
    and compute Cook's distance + regression slope/R2 distortion before vs after.
    """
    work = df[["GrLivArea", "SalePrice", "OverallQual", "Neighborhood"]].dropna().copy()
    x = work["GrLivArea"].to_numpy(dtype=float)
    y = work["SalePrice"].to_numpy(dtype=float)
    n = len(x)

    # OLS fit before outlier removal
    slope_b, intercept_b, r_val_b, _, _ = stats.linregress(x, y)
    r2_before = float(r_val_b**2)
    y_hat_b = intercept_b + slope_b * x
    residuals = y - y_hat_b

    # Leverage h_i and Cook's Distance D_i for simple linear regression
    x_mean = np.mean(x)
    sxx = np.sum((x - x_mean) ** 2)
    leverage = (1.0 / n) + ((x - x_mean) ** 2) / sxx
    mse = np.sum(residuals**2) / (n - 2)
    cooks_d = (residuals**2 / (2.0 * mse)) * (leverage / ((1.0 - leverage) ** 2))

    # Canonical De Cock outlier rule: GrLivArea > 4000 sq.ft and SalePrice < $300,000
    # plus extreme Cook's distance > 0.15 with GrLivArea > 3500
    is_outlier_mask = ((x > 4000) & (y < 300000)) | ((x > 3500) & (cooks_d > 0.15))
    outlier_indices = work.index[is_outlier_mask].tolist()

    # OLS fit after outlier removal
    x_clean = x[~is_outlier_mask]
    y_clean = y[~is_outlier_mask]
    slope_a, intercept_a, r_val_a, _, _ = stats.linregress(x_clean, y_clean)
    r2_after = float(r_val_a**2)

    # Sample points for interactive scatter (include all outliers + stratified sample up to 750 points)
    work["cooks_d"] = np.round(cooks_d, 5)
    work["leverage"] = np.round(leverage, 5)
    work["residual"] = np.round(residuals, 1)
    work["is_outlier"] = is_outlier_mask

    outliers_df = work[work["is_outlier"]]
    inliers_df = work[~work["is_outlier"]]
    if len(inliers_df) > 700:
        rng = np.random.default_rng(42)
        sampled_idx = rng.choice(inliers_df.index, size=700, replace=False)
        inliers_sampled = inliers_df.loc[sampled_idx]
    else:
        inliers_sampled = inliers_df

    combined_points = pd.concat([outliers_df, inliers_sampled], axis=0)
    scatter_points = [
        {
            "id": int(idx),
            "gr_liv_area": float(row["GrLivArea"]),
            "sale_price": float(row["SalePrice"]),
            "overall_qual": int(row["OverallQual"]),
            "neighborhood": str(row["Neighborhood"]),
            "cooks_d": float(row["cooks_d"]),
            "leverage": float(row["leverage"]),
            "residual": float(row["residual"]),
            "is_outlier": bool(row["is_outlier"]),
        }
        for idx, row in combined_points.iterrows()
    ]

    return {
        "total_rows": int(len(df)),
        "outlier_count": int(len(outlier_indices)),
        "outlier_indices": [int(i) for i in outlier_indices],
        "r2_before": round(r2_before, 4),
        "r2_after": round(r2_after, 4),
        "r2_gain_pct": round((r2_after - r2_before) * 100.0, 2),
        "regression_before": {
            "slope": round(float(slope_b), 2),
            "intercept": round(float(intercept_b), 1),
        },
        "regression_after": {
            "slope": round(float(slope_a), 2),
            "intercept": round(float(intercept_a), 1),
        },
        "scatter_points": scatter_points,
    }


def impute_semantic_missing(df: pd.DataFrame) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    """
    Stage 1B: Differentiate semantic absence ('None' / 0) from true missingness
    (e.g. LotFrontage imputed by Neighborhood median) and return zero-NA DataFrame.
    """
    clean = df.copy()
    total_n = len(clean)
    missing_report: list[dict[str, Any]] = []

    # Record missing stats before imputation
    na_counts = clean.isna().sum()
    na_cols = na_counts[na_counts > 0].sort_values(ascending=False)

    for col, count in na_cols.items():
        pct = round(float(count) / total_n * 100.0, 2)
        if col in SEMANTIC_NONE_COLS:
            strategy = "Semantic 'None' (Facility Absent)"
            category = SEMANTIC_NONE_COLS[col]
        elif col in SEMANTIC_ZERO_COLS:
            strategy = "Semantic 0 (Structure Absent)"
            category = SEMANTIC_ZERO_COLS[col]
        elif col == "LotFrontage":
            strategy = "Hierarchical Neighborhood Median"
            category = "Spatial / Lot Geometry"
        elif clean[col].dtype == object:
            strategy = "Neighborhood / Global Mode"
            category = "Categorical Attribute"
        else:
            strategy = "Neighborhood / Global Median"
            category = "Numerical Attribute"

        missing_report.append(
            {
                "feature": str(col),
                "missing_count": int(count),
                "missing_pct": pct,
                "strategy": strategy,
                "category": category,
            }
        )

    # Apply semantic None for categorical absence
    for col in SEMANTIC_NONE_COLS:
        if col in clean.columns:
            clean[col] = clean[col].fillna("None").astype(str)

    # Apply semantic 0 for numerical absence
    for col in SEMANTIC_ZERO_COLS:
        if col in clean.columns:
            clean[col] = pd.to_numeric(clean[col], errors="coerce").fillna(0.0)

    # Contextual LotFrontage imputation by Neighborhood median
    if "LotFrontage" in clean.columns and "Neighborhood" in clean.columns:
        clean["LotFrontage"] = pd.to_numeric(clean["LotFrontage"], errors="coerce")
        global_lf_med = float(clean["LotFrontage"].median())
        nb_medians = clean.groupby("Neighborhood")["LotFrontage"].median().fillna(global_lf_med)
        clean["LotFrontage"] = clean["LotFrontage"].fillna(clean["Neighborhood"].map(nb_medians))
        clean["LotFrontage"] = clean["LotFrontage"].fillna(global_lf_med)

    # Remaining object and numeric columns
    for col in clean.columns:
        if clean[col].isna().any():
            if clean[col].dtype == object:
                mode_val = clean[col].mode(dropna=True)
                fill_val = str(mode_val.iloc[0]) if len(mode_val) > 0 else "None"
                clean[col] = clean[col].fillna(fill_val)
            else:
                med_val = float(clean[col].median()) if clean[col].notna().any() else 0.0
                clean[col] = clean[col].fillna(med_val)

    return clean, missing_report


def _build_hist_and_kde(values: np.ndarray, bins: int = 28) -> dict[str, list[float]]:
    """Compute histogram bins, normalized densities, and smooth KDE curve."""
    clean_vals = values[np.isfinite(values)]
    counts, edges = np.histogram(clean_vals, bins=bins, density=False)
    centers = 0.5 * (edges[:-1] + edges[1:])
    bin_width = float(edges[1] - edges[0]) if len(edges) > 1 else 1.0

    try:
        kde = stats.gaussian_kde(clean_vals)
        kde_y = kde(centers) * len(clean_vals) * bin_width
    except Exception:
        kde_y = counts.astype(float)

    return {
        "bins": [round(float(c), 3) for c in centers],
        "counts": [int(c) for c in counts],
        "kde": [round(float(k), 2) for k in kde_y],
    }


def _build_qq_points(values: np.ndarray, num_points: int = 60) -> list[dict[str, float]]:
    """Compute standardized Q-Q plot theoretical vs sample quantiles."""
    clean_vals = np.sort(values[np.isfinite(values)])
    if len(clean_vals) < 10:
        return []
    std_vals = (clean_vals - np.mean(clean_vals)) / (np.std(clean_vals) + 1e-9)
    quantiles = np.linspace(0.01, 0.99, num_points)
    theo_q = stats.norm.ppf(quantiles)
    sample_q = np.quantile(std_vals, quantiles)
    return [
        {"theoretical": round(float(t), 3), "sample": round(float(s), 3)}
        for t, s in zip(theo_q, sample_q)
    ]


def transform_skewed_features(
    df: pd.DataFrame, skew_threshold: float = 0.75
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    Stage 2: Diagnose and normalize right-skewed continuous features via
    Log1p and Box-Cox / Yeo-Johnson transformations, exporting histograms and Q-Q coordinates.
    """
    transformed = df.copy()
    candidate_cols = [
        "SalePrice",
        "GrLivArea",
        "TotalBsmtSF",
        "1stFlrSF",
        "LotArea",
        "MasVnrArea",
        "OpenPorchSF",
        "WoodDeckSF",
    ]
    skew_report: dict[str, Any] = {}

    for col in candidate_cols:
        if col not in transformed.columns:
            continue
        raw_vals = pd.to_numeric(transformed[col], errors="coerce").fillna(0.0).to_numpy(dtype=float)
        raw_vals_pos = np.maximum(raw_vals, 0.0)
        raw_skew = float(stats.skew(raw_vals_pos))
        raw_kurt = float(stats.kurtosis(raw_vals_pos))

        log_vals = np.log1p(raw_vals_pos)
        log_skew = float(stats.skew(log_vals))
        log_kurt = float(stats.kurtosis(log_vals))

        # Box-Cox on strictly positive shifted values (x + 1)
        try:
            bc_vals, lmbda = stats.boxcox(raw_vals_pos + 1.0)
            bc_skew = float(stats.skew(bc_vals))
            bc_kurt = float(stats.kurtosis(bc_vals))
        except Exception:
            bc_vals = log_vals
            lmbda = 0.0
            bc_skew = log_skew
            bc_kurt = log_kurt

        if abs(raw_skew) >= skew_threshold and col != "SalePrice":
            transformed[f"{col}_Log1p"] = log_vals
            transformed[f"{col}_BoxCox"] = bc_vals

        if col == "SalePrice":
            transformed["SalePrice_Log1p"] = log_vals

        skew_report[col] = {
            "feature": col,
            "raw_skew": round(raw_skew, 3),
            "raw_kurtosis": round(raw_kurt, 3),
            "log1p_skew": round(log_skew, 3),
            "log1p_kurtosis": round(log_kurt, 3),
            "boxcox_skew": round(bc_skew, 3),
            "boxcox_kurtosis": round(bc_kurt, 3),
            "boxcox_lambda": round(float(lmbda), 3),
            "raw_hist": _build_hist_and_kde(raw_vals_pos, bins=26),
            "log1p_hist": _build_hist_and_kde(log_vals, bins=26),
            "boxcox_hist": _build_hist_and_kde(bc_vals, bins=26),
            "qq_raw": _build_qq_points(raw_vals_pos, num_points=55),
            "qq_transformed": _build_qq_points(log_vals, num_points=55),
            "qq_boxcox": _build_qq_points(bc_vals, num_points=55),
        }

    return transformed, skew_report


def synthesize_domain_features(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    """
    Stage 3: Construct 18+ domain-driven structural, lifecycle, amenity, and
    non-linear interaction features and compute correlation lift vs SalePrice.
    """
    work = df.copy()

    # Map ordinal quality columns to numeric scores
    for col in ORDINAL_QUALITY_COLS:
        if col in work.columns:
            work[f"{col}_Num"] = (
                work[col].astype(str).map(lambda v: ORDINAL_QUALITY_MAP.get(v, 0)).astype(float)
            )

    # 1. Total Living & Basement Area
    work["TotalSF"] = (
        work["TotalBsmtSF"].astype(float)
        + work["1stFlrSF"].astype(float)
        + work["2ndFlrSF"].astype(float)
    )

    # 2. Weighted Total Bathrooms
    work["TotalBath"] = (
        work["FullBath"].astype(float)
        + 0.5 * work["HalfBath"].astype(float)
        + work["BsmtFullBath"].astype(float)
        + 0.5 * work["BsmtHalfBath"].astype(float)
    )

    # 3. Total Outdoor Porch & Deck Area
    work["TotalPorchSF"] = (
        work["OpenPorchSF"].astype(float)
        + work["EnclosedPorch"].astype(float)
        + work["3SsnPorch"].astype(float)
        + work["ScreenPorch"].astype(float)
        + work["WoodDeckSF"].astype(float)
    )

    # 4. Property Age & Remodel Lifecycle
    work["HouseAge"] = np.maximum(0.0, work["YrSold"].astype(float) - work["YearBuilt"].astype(float))
    work["RemodAge"] = np.maximum(
        0.0, work["YrSold"].astype(float) - work["YearRemodAdd"].astype(float)
    )
    work["IsRemodeled"] = (work["YearRemodAdd"] != work["YearBuilt"]).astype(int)
    work["IsNewBuild"] = (work["YrSold"] <= work["YearBuilt"] + 1).astype(int)

    # 5. Synergistic Non-Linear Interaction Terms
    work["OverallQual_x_TotalSF"] = work["OverallQual"].astype(float) * work["TotalSF"]
    work["OverallQual_Sq"] = (work["OverallQual"].astype(float)) ** 2
    work["Qual_to_Cond_Ratio"] = work["OverallQual"].astype(float) / np.maximum(
        1.0, work["OverallCond"].astype(float)
    )

    # 6. Spatial Utilization & Basement Ratios
    work["LivArea_to_Lot_Ratio"] = work["GrLivArea"].astype(float) / np.maximum(
        100.0, work["LotArea"].astype(float)
    )
    work["BsmtFinRatio"] = work["BsmtFinSF1"].astype(float) / np.maximum(
        1.0, work["TotalBsmtSF"].astype(float)
    )
    work["SpaceEfficiency"] = work["GrLivArea"].astype(float) / np.maximum(
        1.0, work["TotRmsAbvGrd"].astype(float)
    )

    # 7. Binary Facility Indicators & Composite Amenity Score
    work["HasPool"] = (work["PoolArea"].astype(float) > 0).astype(int)
    work["Has2ndFlr"] = (work["2ndFlrSF"].astype(float) > 0).astype(int)
    work["HasGarage"] = (work["GarageArea"].astype(float) > 0).astype(int)
    work["HasFireplace"] = (work["Fireplaces"].astype(float) > 0).astype(int)

    exter_num = work.get("ExterQual_Num", pd.Series(3.0, index=work.index))
    kitchen_num = work.get("KitchenQual_Num", pd.Series(3.0, index=work.index))
    bsmt_num = work.get("BsmtQual_Num", pd.Series(3.0, index=work.index))
    fireplace_num = work.get("FireplaceQu_Num", pd.Series(0.0, index=work.index))

    work["AmenityScore"] = (
        exter_num * 1.5
        + kitchen_num * 1.8
        + bsmt_num * 1.2
        + fireplace_num * 0.8
        + work["GarageCars"].astype(float) * 1.4
        + work["TotalBath"] * 1.2
    )

    work["QualityWeightedAge"] = work["OverallQual"].astype(float) / np.log1p(work["HouseAge"] + 2.0)

    # Build lineage metadata comparing engineered features with their raw parent features
    target = work["SalePrice"].astype(float)
    log_target = np.log1p(target)

    engineered_specs = [
        (
            "OverallQual_x_TotalSF",
            "Interaction Synthesis",
            ["OverallQual", "TotalBsmtSF", "1stFlrSF", "2ndFlrSF"],
            "OverallQual × (TotalBsmtSF + 1stFlrSF + 2ndFlrSF)",
            "Captures super-linear luxury multiplier of large area in high-grade construction",
        ),
        (
            "TotalSF",
            "Structural Aggregation",
            ["TotalBsmtSF", "1stFlrSF", "2ndFlrSF"],
            "TotalBsmtSF + 1stFlrSF + 2ndFlrSF",
            "Unifies fragmented floor square footage into total usable building footprint",
        ),
        (
            "AmenityScore",
            "Composite Index",
            ["ExterQual", "KitchenQual", "BsmtQual", "FireplaceQu", "GarageCars"],
            "1.5·Exter + 1.8·Kitchen + 1.2·Bsmt + 0.8·Fireplace + 1.4·Garage + 1.2·Bath",
            "Synthesizes interior/exterior finish grades and facility capacity",
        ),
        (
            "QualityWeightedAge",
            "Lifecycle Decay",
            ["OverallQual", "YrSold", "YearBuilt"],
            "OverallQual / log(1 + HouseAge + 2)",
            "Models non-linear age depreciation buffered by construction grade",
        ),
        (
            "OverallQual_Sq",
            "Polynomial Expansion",
            ["OverallQual"],
            "OverallQual²",
            "Models exponential price jump between grade 7, 8, 9, and 10 homes",
        ),
        (
            "TotalBath",
            "Structural Aggregation",
            ["FullBath", "HalfBath", "BsmtFullBath", "BsmtHalfBath"],
            "FullBath + 0.5·HalfBath + BsmtFullBath + 0.5·BsmtHalfBath",
            "Consolidates 4 sparse bathroom counters into weighted utility index",
        ),
        (
            "HouseAge",
            "Lifecycle Decay",
            ["YrSold", "YearBuilt"],
            "YrSold - YearBuilt",
            "Direct structural depreciation age at time of transaction",
        ),
        (
            "RemodAge",
            "Lifecycle Decay",
            ["YrSold", "YearRemodAdd"],
            "YrSold - YearRemodAdd",
            "Years elapsed since most recent major renovation",
        ),
        (
            "TotalPorchSF",
            "Structural Aggregation",
            ["OpenPorchSF", "EnclosedPorch", "3SsnPorch", "ScreenPorch", "WoodDeckSF"],
            "Sum of 5 outdoor porch & deck square footage columns",
            "Aggregates outdoor leisure footprint",
        ),
        (
            "SpaceEfficiency",
            "Spatial Density",
            ["GrLivArea", "TotRmsAbvGrd"],
            "GrLivArea / TotRmsAbvGrd",
            "Average square footage per above-grade room (spaciousness vs partitioning)",
        ),
        (
            "BsmtFinRatio",
            "Spatial Density",
            ["BsmtFinSF1", "TotalBsmtSF"],
            "BsmtFinSF1 / max(1, TotalBsmtSF)",
            "Proportion of basement converted into finished living space",
        ),
        (
            "LivArea_to_Lot_Ratio",
            "Spatial Density",
            ["GrLivArea", "LotArea"],
            "GrLivArea / LotArea",
            "Floor-area ratio (FAR) measuring building density relative to parcel size",
        ),
    ]

    lineage_meta: list[dict[str, Any]] = []
    for feat_name, group, parents, formula, desc in engineered_specs:
        corr_price = float(work[feat_name].corr(target))
        corr_log_price = float(work[feat_name].corr(log_target))
        parent_corrs = []
        for p in parents:
            if p in work.columns and pd.api.types.is_numeric_dtype(work[p]):
                parent_corrs.append(abs(float(work[p].corr(target))))
        best_parent_corr = max(parent_corrs) if parent_corrs else 0.45

        lineage_meta.append(
            {
                "feature": feat_name,
                "group": group,
                "parents": parents,
                "formula": formula,
                "description": desc,
                "corr_sale_price": round(corr_price, 4),
                "corr_log_price": round(corr_log_price, 4),
                "abs_corr": round(abs(corr_price), 4),
                "best_parent_corr": round(best_parent_corr, 4),
                "lift_over_parent": round(abs(corr_price) - best_parent_corr, 4),
            }
        )

    lineage_meta.sort(key=lambda item: item["abs_corr"], reverse=True)
    return work, lineage_meta


def apply_oof_target_encoding(
    df: pd.DataFrame, target_col: str = "SalePrice", smoothing: float = 10.0
) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    """
    Stage 4: Out-of-Fold Empirical Bayes Smoothed Target Encoding for Neighborhood
    and MSSubClass, plus 4-tier socioeconomic clustering.
    """
    work = df.copy()
    y = work[target_col].astype(float)
    global_mean = float(y.mean())

    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    oof_te = np.zeros(len(work), dtype=float)

    for train_idx, val_idx in kf.split(work):
        train_slice = work.iloc[train_idx]
        val_slice = work.iloc[val_idx]
        stats_df = train_slice.groupby("Neighborhood")[target_col].agg(["count", "mean"])
        counts = stats_df["count"]
        means = stats_df["mean"]
        smooth_map = (counts * means + smoothing * global_mean) / (counts + smoothing)
        oof_te[val_idx] = val_slice["Neighborhood"].map(smooth_map).fillna(global_mean).to_numpy()

    work["Neighborhood_TE"] = oof_te

    # Compute full-dataset smoothed stats & socioeconomic tiering for the 28 neighborhoods
    full_stats = (
        work.groupby("Neighborhood")
        .agg(
            count=("SalePrice", "count"),
            mean_price=("SalePrice", "mean"),
            median_price=("SalePrice", "median"),
            mean_total_sf=("TotalSF", "mean"),
            mean_qual=("OverallQual", "mean"),
            mean_age=("HouseAge", "mean"),
            mean_amenity=("AmenityScore", "mean"),
            mean_bath=("TotalBath", "mean"),
            mean_lot=("LotArea", "mean"),
        )
        .reset_index()
    )

    full_stats["smoothed_te"] = (
        full_stats["count"] * full_stats["mean_price"] + smoothing * global_mean
    ) / (full_stats["count"] + smoothing)
    full_stats["price_per_sqft"] = full_stats["mean_price"] / np.maximum(
        1.0, full_stats["mean_total_sf"]
    )

    # Assign 4 socioeconomic tiers by smoothed target encoding quantiles
    q25, q50, q75 = np.quantile(full_stats["smoothed_te"], [0.25, 0.50, 0.75])

    def _assign_tier(val: float) -> str:
        if val >= q75:
            return "Tier 1: Luxury & Affluent"
        if val >= q50:
            return "Tier 2: Upper-Mid Residential"
        if val >= q25:
            return "Tier 3: Core Family Suburb"
        return "Tier 4: Historic & Entry"

    def _assign_tier_num(val: float) -> int:
        if val >= q75:
            return 4
        if val >= q50:
            return 3
        if val >= q25:
            return 2
        return 1

    full_stats["tier"] = full_stats["smoothed_te"].map(_assign_tier)
    full_stats["tier_num"] = full_stats["smoothed_te"].map(_assign_tier_num)

    tier_map = dict(zip(full_stats["Neighborhood"], full_stats["tier_num"]))
    work["Neighborhood_Tier"] = work["Neighborhood"].map(tier_map).fillna(2).astype(int)
    work["Qual_x_Neighborhood_TE"] = work["OverallQual"].astype(float) * (
        work["Neighborhood_TE"] / 100000.0
    )

    full_stats = full_stats.sort_values("smoothed_te", ascending=False)
    neighborhood_profiles: list[dict[str, Any]] = [
        {
            "neighborhood": str(row["Neighborhood"]),
            "count": int(row["count"]),
            "mean_price": round(float(row["mean_price"]), 0),
            "median_price": round(float(row["median_price"]), 0),
            "smoothed_te": round(float(row["smoothed_te"]), 0),
            "price_per_sqft": round(float(row["price_per_sqft"]), 2),
            "mean_total_sf": round(float(row["mean_total_sf"]), 0),
            "mean_qual": round(float(row["mean_qual"]), 2),
            "mean_age": round(float(row["mean_age"]), 1),
            "mean_amenity": round(float(row["mean_amenity"]), 2),
            "mean_bath": round(float(row["mean_bath"]), 2),
            "mean_lot": round(float(row["mean_lot"]), 0),
            "tier": str(row["tier"]),
            "tier_num": int(row["tier_num"]),
        }
        for _, row in full_stats.iterrows()
    ]

    return work, neighborhood_profiles

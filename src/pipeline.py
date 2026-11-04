"""End-to-End Ames Housing Feature Engineering & Visual Analytics Pipeline."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.data_loader import load_ames_raw
from src.features import (
    apply_oof_target_encoding,
    build_analytical_discovery_evidence,
    detect_leverage_outliers,
    impute_semantic_missing,
    synthesize_domain_features,
    transform_skewed_features,
)
from src.models import (
    compute_shap_and_simulator_weights,
    run_ablation_arena,
    simulate_property_valuation,
)


def build_full_analytics_payload(
    output_paths: list[Path] | None = None,
) -> dict[str, Any]:
    """
    Execute the complete 5-stage pipeline and export the structured JSON payload
    for both the FastAPI server and the React visualization workbench.
    """
    raw_df = load_ames_raw(Path("data/raw"))

    # Stage 1: Outlier surgery & semantic missingness imputation
    outlier_lab = detect_leverage_outliers(raw_df)
    clean_no_outliers = raw_df.drop(index=outlier_lab["outlier_indices"]).reset_index(drop=True)
    imputed_df, missing_report = impute_semantic_missing(clean_no_outliers)

    # Stage 2: Skewness & Box-Cox / Log1p transformations
    skew_df, skewness_lab = transform_skewed_features(imputed_df)

    # Stage 3: Domain synthesis & non-linear interactions
    synth_df, engineered_lineage = synthesize_domain_features(skew_df)

    # Stage 4: Out-of-Fold Smoothed Target Encoding & Spatial Clustering
    encoded_df, neighborhood_profiles = apply_oof_target_encoding(synth_df)

    # Analytical Discovery Evidence (How Data Analysis Discovered Useful Features)
    discovery_evidence = build_analytical_discovery_evidence(encoded_df)

    # Stage 5: 4-Stage Ablation Arena & SHAP Attribution
    ablation_raw = run_ablation_arena(raw_df)
    shap_xai = compute_shap_and_simulator_weights(ablation_raw["df_stage3"])

    best_traj = ablation_raw["best_stage_trajectory"]
    r2_s0 = best_traj[0]["r2"]
    r2_s3 = best_traj[3]["r2"]
    rmse_s0 = best_traj[0]["rmse_usd"]
    rmse_s3 = best_traj[3]["rmse_usd"]
    rmse_drop_pct = round((rmse_s0 - rmse_s3) / rmse_s0 * 100.0, 1)

    top_eng_feat = engineered_lineage[0]

    summary_kpis = {
        "total_transactions": int(len(raw_df)),
        "clean_transactions": int(len(encoded_df)),
        "outliers_removed": int(outlier_lab["outlier_count"]),
        "raw_feature_count": int(raw_df.shape[1] - 2),
        "engineered_feature_count": int(ablation_raw["stages"][-1]["feature_count"]),
        "synthesized_features_added": len(engineered_lineage) + 3,
        "r2_baseline": r2_s0,
        "r2_final": r2_s3,
        "r2_lift": round(r2_s3 - r2_s0, 4),
        "rmse_baseline_usd": rmse_s0,
        "rmse_final_usd": rmse_s3,
        "rmse_reduction_pct": rmse_drop_pct,
        "top_engineered_feature": top_eng_feat["feature"],
        "top_engineered_corr": top_eng_feat["corr_sale_price"],
        "median_sale_price": round(float(raw_df["SalePrice"].median()), 0),
        "mean_sale_price": round(float(raw_df["SalePrice"].mean()), 0),
    }

    payload: dict[str, Any] = {
        "meta": {
            "project": "AmesChronicle",
            "dataset": "Ames Housing Dataset (De Cock / Kaggle Combined)",
            "generated_at": "2026-11-04",
        },
        "summary_kpis": summary_kpis,
        "outlier_lab": outlier_lab,
        "missing_report": missing_report,
        "skewness_lab": skewness_lab,
        "engineered_lineage": engineered_lineage,
        "discovery_evidence": discovery_evidence,
        "neighborhood_profiles": neighborhood_profiles,
        "ablation_arena": {
            "stages": ablation_raw["stages"],
            "models": ablation_raw["models"],
            "best_model_name": ablation_raw["best_model_name"],
            "best_stage_trajectory": ablation_raw["best_stage_trajectory"],
            "feature_stepwise_waterfall": ablation_raw["feature_stepwise_waterfall"],
            "residual_diagnostics": ablation_raw["residual_diagnostics"],
        },
        "shap_xai": shap_xai,
        "default_simulation": simulate_property_valuation(
            shap_xai["simulator_config"],
            shap_xai["simulator_config"]["default_inputs"],
        ),
    }

    if output_paths is None:
        output_paths = [
            Path("data/processed/ames_analytics_payload.json"),
            Path("web/src/data/ames_analytics_payload.json"),
        ]

    for out_path in output_paths:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    return payload


if __name__ == "__main__":
    result = build_full_analytics_payload()
    kpis = result["summary_kpis"]
    print(
        f"[AmesChronicle] Pipeline completed: {kpis['total_transactions']} records | "
        f"R² {kpis['r2_baseline']:.4f} -> {kpis['r2_final']:.4f} | "
        f"RMSE -${int(kpis['rmse_baseline_usd'] - kpis['rmse_final_usd']):,} ({kpis['rmse_reduction_pct']}%)"
    )

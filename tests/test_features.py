from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from src.data_loader import load_ames_raw
from src.features import (
    detect_leverage_outliers,
    impute_semantic_missing,
    transform_skewed_features,
    synthesize_domain_features,
    apply_oof_target_encoding,
)


@pytest.fixture(scope="module")
def raw_df() -> pd.DataFrame:
    df = load_ames_raw(Path("data/raw"))
    return df


def test_load_ames_raw_shape_and_columns(raw_df: pd.DataFrame):
    assert len(raw_df) >= 1460
    assert "SalePrice" in raw_df.columns
    assert "GrLivArea" in raw_df.columns
    assert "OverallQual" in raw_df.columns
    assert "Neighborhood" in raw_df.columns
    assert raw_df["SalePrice"].notna().all()


def test_detect_leverage_outliers(raw_df: pd.DataFrame):
    result = detect_leverage_outliers(raw_df)
    assert "outlier_indices" in result
    assert len(result["outlier_indices"]) >= 2
    assert result["r2_after"] > result["r2_before"]
    assert len(result["scatter_points"]) > 500
    assert "regression_before" in result
    assert "regression_after" in result


def test_impute_semantic_missing(raw_df: pd.DataFrame):
    clean_df, missing_report = impute_semantic_missing(raw_df)
    assert clean_df.isna().sum().sum() == 0
    assert len(missing_report) >= 10
    first_item = missing_report[0]
    assert {"feature", "missing_count", "missing_pct", "strategy", "category"}.issubset(
        first_item.keys()
    )


def test_transform_skewed_features(raw_df: pd.DataFrame):
    clean_df, _ = impute_semantic_missing(raw_df)
    transformed_df, skew_report = transform_skewed_features(clean_df)
    assert "SalePrice" in skew_report
    assert "GrLivArea" in skew_report
    sp_info = skew_report["SalePrice"]
    assert abs(sp_info["log1p_skew"]) < abs(sp_info["raw_skew"])
    assert len(sp_info["raw_hist"]["bins"]) >= 20
    assert len(sp_info["qq_raw"]) >= 30
    assert len(sp_info["qq_transformed"]) >= 30


def test_synthesize_domain_features(raw_df: pd.DataFrame):
    clean_df, _ = impute_semantic_missing(raw_df)
    synth_df, lineage_meta = synthesize_domain_features(clean_df)
    expected_cols = [
        "TotalSF",
        "TotalBath",
        "TotalPorchSF",
        "HouseAge",
        "RemodAge",
        "IsRemodeled",
        "IsNewBuild",
        "OverallQual_x_TotalSF",
        "Qual_to_Cond_Ratio",
        "LivArea_to_Lot_Ratio",
        "AmenityScore",
        "BsmtFinRatio",
        "SpaceEfficiency",
    ]
    for col in expected_cols:
        assert col in synth_df.columns
        assert synth_df[col].isna().sum() == 0

    # Verify synthesized TotalSF has stronger correlation with SalePrice than 1stFlrSF alone
    corr_total = synth_df["TotalSF"].corr(synth_df["SalePrice"])
    corr_first = synth_df["1stFlrSF"].corr(synth_df["SalePrice"])
    assert corr_total > corr_first
    assert len(lineage_meta) >= 12


def test_apply_oof_target_encoding(raw_df: pd.DataFrame):
    clean_df, _ = impute_semantic_missing(raw_df)
    synth_df, _ = synthesize_domain_features(clean_df)
    encoded_df, neighborhood_profiles = apply_oof_target_encoding(synth_df)
    assert "Neighborhood_TE" in encoded_df.columns
    assert "Neighborhood_Tier" in encoded_df.columns
    assert encoded_df["Neighborhood_TE"].isna().sum() == 0
    assert len(neighborhood_profiles) >= 20
    tiers = {p["tier"] for p in neighborhood_profiles}
    assert len(tiers) == 4

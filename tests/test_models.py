from pathlib import Path
import pytest

from src.models import simulate_property_valuation
from src.pipeline import build_full_analytics_payload


@pytest.fixture(scope="module")
def full_payload():
    return build_full_analytics_payload(
        output_paths=[
            Path("data/processed/ames_analytics_payload.json"),
            Path("web/src/data/ames_analytics_payload.json"),
        ]
    )


def test_run_ablation_arena_progression(full_payload):
    arena = full_payload["ablation_arena"]
    assert "stages" in arena
    assert len(arena["stages"]) == 4
    assert "models" in arena
    assert len(arena["models"]) >= 5

    best_model_metrics = arena["best_stage_trajectory"]
    assert best_model_metrics[3]["r2"] > best_model_metrics[0]["r2"]
    assert best_model_metrics[3]["rmse_usd"] < best_model_metrics[0]["rmse_usd"]
    assert best_model_metrics[3]["r2"] >= 0.90


def test_compute_shap_and_simulator_weights(full_payload):
    shap_data = full_payload["shap_xai"]
    assert "global_importance" in shap_data
    assert len(shap_data["global_importance"]) >= 12
    assert "beeswarm_points" in shap_data
    assert len(shap_data["beeswarm_points"]) >= 100
    assert "sankey_lineage" in shap_data
    assert len(shap_data["sankey_lineage"]["nodes"]) >= 15
    assert "surface_3d" in shap_data
    assert "parallel_coords" in shap_data
    assert "simulator_config" in shap_data

    sim_res = simulate_property_valuation(
        shap_data["simulator_config"],
        {
            "total_sf": 3200,
            "overall_qual": 8,
            "house_age": 6,
            "neighborhood": "NoRidge",
            "total_bath": 3.5,
            "garage_cars": 3,
            "kitchen_qual": "Ex",
            "is_remodeled": 1,
            "lot_area": 12500,
            "fireplaces": 2,
        },
    )
    assert sim_res["predicted_price"] > 220000
    assert len(sim_res["waterfall_contributions"]) >= 8
    total_attributed = sim_res["base_price"] + sum(
        c["delta_usd"] for c in sim_res["waterfall_contributions"]
    )
    assert abs(total_attributed - sim_res["predicted_price"]) < 5.0


def test_build_full_analytics_payload(full_payload):
    assert "summary_kpis" in full_payload
    assert "outlier_lab" in full_payload
    assert "missing_report" in full_payload
    assert "skewness_lab" in full_payload
    assert "engineered_lineage" in full_payload
    assert "neighborhood_profiles" in full_payload
    assert "ablation_arena" in full_payload
    assert "shap_xai" in full_payload
    assert Path("data/processed/ames_analytics_payload.json").exists()
    assert Path("web/src/data/ames_analytics_payload.json").exists()

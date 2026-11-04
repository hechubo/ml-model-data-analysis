from fastapi.testclient import TestClient
from src.server import app


client = TestClient(app)


def test_health_endpoint():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["dataset_rows"] >= 1460


def test_payload_endpoint():
    resp = client.get("/api/payload")
    assert resp.status_code == 200
    data = resp.json()
    assert "summary_kpis" in data
    assert "discovery_evidence" in data
    assert "ablation_arena" in data
    assert "shap_xai" in data


def test_simulate_endpoint():
    resp = client.post(
        "/api/simulate",
        json={
            "total_sf": 3100,
            "overall_qual": 8,
            "house_age": 10,
            "neighborhood": "NridgHt",
            "total_bath": 3.0,
            "garage_cars": 3,
            "kitchen_qual": "Ex",
            "is_remodeled": 1,
            "lot_area": 11500,
            "fireplaces": 1,
        },
    )
    assert resp.status_code == 200
    res = resp.json()
    assert res["predicted_price"] > 200000
    assert len(res["waterfall_contributions"]) >= 8
    assert "engineered_readouts" in res

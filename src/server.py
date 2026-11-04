"""FastAPI Real-Time Valuation & SHAP What-If Attribution Backend."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.models import simulate_property_valuation
from src.pipeline import build_full_analytics_payload


PAYLOAD_PATH = Path("data/processed/ames_analytics_payload.json")

app = FastAPI(
    title="AmesChronicle Analytics & SHAP Valuation API",
    version="1.0.0",
    description="Serves precomputed Ames Housing feature engineering diagnostics and real-time SHAP valuation waterfall.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_CACHED_PAYLOAD: dict[str, Any] | None = None


def _get_payload() -> dict[str, Any]:
    global _CACHED_PAYLOAD
    if _CACHED_PAYLOAD is not None:
        return _CACHED_PAYLOAD
    if PAYLOAD_PATH.exists():
        with PAYLOAD_PATH.open("r", encoding="utf-8") as f:
            _CACHED_PAYLOAD = json.load(f)
            return _CACHED_PAYLOAD
    _CACHED_PAYLOAD = build_full_analytics_payload()
    return _CACHED_PAYLOAD


class SimulationRequest(BaseModel):
    total_sf: float = Field(default=2560, ge=500, le=7500)
    overall_qual: int = Field(default=7, ge=1, le=10)
    house_age: float = Field(default=18, ge=0, le=130)
    neighborhood: str = Field(default="CollgCr")
    total_bath: float = Field(default=2.5, ge=1.0, le=6.0)
    garage_cars: int = Field(default=2, ge=0, le=4)
    kitchen_qual: str = Field(default="Gd")
    is_remodeled: int = Field(default=1, ge=0, le=1)
    lot_area: float = Field(default=9600, ge=1300, le=60000)
    fireplaces: int = Field(default=1, ge=0, le=4)


@app.get("/api/health")
def health_check() -> dict[str, Any]:
    payload = _get_payload()
    return {
        "status": "ok",
        "project": "AmesChronicle",
        "dataset_rows": payload["summary_kpis"]["total_transactions"],
        "r2_final": payload["summary_kpis"]["r2_final"],
    }


@app.get("/api/payload")
def get_analytics_payload() -> dict[str, Any]:
    return _get_payload()


@app.post("/api/simulate")
def simulate_property(req: SimulationRequest) -> dict[str, Any]:
    payload = _get_payload()
    sim_config = payload["shap_xai"]["simulator_config"]
    return simulate_property_valuation(sim_config, req.model_dump())

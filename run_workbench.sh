#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "============================================================"
echo "  AmesChronicle | 7-Page Interactive Feature Engineering Lab"
echo "============================================================"

if [ ! -f "data/processed/ames_analytics_payload.json" ]; then
  echo "[1/3] Running 5-stage Python feature engineering & SHAP pipeline..."
  python3 -m src.pipeline
fi

echo "[2/3] Starting FastAPI Real-Time SHAP Valuation Engine on http://127.0.0.1:8000 ..."
python3 -m uvicorn src.server:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

cleanup() {
  echo "Shutting down backend server (PID $BACKEND_PID)..."
  kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "[3/3] Starting React + ECharts-GL + Nivo Interactive Workbench on http://127.0.0.1:5173 ..."
cd "$ROOT_DIR/web"
npm run dev -- --host 127.0.0.1 --port 5173

"""API router for ONEQ learned strategy research, predictions, and reports."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from trading_app.research.oneq.predict import ONEQPredictor

router = APIRouter(prefix="/research/oneq", tags=["ONEQ Research"])

ARTIFACTS_DIR = Path(__file__).parent.parent / "research" / "oneq" / "artifacts"


class PredictRequest(BaseModel):
    snapshot_id: str = "snap-oneq-001"
    run_id: Optional[str] = None
    snapshot_price: float = 180.40
    available_cash: float = 200.0
    feature_values: Optional[dict[str, float]] = None
    cost_bps_per_side: float = 5.0
    matured_actual_return_bps: Optional[float] = None


@router.get("/status")
def get_research_status() -> dict[str, Any]:
    """Returns the current model status, selected hyper-parameters, and dataset manifest."""
    manifest_path = ARTIFACTS_DIR / "training_manifest.json"
    settings_path = ARTIFACTS_DIR / "settings.json"

    if not manifest_path.exists() or not settings_path.exists():
        return {
            "status": "not_trained",
            "message": "Model has not been trained yet. Run python -m trading_app.research.oneq.run_experiment",
        }

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    with open(settings_path, "r", encoding="utf-8") as f:
        settings = json.load(f)

    return {
        "status": "ready",
        "model_version": manifest.get("model_version", "oneq-ridge-v1.0"),
        "training_date": manifest.get("training_date"),
        "selected_settings": settings,
        "manifest": manifest,
    }


@router.get("/report")
def get_research_report() -> dict[str, Any]:
    """Returns the full research report including benchmarks and uncertainty estimates."""
    report_path = ARTIFACTS_DIR / "research_report.json"
    if not report_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Research report not found. Please run the experiment first.",
        )
    with open(report_path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.post("/predict")
def predict_proposal(req: PredictRequest) -> dict[str, Any]:
    """Generates a structured prediction and agent communication bubbles for ONEQ."""
    try:
        predictor = ONEQPredictor(ARTIFACTS_DIR)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    feat_vals = req.feature_values or {
        "ret_5m": 0.0005,
        "ret_15m": 0.0012,
        "ret_60m": 0.0025,
        "recent_volatility": 0.0008,
        "vwap_distance": 0.0004,
        "relative_volume": 1.15,
        "time_of_day": 90.0,
    }

    prediction = predictor.predict_features(
        feature_values=feat_vals,
        snapshot_id=req.snapshot_id,
        run_id=req.run_id,
        cost_bps_per_side=req.cost_bps_per_side,
    )

    bubbles = predictor.generate_agent_bubbles(
        prediction=prediction,
        snapshot_price=req.snapshot_price,
        available_cash=req.available_cash,
        matured_actual_return_bps=req.matured_actual_return_bps,
    )

    return {
        "prediction": prediction,
        "bubbles": bubbles,
    }

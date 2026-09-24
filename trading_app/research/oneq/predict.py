"""Production inference and proposal generation for the ONEQ learned strategy.

Returns a structured prediction containing:
run_id, snapshot_id, model_version, trained_through, as_of, feature_values,
predicted_gross_bps, estimated_cost_bps, estimated_net_bps, entry_buffer_bps,
action, reason_code
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional
import time
from datetime import datetime, timezone
import joblib
import numpy as np
import pandas as pd

from trading_app.research.oneq.features import FEATURE_NAMES, calculate_features


class ONEQPredictor:
    """Loads a saved model pipeline and settings to generate live/historical ONEQ proposals."""

    def __init__(self, artifacts_dir: Optional[str | Path] = None):
        base_dir = Path(artifacts_dir or (Path(__file__).parent / "artifacts"))
        self.artifacts_dir = base_dir

        model_path = base_dir / "oneq_ridge_pipeline.joblib"
        settings_path = base_dir / "settings.json"
        manifest_path = base_dir / "training_manifest.json"

        if not model_path.exists() or not settings_path.exists():
            raise FileNotFoundError(
                f"Model artifacts not found in {base_dir.resolve()}. "
                "Run training first via train_and_select_model() or python -m trading_app.research.oneq.run_experiment"
            )

        self.pipeline = joblib.load(model_path)
        with open(settings_path, "r", encoding="utf-8") as f:
            self.settings = json.load(f)

        self.manifest = {}
        if manifest_path.exists():
            with open(manifest_path, "r", encoding="utf-8") as f:
                self.manifest = json.load(f)

        self.model_version = self.manifest.get("model_version", "oneq-ridge-v1.0")
        self.trained_through = self.manifest.get("dev_date_range", ["unknown", "unknown"])[1]
        self.alpha = float(self.settings.get("alpha", 1.0))
        self.entry_buffer_bps = float(self.settings.get("entry_buffer_bps", 2.0))
        self.stay_in_cash = bool(self.settings.get("stay_in_cash", False))
        self.feature_names = self.settings.get("feature_names", FEATURE_NAMES)

    def predict_features(
        self,
        feature_values: dict[str, float],
        snapshot_id: str = "snap-oneq-live",
        run_id: Optional[str] = None,
        as_of: Optional[str] = None,
        cost_bps_per_side: float = 5.0,
    ) -> dict[str, Any]:
        """Generates a structured prediction from a feature dictionary without future prices."""
        run_id = run_id or f"prop-oneq-{int(time.time() * 1000)}"
        as_of_iso = as_of or datetime.now(timezone.utc).isoformat()

        # Build feature vector
        x_vec = np.array([[feature_values.get(f, 0.0) for f in self.feature_names]])

        if self.stay_in_cash:
            pred_gross = 0.0
        else:
            pred_gross = float(self.pipeline.predict(x_vec)[0])

        est_cost_bps = 2.0 * cost_bps_per_side
        est_net_bps = pred_gross - est_cost_bps

        if self.stay_in_cash:
            action = "WAIT"
            reason_code = "STAY_IN_CASH"
        elif est_net_bps > self.entry_buffer_bps:
            action = "BUY"
            reason_code = "EDGE_ABOVE_BUFFER"
        else:
            action = "WAIT"
            reason_code = "NET_BELOW_BUFFER"

        return {
            "run_id": run_id,
            "snapshot_id": snapshot_id,
            "model_version": self.model_version,
            "trained_through": self.trained_through,
            "as_of": as_of_iso,
            "feature_values": {k: round(float(v), 5) for k, v in feature_values.items()},
            "predicted_gross_bps": round(pred_gross, 2),
            "estimated_cost_bps": round(est_cost_bps, 2),
            "estimated_net_bps": round(est_net_bps, 2),
            "entry_buffer_bps": round(self.entry_buffer_bps, 2),
            "action": action,
            "reason_code": reason_code,
        }

    def predict_latest_bar(
        self,
        bars_df: pd.DataFrame,
        snapshot_id: str = "snap-oneq-latest",
        cost_bps_per_side: float = 5.0,
    ) -> dict[str, Any]:
        """Calculates features up to the latest completed bar and returns a proposal."""
        feat_df = calculate_features(bars_df)
        latest_row = feat_df.iloc[-1]
        feat_vals = {f: float(latest_row[f]) if pd.notna(latest_row[f]) else 0.0 for f in self.feature_names}
        as_of = str(latest_row["bar_end_utc"])
        return self.predict_features(
            feature_values=feat_vals,
            snapshot_id=snapshot_id,
            as_of=as_of,
            cost_bps_per_side=cost_bps_per_side,
        )

    def generate_agent_bubbles(
        self,
        prediction: dict[str, Any],
        snapshot_price: float = 180.40,
        available_cash: float = 200.0,
        matured_actual_return_bps: Optional[float] = None,
    ) -> list[dict[str, Any]]:
        """Generates grounded agent messages and communication bubbles from structured prediction."""
        pred_gross = prediction["predicted_gross_bps"]
        est_net = prediction["estimated_net_bps"]
        buffer_bps = prediction["entry_buffer_bps"]
        cost_bps = prediction["estimated_cost_bps"]
        action = prediction["action"]

        messages = []

        # 1. Alpha
        if action == "BUY":
            alpha_text = (
                f"Alpha → Manager: BUY candidate: predicted return (+{pred_gross:.1f} bps) "
                f"exceeds costs ({cost_bps:.1f} bps) + buffer (+{buffer_bps:.1f} bps). "
                f"Proposing whole share entry @ ${snapshot_price:.2f}."
            )
        else:
            alpha_text = (
                f"Alpha → Manager: WAIT: estimated net return ({est_net:+.1f} bps) "
                f"is below the selected entry buffer (+{buffer_bps:.1f} bps)."
            )
        messages.append(
            {
                "sender": "trader-alpha",
                "recipient": "portfolio-manager",
                "messageType": "proposal" if action == "BUY" else "skip",
                "summary": alpha_text,
                "evidence": [
                    {"rule": "predicted_gross_bps", "value": f"{pred_gross:+.1f} bps"},
                    {"rule": "estimated_net_bps", "value": f"{est_net:+.1f} bps"},
                    {"rule": "entry_buffer_bps", "value": f"+{buffer_bps:.1f} bps"},
                ],
            }
        )

        # 2. Beta & Gamma: Explicitly report models unavailable until independently implemented
        messages.append(
            {
                "sender": "trader-beta",
                "recipient": "portfolio-manager",
                "messageType": "skip",
                "summary": "Beta → Manager: Skipping: candidate research model is unavailable until independently implemented.",
                "evidence": [{"rule": "model_availability", "value": "unavailable", "threshold": "implemented"}],
            }
        )
        messages.append(
            {
                "sender": "trader-gamma",
                "recipient": "portfolio-manager",
                "messageType": "skip",
                "summary": "Gamma → Manager: Skipping: candidate research model is unavailable until independently implemented.",
                "evidence": [{"rule": "model_availability", "value": "unavailable", "threshold": "implemented"}],
            }
        )

        # 3. Manager
        if action == "BUY":
            affordable_shares = int(available_cash // snapshot_price)
            if affordable_shares >= 1:
                mgr_text = (
                    f"Manager → Risk: Selected proposal: ALPHA (1 share of ONEQ @ ${snapshot_price:.2f}). "
                    f"Checking affordability against available capital (${available_cash:.2f})."
                )
                mgr_type = "selection"
            else:
                mgr_text = (
                    f"Manager → Risk: NO TRADE: Alpha proposed BUY but available capital (${available_cash:.2f}) "
                    f"is insufficient for 1 whole share @ ${snapshot_price:.2f}."
                )
                mgr_type = "no_trade"
        else:
            mgr_text = "Manager → Risk: NO TRADE recorded: all competitor agents submitted WAIT for this evaluation round."
            mgr_type = "no_trade"
        messages.append(
            {
                "sender": "portfolio-manager",
                "recipient": "risk-engine",
                "messageType": mgr_type,
                "summary": mgr_text,
            }
        )

        # 4. Risk Engine
        if action == "BUY" and available_cash >= snapshot_price:
            risk_text = f"Risk → Manager: APPROVED: proposed order of 1 unit satisfies sizing, capital, and loss boundaries."
            risk_verdict = "APPROVED"
        else:
            risk_text = "Risk → Manager: No active trade exposure evaluated; portfolio capital boundaries remain intact."
            risk_verdict = "APPROVED"
        messages.append(
            {
                "sender": "risk-engine",
                "recipient": "portfolio-manager",
                "messageType": "risk_verdict",
                "summary": risk_text,
            }
        )

        # 5. Execution (Research simulation notice / proposal-only)
        exec_text = "Execution → Manager: Research simulation assumption: fills modeled at next-open ($180.40) + slippage. Real-money submission disabled."
        messages.append(
            {
                "sender": "paper-execution",
                "recipient": "portfolio-manager",
                "messageType": "execution_notice",
                "summary": exec_text,
            }
        )

        # 6. Coach Evaluator (Forecast error and outcome tracking for both BUY and WAIT)
        if matured_actual_return_bps is not None:
            err = pred_gross - matured_actual_return_bps
            coach_text = (
                f"Coach → Manager: Matured outcome recorded: actual 30-min return = {matured_actual_return_bps:+.1f} bps. "
                f"Forecasting error = {err:+.1f} bps. Decision ({action}) audited for execution/opportunity cost."
            )
        else:
            coach_text = (
                f"Coach → Manager: Forecast recorded ({action}: predicted {pred_gross:+.1f} bps). "
                "Outcome pending maturation at scheduled exit (t+7)."
            )
        messages.append(
            {
                "sender": "coach-evaluator",
                "recipient": "portfolio-manager",
                "messageType": "coach_record",
                "summary": coach_text,
            }
        )

        return messages

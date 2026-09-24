"""Comprehensive tests for ONEQ learned trading strategy research modules and API endpoints."""

from __future__ import annotations

import json
from pathlib import Path
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from trading_app.main import app
from trading_app.research.oneq.data import (
    AlpacaBarsAdapter,
    CSVBarsAdapter,
    MissingAlpacaCredentialsError,
    load_and_validate_oneq_bars,
    normalize_bar_dataframe,
    validate_bars,
)
from trading_app.research.oneq.features import FEATURE_NAMES, calculate_features
from trading_app.research.oneq.labels import calculate_labels
from trading_app.research.oneq.predict import ONEQPredictor
from trading_app.research.oneq.report import (
    compute_benchmarks,
    compute_monthly_results,
    compute_resampling_uncertainty,
    generate_research_report,
    verify_causal_invariance,
)
from trading_app.research.oneq.simulate import (
    SimulationConfig,
    simulate_predictions,
)
from trading_app.research.oneq.train import split_sessions_80_20, train_and_select_model


# ── 1. Data Ingestion, Adapters & Validation ───────────────────────────────────

class TestONEQData:
    def test_alpaca_adapter_missing_credentials(self, monkeypatch):
        monkeypatch.delenv("APCA_API_KEY_ID", raising=False)
        monkeypatch.delenv("ALPACA_API_KEY", raising=False)
        monkeypatch.delenv("APCA_API_SECRET_KEY", raising=False)
        monkeypatch.delenv("ALPACA_API_SECRET", raising=False)

        adapter = AlpacaBarsAdapter()
        assert not adapter.has_credentials()
        with pytest.raises(MissingAlpacaCredentialsError) as exc_info:
            adapter.fetch_bars("ONEQ")
        assert "credentials missing" in str(exc_info.value)

    def test_csv_adapter_and_normalization(self, tmp_path):
        csv_file = tmp_path / "sample_bars.csv"
        csv_file.write_text(
            "symbol,bar_start_utc,open,high,low,close,volume\n"
            "ONEQ,2026-07-01T13:30:00+00:00,100.0,101.0,99.5,100.5,1000\n"
            "ONEQ,2026-07-01T13:35:00+00:00,100.5,101.2,100.0,101.0,1500\n"
        )
        df = CSVBarsAdapter.load(csv_file)
        assert len(df) == 2
        assert "bar_end_utc" in df.columns
        assert "bar_vwap" in df.columns
        # Typical price fallback check: (101 + 99.5 + 100.5) / 3 = 100.3333
        assert np.isclose(df["bar_vwap"].iloc[0], 100.3333, atol=1e-3)

    def test_validate_bars_continuity_and_duplicates(self):
        data = {
            "symbol": ["ONEQ", "ONEQ", "ONEQ"],
            "bar_start_utc": [
                "2026-07-01T13:30:00+00:00",
                "2026-07-01T13:30:00+00:00",  # Duplicate
                "2026-07-01T13:45:00+00:00",  # 15m gap (> 5m)
            ],
            "bar_end_utc": [
                "2026-07-01T13:35:00+00:00",
                "2026-07-01T13:35:00+00:00",
                "2026-07-01T13:50:00+00:00",
            ],
            "open": [100.0, 100.0, 101.0],
            "high": [101.0, 101.0, 102.0],
            "low": [99.0, 99.0, 100.0],
            "close": [100.5, 100.5, 101.5],
            "volume": [100, 100, 200],
            "bar_vwap": [100.2, 100.2, 101.2],
        }
        raw_df = pd.DataFrame(data)
        summary = validate_bars(raw_df)
        assert summary["duplicates_removed"] == 1
        assert summary["missing_intervals_detected"] >= 1
        assert summary["valid"] is True


# ── 2. Feature Calculations ────────────────────────────────────────────────────

class TestONEQFeatures:
    def test_feature_columns_and_names(self):
        bars_df, _ = load_and_validate_oneq_bars()
        features = calculate_features(bars_df)
        for col in FEATURE_NAMES:
            assert col in features.columns

    def test_intraday_return_windows_session_isolation(self):
        bars_df, _ = load_and_validate_oneq_bars()
        features = calculate_features(bars_df)

        # First bar of each session cannot have a valid 5m return from previous session
        first_bars = features.groupby("session_date").nth(0)
        assert first_bars["ret_5m"].isnull().all()
        assert first_bars["ret_15m"].isnull().all()
        assert first_bars["ret_60m"].isnull().all()

    def test_causal_invariance_property(self):
        bars_df, _ = load_and_validate_oneq_bars()
        predictor = ONEQPredictor()
        # Verify changing future bars never alters earlier features
        assert verify_causal_invariance(predictor, bars_df) is True


# ── 3. Label Calculations ──────────────────────────────────────────────────────

class TestONEQLabels:
    def test_thirty_minute_future_return_target(self):
        bars_df, _ = load_and_validate_oneq_bars()
        labeled = calculate_labels(bars_df)

        valid_rows = labeled[labeled["label_valid"]].copy()
        assert len(valid_rows) > 0

        # Check explicit math: target_bps = 10_000 * (open[t+7] / open[t+1] - 1)
        for idx in range(min(10, len(valid_rows))):
            row = valid_rows.iloc[idx]
            o_entry = row["ref_entry_open"]
            o_exit = row["ref_exit_open"]
            expected_bps = round(((o_exit / o_entry) - 1.0) * 10_000.0, 4)
            assert np.isclose(row["target_bps"], expected_bps, atol=1e-3)

            # Check 30 minute holding period
            t_entry = pd.to_datetime(row["ref_entry_time_utc"])
            t_exit = pd.to_datetime(row["ref_exit_time_utc"])
            assert (t_exit - t_entry).total_seconds() == 1800  # 30 min


# ── 4. Cross-Validation and Model Selection ────────────────────────────────────

class TestONEQTraining:
    def test_split_sessions_80_20(self):
        bars_df, _ = load_and_validate_oneq_bars()
        dev_sessions, test_sessions = split_sessions_80_20(bars_df)
        total = len(dev_sessions) + len(test_sessions)
        assert len(dev_sessions) == int(np.floor(total * 0.80))
        assert len(test_sessions) == total - len(dev_sessions)
        assert set(dev_sessions).isdisjoint(set(test_sessions))

    def test_train_and_select_model_artifacts(self, tmp_path):
        bars_df, _ = load_and_validate_oneq_bars()
        feat_df = calculate_features(bars_df)
        lab_df = calculate_labels(feat_df)

        res = train_and_select_model(lab_df, artifacts_dir=tmp_path)
        assert "selected_settings" in res
        assert "pipeline" in res
        assert (tmp_path / "oneq_ridge_pipeline.joblib").exists()
        assert (tmp_path / "settings.json").exists()
        assert (tmp_path / "training_manifest.json").exists()
        assert (tmp_path / "features.json").exists()


# ── 5. Simulation Arithmetic & Cash Reconciliation ─────────────────────────────

class TestONEQSimulation:
    def test_simulation_reconciles_cash_with_trades(self):
        sample_df = pd.DataFrame(
            {
                "bar_start_utc": ["2026-07-01T13:30:00+00:00", "2026-07-01T14:30:00+00:00"],
                "ref_entry_time_utc": ["2026-07-01T13:35:00+00:00", "2026-07-01T14:35:00+00:00"],
                "ref_exit_time_utc": ["2026-07-01T14:05:00+00:00", "2026-07-01T15:05:00+00:00"],
                "ref_entry_open": [100.0, 102.0],
                "ref_exit_open": [101.0, 101.5],
                "pred_gross_bps": [50.0, 45.0],  # Edge > 10 bps cost + 2 bps buffer
                "label_valid": [True, True],
            }
        )
        cfg = SimulationConfig(initial_cash=200.0, cost_bps_per_side=5.0, entry_buffer_bps=2.0)
        res = simulate_predictions(sample_df, "pred_gross_bps", cfg)

        assert res.total_trades == 2
        assert res.cash_reconciled is True
        assert np.isclose(res.final_cash, res.initial_cash + sum(t.net_pnl for t in res.trades), atol=1e-3)

    def test_unaffordable_shares_records_wait(self):
        sample_df = pd.DataFrame(
            {
                "bar_start_utc": ["2026-07-01T13:30:00+00:00"],
                "ref_entry_time_utc": ["2026-07-01T13:35:00+00:00"],
                "ref_exit_time_utc": ["2026-07-01T14:05:00+00:00"],
                "ref_entry_open": [350.0],  # $350 > $200 available cash
                "ref_exit_open": [360.0],
                "pred_gross_bps": [80.0],
                "label_valid": [True],
            }
        )
        cfg = SimulationConfig(initial_cash=200.0, cost_bps_per_side=5.0)
        res = simulate_predictions(sample_df, "pred_gross_bps", cfg)
        assert res.total_trades == 0
        assert res.decisions[0].action == "WAIT"
        assert res.decisions[0].reason == "insufficient_cash"


# ── 6. Predictor & Agent Bubble Generation ─────────────────────────────────────

class TestONEQPredictorAndAgents:
    def test_predictor_structured_output_fields(self):
        predictor = ONEQPredictor()
        f_vals = {
            "ret_5m": 0.001,
            "ret_15m": 0.002,
            "ret_60m": 0.005,
            "recent_volatility": 0.001,
            "vwap_distance": 0.0005,
            "relative_volume": 1.2,
            "time_of_day": 60.0,
        }
        pred = predictor.predict_features(f_vals, snapshot_id="snap-test-01")

        required_keys = [
            "run_id",
            "snapshot_id",
            "model_version",
            "trained_through",
            "as_of",
            "feature_values",
            "predicted_gross_bps",
            "estimated_cost_bps",
            "estimated_net_bps",
            "entry_buffer_bps",
            "action",
            "reason_code",
        ]
        for k in required_keys:
            assert k in pred

    def test_agent_bubbles_generation(self):
        predictor = ONEQPredictor()
        pred = {
            "run_id": "prop-test",
            "snapshot_id": "snap-test",
            "model_version": "oneq-ridge-v1.0",
            "trained_through": "2026-09-01",
            "as_of": "2026-09-24T12:00:00Z",
            "feature_values": {},
            "predicted_gross_bps": 25.0,
            "estimated_cost_bps": 10.0,
            "estimated_net_bps": 15.0,
            "entry_buffer_bps": 2.0,
            "action": "BUY",
            "reason_code": "EDGE_ABOVE_BUFFER",
        }
        bubbles = predictor.generate_agent_bubbles(
            pred, snapshot_price=180.40, available_cash=200.0, matured_actual_return_bps=12.5
        )

        senders = {b["sender"] for b in bubbles}
        assert "trader-alpha" in senders
        assert "trader-beta" in senders
        assert "trader-gamma" in senders
        assert "portfolio-manager" in senders
        assert "risk-engine" in senders
        assert "paper-execution" in senders
        assert "coach-evaluator" in senders

        # Beta & Gamma report models unavailable
        beta_msg = next(b for b in bubbles if b["sender"] == "trader-beta")
        gamma_msg = next(b for b in bubbles if b["sender"] == "trader-gamma")
        assert "unavailable" in beta_msg["summary"]
        assert "unavailable" in gamma_msg["summary"]

        # Coach records forecast error
        coach_msg = next(b for b in bubbles if b["sender"] == "coach-evaluator")
        assert "Forecasting error" in coach_msg["summary"]


# ── 7. FastAPI Research Endpoints ──────────────────────────────────────────────

class TestONEQFastAPI:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    def test_get_research_status(self, client):
        resp = client.get("/api/v1/research/oneq/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("ready", "not_trained")

    def test_get_research_report(self, client):
        resp = client.get("/api/v1/research/oneq/report")
        assert resp.status_code == 200
        report = resp.json()
        assert report["symbol"] == "ONEQ"
        assert "benchmarks" in report
        assert "verifications" in report

    def test_post_predict_endpoint(self, client):
        payload = {
            "snapshot_id": "snap-oneq-api-test",
            "snapshot_price": 180.40,
            "available_cash": 200.0,
        }
        resp = client.post("/api/v1/research/oneq/predict", json=payload)
        assert resp.status_code == 200
        res = resp.json()
        assert "prediction" in res
        assert "bubbles" in res
        assert len(res["bubbles"]) == 7

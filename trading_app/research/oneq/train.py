"""Model training, expanding-window walk-forward cross validation, and model selection.

Invariants:
- 80% development / 20% untouched final evaluation split by complete trading sessions.
- 4-fold expanding window cross-validation across development eighths.
- Purges training observations whose future returns reach into the validation period.
- Fits fresh StandardScaler and Ridge(alpha) inside each fold.
- Evaluates regularization values [0.1, 1, 10, 100] and buffers [0, 2, 5, 10] bps, plus cash.
- Selects combination with highest median validation-fold net return (tie-break: fewer trades).
- Refits on full development data and evaluates untouched final period once.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Optional
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from trading_app.research.oneq.features import FEATURE_NAMES
from trading_app.research.oneq.simulate import (
    SimulationConfig,
    SimulationResult,
    simulate_predictions,
)


@dataclass
class FoldMetric:
    fold: int
    train_sessions_count: int
    val_sessions_count: int
    alpha: float
    buffer_bps: float
    stay_in_cash: bool
    val_net_return_pct: float
    val_trades_count: int
    val_win_rate: float
    val_sharpe: float


@dataclass
class SelectedSettings:
    alpha: float
    entry_buffer_bps: float
    stay_in_cash: bool
    median_val_net_return_pct: float
    total_val_trades: int
    feature_names: list[str]
    selection_rule: str = "highest median validation-fold net return, tie-break fewer trades"


def split_sessions_80_20(df: pd.DataFrame) -> tuple[list[Any], list[Any]]:
    """Divides dataset by complete trading sessions into 80% development and 20% untouched test."""
    import zoneinfo
    ny_tz = zoneinfo.ZoneInfo("America/New_York")

    if "session_date" in df.columns:
        unique_sessions = sorted(df["session_date"].unique())
    else:
        dt_ny = pd.to_datetime(df["bar_start_utc"], utc=True).dt.tz_convert(ny_tz)
        unique_sessions = sorted(dt_ny.dt.date.unique())

    total_sessions = len(unique_sessions)
    if total_sessions < 5:
        raise ValueError(f"Insufficient trading sessions ({total_sessions}) for 80/20 train/test split.")

    split_idx = int(np.floor(total_sessions * 0.80))
    dev_sessions = unique_sessions[:split_idx]
    test_sessions = unique_sessions[split_idx:]
    return dev_sessions, test_sessions


def train_and_select_model(
    df: pd.DataFrame,
    artifacts_dir: Optional[str | Path] = None,
    cost_bps_per_side: float = 5.0,
) -> dict[str, Any]:
    """Runs the complete training and selection protocol.

    Returns dictionary containing:
    - selected_settings
    - dev_results
    - test_simulation
    - artifacts_saved_to
    """
    out_dir = Path(artifacts_dir or (Path(__file__).parent / "artifacts"))
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Clean valid feature and label rows
    feature_cols = FEATURE_NAMES
    valid_mask = df[feature_cols].notnull().all(axis=1) & df["label_valid"].fillna(False)
    clean_df = df[valid_mask].copy().sort_values("bar_start_utc").reset_index(drop=True)

    # 2. Divide by complete sessions: 80% dev, 20% test
    dev_sessions, test_sessions = split_sessions_80_20(clean_df)

    dev_df = clean_df[clean_df["session_date"].isin(dev_sessions)].copy().reset_index(drop=True)
    test_df = clean_df[clean_df["session_date"].isin(test_sessions)].copy().reset_index(drop=True)

    # 3. Divide development data into 8 eighths for 4-fold expanding window cross-validation
    n_dev = len(dev_sessions)
    slice_size = max(1, n_dev // 8)
    slices = [dev_sessions[i * slice_size : (i + 1) * slice_size] for i in range(7)]
    slices.append(dev_sessions[7 * slice_size :])  # Final remainder

    # Hyperparameter grids
    alphas = [0.1, 1.0, 10.0, 100.0]
    buffers = [0.0, 2.0, 5.0, 10.0]

    # Grid candidate keys: (alpha, buffer, stay_in_cash)
    candidates: list[tuple[float, float, bool]] = []
    # Cash candidate
    candidates.append((1.0, 0.0, True))
    # Alpha + Buffer candidates
    for a in alphas:
        for b in buffers:
            candidates.append((a, b, False))

    grid_results: dict[tuple[float, float, bool], list[FoldMetric]] = {c: [] for c in candidates}

    # 4. Run 4 expanding folds
    # Fold 0: Train on slices 0..3 (first half, 4/8), validate on slice 4 (5th eighth)
    # Fold 1: Train on slices 0..4 (5/8), validate on slice 5 (6th eighth)
    # Fold 2: Train on slices 0..5 (6/8), validate on slice 6 (7th eighth)
    # Fold 3: Train on slices 0..6 (7/8), validate on slice 7 (8th eighth)
    for fold_idx in range(4):
        train_slice_sessions: list[Any] = []
        for s_i in range(4 + fold_idx):
            train_slice_sessions.extend(slices[s_i])

        val_slice_sessions = slices[4 + fold_idx]

        train_fold_raw = dev_df[dev_df["session_date"].isin(train_slice_sessions)].copy()
        val_fold_df = dev_df[dev_df["session_date"].isin(val_slice_sessions)].copy()

        if train_fold_raw.empty or val_fold_df.empty:
            continue

        # Purge training observations whose future-return labels reach into the validation period
        earliest_val_time = val_fold_df["bar_start_utc"].min()
        purge_mask = train_fold_raw["ref_exit_time_utc"].astype(str) < str(earliest_val_time)
        train_fold_df = train_fold_raw[purge_mask].copy()

        X_train = train_fold_df[feature_cols].values
        y_train = train_fold_df["target_bps"].values

        X_val = val_fold_df[feature_cols].values

        # For each alpha, fit pipeline
        fitted_pipelines: dict[float, Pipeline] = {}
        val_predictions: dict[float, np.ndarray] = {}

        for a in alphas:
            pipe = Pipeline(
                [
                    ("scaler", StandardScaler()),
                    ("ridge", Ridge(alpha=a, random_state=42)),
                ]
            )
            pipe.fit(X_train, y_train)
            fitted_pipelines[a] = pipe
            val_predictions[a] = pipe.predict(X_val)

        # Evaluate all candidate settings on validation fold
        for cand in candidates:
            a, b, stay_cash = cand
            cand_val_df = val_fold_df.copy()

            if stay_cash:
                cand_val_df["pred_gross_bps"] = 0.0
            else:
                cand_val_df["pred_gross_bps"] = val_predictions[a]

            sim_cfg = SimulationConfig(
                initial_cash=200.0,
                cost_bps_per_side=cost_bps_per_side,
                entry_buffer_bps=b,
                stay_in_cash=stay_cash,
            )
            sim_res = simulate_predictions(cand_val_df, "pred_gross_bps", sim_cfg)

            grid_results[cand].append(
                FoldMetric(
                    fold=fold_idx + 1,
                    train_sessions_count=len(train_slice_sessions),
                    val_sessions_count=len(val_slice_sessions),
                    alpha=a,
                    buffer_bps=b,
                    stay_in_cash=stay_cash,
                    val_net_return_pct=sim_res.net_return_pct,
                    val_trades_count=sim_res.total_trades,
                    val_win_rate=sim_res.win_rate,
                    val_sharpe=sim_res.sharpe_ratio,
                )
            )

    # 5. Model Selection: Highest median validation-fold net return, tie-break fewer trades
    candidate_scores = []
    for cand, fold_metrics in grid_results.items():
        if not fold_metrics:
            continue
        rets = [m.val_net_return_pct for m in fold_metrics]
        trades = [m.val_trades_count for m in fold_metrics]
        med_ret = float(np.median(rets))
        total_trd = int(np.sum(trades))
        candidate_scores.append((cand, med_ret, total_trd))

    # Sort descending by median return, then ascending by total trades
    candidate_scores.sort(key=lambda item: (-item[1], item[2]))
    best_cand, best_median_ret, best_total_trades = candidate_scores[0]
    best_alpha, best_buffer, best_stay_cash = best_cand

    selected_settings = SelectedSettings(
        alpha=best_alpha,
        entry_buffer_bps=best_buffer,
        stay_in_cash=best_stay_cash,
        median_val_net_return_pct=round(best_median_ret, 4),
        total_val_trades=best_total_trades,
        feature_names=feature_cols,
    )

    # 6. Freeze selection, refit on full 80% development data
    X_dev = dev_df[feature_cols].values
    y_dev = dev_df["target_bps"].values

    final_pipeline = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("ridge", Ridge(alpha=best_alpha, random_state=42)),
        ]
    )
    final_pipeline.fit(X_dev, y_dev)

    # 7. Evaluate untouched final 20% period ONCE
    test_eval_df = test_df.copy()
    if best_stay_cash:
        test_eval_df["pred_gross_bps"] = 0.0
    else:
        X_test = test_df[feature_cols].values
        test_eval_df["pred_gross_bps"] = final_pipeline.predict(X_test)

    test_sim_cfg = SimulationConfig(
        initial_cash=200.0,
        cost_bps_per_side=cost_bps_per_side,
        entry_buffer_bps=best_buffer,
        stay_in_cash=best_stay_cash,
    )
    final_sim_result = simulate_predictions(test_eval_df, "pred_gross_bps", test_sim_cfg)

    # 8. Save artifacts: model, settings, manifests
    model_path = out_dir / "oneq_ridge_pipeline.joblib"
    joblib.dump(final_pipeline, model_path)

    features_path = out_dir / "features.json"
    with open(features_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "feature_names": feature_cols,
                "coefficients": dict(
                    zip(feature_cols, final_pipeline.named_steps["ridge"].coef_.tolist())
                ),
                "intercept": float(final_pipeline.named_steps["ridge"].intercept_),
            },
            f,
            indent=2,
        )

    settings_path = out_dir / "settings.json"
    with open(settings_path, "w", encoding="utf-8") as f:
        json.dump(asdict(selected_settings), f, indent=2)

    training_manifest = {
        "model_version": "oneq-ridge-v1.0",
        "training_date": pd.Timestamp.now("UTC").isoformat(),
        "total_sessions": len(sorted(df["session_date"].unique())),
        "development_sessions_count": len(dev_sessions),
        "test_sessions_count": len(test_sessions),
        "dev_date_range": [str(min(dev_sessions)), str(max(dev_sessions))],
        "test_date_range": [str(min(test_sessions)), str(max(test_sessions))],
        "selected_alpha": best_alpha,
        "selected_buffer_bps": best_buffer,
        "selected_stay_in_cash": best_stay_cash,
        "median_val_net_return_pct": best_median_ret,
        "test_simulation_summary": final_sim_result.to_dict(),
    }
    manifest_path = out_dir / "training_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(training_manifest, f, indent=2)

    return {
        "selected_settings": asdict(selected_settings),
        "pipeline": final_pipeline,
        "test_simulation": final_sim_result,
        "artifacts_dir": str(out_dir.resolve()),
        "manifest": training_manifest,
        "test_eval_df": test_eval_df,
    }

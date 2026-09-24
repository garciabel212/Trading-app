"""Command line entrypoint for the ONEQ Learned Strategy Experiment.

Usage:
    python -m trading_app.research.oneq.run_experiment [--csv path/to/bars.csv] [--cost-bps 5.0]

This command:
1. Loads and validates real 5-minute ONEQ bars (from Alpaca or CSV).
2. Calculates strictly causal intraday features.
3. Calculates forward 30-minute training return targets.
4. Executes 4-fold expanding window cross-validation across regularization values and entry buffers.
5. Selects the optimal model/buffer combination (or staying in cash).
6. Evaluates the untouched 20% test period once under modeled execution friction.
7. Produces all required manifests, saved model pipeline, predictions, trades, benchmarks, and uncertainty estimates.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from trading_app.research.oneq.data import (
    AlpacaBarsAdapter,
    load_and_validate_oneq_bars,
    MissingAlpacaCredentialsError,
)
from trading_app.research.oneq.features import calculate_features
from trading_app.research.oneq.labels import calculate_labels
from trading_app.research.oneq.report import generate_research_report
from trading_app.research.oneq.train import train_and_select_model

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("oneq_experiment")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the ONEQ learned strategy experiment.")
    parser.add_argument(
        "--csv",
        type=str,
        default=None,
        help="Optional path to custom 5-minute bars CSV file. Defaults to data/oneq_5min.csv.",
    )
    parser.add_argument(
        "--cost-bps",
        type=float,
        default=5.0,
        help="Execution cost in basis points per side (default: 5.0 bps = 10.0 bps round trip).",
    )
    parser.add_argument(
        "--artifacts-dir",
        type=str,
        default=None,
        help="Directory to store model, manifests, and reports. Defaults to artifacts/.",
    )
    args = parser.parse_args()

    artifacts_dir = Path(args.artifacts_dir or (Path(__file__).parent / "artifacts"))
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    logger.info("=================================================================")
    logger.info("           ONEQ LEARNED TRADING STRATEGY EXPERIMENT               ")
    logger.info("=================================================================")

    # 1. Ingest & Validate Bars
    alpaca = AlpacaBarsAdapter()
    if not alpaca.has_credentials() and not args.csv:
        logger.info("Alpaca credentials not found in environment. Using validated CSV dataset.")

    try:
        bars_df, manifest = load_and_validate_oneq_bars(args.csv, alpaca_adapter=alpaca)
    except MissingAlpacaCredentialsError as e:
        logger.error("Data access unavailable: %s", e)
        sys.exit(1)
    except FileNotFoundError as e:
        logger.error("Missing input data file: %s", e)
        sys.exit(1)

    logger.info("Loaded %d bars across %d trading sessions.", len(bars_df), manifest.trading_sessions_count)
    logger.info("Dataset SHA-256: %s", manifest.sha256_checksum)
    logger.info("Validation Summary: %s", manifest.validation_summary)

    # 2. Compute Intraday Features
    logger.info("Calculating strictly causal intraday features...")
    feat_df = calculate_features(bars_df)

    # 3. Compute Future 30-min Return Target Labels
    logger.info("Calculating forward 30-minute return labels...")
    labeled_df = calculate_labels(feat_df)
    valid_labeled_count = int(labeled_df["label_valid"].sum())
    logger.info("Valid complete 30-min training observations: %d", valid_labeled_count)

    # 4 & 5. Cross-Validation, Model Selection, Refit & Evaluation
    logger.info("Running 4-fold expanding window cross-validation on 80%% development data...")
    train_result = train_and_select_model(
        labeled_df,
        artifacts_dir=artifacts_dir,
        cost_bps_per_side=args.cost_bps,
    )

    settings = train_result["selected_settings"]
    logger.info("Model Selection Result:")
    logger.info("  - Ridge Regularization (alpha): %s", settings["alpha"])
    logger.info("  - Selected Entry Buffer (bps): %s", settings["entry_buffer_bps"])
    logger.info("  - Stay in Cash: %s", settings["stay_in_cash"])
    logger.info("  - Median Val Net Return: %s%%", settings["median_val_net_return_pct"])

    # 6 & 8. Simulation Report, Benchmarks, Uncertainty, and Verifications
    logger.info("Evaluating on untouched 20%% evaluation period and generating report...")
    report = generate_research_report(train_result, bars_df, artifacts_dir=artifacts_dir)

    test_sim = report["performance_summary"]
    logger.info("-----------------------------------------------------------------")
    logger.info("Untouched Test Period Performance:")
    logger.info("  - Total Trades: %d", test_sim["total_trades"])
    logger.info("  - Win Rate: %.1f%%", test_sim["win_rate"])
    logger.info("  - Profit Factor: %.2f", test_sim["profit_factor"])
    logger.info("  - Net Return: %+.2f%%", test_sim["net_return_pct"])
    logger.info("  - Max Drawdown: %.2f%%", test_sim["max_drawdown_pct"])
    logger.info("  - Total Trading Costs Paid: $%.2f", test_sim["total_costs_paid"])
    logger.info("  - Cash Reconciled with Trades: %s", report["verifications"]["cash_reconciled"])
    logger.info("  - Causal Invariance Passed: %s", report["verifications"]["causal_invariance_passed"])
    logger.info("-----------------------------------------------------------------")
    logger.info("Benchmark Comparison:")
    for b_name, b_data in report["benchmarks"].items():
        logger.info("  - %s: Net Return %s%%", b_name, b_data.get("net_return_pct"))
    logger.info("-----------------------------------------------------------------")
    logger.info("Conclusion: %s", report["conclusion"]["status"])
    logger.info("%s", report["conclusion"]["summary"])
    logger.info("Artifacts saved to: %s", artifacts_dir.resolve())
    logger.info("=================================================================")


if __name__ == "__main__":
    main()

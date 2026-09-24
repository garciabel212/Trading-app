"""ONEQ Intraday Return Prediction and Simulation Research Package."""

from trading_app.research.oneq.data import (
    AlpacaBarsAdapter,
    CSVBarsAdapter,
    MissingAlpacaCredentialsError,
    load_and_validate_oneq_bars,
)
from trading_app.research.oneq.features import calculate_features
from trading_app.research.oneq.labels import calculate_labels
from trading_app.research.oneq.train import train_and_select_model
from trading_app.research.oneq.simulate import simulate_predictions, SimulationConfig
from trading_app.research.oneq.predict import ONEQPredictor
from trading_app.research.oneq.report import generate_research_report

__all__ = [
    "AlpacaBarsAdapter",
    "CSVBarsAdapter",
    "MissingAlpacaCredentialsError",
    "load_and_validate_oneq_bars",
    "calculate_features",
    "calculate_labels",
    "train_and_select_model",
    "simulate_predictions",
    "SimulationConfig",
    "ONEQPredictor",
    "generate_research_report",
]

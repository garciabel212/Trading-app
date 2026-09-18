"""Base strategy interface for Trading App strategies."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List, Literal

from trading_app.models.market_data import Candle


Signal = Literal["BUY", "SELL", "HOLD"]


class BaseStrategy(ABC):
    """Abstract base class for all trading strategies."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable strategy name."""
        ...

    @abstractmethod
    def generate_signal(self, candles: List[Candle]) -> Signal:
        """
        Generate a trading signal from a list of candles.

        Args:
            candles: List of OHLCV bars in ascending time order (oldest first).

        Returns:
            "BUY", "SELL", or "HOLD"
        """
        ...

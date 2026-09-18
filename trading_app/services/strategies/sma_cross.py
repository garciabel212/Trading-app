"""SMA (Simple Moving Average) crossover strategy."""

from __future__ import annotations

from typing import List

from trading_app.models.market_data import Candle
from trading_app.services.strategies.base import BaseStrategy, Signal


class SMACrossStrategy(BaseStrategy):
    """
    Golden cross / death cross strategy.

    Generates a BUY signal when the short-period SMA crosses above
    the long-period SMA (golden cross), and a SELL signal when it
    crosses below (death cross).
    """

    def __init__(self, short_window: int = 10, long_window: int = 50) -> None:
        if short_window >= long_window:
            raise ValueError("short_window must be less than long_window")
        self.short_window = short_window
        self.long_window = long_window

    @property
    def name(self) -> str:
        return f"SMA Crossover ({self.short_window}/{self.long_window})"

    def _sma(self, closes: List[float], window: int) -> List[float]:
        """Compute simple moving average over a list of closes."""
        return [
            sum(closes[i - window : i]) / window
            for i in range(window, len(closes) + 1)
        ]

    def generate_signal(self, candles: List[Candle]) -> Signal:
        """Return BUY on golden cross, SELL on death cross, else HOLD."""
        if len(candles) < self.long_window + 1:
            return "HOLD"

        closes = [c.close for c in candles]
        short_sma = self._sma(closes, self.short_window)
        long_sma = self._sma(closes, self.long_window)

        # Align series (long_sma is shorter)
        offset = len(short_sma) - len(long_sma)
        short_aligned = short_sma[offset:]

        # Look at the last two values for a crossover
        if len(short_aligned) < 2 or len(long_sma) < 2:
            return "HOLD"

        prev_short, curr_short = short_aligned[-2], short_aligned[-1]
        prev_long, curr_long = long_sma[-2], long_sma[-1]

        if prev_short <= prev_long and curr_short > curr_long:
            return "BUY"
        if prev_short >= prev_long and curr_short < curr_long:
            return "SELL"
        return "HOLD"

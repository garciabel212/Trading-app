"""RSI mean reversion strategy."""

from __future__ import annotations

from typing import List

from trading_app.models.market_data import Candle
from trading_app.services.strategies.base import BaseStrategy, Signal


class RSIStrategy(BaseStrategy):
    """
    RSI-based mean reversion strategy.

    Generates a BUY signal when RSI drops below the oversold threshold,
    and a SELL signal when RSI rises above the overbought threshold.
    """

    def __init__(
        self,
        period: int = 14,
        oversold: float = 30.0,
        overbought: float = 70.0,
    ) -> None:
        self.period = period
        self.oversold = oversold
        self.overbought = overbought

    @property
    def name(self) -> str:
        return f"RSI({self.period}) [{self.oversold}/{self.overbought}]"

    def _compute_rsi(self, closes: List[float]) -> float:
        """Compute RSI for the last `period` bars using Wilder smoothing."""
        if len(closes) < self.period + 1:
            return 50.0  # Neutral when not enough data

        deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
        gains = [d for d in deltas if d > 0]
        losses = [-d for d in deltas if d < 0]

        # Use simple averages for the seed, then Wilder smoothing
        period_deltas = deltas[-(self.period):]
        avg_gain = sum(d for d in period_deltas if d > 0) / self.period
        avg_loss = sum(-d for d in period_deltas if d < 0) / self.period

        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return 100.0 - (100.0 / (1.0 + rs))

    def generate_signal(self, candles: List[Candle]) -> Signal:
        """Return BUY when RSI oversold, SELL when overbought, else HOLD."""
        if len(candles) < self.period + 1:
            return "HOLD"

        closes = [c.close for c in candles]
        rsi = self._compute_rsi(closes)

        if rsi < self.oversold:
            return "BUY"
        if rsi > self.overbought:
            return "SELL"
        return "HOLD"

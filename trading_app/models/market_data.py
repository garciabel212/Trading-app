"""Market data models for Trading App."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class TickerQuote(BaseModel):
    """Real-time or simulated ticker quote."""
    ticker: str
    price: float = Field(..., description="Current market price")
    bid: float
    ask: float
    volume: int = Field(..., description="Volume in current session")
    change: float = Field(..., description="Absolute price change from previous close")
    change_pct: float = Field(..., description="Percentage change from previous close")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Candle(BaseModel):
    """OHLCV candlestick bar."""
    ticker: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int

    @property
    def body_size(self) -> float:
        """Return the absolute size of the candle body."""
        return abs(self.close - self.open)

    @property
    def is_bullish(self) -> bool:
        """Return True if candle closed higher than it opened."""
        return self.close >= self.open

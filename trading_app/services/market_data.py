"""Market data service — simulated quotes and OHLCV bars."""

from __future__ import annotations

import math
import random
from datetime import datetime, timedelta
from typing import List

from trading_app.models.market_data import Candle, TickerQuote

# Base prices for simulation
_BASE_PRICES: dict[str, float] = {
    "AAPL": 178.50,
    "MSFT": 415.20,
    "GOOGL": 171.30,
    "AMZN": 192.80,
    "NVDA": 875.40,
    "TSLA": 248.60,
    "SPY": 511.30,
    "BTC-USD": 67240.00,
}

_VOLATILITIES: dict[str, float] = {
    "AAPL": 0.015,
    "MSFT": 0.014,
    "GOOGL": 0.016,
    "AMZN": 0.018,
    "NVDA": 0.030,
    "TSLA": 0.035,
    "SPY": 0.008,
    "BTC-USD": 0.050,
}


def _random_walk(base: float, volatility: float, steps: int, seed: int | None = None) -> List[float]:
    """Generate a geometric random walk price series."""
    rng = random.Random(seed)
    prices = [base]
    for _ in range(steps - 1):
        ret = rng.gauss(0.0001, volatility)
        prices.append(prices[-1] * math.exp(ret))
    return prices


def get_quote(ticker: str) -> TickerQuote:
    """Return a simulated real-time quote for the given ticker."""
    ticker = ticker.upper()
    base = _BASE_PRICES.get(ticker, 100.0)
    vol = _VOLATILITIES.get(ticker, 0.02)

    price = base * math.exp(random.gauss(0, vol))
    spread = price * 0.0002  # 2 bps spread
    change = price - base
    change_pct = (change / base) * 100

    return TickerQuote(
        ticker=ticker,
        price=round(price, 4),
        bid=round(price - spread / 2, 4),
        ask=round(price + spread / 2, 4),
        volume=random.randint(500_000, 10_000_000),
        change=round(change, 4),
        change_pct=round(change_pct, 4),
        timestamp=datetime.utcnow(),
    )


def get_candles(ticker: str, bars: int = 100, interval_minutes: int = 60) -> List[Candle]:
    """Return a list of simulated OHLCV bars for a ticker."""
    ticker = ticker.upper()
    base = _BASE_PRICES.get(ticker, 100.0)
    vol = _VOLATILITIES.get(ticker, 0.02) / math.sqrt(1440 / interval_minutes)

    now = datetime.utcnow().replace(second=0, microsecond=0)
    start = now - timedelta(minutes=interval_minutes * bars)
    closes = _random_walk(base, vol, bars, seed=hash(ticker) % 100_000)

    candles: List[Candle] = []
    for i, close_price in enumerate(closes):
        ts = start + timedelta(minutes=interval_minutes * i)
        open_price = closes[i - 1] if i > 0 else close_price
        high = max(open_price, close_price) * (1 + abs(random.gauss(0, vol / 2)))
        low = min(open_price, close_price) * (1 - abs(random.gauss(0, vol / 2)))
        candles.append(
            Candle(
                ticker=ticker,
                timestamp=ts,
                open=round(open_price, 4),
                high=round(high, 4),
                low=round(low, 4),
                close=round(close_price, 4),
                volume=random.randint(50_000, 2_000_000),
            )
        )
    return candles

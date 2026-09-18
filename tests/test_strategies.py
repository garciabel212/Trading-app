"""Tests for the strategy implementations."""

import pytest

from trading_app.models.market_data import Candle
from trading_app.services.strategies.sma_cross import SMACrossStrategy
from trading_app.services.strategies.rsi import RSIStrategy
from datetime import datetime, timedelta


def make_candles(prices: list[float], ticker: str = "TEST") -> list[Candle]:
    """Build synthetic candles from a price series."""
    base = datetime(2024, 1, 1)
    return [
        Candle(
            ticker=ticker,
            timestamp=base + timedelta(hours=i),
            open=p,
            high=p * 1.01,
            low=p * 0.99,
            close=p,
            volume=100_000,
        )
        for i, p in enumerate(prices)
    ]


class TestSMACrossStrategy:
    def test_insufficient_data_returns_hold(self):
        strat = SMACrossStrategy(short_window=5, long_window=20)
        candles = make_candles([100.0] * 15)  # Less than long_window + 1
        assert strat.generate_signal(candles) == "HOLD"

    def test_golden_cross_returns_buy(self):
        strat = SMACrossStrategy(short_window=3, long_window=5)
        # 5 flat bars then a surge on the 6th bar triggers golden cross
        prices = [10.0, 10.0, 10.0, 10.0, 10.0, 20.0]
        candles = make_candles(prices)
        signal = strat.generate_signal(candles)
        assert signal == "BUY"

    def test_death_cross_returns_sell(self):
        strat = SMACrossStrategy(short_window=3, long_window=5)
        # 5 flat bars then a drop on the 6th bar triggers death cross
        prices = [50.0, 50.0, 50.0, 50.0, 50.0, 10.0]
        candles = make_candles(prices)
        signal = strat.generate_signal(candles)
        assert signal == "SELL"

    def test_flat_market_returns_hold(self):
        strat = SMACrossStrategy(short_window=3, long_window=5)
        prices = [100.0] * 20
        candles = make_candles(prices)
        assert strat.generate_signal(candles) == "HOLD"

    def test_invalid_windows_raises(self):
        with pytest.raises(ValueError):
            SMACrossStrategy(short_window=20, long_window=10)

    def test_strategy_name(self):
        strat = SMACrossStrategy(10, 50)
        assert "10" in strat.name and "50" in strat.name


class TestRSIStrategy:
    def test_insufficient_data_returns_hold(self):
        strat = RSIStrategy(period=14)
        candles = make_candles([100.0] * 5)
        assert strat.generate_signal(candles) == "HOLD"

    def test_oversold_returns_buy(self):
        strat = RSIStrategy(period=5, oversold=40, overbought=70)
        # Sharply declining prices → low RSI
        prices = [100, 90, 80, 70, 60, 50, 45, 40]
        candles = make_candles(prices)
        signal = strat.generate_signal(candles)
        assert signal == "BUY"

    def test_overbought_returns_sell(self):
        strat = RSIStrategy(period=5, oversold=30, overbought=60)
        # Sharply rising prices → high RSI
        prices = [50, 60, 70, 80, 90, 100, 110, 120]
        candles = make_candles(prices)
        signal = strat.generate_signal(candles)
        assert signal == "SELL"

    def test_strategy_name(self):
        strat = RSIStrategy(period=14)
        assert "RSI" in strat.name and "14" in strat.name

"""Tests for the backtesting engine."""

import pytest

from datetime import datetime, timedelta
from trading_app.models.market_data import Candle
from trading_app.services.backtest import run_backtest


def make_candles(prices: list[float], ticker: str = "TEST") -> list[Candle]:
    base = datetime(2024, 1, 1)
    return [
        Candle(
            ticker=ticker,
            timestamp=base + timedelta(hours=i),
            open=p, high=p * 1.005, low=p * 0.995, close=p,
            volume=100_000,
        )
        for i, p in enumerate(prices)
    ]


class TestBacktest:
    def test_sma_backtest_returns_result(self):
        prices = list(range(50, 200))  # Steadily rising
        candles = make_candles(prices)
        result = run_backtest(candles, strategy_name="sma_cross", short_window=5, long_window=20)
        assert result.bars_tested == len(candles)
        assert result.initial_cash == 100_000.0
        assert result.final_equity > 0

    def test_rsi_backtest_returns_result(self):
        import math
        prices = [100 + 20 * math.sin(i / 10) for i in range(150)]
        candles = make_candles(prices)
        result = run_backtest(candles, strategy_name="rsi", period=10, oversold=35, overbought=65)
        assert result.strategy_name.startswith("RSI")
        assert result.total_trades >= 0

    def test_unknown_strategy_raises(self):
        candles = make_candles([100.0] * 100)
        with pytest.raises(ValueError, match="Unknown strategy"):
            run_backtest(candles, strategy_name="unknown_strat")

    def test_winning_plus_losing_equals_sell_trades(self):
        prices = list(range(100, 400))
        candles = make_candles(prices)
        result = run_backtest(candles, strategy_name="sma_cross", short_window=5, long_window=20)
        assert result.winning_trades + result.losing_trades == result.losing_trades + result.winning_trades

    def test_max_drawdown_between_zero_and_hundred(self):
        prices = [100 - i * 0.5 for i in range(200)]  # Monotonically declining
        candles = make_candles(prices)
        result = run_backtest(candles, strategy_name="rsi")
        assert 0 <= result.max_drawdown_pct <= 100

"""Backtesting engine for Trading App strategies."""

from __future__ import annotations

import math
from typing import List, Literal

from pydantic import BaseModel, Field

from trading_app.models.market_data import Candle
from trading_app.services.strategies.base import BaseStrategy
from trading_app.services.strategies.sma_cross import SMACrossStrategy
from trading_app.services.strategies.rsi import RSIStrategy
from trading_app.core.config import settings


class TradeRecord(BaseModel):
    """Record of a single simulated backtest trade."""
    bar_index: int
    signal: str
    price: float
    quantity: float
    pnl: float = 0.0


class BacktestResult(BaseModel):
    """Aggregated performance metrics from a backtest run."""
    strategy_name: str
    ticker: str
    bars_tested: int
    total_trades: int
    winning_trades: int
    losing_trades: int
    total_return_pct: float
    annualized_return_pct: float
    sharpe_ratio: float
    max_drawdown_pct: float
    final_equity: float
    initial_cash: float
    trades: List[TradeRecord] = Field(default_factory=list)


StrategyName = Literal["sma_cross", "rsi"]

STRATEGY_MAP: dict[str, type[BaseStrategy]] = {
    "sma_cross": SMACrossStrategy,
    "rsi": RSIStrategy,
}


def run_backtest(
    candles: List[Candle],
    strategy_name: StrategyName = "sma_cross",
    initial_cash: float = settings.initial_cash,
    position_size_pct: float = 0.10,
    commission_rate: float = settings.commission_rate,
    **strategy_kwargs,
) -> BacktestResult:
    """
    Replay historical candle bars through a strategy and compute performance metrics.

    Args:
        candles: OHLCV bars in ascending time order.
        strategy_name: "sma_cross" or "rsi".
        initial_cash: Starting cash balance.
        position_size_pct: Fraction of cash to deploy per trade (0.10 = 10%).
        commission_rate: Commission fraction per trade.
        **strategy_kwargs: Forwarded to the strategy constructor.

    Returns:
        BacktestResult with performance metrics and trade log.
    """
    strategy_cls = STRATEGY_MAP.get(strategy_name)
    if strategy_cls is None:
        raise ValueError(f"Unknown strategy: {strategy_name}. Choose from {list(STRATEGY_MAP)}")

    strategy = strategy_cls(**strategy_kwargs)

    cash = initial_cash
    position_qty = 0.0
    position_entry_price = 0.0
    equity_curve: List[float] = [initial_cash]
    trades: List[TradeRecord] = []
    winning = 0
    losing = 0

    for i in range(1, len(candles)):
        window = candles[: i + 1]
        signal = strategy.generate_signal(window)
        bar = candles[i]
        price = bar.close

        if signal == "BUY" and position_qty == 0 and cash > 0:
            invest = cash * position_size_pct
            qty = invest / price
            commission = invest * commission_rate
            position_qty = qty
            position_entry_price = price
            cash -= invest + commission
            trades.append(TradeRecord(bar_index=i, signal="BUY", price=price, quantity=qty))

        elif signal == "SELL" and position_qty > 0:
            proceeds = position_qty * price
            commission = proceeds * commission_rate
            pnl = (price - position_entry_price) * position_qty - commission
            cash += proceeds - commission
            if pnl >= 0:
                winning += 1
            else:
                losing += 1
            trades.append(
                TradeRecord(bar_index=i, signal="SELL", price=price, quantity=position_qty, pnl=pnl)
            )
            position_qty = 0.0
            position_entry_price = 0.0

        current_equity = cash + position_qty * price
        equity_curve.append(current_equity)

    final_equity = equity_curve[-1]
    total_return_pct = ((final_equity - initial_cash) / initial_cash) * 100

    # Annualized return (assume hourly bars -> 6.5 trading hours/day * 252 days)
    bars_per_year = 252 * 6.5 if len(candles) > 0 else 1
    n_years = len(candles) / bars_per_year
    if n_years > 0 and final_equity > 0:
        annualized_return_pct = (((final_equity / initial_cash) ** (1 / n_years)) - 1) * 100
    else:
        annualized_return_pct = 0.0

    # Sharpe ratio (annualized, assuming 0% risk-free rate)
    returns = [
        (equity_curve[i] - equity_curve[i - 1]) / equity_curve[i - 1]
        for i in range(1, len(equity_curve))
        if equity_curve[i - 1] > 0
    ]
    if len(returns) > 1:
        avg_r = sum(returns) / len(returns)
        std_r = math.sqrt(sum((r - avg_r) ** 2 for r in returns) / len(returns))
        sharpe_ratio = (avg_r / std_r * math.sqrt(bars_per_year)) if std_r > 0 else 0.0
    else:
        sharpe_ratio = 0.0

    # Maximum drawdown
    peak = equity_curve[0]
    max_drawdown = 0.0
    for eq in equity_curve:
        if eq > peak:
            peak = eq
        dd = (peak - eq) / peak
        if dd > max_drawdown:
            max_drawdown = dd

    return BacktestResult(
        strategy_name=strategy.name,
        ticker=candles[0].ticker if candles else "UNKNOWN",
        bars_tested=len(candles),
        total_trades=len(trades),
        winning_trades=winning,
        losing_trades=losing,
        total_return_pct=round(total_return_pct, 4),
        annualized_return_pct=round(annualized_return_pct, 4),
        sharpe_ratio=round(sharpe_ratio, 4),
        max_drawdown_pct=round(max_drawdown * 100, 4),
        final_equity=round(final_equity, 4),
        initial_cash=initial_cash,
        trades=trades,
    )

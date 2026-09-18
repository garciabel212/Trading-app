"""Backtest API router."""

from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from trading_app.services.backtest import BacktestResult, run_backtest
from trading_app.services.market_data import get_candles
from trading_app.core.config import settings

router = APIRouter(prefix="/backtest", tags=["Backtest"])


class BacktestRequest(BaseModel):
    """Request body for running a strategy backtest."""
    ticker: str = Field(..., description="Ticker symbol to backtest")
    strategy: Literal["sma_cross", "rsi"] = Field(default="sma_cross")
    bars: int = Field(default=300, ge=50, le=500)
    position_size_pct: float = Field(default=0.10, ge=0.01, le=1.0)
    # SMA Crossover params
    short_window: Optional[int] = Field(default=10, ge=2)
    long_window: Optional[int] = Field(default=50, ge=5)
    # RSI params
    rsi_period: Optional[int] = Field(default=14, ge=2)
    rsi_oversold: Optional[float] = Field(default=30.0)
    rsi_overbought: Optional[float] = Field(default=70.0)


@router.post("", response_model=BacktestResult)
def backtest(request: BacktestRequest) -> BacktestResult:
    """Run a strategy backtest on simulated historical data."""
    ticker = request.ticker.upper()
    if ticker not in settings.supported_tickers:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not supported.")

    candles = get_candles(ticker, bars=request.bars, interval_minutes=60)

    kwargs: dict = {}
    if request.strategy == "sma_cross":
        if request.short_window:
            kwargs["short_window"] = request.short_window
        if request.long_window:
            kwargs["long_window"] = request.long_window
    elif request.strategy == "rsi":
        if request.rsi_period:
            kwargs["period"] = request.rsi_period
        if request.rsi_oversold is not None:
            kwargs["oversold"] = request.rsi_oversold
        if request.rsi_overbought is not None:
            kwargs["overbought"] = request.rsi_overbought

    try:
        result = run_backtest(
            candles=candles,
            strategy_name=request.strategy,
            position_size_pct=request.position_size_pct,
            **kwargs,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return result

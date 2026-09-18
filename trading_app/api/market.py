"""Market data API router."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException, Query

from trading_app.core.config import settings
from trading_app.models.market_data import Candle, TickerQuote
from trading_app.services.market_data import get_candles, get_quote

router = APIRouter(prefix="/market", tags=["Market Data"])


@router.get("/quote/{ticker}", response_model=TickerQuote)
def quote(ticker: str) -> TickerQuote:
    """Return the latest simulated quote for a ticker."""
    ticker = ticker.upper()
    if ticker not in settings.supported_tickers:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not supported.")
    return get_quote(ticker)


@router.get("/candles/{ticker}", response_model=List[Candle])
def candles(
    ticker: str,
    bars: int = Query(default=100, ge=10, le=500),
    interval_minutes: int = Query(default=60, ge=1, le=1440),
) -> List[Candle]:
    """Return OHLCV candlestick bars for a ticker."""
    ticker = ticker.upper()
    if ticker not in settings.supported_tickers:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not supported.")
    return get_candles(ticker, bars=bars, interval_minutes=interval_minutes)


@router.get("/tickers", response_model=List[str])
def list_tickers() -> List[str]:
    """Return all supported ticker symbols."""
    return settings.supported_tickers

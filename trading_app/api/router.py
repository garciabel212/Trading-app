"""Main API router aggregating all sub-routers."""

from fastapi import APIRouter

from trading_app.api import market, orders, portfolio, backtest

router = APIRouter(prefix="/api/v1")

router.include_router(market.router)
router.include_router(orders.router)
router.include_router(portfolio.router)
router.include_router(backtest.router)

"""Portfolio API router."""

from __future__ import annotations

from fastapi import APIRouter

from trading_app.models.portfolio import PortfolioState
from trading_app.services.portfolio import portfolio_service

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.get("", response_model=PortfolioState)
def get_portfolio() -> PortfolioState:
    """Return the current portfolio state."""
    return portfolio_service.get_state()

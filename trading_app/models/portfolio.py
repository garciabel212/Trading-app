"""Portfolio models for Trading App."""

from __future__ import annotations

from datetime import datetime
from typing import Dict

from pydantic import BaseModel, Field


class Position(BaseModel):
    """A single open position in the portfolio."""
    ticker: str
    quantity: float = Field(..., description="Number of shares/units held")
    avg_entry_price: float = Field(..., description="Volume-weighted average entry price")
    current_price: float = Field(default=0.0, description="Latest market price")

    @property
    def market_value(self) -> float:
        """Current market value of the position."""
        return self.quantity * self.current_price

    @property
    def cost_basis(self) -> float:
        """Total cost basis of the position."""
        return self.quantity * self.avg_entry_price

    @property
    def unrealized_pnl(self) -> float:
        """Unrealized profit/loss based on current price."""
        return self.market_value - self.cost_basis

    @property
    def unrealized_pnl_pct(self) -> float:
        """Unrealized P&L as a percentage of cost basis."""
        if self.cost_basis == 0:
            return 0.0
        return (self.unrealized_pnl / self.cost_basis) * 100


class PortfolioState(BaseModel):
    """Full snapshot of the portfolio at a point in time."""
    cash: float = Field(..., description="Available cash in USD")
    positions: Dict[str, Position] = Field(default_factory=dict)
    realized_pnl: float = Field(default=0.0, description="Total realized profit/loss")
    total_commission_paid: float = Field(default=0.0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def total_market_value(self) -> float:
        """Sum of market value across all open positions."""
        return sum(p.market_value for p in self.positions.values())

    @property
    def total_equity(self) -> float:
        """Total account equity: cash + market value of positions."""
        return self.cash + self.total_market_value

    @property
    def total_unrealized_pnl(self) -> float:
        """Combined unrealized P&L across all positions."""
        return sum(p.unrealized_pnl for p in self.positions.values())

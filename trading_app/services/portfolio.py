"""Portfolio service — manages cash, positions, and P&L."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from trading_app.core.config import settings
from trading_app.models.order import Order, OrderSide, OrderStatus
from trading_app.models.portfolio import Position, PortfolioState


class PortfolioService:
    """Stateful portfolio manager for paper trading."""

    def __init__(self, initial_cash: float = settings.initial_cash) -> None:
        self._cash: float = initial_cash
        self._positions: dict[str, Position] = {}
        self._realized_pnl: float = 0.0
        self._total_commission: float = 0.0

    # ------------------------------------------------------------------
    # State access
    # ------------------------------------------------------------------

    def get_state(self) -> PortfolioState:
        """Return a snapshot of the current portfolio state."""
        return PortfolioState(
            cash=round(self._cash, 4),
            positions=dict(self._positions),
            realized_pnl=round(self._realized_pnl, 4),
            total_commission_paid=round(self._total_commission, 4),
            updated_at=datetime.utcnow(),
        )

    def get_position(self, ticker: str) -> Optional[Position]:
        """Return the current open position for a ticker, or None."""
        return self._positions.get(ticker.upper())

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def can_buy(self, ticker: str, quantity: float, price: float) -> tuple[bool, str]:
        """Check whether a BUY order is affordable."""
        cost = quantity * price * (1 + settings.commission_rate)
        if cost > self._cash:
            return False, f"Insufficient cash: need ${cost:.2f}, have ${self._cash:.2f}"
        return True, "OK"

    def can_sell(self, ticker: str, quantity: float) -> tuple[bool, str]:
        """Check whether a SELL order has enough shares."""
        pos = self._positions.get(ticker.upper())
        if pos is None or pos.quantity < quantity:
            held = pos.quantity if pos else 0
            return False, f"Insufficient shares: need {quantity}, have {held}"
        return True, "OK"

    # ------------------------------------------------------------------
    # Order application
    # ------------------------------------------------------------------

    def apply_fill(self, order: Order) -> None:
        """Update portfolio cash and positions after an order fill."""
        ticker = order.ticker.upper()
        fill_price = order.filled_avg_price or 0.0
        qty = order.filled_quantity
        commission = order.commission

        self._total_commission += commission

        if order.side == OrderSide.BUY:
            total_cost = qty * fill_price + commission
            self._cash -= total_cost

            if ticker in self._positions:
                pos = self._positions[ticker]
                total_qty = pos.quantity + qty
                new_avg = (pos.quantity * pos.avg_entry_price + qty * fill_price) / total_qty
                self._positions[ticker] = Position(
                    ticker=ticker,
                    quantity=total_qty,
                    avg_entry_price=round(new_avg, 6),
                    current_price=fill_price,
                )
            else:
                self._positions[ticker] = Position(
                    ticker=ticker,
                    quantity=qty,
                    avg_entry_price=fill_price,
                    current_price=fill_price,
                )

        elif order.side == OrderSide.SELL:
            proceeds = qty * fill_price - commission
            self._cash += proceeds

            pos = self._positions[ticker]
            realized = qty * (fill_price - pos.avg_entry_price) - commission
            self._realized_pnl += realized

            remaining = pos.quantity - qty
            if remaining <= 1e-9:
                del self._positions[ticker]
            else:
                self._positions[ticker] = Position(
                    ticker=ticker,
                    quantity=remaining,
                    avg_entry_price=pos.avg_entry_price,
                    current_price=fill_price,
                )

    def update_prices(self, prices: dict[str, float]) -> None:
        """Update current_price on all positions from a price map."""
        for ticker, price in prices.items():
            if ticker in self._positions:
                pos = self._positions[ticker]
                self._positions[ticker] = pos.model_copy(update={"current_price": price})


# Singleton instance shared across the application
portfolio_service = PortfolioService()

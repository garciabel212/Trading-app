"""Execution engine — paper trading order matching and fills."""

from __future__ import annotations

import random
from datetime import datetime
from typing import List

from trading_app.core.config import settings
from trading_app.models.order import Order, OrderRequest, OrderStatus, OrderType
from trading_app.services.market_data import get_quote
from trading_app.services.portfolio import portfolio_service


class ExecutionService:
    """Simulates paper-trading order execution with slippage and commission."""

    def __init__(self) -> None:
        self._orders: List[Order] = []

    def _apply_slippage(self, price: float, side: str) -> float:
        """Apply random slippage around the base slippage setting."""
        slippage_pct = settings.default_slippage_bps / 10_000
        noise = random.uniform(0, slippage_pct * 2)
        if side == "BUY":
            return price * (1 + noise)
        return price * (1 - noise)

    def _compute_commission(self, qty: float, fill_price: float) -> float:
        """Compute commission based on fill value."""
        return round(qty * fill_price * settings.commission_rate, 4)

    def place_order(self, request: OrderRequest) -> Order:
        """Place and immediately attempt to fill a paper trading order."""
        order = Order(
            ticker=request.ticker.upper(),
            side=request.side,
            order_type=request.order_type,
            quantity=request.quantity,
            limit_price=request.limit_price,
            stop_price=request.stop_price,
        )

        self._orders.append(order)
        self._try_fill(order)
        return order

    def _try_fill(self, order: Order) -> None:
        """Attempt to fill the order based on order type and market conditions."""
        quote = get_quote(order.ticker)
        market_price = quote.price

        # Determine fill price based on order type
        if order.order_type == OrderType.MARKET:
            fill_price = self._apply_slippage(market_price, order.side.value)
        elif order.order_type == OrderType.LIMIT:
            if order.limit_price is None:
                order.status = OrderStatus.REJECTED
                order.updated_at = datetime.utcnow()
                return
            # Only fill if market price is favorable
            if order.side.value == "BUY" and market_price > order.limit_price:
                return  # Leave pending
            if order.side.value == "SELL" and market_price < order.limit_price:
                return  # Leave pending
            fill_price = order.limit_price
        elif order.order_type == OrderType.STOP:
            if order.stop_price is None:
                order.status = OrderStatus.REJECTED
                order.updated_at = datetime.utcnow()
                return
            if order.side.value == "BUY" and market_price < order.stop_price:
                return  # Not triggered yet
            if order.side.value == "SELL" and market_price > order.stop_price:
                return  # Not triggered yet
            fill_price = self._apply_slippage(market_price, order.side.value)
        else:
            order.status = OrderStatus.REJECTED
            order.updated_at = datetime.utcnow()
            return

        commission = self._compute_commission(order.quantity, fill_price)

        # Validate portfolio can support this order
        if order.side.value == "BUY":
            ok, msg = portfolio_service.can_buy(order.ticker, order.quantity, fill_price)
        else:
            ok, msg = portfolio_service.can_sell(order.ticker, order.quantity)

        if not ok:
            order.status = OrderStatus.REJECTED
            order.updated_at = datetime.utcnow()
            return

        # Apply the fill
        order.filled_quantity = order.quantity
        order.filled_avg_price = round(fill_price, 4)
        order.commission = commission
        order.status = OrderStatus.FILLED
        order.updated_at = datetime.utcnow()

        portfolio_service.apply_fill(order)

    def get_orders(self, ticker: str | None = None) -> List[Order]:
        """Return all orders, optionally filtered by ticker."""
        if ticker:
            return [o for o in self._orders if o.ticker == ticker.upper()]
        return list(self._orders)


# Singleton instance shared across the application
execution_service = ExecutionService()

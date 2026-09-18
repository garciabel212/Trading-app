"""Tests for portfolio service."""

import pytest

from trading_app.models.order import Order, OrderSide, OrderStatus, OrderType
from trading_app.models.portfolio import PortfolioState
from trading_app.services.portfolio import PortfolioService


@pytest.fixture()
def portfolio():
    """Fresh portfolio with $100,000 initial cash."""
    return PortfolioService(initial_cash=100_000.0)


def make_filled_order(ticker: str, side: OrderSide, qty: float, price: float, commission: float = 0.0) -> Order:
    """Helper to build a synthetic filled order."""
    o = Order(ticker=ticker, side=side, order_type=OrderType.MARKET, quantity=qty)
    o.filled_quantity = qty
    o.filled_avg_price = price
    o.commission = commission
    o.status = OrderStatus.FILLED
    return o


class TestPortfolioService:
    def test_initial_state(self, portfolio):
        state = portfolio.get_state()
        assert state.cash == 100_000.0
        assert state.positions == {}
        assert state.realized_pnl == 0.0

    def test_buy_creates_position(self, portfolio):
        order = make_filled_order("AAPL", OrderSide.BUY, 10, 150.0, commission=1.5)
        portfolio.apply_fill(order)
        state = portfolio.get_state()
        assert "AAPL" in state.positions
        assert state.positions["AAPL"].quantity == 10
        assert state.positions["AAPL"].avg_entry_price == 150.0
        assert state.cash == pytest.approx(100_000 - (10 * 150.0) - 1.5, rel=1e-4)

    def test_buy_averages_entry_price(self, portfolio):
        order1 = make_filled_order("AAPL", OrderSide.BUY, 10, 100.0)
        order2 = make_filled_order("AAPL", OrderSide.BUY, 10, 200.0)
        portfolio.apply_fill(order1)
        portfolio.apply_fill(order2)
        pos = portfolio.get_position("AAPL")
        assert pos.quantity == 20
        assert pos.avg_entry_price == pytest.approx(150.0, rel=1e-6)

    def test_sell_closes_position(self, portfolio):
        portfolio.apply_fill(make_filled_order("AAPL", OrderSide.BUY, 10, 100.0))
        portfolio.apply_fill(make_filled_order("AAPL", OrderSide.SELL, 10, 120.0))
        assert portfolio.get_position("AAPL") is None

    def test_sell_books_realized_pnl(self, portfolio):
        portfolio.apply_fill(make_filled_order("AAPL", OrderSide.BUY, 10, 100.0))
        portfolio.apply_fill(make_filled_order("AAPL", OrderSide.SELL, 10, 130.0))
        state = portfolio.get_state()
        assert state.realized_pnl == pytest.approx(300.0, rel=1e-4)

    def test_can_buy_insufficient_cash(self, portfolio):
        ok, msg = portfolio.can_buy("AAPL", 10_000, 1_000.0)
        assert not ok
        assert "Insufficient cash" in msg

    def test_can_sell_no_position(self, portfolio):
        ok, msg = portfolio.can_sell("AAPL", 1)
        assert not ok
        assert "Insufficient shares" in msg

    def test_partial_sell_leaves_remaining(self, portfolio):
        portfolio.apply_fill(make_filled_order("AAPL", OrderSide.BUY, 20, 100.0))
        portfolio.apply_fill(make_filled_order("AAPL", OrderSide.SELL, 15, 110.0))
        pos = portfolio.get_position("AAPL")
        assert pos is not None
        assert pos.quantity == pytest.approx(5.0)

    def test_total_equity(self, portfolio):
        portfolio.apply_fill(make_filled_order("AAPL", OrderSide.BUY, 10, 100.0))
        portfolio.update_prices({"AAPL": 120.0})
        state = portfolio.get_state()
        assert state.total_equity == pytest.approx(state.cash + 10 * 120.0, rel=1e-4)

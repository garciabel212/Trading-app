"""Integration tests for FastAPI routes."""

import pytest
from fastapi.testclient import TestClient

from trading_app.main import app

client = TestClient(app)


class TestHealthEndpoint:
    def test_health_ok(self):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


class TestMarketEndpoints:
    def test_list_tickers(self):
        r = client.get("/api/v1/market/tickers")
        assert r.status_code == 200
        tickers = r.json()
        assert isinstance(tickers, list)
        assert "AAPL" in tickers

    def test_quote_known_ticker(self):
        r = client.get("/api/v1/market/quote/AAPL")
        assert r.status_code == 200
        q = r.json()
        assert q["ticker"] == "AAPL"
        assert q["price"] > 0

    def test_quote_unknown_ticker(self):
        r = client.get("/api/v1/market/quote/ZZZZ")
        assert r.status_code == 404

    def test_candles_returns_list(self):
        r = client.get("/api/v1/market/candles/AAPL?bars=20")
        assert r.status_code == 200
        candles = r.json()
        assert len(candles) == 20
        assert all(k in candles[0] for k in ["open", "high", "low", "close", "volume"])


class TestPortfolioEndpoint:
    def test_portfolio_state(self):
        r = client.get("/api/v1/portfolio")
        assert r.status_code == 200
        p = r.json()
        assert "cash" in p
        assert "positions" in p
        assert p["cash"] >= 0


class TestOrdersEndpoint:
    def test_place_market_buy(self):
        r = client.post("/api/v1/orders", json={
            "ticker": "AAPL",
            "side": "BUY",
            "order_type": "MARKET",
            "quantity": 1,
        })
        assert r.status_code == 201
        order = r.json()
        assert order["ticker"] == "AAPL"
        assert order["side"] == "BUY"
        assert order["status"] in ("FILLED", "REJECTED")

    def test_list_orders(self):
        r = client.get("/api/v1/orders")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestBacktestEndpoint:
    def test_sma_backtest(self):
        r = client.post("/api/v1/backtest", json={
            "ticker": "AAPL",
            "strategy": "sma_cross",
            "bars": 100,
            "short_window": 5,
            "long_window": 20,
        })
        assert r.status_code == 200
        res = r.json()
        assert "total_return_pct" in res
        assert "sharpe_ratio" in res

    def test_rsi_backtest(self):
        r = client.post("/api/v1/backtest", json={
            "ticker": "MSFT",
            "strategy": "rsi",
            "bars": 100,
        })
        assert r.status_code == 200

    def test_backtest_unknown_ticker(self):
        r = client.post("/api/v1/backtest", json={
            "ticker": "ZZZZ",
            "strategy": "sma_cross",
        })
        assert r.status_code == 404

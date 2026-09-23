---
name: agent-trading-os
description: Query live prediction & crypto market data, inspect simulated portfolios, execute paper trades, and backtest quantitative strategies against the Agent Trading OS engine.
---

# Agent Trading OS Skill

Use this skill to interact with the local Agent Trading OS FastAPI service running at `http://localhost:8000`.

## System Overview
- **Service**: Agent Trading OS
- **Base URL**: `http://localhost:8000`
- **Execution Mode**: Decimal-safe simulated paper trading (no real funds or exchange keys required)
- **Safety Invariant**: Hard maximum order size `quantity <= 10` enforced by the Risk Engine

---

## Available Actions

### 1. Health Check
Confirm the FastAPI backend service is online.
```bash
curl -s http://localhost:8000/health
```

### 2. Live Market Quote
Fetch real-time bid, ask, last price, and volume for a symbol (`AAPL`, `BTC-USD`, `MSFT`, `TSLA`, `SPY`).
```bash
curl -s http://localhost:8000/api/market/quote/BTC-USD
```

### 3. Historical Candles
Fetch historical OHLCV candles for technical analysis.
```bash
curl -s "http://localhost:8000/api/market/candles/BTC-USD?limit=50"
```

### 4. Check Simulated Portfolio
Inspect cash balance, open positions, cost basis, realized P&L, and total portfolio equity.
```bash
curl -s http://localhost:8000/api/portfolio/
```

### 5. Submit Paper Trade
Submit a paper order proposal to the execution engine.
```bash
curl -X POST http://localhost:8000/api/orders/ \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "BTC-USD",
    "side": "buy",
    "quantity": 5,
    "order_type": "market"
  }'
```

### 6. Run Strategy Backtest
Execute a backtest on an SMA Cross or RSI strategy.
```bash
curl -X POST http://localhost:8000/api/backtest/run \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "strategy": "sma_cross",
    "params": {
      "fast_window": 10,
      "slow_window": 30
    }
  }'
```

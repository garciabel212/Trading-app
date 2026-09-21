# Agent Trading OS & Algorithmic Trading Platform

A unified operating system for specialized AI trading agents, paper trading against live prediction markets (Kalshi), algorithmic execution with a FastAPI backend, and **Graphify** codebase knowledge graph integration.

---

## Architecture Overview

```
trading-app/
├── src/                          # Agent Trading OS (React 19 + TypeScript + Vite)
│   ├── agents/                   # Agent registry, modular skills, and episodic memory store
│   ├── components/               # React Flow canvas, TopBar, NodeInspector, AgentStudioModal
│   ├── hooks/                    # Replay runner and Kalshi live market polling hooks
│   ├── kalshi/                   # Kalshi API client, binary orderbook normalization, taker fees
│   ├── paper/                    # Paper trading ledger and audit bridge
│   ├── workflow/                 # 8-stage deterministic execution pipeline and point-in-time trace replay
│   └── __tests__/                # Vitest suite (50 tests passing)
├── trading_app/                  # Python FastAPI Backend
│   ├── api/                      # REST routers (market quotes, candles, orders, portfolio, backtest)
│   ├── core/                     # Configuration and settings
│   ├── models/                   # Pydantic data schemas
│   ├── services/                 # Execution engine, portfolio ledger, SMA/RSI strategies, backtesting
│   └── static/                   # Static dashboard assets
├── tests/                        # Pytest suite for Python backend
├── graphify-out/                 # Graphify knowledge graph outputs (AST extract, callflow, HTML visualizer)
├── .agents/                      # Antigravity rules and workflows
├── run_graphify.ps1              # Graphify automated extraction script
├── pyproject.toml                # Python project configuration (uv, hatchling)
├── package.json                  # Frontend dependencies and scripts
└── vite.config.ts                # Vite dev server with Kalshi API reverse proxy
```

---

## 1. Agent Trading OS (Frontend Workspace)

The frontend offers two interconnected workspaces:

### 🔬 Agent Lab
* **8-Stage Agent Pipeline**: Visualizes and executes agent collaboration across a React Flow graph canvas:
  $$\text{Market Feed} \longrightarrow \text{Analysis Skill} \longrightarrow \text{Market Analyst} \longrightarrow \text{Agent Memory (Query)} \longrightarrow \text{Strategy Agent} \longrightarrow \text{Risk Engine} \longrightarrow \text{Paper Execution} \longrightarrow \text{Evaluation} \longrightarrow \text{Agent Memory (Commit)}$$
* **Inspectable Replay Timeline**: Step-by-step point-in-time state scrubbing across recorded execution traces.
* **Agent Studio**: Configure preset profiles (*Alpha Scalper*, *Spread Arbitrageur*, *Conservative Sentinel*, *Aggressive Breakout*) or create custom agents with modular skill assignments.
* **Episodic Learning Memory Loop**: Evaluates execution outcomes, calculates net friction, commits post-trade lessons, and adaptively tunes conviction and sizing on subsequent runs.

### 📈 Paper Trading (Live Kalshi Prediction Markets)
* **Real Binary Market Data**: Polls Kalshi's live API (`https://api.elections.kalshi.com/trade-api/v2`) with reciprocal orderbook normalization:
  * Best YES Bid from `orderbook_fp.yes_dollars`
  * Best YES Ask derived from resting NO bids (`1.00 - highest_no_bid`)
* **Decimal-Safe Paper Account**: Starting at $1,000.00 cash, with official Kalshi taker fee formulas:
  $$\text{Fee} = \lceil 0.07 \times \text{Contracts} \times P \times (1 - P) \times 100 \rceil \div 100$$
* **Decision Trace Bridge**: Simulated paper executions emit a full trace. Clicking **`🔍 Inspect Decision`** opens Agent Lab with the exact point-in-time Risk Engine validation token.

---

## 2. Python FastAPI Backend

* **REST Endpoints**:
  * `GET /api/v1/portfolio`: Current cash balance ($100,000 starting), equity, positions, and P&L.
  * `GET /api/v1/market/quote/{ticker}`: Real-time and simulated quotes.
  * `GET /api/v1/market/candles/{ticker}`: OHLCV candle history for equities and crypto.
  * `POST /api/v1/orders`: Order placement with configurable slippage (5 bps) and commission (0.1%).
  * `POST /api/v1/backtest`: Quantitative strategy backtesting engine (SMA Crossover & RSI Mean Reversion).

---

## 3. Quickstart Guide

### Frontend (Agent Trading OS)

```powershell
# Install dependencies
npm install

# Run the test suite (50 tests passing)
npm test

# Production build validation
npm run build

# Start the dev server
npm run dev
```
Open **http://localhost:5173** in your browser.

### Backend (FastAPI Service)

```powershell
# Install dependencies with uv
uv sync

# Run the pytest suite
uv run pytest tests/ -v

# Start the backend server
uv run uvicorn trading_app.main:app --reload --port 8000
```
Open **http://localhost:8000** for the API docs at `/docs` or the backend dashboard.

---

## 4. Graphify Knowledge Graph

Extract and visualize the architectural knowledge graph:

```powershell
# Extract AST code graph across the project
uv tool run --from graphifyy graphify extract . --code-only

# Generate interactive HTML visualization
uv tool run --from graphifyy graphify export html

# View god nodes / architectural hubs
uv tool run --from graphifyy graphify god-nodes
```

View the generated graph anytime by opening `graphify-out/graph.html` in any browser.

# Graph Report - trading app  (2026-09-23)

## Corpus Check
- 101 files · ~146,222 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .css 2, (none) 1)

## Summary
- 763 nodes · 1693 edges · 40 communities (25 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1a7eb571`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- workflow/types.ts
- App.tsx
- demonstration.test.ts
- package.json
- Candle
- SMACrossStrategy
- main.py
- NodeInspector.tsx
- execution.py
- compilerOptions
- services/backtest.py
- Order
- compilerOptions
- RSIStrategy
- PortfolioService
- communication.test.ts
- app.js
- Position
- services/portfolio.py
- make_filled_order
- ExecutionService
- run_backtest
- .oxlintrc.json
- Agent Trading OS — Competitive Multi-Agent Trading Laboratory
- tsconfig.json
- ref_vitest_config
- tests/__init__.py
- api/__init__.py
- core/__init__.py
- trading_app/__init__.py
- models/__init__.py
- services/__init__.py
- strategies/__init__.py
- trading-app
- order.py
- rules/graphify.md
- workflows/graphify.md
- src_types_index_scenariokey

## God Nodes (most connected - your core abstractions)
1. `Candle` - 24 edges
2. `runWorkflow()` - 23 edges
3. `RunRecord` - 22 edges
4. `react` - 21 edges
5. `NormalizedMarketSnapshot` - 20 edges
6. `Order` - 18 edges
7. `compilerOptions` - 18 edges
8. `SMACrossStrategy` - 17 edges
9. `loadTraderPortfolio()` - 16 edges
10. `usePaperTrading()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `make_filled_order()` --uses--> `OrderSide`  [INFERRED]
  tests/test_portfolio.py → trading_app/models/order.py
- `make_filled_order()` --uses--> `OrderStatus`  [INFERRED]
  tests/test_portfolio.py → trading_app/models/order.py
- `make_filled_order()` --uses--> `OrderType`  [INFERRED]
  tests/test_portfolio.py → trading_app/models/order.py
- `TestPortfolioService` --uses--> `OrderSide`  [INFERRED]
  tests/test_portfolio.py → trading_app/models/order.py
- `make_candles()` --calls--> `Candle`  [EXTRACTED]
  tests/test_backtest.py → trading_app/models/market_data.py

## Import Cycles
- None detected.

## Communities (40 total, 15 thin omitted)

### Community 0 - "workflow/types.ts"
Cohesion: 0.05
Nodes (88): vitest, AVAILABLE_SKILLS, createCustomAgent(), deleteCustomAgent(), getAgentById(), getAllAgents(), INITIAL_STATS, _inMemoryCustomAgents (+80 more)

### Community 1 - "App.tsx"
Cohesion: 0.07
Nodes (43): react, ref_react_dom_client, @xyflow/react, ref_xyflow_react_dist_style_css, AgentFlowNode, EDGE_TYPES, NODE_LABELS, NODE_TYPES (+35 more)

### Community 2 - "demonstration.test.ts"
Cohesion: 0.09
Nodes (56): PaperTradingWorkspace, PaperTradingWorkspaceProps, PriceChart, PriceChartProps, executePaperTrade(), INITIAL_CASH, INITIAL_PAPER_ACCOUNT, loadPersistedAccount() (+48 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (35): dependencies, react, react-dom, @xyflow/react, devDependencies, oxlint, @types/node, @types/react (+27 more)

### Community 4 - "Candle"
Cohesion: 0.13
Nodes (14): ABC, Candle, BaseModel, Market data models for Trading App., OHLCV candlestick bar., Return the absolute size of the candle body., Return True if candle closed higher than it opened., BaseStrategy (+6 more)

### Community 5 - "SMACrossStrategy"
Cohesion: 0.18
Nodes (8): make_candles(), Tests for the strategy implementations., Build synthetic candles from a price series., TestSMACrossStrategy, Golden cross / death cross strategy. Generates a BUY signal when the short-…, Compute simple moving average over a list of closes., Return BUY on golden cross, SELL on death cross, else HOLD., SMACrossStrategy

### Community 6 - "main.py"
Cohesion: 0.07
Nodes (17): fastapi_responses, fastapi_staticfiles, fastapi_testclient, FileResponse, os, Integration tests for FastAPI routes., TestBacktestEndpoint, TestHealthEndpoint (+9 more)

### Community 7 - "NodeInspector.tsx"
Cohesion: 0.06
Nodes (66): approveExperiment(), evaluateTrader(), loadExperiments(), saveExperiments(), DecisionBundle, runIndependentPhase(), CATEGORIES, computeLeaderboard() (+58 more)

### Community 8 - "execution.py"
Cohesion: 0.14
Nodes (20): random, candles(), list_tickers(), get, quote(), Market data API router., Return the latest simulated quote for a ticker., Return OHLCV candlestick bars for a ticker. (+12 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "services/backtest.py"
Cohesion: 0.13
Nodes (18): math, pydantic, backtest(), BacktestRequest, BaseModel, post, Request body for running a strategy backtest., Run a strategy backtest on simulated historical data. (+10 more)

### Community 11 - "Order"
Cohesion: 0.14
Nodes (17): fastapi, trading_app_api, get_order(), list_orders(), place_order(), get, post, Place a new paper trading order. (+9 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "RSIStrategy"
Cohesion: 0.22
Nodes (5): TestRSIStrategy, RSI-based mean reversion strategy. Generates a BUY signal when RSI drops below…, Compute RSI for the last `period` bars using Wilder smoothing., Return BUY when RSI oversold, SELL when overbought, else HOLD., RSIStrategy

### Community 14 - "PortfolioService"
Cohesion: 0.12
Nodes (10): fixture, portfolio(), Fresh portfolio with $100,000 initial cash., PortfolioService, Update current_price on all positions from a price map., Stateful portfolio manager for paper trading., Return a snapshot of the current portfolio state., Check whether a BUY order is affordable. (+2 more)

### Community 15 - "communication.test.ts"
Cohesion: 0.12
Nodes (21): AgentMessage, AgentMessageType, AgentNodeId, EvidenceReference, ProposalRoundResult, runProposalOnlyRound(), checkWholeShareAffordability(), MarketProfileConfig (+13 more)

### Community 16 - "app.js"
Cohesion: 0.21
Nodes (10): candleData, drawChart(), loadCandles(), loadOrders(), loadPortfolio(), placeOrder(), renderBacktestResults(), renderPositions() (+2 more)

### Community 17 - "Position"
Cohesion: 0.15
Nodes (8): Position, BaseModel, A single open position in the portfolio., Current market value of the position., Total cost basis of the position., Unrealized profit/loss based on current price., Unrealized P&L as a percentage of cost basis., Return the current open position for a ticker, or None.

### Community 18 - "services/portfolio.py"
Cohesion: 0.14
Nodes (13): datetime, Tests for portfolio service., get_portfolio(), get, Portfolio API router., Return the current portfolio state., PortfolioState, Portfolio models for Trading App. (+5 more)

### Community 19 - "make_filled_order"
Cohesion: 0.24
Nodes (3): make_filled_order(), Helper to build a synthetic filled order., TestPortfolioService

### Community 20 - "ExecutionService"
Cohesion: 0.19
Nodes (7): ExecutionService, Return all orders, optionally filtered by ticker., Simulates paper-trading order execution with slippage and commission., Apply random slippage around the base slippage setting., Compute commission based on fill value., Place and immediately attempt to fill a paper trading order., Attempt to fill the order based on order type and market conditions.

### Community 21 - "run_backtest"
Cohesion: 0.28
Nodes (7): pytest, StrategyName, make_candles(), Tests for the backtesting engine., TestBacktest, Replay historical candle bars through a strategy and compute performance…, run_backtest()

### Community 22 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 23 - "Agent Trading OS — Competitive Multi-Agent Trading Laboratory"
Cohesion: 0.04
Nodes (45): 🏛 Architecture, 🤖 Clawbot (OpenClaw) Integration Guide, ⚡ Quickstart Setup, 📋 Ready-to-Use Copy & Paste Prompt for Clawbot, 🛡 Security & Safety Boundaries, Step 1: Start the Backend Service, Step 2: Install the Skill in Clawbot, Step 3: Two-Way Webhooks (Optional) (+37 more)

### Community 36 - "order.py"
Cohesion: 0.27
Nodes (10): Enum, str, OrderSide, OrderStatus, OrderType, Order models for Trading App., Direction of the order., Execution type of the order. (+2 more)

## Knowledge Gaps
- **168 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+163 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 323 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `workflow/types.ts`, `demonstration.test.ts`, `package.json`, `NodeInspector.tsx`, `communication.test.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `vitest` connect `workflow/types.ts` to `demonstration.test.ts`, `package.json`, `NodeInspector.tsx`, `communication.test.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `Candle` connect `Candle` to `SMACrossStrategy`, `execution.py`, `services/backtest.py`, `RSIStrategy`, `run_backtest`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Candle` (e.g. with `candles()` and `run_backtest()`) actually correct?**
  _`Candle` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _168 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `workflow/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05378240169282313 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07207792207792207 - nodes in this community are weakly interconnected._
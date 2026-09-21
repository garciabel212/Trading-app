# Graph Report - trading app  (2026-09-21)

## Corpus Check
- 93 files · ~138,616 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .css 2, (none) 1)

## Summary
- 710 nodes · 1556 edges · 40 communities (25 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `70dd9f63`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- runner.ts
- App.tsx
- usePaperTrading.ts
- package.json
- Candle
- 2. Key Architecture & Milestone 5 Highlights
- main.py
- competition/types.ts
- order.py
- compilerOptions
- market.py
- Order
- compilerOptions
- SMACrossStrategy
- PortfolioService
- backtest
- app.js
- Position
- services/portfolio.py
- make_filled_order
- RSIStrategy
- run_backtest
- .oxlintrc.json
- Agent Trading OS & Algorithmic Trading Platform
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
- config.py
- rules/graphify.md
- workflows/graphify.md
- src_types_index_scenariokey

## God Nodes (most connected - your core abstractions)
1. `Candle` - 24 edges
2. `runWorkflow()` - 23 edges
3. `react` - 20 edges
4. `RunRecord` - 19 edges
5. `Order` - 18 edges
6. `compilerOptions` - 18 edges
7. `SMACrossStrategy` - 17 edges
8. `loadTraderPortfolio()` - 16 edges
9. `NormalizedMarketSnapshot` - 16 edges
10. `usePaperTrading()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `C. Episodic Learning Memory Loop` --references--> `EpisodicMemoryItem`  [INFERRED]
  docs/walkthrough.md → src/agents/types.ts
- `B. Modular Skills Architecture` --references--> `SkillExecutionOutput`  [INFERRED]
  docs/walkthrough.md → src/agents/types.ts
- `make_filled_order()` --uses--> `OrderSide`  [INFERRED]
  tests/test_portfolio.py → trading_app/models/order.py
- `make_filled_order()` --uses--> `OrderStatus`  [INFERRED]
  tests/test_portfolio.py → trading_app/models/order.py
- `make_filled_order()` --uses--> `OrderType`  [INFERRED]
  tests/test_portfolio.py → trading_app/models/order.py

## Import Cycles
- None detected.

## Communities (40 total, 15 thin omitted)

### Community 0 - "runner.ts"
Cohesion: 0.07
Nodes (73): vitest, AVAILABLE_SKILLS, createCustomAgent(), deleteCustomAgent(), getAgentById(), getAllAgents(), INITIAL_STATS, _inMemoryCustomAgents (+65 more)

### Community 1 - "App.tsx"
Cohesion: 0.05
Nodes (58): react, ref_react_dom_client, @xyflow/react, ref_xyflow_react_dist_style_css, PRESET_AGENTS, AgentFlowNode, EDGE_TYPES, NODE_LABELS (+50 more)

### Community 2 - "usePaperTrading.ts"
Cohesion: 0.09
Nodes (52): PaperTradingWorkspace, PaperTradingWorkspaceProps, PriceChart, PriceChartProps, executePaperTrade(), INITIAL_CASH, INITIAL_PAPER_ACCOUNT, loadPersistedAccount() (+44 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (35): dependencies, react, react-dom, @xyflow/react, devDependencies, oxlint, @types/node, @types/react (+27 more)

### Community 4 - "Candle"
Cohesion: 0.13
Nodes (16): ABC, math, Candle, BaseModel, Market data models for Trading App., OHLCV candlestick bar., Return the absolute size of the candle body., Return True if candle closed higher than it opened. (+8 more)

### Community 5 - "2. Key Architecture & Milestone 5 Highlights"
Cohesion: 0.12
Nodes (15): 1. Quickstart Instructions, 2. Key Architecture & Milestone 5 Highlights, 3. Visual Demonstration & Screenshots, 4. Automated Test Suite Results, 5. Verification Checklist, A. Agent Studio & Training Registry, A. Complete Replay Trace with Custom Agent & 8 Pipeline Nodes, Agent Trading OS — Milestone 5 Walkthrough: Agent Studio, Modular Skills & Episodic Learning Memory Loop (+7 more)

### Community 6 - "main.py"
Cohesion: 0.07
Nodes (18): fastapi_responses, fastapi_staticfiles, fastapi_testclient, FileResponse, os, pytest, Integration tests for FastAPI routes., TestBacktestEndpoint (+10 more)

### Community 7 - "competition/types.ts"
Cohesion: 0.07
Nodes (67): approveExperiment(), evaluateTrader(), loadExperiments(), saveExperiments(), DecisionBundle, runIndependentPhase(), CATEGORIES, computeLeaderboard() (+59 more)

### Community 8 - "order.py"
Cohesion: 0.22
Nodes (12): Enum, random, str, OrderSide, OrderStatus, OrderType, Order models for Trading App., Direction of the order. (+4 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "market.py"
Cohesion: 0.13
Nodes (21): fastapi, trading_app_api, candles(), list_tickers(), get, quote(), Market data API router., Return the latest simulated quote for a ticker. (+13 more)

### Community 11 - "Order"
Cohesion: 0.10
Nodes (21): get_order(), list_orders(), place_order(), get, post, Place a new paper trading order., Return all orders, optionally filtered by ticker., Return a specific order by ID. (+13 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "SMACrossStrategy"
Cohesion: 0.19
Nodes (7): make_candles(), Build synthetic candles from a price series., TestSMACrossStrategy, Golden cross / death cross strategy. Generates a BUY signal when the short-…, Compute simple moving average over a list of closes., Return BUY on golden cross, SELL on death cross, else HOLD., SMACrossStrategy

### Community 14 - "PortfolioService"
Cohesion: 0.12
Nodes (10): fixture, portfolio(), Fresh portfolio with $100,000 initial cash., PortfolioService, Update current_price on all positions from a price map., Stateful portfolio manager for paper trading., Return a snapshot of the current portfolio state., Check whether a BUY order is affordable. (+2 more)

### Community 15 - "backtest"
Cohesion: 0.18
Nodes (11): backtest(), BacktestRequest, BaseModel, post, Request body for running a strategy backtest., Run a strategy backtest on simulated historical data., BacktestResult, BaseModel (+3 more)

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

### Community 20 - "RSIStrategy"
Cohesion: 0.19
Nodes (6): Tests for the strategy implementations., TestRSIStrategy, RSI-based mean reversion strategy. Generates a BUY signal when RSI drops below…, Compute RSI for the last `period` bars using Wilder smoothing., Return BUY when RSI oversold, SELL when overbought, else HOLD., RSIStrategy

### Community 21 - "run_backtest"
Cohesion: 0.32
Nodes (6): StrategyName, make_candles(), Tests for the backtesting engine., TestBacktest, Replay historical candle bars through a strategy and compute performance…, run_backtest()

### Community 22 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 23 - "Agent Trading OS & Algorithmic Trading Platform"
Cohesion: 0.18
Nodes (10): 1. Agent Trading OS (Frontend Workspace), 2. Python FastAPI Backend, 3. Quickstart Guide, 4. Graphify Knowledge Graph, 🔬 Agent Lab, Agent Trading OS & Algorithmic Trading Platform, Architecture Overview, Backend (FastAPI Service) (+2 more)

### Community 36 - "config.py"
Cohesion: 0.33
Nodes (5): pydantic, BaseModel, Configuration settings for Trading App., Global application settings., Settings

## Knowledge Gaps
- **137 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 293 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `runner.ts`, `usePaperTrading.ts`, `package.json`, `competition/types.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `Candle` connect `Candle` to `SMACrossStrategy`, `market.py`, `RSIStrategy`, `run_backtest`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Candle` (e.g. with `candles()` and `run_backtest()`) actually correct?**
  _`Candle` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `Order` (e.g. with `get_order()` and `list_orders()`) actually correct?**
  _`Order` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _137 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `runner.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06566791510611736 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05092276144907724 - nodes in this community are weakly interconnected._
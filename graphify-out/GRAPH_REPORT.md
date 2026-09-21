# Graph Report - trading app  (2026-09-21)

## Corpus Check
- 81 files · ~128,624 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .css 2, (none) 1)

## Summary
- 629 nodes · 1288 edges · 38 communities (23 shown, 15 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b6f0d95a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- runner.ts
- App.tsx
- usePaperTrading.ts
- package.json
- Candle
- 2. Key Architecture & Milestone 5 Highlights
- test_api.py
- agents.test.ts
- order.py
- compilerOptions
- market.py
- Order
- compilerOptions
- main.py
- PortfolioService
- api/backtest.py
- app.js
- Position
- PortfolioState
- make_filled_order
- serve_dashboard
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
- rules/graphify.md
- workflows/graphify.md
- src_types_index_scenariokey

## God Nodes (most connected - your core abstractions)
1. `Candle` - 24 edges
2. `runWorkflow()` - 23 edges
3. `react` - 19 edges
4. `RunRecord` - 19 edges
5. `Order` - 18 edges
6. `compilerOptions` - 18 edges
7. `SMACrossStrategy` - 17 edges
8. `usePaperTrading()` - 16 edges
9. `PortfolioService` - 15 edges
10. `RSIStrategy` - 15 edges

## Surprising Connections (you probably didn't know these)
- `B. Modular Skills Architecture` --references--> `SkillExecutionOutput`  [INFERRED]
  docs/walkthrough.md → src/agents/types.ts
- `C. Episodic Learning Memory Loop` --references--> `EpisodicMemoryItem`  [INFERRED]
  docs/walkthrough.md → src/agents/types.ts
- `make_filled_order()` --uses--> `OrderSide`  [INFERRED]
  tests/test_portfolio.py → trading_app/models/order.py
- `make_filled_order()` --uses--> `OrderStatus`  [INFERRED]
  tests/test_portfolio.py → trading_app/models/order.py
- `make_filled_order()` --uses--> `OrderType`  [INFERRED]
  tests/test_portfolio.py → trading_app/models/order.py

## Import Cycles
- None detected.

## Communities (38 total, 15 thin omitted)

### Community 0 - "runner.ts"
Cohesion: 0.05
Nodes (79): buildEpisodicReflection(), MemoryQueryOutput, SkillExecutionOutput, App(), ActivityStrip, ActivityStripProps, BottomCommandStripProps, EventTimeline (+71 more)

### Community 1 - "App.tsx"
Cohesion: 0.09
Nodes (26): react, ref_react_dom_client, @xyflow/react, ref_xyflow_react_dist_style_css, AgentFlowNode, EDGE_TYPES, NODE_LABELS, NODE_TYPES (+18 more)

### Community 2 - "usePaperTrading.ts"
Cohesion: 0.09
Nodes (52): PaperTradingWorkspace, PaperTradingWorkspaceProps, PriceChart, PriceChartProps, executePaperTrade(), INITIAL_CASH, INITIAL_PAPER_ACCOUNT, loadPersistedAccount() (+44 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (36): dependencies, react, react-dom, @xyflow/react, devDependencies, oxlint, @types/node, @types/react (+28 more)

### Community 4 - "Candle"
Cohesion: 0.05
Nodes (38): ABC, StrategyName, make_candles(), Tests for the backtesting engine., TestBacktest, make_candles(), Tests for the strategy implementations., Build synthetic candles from a price series. (+30 more)

### Community 5 - "2. Key Architecture & Milestone 5 Highlights"
Cohesion: 0.13
Nodes (14): 1. Quickstart Instructions, 2. Key Architecture & Milestone 5 Highlights, 3. Visual Demonstration & Screenshots, 4. Automated Test Suite Results, 5. Verification Checklist, A. Agent Studio & Training Registry, A. Complete Replay Trace with Custom Agent & 8 Pipeline Nodes, Agent Trading OS — Milestone 5 Walkthrough: Agent Studio, Modular Skills & Episodic Learning Memory Loop (+6 more)

### Community 6 - "test_api.py"
Cohesion: 0.10
Nodes (8): fastapi_testclient, pytest, Integration tests for FastAPI routes., TestBacktestEndpoint, TestHealthEndpoint, TestMarketEndpoints, TestOrdersEndpoint, TestPortfolioEndpoint

### Community 7 - "agents.test.ts"
Cohesion: 0.14
Nodes (30): C. Episodic Learning Memory Loop, AVAILABLE_SKILLS, createCustomAgent(), deleteCustomAgent(), getAgentById(), getAllAgents(), INITIAL_STATS, _inMemoryCustomAgents (+22 more)

### Community 8 - "order.py"
Cohesion: 0.20
Nodes (16): datetime, Enum, str, Tests for portfolio service., OrderSide, OrderStatus, OrderType, Order models for Trading App. (+8 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "market.py"
Cohesion: 0.13
Nodes (20): math, random, candles(), list_tickers(), get, quote(), Market data API router., Return the latest simulated quote for a ticker. (+12 more)

### Community 11 - "Order"
Cohesion: 0.10
Nodes (21): get_order(), list_orders(), place_order(), get, post, Place a new paper trading order., Return all orders, optionally filtered by ticker., Return a specific order by ID. (+13 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "main.py"
Cohesion: 0.16
Nodes (11): fastapi, fastapi_responses, fastapi_staticfiles, os, trading_app_api, get_portfolio(), get, Portfolio API router. (+3 more)

### Community 14 - "PortfolioService"
Cohesion: 0.14
Nodes (9): fixture, portfolio(), Fresh portfolio with $100,000 initial cash., PortfolioService, Update current_price on all positions from a price map., Stateful portfolio manager for paper trading., Check whether a BUY order is affordable., Check whether a SELL order has enough shares. (+1 more)

### Community 15 - "api/backtest.py"
Cohesion: 0.18
Nodes (11): pydantic, backtest(), BacktestRequest, BaseModel, post, Request body for running a strategy backtest., Run a strategy backtest on simulated historical data., BaseModel (+3 more)

### Community 16 - "app.js"
Cohesion: 0.21
Nodes (10): candleData, drawChart(), loadCandles(), loadOrders(), loadPortfolio(), placeOrder(), renderBacktestResults(), renderPositions() (+2 more)

### Community 17 - "Position"
Cohesion: 0.15
Nodes (8): Position, BaseModel, A single open position in the portfolio., Current market value of the position., Total cost basis of the position., Unrealized profit/loss based on current price., Unrealized P&L as a percentage of cost basis., Return the current open position for a ticker, or None.

### Community 18 - "PortfolioState"
Cohesion: 0.20
Nodes (6): PortfolioState, Full snapshot of the portfolio at a point in time., Sum of market value across all open positions., Total account equity: cash + market value of positions., Combined unrealized P&L across all positions., Return a snapshot of the current portfolio state.

### Community 19 - "make_filled_order"
Cohesion: 0.24
Nodes (3): make_filled_order(), Helper to build a synthetic filled order., TestPortfolioService

### Community 20 - "serve_dashboard"
Cohesion: 0.33
Nodes (6): FileResponse, health_check(), get, Serve the trading dashboard., Simple health check endpoint., serve_dashboard()

### Community 22 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 23 - "Agent Trading OS & Algorithmic Trading Platform"
Cohesion: 0.18
Nodes (10): 1. Agent Trading OS (Frontend Workspace), 2. Python FastAPI Backend, 3. Quickstart Guide, 4. Graphify Knowledge Graph, 🔬 Agent Lab, Agent Trading OS & Algorithmic Trading Platform, Architecture Overview, Backend (FastAPI Service) (+2 more)

## Knowledge Gaps
- **124 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+119 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 276 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `runner.ts`, `usePaperTrading.ts`, `package.json`, `agents.test.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `Candle` connect `Candle` to `market.py`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `2. Key Architecture & Milestone 5 Highlights` connect `2. Key Architecture & Milestone 5 Highlights` to `agents.test.ts`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Candle` (e.g. with `candles()` and `run_backtest()`) actually correct?**
  _`Candle` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `Order` (e.g. with `get_order()` and `list_orders()`) actually correct?**
  _`Order` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _124 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `runner.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0533028745478774 - nodes in this community are weakly interconnected._
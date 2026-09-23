# Graph Report - trading app  (2026-09-23)

## Corpus Check
- 96 files · ~141,279 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .css 2, (none) 1)

## Summary
- 736 nodes · 1614 edges · 44 communities (29 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fe464675`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- runner.ts
- App.tsx
- demonstration.test.ts
- package.json
- Candle
- SMACrossStrategy
- main.py
- competition/types.ts
- market.py
- compilerOptions
- api/backtest.py
- Order
- compilerOptions
- RSIStrategy
- PortfolioService
- index.ts
- app.js
- Position
- order.py
- make_filled_order
- AgentNode.tsx
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
- NodeInspector.tsx
- replay.ts
- rules/graphify.md
- workflows/graphify.md
- src_types_index_scenariokey
- useDemoRunner.ts
- TopBar.tsx
- EventTimeline.tsx

## God Nodes (most connected - your core abstractions)
1. `Candle` - 24 edges
2. `runWorkflow()` - 23 edges
3. `react` - 20 edges
4. `RunRecord` - 19 edges
5. `Order` - 18 edges
6. `compilerOptions` - 18 edges
7. `NormalizedMarketSnapshot` - 17 edges
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

## Communities (44 total, 15 thin omitted)

### Community 0 - "runner.ts"
Cohesion: 0.07
Nodes (67): vitest, AVAILABLE_SKILLS, createCustomAgent(), deleteCustomAgent(), getAgentById(), getAllAgents(), INITIAL_STATS, _inMemoryCustomAgents (+59 more)

### Community 1 - "App.tsx"
Cohesion: 0.15
Nodes (15): react, ref_react_dom_client, @xyflow/react, ref_xyflow_react_dist_style_css, AgentFlowNode, EDGE_TYPES, NODE_LABELS, NODE_TYPES (+7 more)

### Community 2 - "demonstration.test.ts"
Cohesion: 0.09
Nodes (56): PaperTradingWorkspace, PaperTradingWorkspaceProps, PriceChart, PriceChartProps, executePaperTrade(), INITIAL_CASH, INITIAL_PAPER_ACCOUNT, loadPersistedAccount() (+48 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (35): dependencies, react, react-dom, @xyflow/react, devDependencies, oxlint, @types/node, @types/react (+27 more)

### Community 4 - "Candle"
Cohesion: 0.14
Nodes (16): ABC, Tests for the strategy implementations., Candle, Market data models for Trading App., OHLCV candlestick bar., Return the absolute size of the candle body., Return True if candle closed higher than it opened., Backtesting engine for Trading App strategies. (+8 more)

### Community 5 - "SMACrossStrategy"
Cohesion: 0.20
Nodes (5): TestSMACrossStrategy, Golden cross / death cross strategy. Generates a BUY signal when the short-…, Compute simple moving average over a list of closes., Return BUY on golden cross, SELL on death cross, else HOLD., SMACrossStrategy

### Community 6 - "main.py"
Cohesion: 0.07
Nodes (17): fastapi_responses, fastapi_staticfiles, fastapi_testclient, FileResponse, os, Integration tests for FastAPI routes., TestBacktestEndpoint, TestHealthEndpoint (+9 more)

### Community 7 - "competition/types.ts"
Cohesion: 0.07
Nodes (63): approveExperiment(), evaluateTrader(), loadExperiments(), saveExperiments(), DecisionBundle, runIndependentPhase(), CATEGORIES, computeLeaderboard() (+55 more)

### Community 8 - "market.py"
Cohesion: 0.13
Nodes (20): math, random, candles(), list_tickers(), get, quote(), Market data API router., Return the latest simulated quote for a ticker. (+12 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "api/backtest.py"
Cohesion: 0.11
Nodes (18): fastapi, pydantic, trading_app_api, backtest(), BacktestRequest, BaseModel, post, Request body for running a strategy backtest. (+10 more)

### Community 11 - "Order"
Cohesion: 0.10
Nodes (21): get_order(), list_orders(), place_order(), get, post, Place a new paper trading order., Return all orders, optionally filtered by ticker., Return a specific order by ID. (+13 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "RSIStrategy"
Cohesion: 0.20
Nodes (7): make_candles(), Build synthetic candles from a price series., TestRSIStrategy, RSI-based mean reversion strategy. Generates a BUY signal when RSI drops below…, Compute RSI for the last `period` bars using Wilder smoothing., Return BUY when RSI oversold, SELL when overbought, else HOLD., RSIStrategy

### Community 14 - "PortfolioService"
Cohesion: 0.12
Nodes (10): fixture, portfolio(), Fresh portfolio with $100,000 initial cash., PortfolioService, Update current_price on all positions from a price map., Stateful portfolio manager for paper trading., Return a snapshot of the current portfolio state., Check whether a BUY order is affordable. (+2 more)

### Community 15 - "index.ts"
Cohesion: 0.36
Nodes (7): ActivityStrip, ActivityStripProps, BottomCommandStripProps, UseDemoRunnerOptions, ActivityEvent, EdgeKind, RunRecord

### Community 16 - "app.js"
Cohesion: 0.21
Nodes (10): candleData, drawChart(), loadCandles(), loadOrders(), loadPortfolio(), placeOrder(), renderBacktestResults(), renderPositions() (+2 more)

### Community 17 - "Position"
Cohesion: 0.15
Nodes (8): Position, BaseModel, A single open position in the portfolio., Current market value of the position., Total cost basis of the position., Unrealized profit/loss based on current price., Unrealized P&L as a percentage of cost basis., Return the current open position for a ticker, or None.

### Community 18 - "order.py"
Cohesion: 0.12
Nodes (20): datetime, Enum, str, Tests for portfolio service., OrderSide, OrderStatus, OrderType, Order models for Trading App. (+12 more)

### Community 19 - "make_filled_order"
Cohesion: 0.24
Nodes (3): make_filled_order(), Helper to build a synthetic filled order., TestPortfolioService

### Community 20 - "AgentNode.tsx"
Cohesion: 0.40
Nodes (4): AgentNode, KIND_ICONS, KIND_ROLES, NodeKind

### Community 21 - "run_backtest"
Cohesion: 0.18
Nodes (12): pytest, StrategyName, make_candles(), Tests for the backtesting engine., TestBacktest, BacktestResult, BaseModel, Record of a single simulated backtest trade. (+4 more)

### Community 22 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 23 - "Agent Trading OS — Competitive Multi-Agent Trading Laboratory"
Cohesion: 0.04
Nodes (45): 🏛 Architecture, 🤖 Clawbot (OpenClaw) Integration Guide, ⚡ Quickstart Setup, 📋 Ready-to-Use Copy & Paste Prompt for Clawbot, 🛡 Security & Safety Boundaries, Step 1: Start the Backend Service, Step 2: Install the Skill in Clawbot, Step 3: Two-Way Webhooks (Optional) (+37 more)

### Community 36 - "NodeInspector.tsx"
Cohesion: 0.17
Nodes (10): KIND_ICONS, KIND_LABELS, NodeInspector, NodeInspectorProps, TraceSection(), TraceSectionProps, AgentNodeData, deriveNodeInspectorTrace() (+2 more)

### Community 37 - "replay.ts"
Cohesion: 0.27
Nodes (10): App(), AgentFlowNode, deriveActivityEvents(), deriveEdgeStates(), deriveNodeStates(), deriveReplaySnapshot(), EDGE_FOR_NODE, NodePointInTimeTrace (+2 more)

### Community 41 - "useDemoRunner.ts"
Cohesion: 0.24
Nodes (10): INITIAL_EDGES, INITIAL_NODES, INITIAL_STATUSES, AgentFlowNode, EDGE_FOR_NODE, resetEdges(), resetNodes(), traceEventToNodeStatus() (+2 more)

### Community 42 - "TopBar.tsx"
Cohesion: 0.36
Nodes (6): Navigation, NavigationProps, WorkspaceId, SCENARIO_LABELS, TopBar, TopBarProps

### Community 43 - "EventTimeline.tsx"
Cohesion: 0.40
Nodes (5): EventTimeline, EventTimelineProps, eventTypeBadge(), NODE_SHORT_LABELS, TraceEventType

## Knowledge Gaps
- **157 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+152 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 311 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `runner.ts`, `demonstration.test.ts`, `package.json`, `NodeInspector.tsx`, `competition/types.ts`, `useDemoRunner.ts`, `TopBar.tsx`, `EventTimeline.tsx`, `index.ts`, `AgentNode.tsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `vitest` connect `runner.ts` to `demonstration.test.ts`, `package.json`, `competition/types.ts`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `Candle` connect `Candle` to `market.py`, `RSIStrategy`, `SMACrossStrategy`, `run_backtest`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Candle` (e.g. with `candles()` and `run_backtest()`) actually correct?**
  _`Candle` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `Order` (e.g. with `get_order()` and `list_orders()`) actually correct?**
  _`Order` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _157 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `runner.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07056798623063683 - nodes in this community are weakly interconnected._
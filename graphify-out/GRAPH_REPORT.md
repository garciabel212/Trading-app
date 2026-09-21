# Graph Report - trading app  (2026-09-21)

## Corpus Check
- 80 files · ~127,259 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .css 2, (none) 1)

## Summary
- 622 nodes · 1254 edges · 41 communities (26 shown, 15 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a68d4fad`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- runner.ts
- App.tsx
- account.ts
- package.json
- Candle
- 2. Key Architecture & Milestone 5 Highlights
- main.py
- RunRecord
- order.py
- compilerOptions
- execution.py
- Order
- compilerOptions
- workflow/types.ts
- PortfolioService
- services/backtest.py
- app.js
- Position
- index.ts
- make_filled_order
- ExecutionService
- NodeInspector.tsx
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
- react
- useDemoRunner.ts
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
8. `PortfolioService` - 15 edges
9. `RSIStrategy` - 15 edges
10. `compilerOptions` - 15 edges

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

## Communities (41 total, 15 thin omitted)

### Community 0 - "runner.ts"
Cohesion: 0.08
Nodes (59): vitest, AVAILABLE_SKILLS, createCustomAgent(), deleteCustomAgent(), getAgentById(), getAllAgents(), INITIAL_STATS, _inMemoryCustomAgents (+51 more)

### Community 1 - "App.tsx"
Cohesion: 0.12
Nodes (19): ref_react_dom_client, ref_xyflow_react_dist_style_css, AgentFlowNode, App(), EDGE_TYPES, NODE_LABELS, NODE_TYPES, AnimatedEdge (+11 more)

### Community 2 - "account.ts"
Cohesion: 0.10
Nodes (46): PaperTradingWorkspace, PaperTradingWorkspaceProps, PriceChart, PriceChartProps, executePaperTrade(), INITIAL_CASH, INITIAL_PAPER_ACCOUNT, loadPersistedAccount() (+38 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (35): dependencies, react, react-dom, @xyflow/react, devDependencies, oxlint, @types/node, @types/react (+27 more)

### Community 4 - "Candle"
Cohesion: 0.05
Nodes (35): ABC, StrategyName, make_candles(), Tests for the backtesting engine., TestBacktest, make_candles(), Tests for the strategy implementations., Build synthetic candles from a price series. (+27 more)

### Community 5 - "2. Key Architecture & Milestone 5 Highlights"
Cohesion: 0.12
Nodes (15): 1. Quickstart Instructions, 2. Key Architecture & Milestone 5 Highlights, 3. Visual Demonstration & Screenshots, 4. Automated Test Suite Results, 5. Verification Checklist, A. Agent Studio & Training Registry, A. Complete Replay Trace with Custom Agent & 8 Pipeline Nodes, Agent Trading OS — Milestone 5 Walkthrough: Agent Studio, Modular Skills & Episodic Learning Memory Loop (+7 more)

### Community 6 - "main.py"
Cohesion: 0.07
Nodes (18): fastapi_responses, fastapi_staticfiles, fastapi_testclient, FileResponse, os, pytest, Integration tests for FastAPI routes., TestBacktestEndpoint (+10 more)

### Community 7 - "RunRecord"
Cohesion: 0.19
Nodes (12): ActivityStrip, ActivityStripProps, BottomCommandStrip, BottomCommandStripProps, EventTimeline, EventTimelineProps, eventTypeBadge(), NODE_SHORT_LABELS (+4 more)

### Community 8 - "order.py"
Cohesion: 0.11
Nodes (22): Enum, str, Tests for portfolio service., get_portfolio(), get, Portfolio API router., Return the current portfolio state., OrderSide (+14 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "execution.py"
Cohesion: 0.16
Nodes (18): datetime, random, candles(), list_tickers(), get, quote(), Market data API router., Return the latest simulated quote for a ticker. (+10 more)

### Community 11 - "Order"
Cohesion: 0.14
Nodes (17): fastapi, trading_app_api, get_order(), list_orders(), place_order(), get, post, Place a new paper trading order. (+9 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "workflow/types.ts"
Cohesion: 0.20
Nodes (13): AgentFlowNode, deriveReplaySnapshot(), EDGE_FOR_NODE, NodePointInTimeTrace, RiskDecisionBreakdown, AnalystOutput, Approval, EvaluationCheck (+5 more)

### Community 14 - "PortfolioService"
Cohesion: 0.12
Nodes (10): fixture, portfolio(), Fresh portfolio with $100,000 initial cash., PortfolioService, Update current_price on all positions from a price map., Stateful portfolio manager for paper trading., Return a snapshot of the current portfolio state., Check whether a BUY order is affordable. (+2 more)

### Community 15 - "services/backtest.py"
Cohesion: 0.12
Nodes (19): math, pydantic, backtest(), BacktestRequest, BaseModel, post, Request body for running a strategy backtest., Run a strategy backtest on simulated historical data. (+11 more)

### Community 16 - "app.js"
Cohesion: 0.21
Nodes (10): candleData, drawChart(), loadCandles(), loadOrders(), loadPortfolio(), placeOrder(), renderBacktestResults(), renderPositions() (+2 more)

### Community 17 - "Position"
Cohesion: 0.15
Nodes (8): Position, BaseModel, A single open position in the portfolio., Current market value of the position., Total cost basis of the position., Unrealized profit/loss based on current price., Unrealized P&L as a percentage of cost basis., Return the current open position for a ticker, or None.

### Community 18 - "index.ts"
Cohesion: 0.26
Nodes (9): @xyflow/react, AgentNode, KIND_ICONS, KIND_ROLES, INITIAL_STATUSES, AgentNodeData, EdgeKind, NodeKind (+1 more)

### Community 19 - "make_filled_order"
Cohesion: 0.24
Nodes (3): make_filled_order(), Helper to build a synthetic filled order., TestPortfolioService

### Community 20 - "ExecutionService"
Cohesion: 0.19
Nodes (7): ExecutionService, Return all orders, optionally filtered by ticker., Simulates paper-trading order execution with slippage and commission., Apply random slippage around the base slippage setting., Compute commission based on fill value., Place and immediately attempt to fill a paper trading order., Attempt to fill the order based on order type and market conditions.

### Community 21 - "NodeInspector.tsx"
Cohesion: 0.19
Nodes (8): KIND_ICONS, KIND_LABELS, NodeInspector, NodeInspectorProps, TraceSection(), TraceSectionProps, deriveNodeInspectorTrace(), TraceEvent

### Community 22 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 23 - "Agent Trading OS & Algorithmic Trading Platform"
Cohesion: 0.18
Nodes (10): 1. Agent Trading OS (Frontend Workspace), 2. Python FastAPI Backend, 3. Quickstart Guide, 4. Graphify Knowledge Graph, 🔬 Agent Lab, Agent Trading OS & Algorithmic Trading Platform, Architecture Overview, Backend (FastAPI Service) (+2 more)

### Community 36 - "react"
Cohesion: 0.36
Nodes (7): react, Navigation, NavigationProps, WorkspaceId, SCENARIO_LABELS, TopBarProps, ScenarioKey

### Community 37 - "useDemoRunner.ts"
Cohesion: 0.31
Nodes (8): INITIAL_EDGES, INITIAL_NODES, AgentFlowNode, EDGE_FOR_NODE, resetEdges(), resetNodes(), traceEventToNodeStatus(), useDemoRunner()

## Knowledge Gaps
- **122 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 274 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `runner.ts`, `App.tsx`, `account.ts`, `package.json`, `useDemoRunner.ts`, `RunRecord`, `index.ts`, `NodeInspector.tsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `Candle` connect `Candle` to `execution.py`, `services/backtest.py`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Order` connect `Order` to `order.py`, `execution.py`, `PortfolioService`, `make_filled_order`, `ExecutionService`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Candle` (e.g. with `candles()` and `run_backtest()`) actually correct?**
  _`Candle` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `Order` (e.g. with `get_order()` and `list_orders()`) actually correct?**
  _`Order` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _122 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `runner.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0763963963963964 - nodes in this community are weakly interconnected._
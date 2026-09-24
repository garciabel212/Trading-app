# Graph Report - trading app  (2026-09-24)

## Corpus Check
- 118 files · ~261,190 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: .csv 4, .css 2, (none) 1)

## Summary
- 933 nodes · 2097 edges · 54 communities (38 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4515eda4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- replay.ts
- App.tsx
- demonstration.test.ts
- package.json
- Candle
- RSIStrategy
- main.py
- competition/types.ts
- market.py
- compilerOptions
- services/backtest.py
- Order
- compilerOptions
- runner.ts
- PortfolioService
- useReplayRunner.ts
- app.js
- workflow/types.ts
- order.py
- make_filled_order
- ONEQ Learned Trading Strategy — Research Experiment Walkthrough
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
- train.py
- rules/graphify.md
- workflows/graphify.md
- src_types_index_scenariokey
- EventTimeline.tsx
- agents.test.ts
- data.py
- load_and_validate_oneq_bars
- test_oneq_research.py
- ONEQPredictor
- SMACrossStrategy
- run_experiment.py
- services/portfolio.py
- Position
- orders.py
- predict_proposal
- train_and_select_model
- TestONEQFastAPI

## God Nodes (most connected - your core abstractions)
1. `runWorkflow()` - 25 edges
2. `Candle` - 24 edges
3. `react` - 22 edges
4. `RunRecord` - 22 edges
5. `NormalizedMarketSnapshot` - 21 edges
6. `load_and_validate_oneq_bars()` - 19 edges
7. `Order` - 18 edges
8. `ONEQPredictor` - 18 edges
9. `compilerOptions` - 18 edges
10. `generate_research_report()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `2. Research Package Modules (`trading_app/research/oneq/`)` --references--> `StructuredPrediction`  [INFERRED]
  docs/oneq_learned_strategy_walkthrough.md → src/competition/messageTypes.ts
- `TestONEQFeatures` --uses--> `ONEQPredictor`  [INFERRED]
  tests/test_oneq_research.py → trading_app/research/oneq/predict.py
- `make_filled_order()` --uses--> `OrderSide`  [INFERRED]
  tests/test_portfolio.py → trading_app/models/order.py
- `make_filled_order()` --uses--> `OrderStatus`  [INFERRED]
  tests/test_portfolio.py → trading_app/models/order.py
- `make_filled_order()` --uses--> `OrderType`  [INFERRED]
  tests/test_portfolio.py → trading_app/models/order.py

## Import Cycles
- None detected.

## Communities (54 total, 16 thin omitted)

### Community 0 - "replay.ts"
Cohesion: 0.11
Nodes (30): App(), PLAYBACK_STEP_MS, useReplayRunner(), mountReplayHook(), TestComponent(), setupDomHarness(), VALID_WEATHER_SNAPSHOT, freshAdapter() (+22 more)

### Community 1 - "App.tsx"
Cohesion: 0.05
Nodes (56): react, ref_react_dom_client, @xyflow/react, ref_xyflow_react_dist_style_css, AgentFlowNode, EDGE_TYPES, NODE_LABELS, NODE_TYPES (+48 more)

### Community 2 - "demonstration.test.ts"
Cohesion: 0.08
Nodes (62): vitest, PaperTradingWorkspace, PaperTradingWorkspaceProps, PriceChart, PriceChartProps, executePaperTrade(), INITIAL_CASH, INITIAL_PAPER_ACCOUNT (+54 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (35): dependencies, react, react-dom, @xyflow/react, devDependencies, oxlint, @types/node, @types/react (+27 more)

### Community 4 - "Candle"
Cohesion: 0.14
Nodes (14): ABC, Candle, Market data models for Trading App., OHLCV candlestick bar., Return the absolute size of the candle body., Return True if candle closed higher than it opened., BaseStrategy, Base strategy interface for Trading App strategies. (+6 more)

### Community 5 - "RSIStrategy"
Cohesion: 0.19
Nodes (6): Tests for the strategy implementations., TestRSIStrategy, RSI-based mean reversion strategy. Generates a BUY signal when RSI drops below…, Compute RSI for the last `period` bars using Wilder smoothing., Return BUY when RSI oversold, SELL when overbought, else HOLD., RSIStrategy

### Community 6 - "main.py"
Cohesion: 0.07
Nodes (18): fastapi_responses, fastapi_staticfiles, fastapi_testclient, FileResponse, os, pytest, Integration tests for FastAPI routes., TestBacktestEndpoint (+10 more)

### Community 7 - "competition/types.ts"
Cohesion: 0.07
Nodes (62): approveExperiment(), evaluateTrader(), loadExperiments(), saveExperiments(), DecisionBundle, runIndependentPhase(), CATEGORIES, computeLeaderboard() (+54 more)

### Community 8 - "market.py"
Cohesion: 0.13
Nodes (20): math, random, candles(), list_tickers(), get, quote(), Market data API router., Return the latest simulated quote for a ticker. (+12 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "services/backtest.py"
Cohesion: 0.14
Nodes (17): pydantic, backtest(), BacktestRequest, BaseModel, post, Request body for running a strategy backtest., Run a strategy backtest on simulated historical data., BaseModel (+9 more)

### Community 11 - "Order"
Cohesion: 0.12
Nodes (16): place_order(), post, Place a new paper trading order., Order, OrderRequest, BaseModel, Represents a trading order., Return True if the order is in a terminal state. (+8 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "runner.ts"
Cohesion: 0.26
Nodes (15): buildEpisodicReflection(), queryRelevantMemories(), completeEvent(), newEventId(), newRunId(), runWorkflow(), skippedEvent(), startEvent() (+7 more)

### Community 14 - "PortfolioService"
Cohesion: 0.12
Nodes (10): portfolio(), fixture, Fresh portfolio with $100,000 initial cash., PortfolioService, Update current_price on all positions from a price map., Stateful portfolio manager for paper trading., Return a snapshot of the current portfolio state., Check whether a BUY order is affordable. (+2 more)

### Community 15 - "useReplayRunner.ts"
Cohesion: 0.22
Nodes (16): AgentMessage, AgentMessageType, AgentNodeId, EvidenceReference, StructuredPrediction, ProposalRoundResult, runProposalOnlyRound(), checkWholeShareAffordability() (+8 more)

### Community 16 - "app.js"
Cohesion: 0.21
Nodes (10): candleData, drawChart(), loadCandles(), loadOrders(), loadPortfolio(), placeOrder(), renderBacktestResults(), renderPositions() (+2 more)

### Community 17 - "workflow/types.ts"
Cohesion: 0.23
Nodes (14): addEpisodicMemory(), clearAgentMemories(), _inMemoryAllMemories, loadAllMemories(), saveAllMemories(), MemoryQueryOutput, AnalystOutput, EvaluationCheck (+6 more)

### Community 18 - "order.py"
Cohesion: 0.24
Nodes (11): Enum, str, OrderSide, OrderStatus, OrderType, Order models for Trading App., Direction of the order., Execution type of the order. (+3 more)

### Community 19 - "make_filled_order"
Cohesion: 0.24
Nodes (3): make_filled_order(), Helper to build a synthetic filled order., TestPortfolioService

### Community 20 - "ONEQ Learned Trading Strategy — Research Experiment Walkthrough"
Cohesion: 0.25
Nodes (7): 1. High-Level Architecture & Workflow, 2. Research Package Modules (`trading_app/research/oneq/`), 3. Causal Invariance Verification (Spotlight: `report.py:L20-48`), 4. Empirical Experiment Findings on Real ONEQ 5-Minute Bars, 5. Agent Communication Bubbles Routing, 6. How to Run and Verify Locally, ONEQ Learned Trading Strategy — Research Experiment Walkthrough

### Community 21 - "run_backtest"
Cohesion: 0.32
Nodes (6): StrategyName, make_candles(), Tests for the backtesting engine., TestBacktest, Replay historical candle bars through a strategy and compute performance…, run_backtest()

### Community 22 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 23 - "Agent Trading OS — Competitive Multi-Agent Trading Laboratory"
Cohesion: 0.04
Nodes (45): 🏛 Architecture, 🤖 Clawbot (OpenClaw) Integration Guide, ⚡ Quickstart Setup, 📋 Ready-to-Use Copy & Paste Prompt for Clawbot, 🛡 Security & Safety Boundaries, Step 1: Start the Backend Service, Step 2: Install the Skill in Clawbot, Step 3: Two-Way Webhooks (Optional) (+37 more)

### Community 36 - "train.py"
Cohesion: 0.11
Nodes (26): dataclasses, joblib, json, numpy, pandas, pathlib, sklearn_linear_model, sklearn_pipeline (+18 more)

### Community 41 - "EventTimeline.tsx"
Cohesion: 0.40
Nodes (5): EventTimeline, EventTimelineProps, eventTypeBadge(), NODE_SHORT_LABELS, TraceEventType

### Community 42 - "agents.test.ts"
Cohesion: 0.16
Nodes (24): AVAILABLE_SKILLS, createCustomAgent(), deleteCustomAgent(), getAgentById(), getAllAgents(), INITIAL_STATS, _inMemoryCustomAgents, loadCustomAgents() (+16 more)

### Community 43 - "data.py"
Cohesion: 0.12
Nodes (17): hashlib, httpx, RuntimeError, TestONEQData, AlpacaBarsAdapter, CSVBarsAdapter, MissingAlpacaCredentialsError, normalize_bar_dataframe() (+9 more)

### Community 44 - "load_and_validate_oneq_bars"
Cohesion: 0.14
Nodes (12): TestONEQFeatures, TestONEQTraining, compute_dataset_sha256(), DatasetManifest, load_and_validate_oneq_bars(), Any, Path, Computes SHA-256 hash of the dataset file for data provenance and manifest… (+4 more)

### Community 45 - "test_oneq_research.py"
Cohesion: 0.23
Nodes (14): Comprehensive tests for ONEQ learned trading strategy research modules and API…, compute_benchmarks(), compute_monthly_results(), compute_resampling_uncertainty(), generate_research_report(), Any, DataFrame, Path (+6 more)

### Community 46 - "ONEQPredictor"
Cohesion: 0.18
Nodes (9): TestONEQPredictorAndAgents, ONEQPredictor, Any, DataFrame, Path, Calculates features up to the latest completed bar and returns a proposal., Generates grounded agent messages and communication bubbles from structured…, Loads a saved model pipeline and settings to generate live/historical ONEQ… (+1 more)

### Community 47 - "SMACrossStrategy"
Cohesion: 0.19
Nodes (7): make_candles(), Build synthetic candles from a price series., TestSMACrossStrategy, Golden cross / death cross strategy. Generates a BUY signal when the short-…, Compute simple moving average over a list of closes., Return BUY on golden cross, SELL on death cross, else HOLD., SMACrossStrategy

### Community 48 - "run_experiment.py"
Cohesion: 0.16
Nodes (11): argparse, logging, sys, TestONEQLabels, calculate_labels(), DataFrame, Future return training labels calculation for ONEQ 5-minute bars. Invariants: -…, Calculates the 30-minute forward return target (in basis points) for each… (+3 more)

### Community 49 - "services/portfolio.py"
Cohesion: 0.17
Nodes (9): datetime, Tests for portfolio service., PortfolioState, Portfolio models for Trading App., Full snapshot of the portfolio at a point in time., Sum of market value across all open positions., Total account equity: cash + market value of positions., Combined unrealized P&L across all positions. (+1 more)

### Community 50 - "Position"
Cohesion: 0.15
Nodes (8): Position, BaseModel, A single open position in the portfolio., Current market value of the position., Total cost basis of the position., Unrealized profit/loss based on current price., Unrealized P&L as a percentage of cost basis., Return the current open position for a ticker, or None.

### Community 51 - "orders.py"
Cohesion: 0.16
Nodes (12): fastapi, trading_app_api, get_order(), list_orders(), get, Return all orders, optionally filtered by ticker., Return a specific order by ID., get_portfolio() (+4 more)

### Community 52 - "predict_proposal"
Cohesion: 0.20
Nodes (11): get_research_report(), get_research_status(), predict_proposal(), PredictRequest, Any, BaseModel, get, post (+3 more)

### Community 53 - "train_and_select_model"
Cohesion: 0.28
Nodes (9): FoldMetric, Any, DataFrame, Path, Divides dataset by complete trading sessions into 80% development and 20%…, Runs the complete training and selection protocol. Returns dictionary…, SelectedSettings, split_sessions_80_20() (+1 more)

## Knowledge Gaps
- **174 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+169 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 385 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `replay.ts`, `demonstration.test.ts`, `package.json`, `competition/types.ts`, `EventTimeline.tsx`, `agents.test.ts`, `useReplayRunner.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `Candle` connect `Candle` to `RSIStrategy`, `market.py`, `services/backtest.py`, `SMACrossStrategy`, `run_backtest`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `vitest` connect `demonstration.test.ts` to `replay.ts`, `agents.test.ts`, `package.json`, `competition/types.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Candle` (e.g. with `candles()` and `run_backtest()`) actually correct?**
  _`Candle` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _174 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `replay.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05153153153153153 - nodes in this community are weakly interconnected._
# Graph Report - trading app  (2026-09-24)

## Corpus Check
- 118 files · ~261,690 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: .csv 4, .css 2, (none) 1)

## Summary
- 935 nodes · 2102 edges · 56 communities (39 shown, 17 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4fc5ca1e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- replay.ts
- App.tsx
- demonstration.test.ts
- package.json
- Candle
- NodeInspector.tsx
- main.py
- competition/types.ts
- typing
- compilerOptions
- api/backtest.py
- Order
- compilerOptions
- runner.ts
- PortfolioService
- useReplayRunner.ts
- app.js
- Agent Trading OS — Comprehensive System Walkthrough
- Available Actions
- order.py
- ONEQ Learned Trading Strategy — Research Experiment Walkthrough
- 🤖 Clawbot (OpenClaw) Integration Guide
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
- oneq/__init__.py
- useDemoRunner.ts
- rules/graphify.md
- workflows/graphify.md
- src_types_index_scenariokey
- EventTimeline.tsx
- agents.test.ts
- data.py
- load_and_validate_oneq_bars
- generate_research_report
- ONEQPredictor
- test_oneq_research.py
- services/portfolio.py
- ✅ Automated Test Suite Verification
- router.py
- research.py
- train.py
- TestONEQFastAPI
- 🖥 The Three Workspaces

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
- `🌟 Key Highlights` --references--> `AgentMessage`  [INFERRED]
  README.md → src/competition/messageTypes.ts
- `2. Research Package Modules (`trading_app/research/oneq/`)` --references--> `StructuredPrediction`  [INFERRED]
  docs/oneq_learned_strategy_walkthrough.md → src/competition/messageTypes.ts
- `TestONEQFeatures` --uses--> `ONEQPredictor`  [INFERRED]
  tests/test_oneq_research.py → trading_app/research/oneq/predict.py
- `TestONEQData` --uses--> `AlpacaBarsAdapter`  [INFERRED]
  tests/test_oneq_research.py → trading_app/research/oneq/data.py
- `TestONEQData` --uses--> `CSVBarsAdapter`  [INFERRED]
  tests/test_oneq_research.py → trading_app/research/oneq/data.py

## Import Cycles
- None detected.

## Communities (56 total, 17 thin omitted)

### Community 0 - "replay.ts"
Cohesion: 0.14
Nodes (21): ref_react_dom_client, App(), reviewProposals(), PLAYBACK_STEP_MS, useReplayRunner(), src_index, mountReplayHook(), TestComponent() (+13 more)

### Community 1 - "App.tsx"
Cohesion: 0.10
Nodes (28): react, @xyflow/react, ref_xyflow_react_dist_style_css, AgentFlowNode, EDGE_TYPES, NODE_LABELS, NODE_TYPES, ActivityStrip (+20 more)

### Community 2 - "demonstration.test.ts"
Cohesion: 0.08
Nodes (62): vitest, PaperTradingWorkspace, PaperTradingWorkspaceProps, PriceChart, PriceChartProps, executePaperTrade(), INITIAL_CASH, INITIAL_PAPER_ACCOUNT (+54 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (35): dependencies, react, react-dom, @xyflow/react, devDependencies, oxlint, @types/node, @types/react (+27 more)

### Community 4 - "Candle"
Cohesion: 0.05
Nodes (40): ABC, math, StrategyName, make_candles(), Tests for the backtesting engine., TestBacktest, make_candles(), Tests for the strategy implementations. (+32 more)

### Community 5 - "NodeInspector.tsx"
Cohesion: 0.16
Nodes (11): CommunicationSection(), KIND_ICONS, KIND_LABELS, NodeInspector, NodeInspectorProps, TraceSection(), TraceSectionProps, deriveNodeInspectorTrace() (+3 more)

### Community 6 - "main.py"
Cohesion: 0.07
Nodes (18): fastapi_responses, fastapi_staticfiles, fastapi_testclient, FileResponse, os, pytest, Integration tests for FastAPI routes., TestBacktestEndpoint (+10 more)

### Community 7 - "competition/types.ts"
Cohesion: 0.07
Nodes (62): approveExperiment(), evaluateTrader(), loadExperiments(), saveExperiments(), DecisionBundle, runIndependentPhase(), CATEGORIES, computeLeaderboard() (+54 more)

### Community 8 - "typing"
Cohesion: 0.14
Nodes (20): random, candles(), list_tickers(), get, quote(), Market data API router., Return the latest simulated quote for a ticker., Return OHLCV candlestick bars for a ticker. (+12 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "api/backtest.py"
Cohesion: 0.18
Nodes (11): pydantic, backtest(), BacktestRequest, BaseModel, post, Request body for running a strategy backtest., Run a strategy backtest on simulated historical data., BaseModel (+3 more)

### Community 11 - "Order"
Cohesion: 0.10
Nodes (21): get_order(), list_orders(), place_order(), get, post, Place a new paper trading order., Return all orders, optionally filtered by ticker., Return a specific order by ID. (+13 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "runner.ts"
Cohesion: 0.12
Nodes (33): buildEpisodicReflection(), MemoryQueryOutput, SkillExecutionOutput, freshAdapter(), freshAdapter(), MockExecutionAdapter, completeEvent(), newEventId() (+25 more)

### Community 14 - "PortfolioService"
Cohesion: 0.11
Nodes (11): portfolio(), fixture, Fresh portfolio with $100,000 initial cash., PortfolioService, Update current_price on all positions from a price map., Stateful portfolio manager for paper trading., Return a snapshot of the current portfolio state., Return the current open position for a ticker, or None. (+3 more)

### Community 15 - "useReplayRunner.ts"
Cohesion: 0.16
Nodes (20): AgentMessage, AgentMessageType, AgentNodeId, EvidenceReference, StructuredPrediction, ProposalRoundResult, runProposalOnlyRound(), checkWholeShareAffordability() (+12 more)

### Community 16 - "app.js"
Cohesion: 0.21
Nodes (10): candleData, drawChart(), loadCandles(), loadOrders(), loadPortfolio(), placeOrder(), renderBacktestResults(), renderPositions() (+2 more)

### Community 17 - "Agent Trading OS — Comprehensive System Walkthrough"
Cohesion: 0.20
Nodes (10): 1. Frontend Web App (Agent Trading OS), 2. Backend Engine (FastAPI Service), Agent Trading OS — Comprehensive System Walkthrough, 🤖 Clawbot (OpenClaw / Clawdbot) Integration, 🧠 Graphify Codebase Knowledge Graph, Multi-Dimensional Composite Scoring Formula, ⚡ Quickstart Commands, 📈 Real Market Data Feeds (+2 more)

### Community 18 - "Available Actions"
Cohesion: 0.22
Nodes (9): 1. Health Check, 2. Live Market Quote, 3. Historical Candles, 4. Check Simulated Portfolio, 5. Submit Paper Trade, 6. Run Strategy Backtest, Agent Trading OS Skill, Available Actions (+1 more)

### Community 19 - "order.py"
Cohesion: 0.14
Nodes (14): Enum, str, make_filled_order(), Tests for portfolio service., Helper to build a synthetic filled order., TestPortfolioService, OrderSide, OrderStatus (+6 more)

### Community 20 - "ONEQ Learned Trading Strategy — Research Experiment Walkthrough"
Cohesion: 0.25
Nodes (7): 1. High-Level Architecture & Workflow, 2. Research Package Modules (`trading_app/research/oneq/`), 3. Causal Invariance Verification (Spotlight: `report.py:L20-48`), 4. Empirical Experiment Findings on Real ONEQ 5-Minute Bars, 5. Agent Communication Bubbles Routing, 6. How to Run and Verify Locally, ONEQ Learned Trading Strategy — Research Experiment Walkthrough

### Community 21 - "🤖 Clawbot (OpenClaw) Integration Guide"
Cohesion: 0.25
Nodes (8): 🏛 Architecture, 🤖 Clawbot (OpenClaw) Integration Guide, ⚡ Quickstart Setup, 📋 Ready-to-Use Copy & Paste Prompt for Clawbot, 🛡 Security & Safety Boundaries, Step 1: Start the Backend Service, Step 2: Install the Skill in Clawbot, Step 3: Two-Way Webhooks (Optional)

### Community 22 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 23 - "Agent Trading OS — Competitive Multi-Agent Trading Laboratory"
Cohesion: 0.17
Nodes (12): Agent Trading OS — Competitive Multi-Agent Trading Laboratory, 🏛 Architecture Overview, Backend (FastAPI Service), 🤖 Clawbot (OpenClaw) Integration, 📚 Documentation Directory, Frontend (Agent Trading OS), 🧠 Graphify Knowledge Graph, 🌟 Key Highlights (+4 more)

### Community 36 - "oneq/__init__.py"
Cohesion: 0.20
Nodes (11): TestONEQSimulation, ONEQ Intraday Return Prediction and Simulation Research Package., DecisionRecord, Any, DataFrame, Cash account trading simulation for ONEQ model proposals. Invariants: -…, Replays model predictions through a cash account under specified execution cost…, simulate_predictions() (+3 more)

### Community 37 - "useDemoRunner.ts"
Cohesion: 0.36
Nodes (7): AgentFlowNode, EDGE_FOR_NODE, resetEdges(), resetNodes(), traceEventToNodeStatus(), useDemoRunner(), executionAdapter

### Community 41 - "EventTimeline.tsx"
Cohesion: 0.40
Nodes (5): EventTimeline, EventTimelineProps, eventTypeBadge(), NODE_SHORT_LABELS, TraceEventType

### Community 42 - "agents.test.ts"
Cohesion: 0.11
Nodes (35): AVAILABLE_SKILLS, createCustomAgent(), deleteCustomAgent(), getAgentById(), getAllAgents(), INITIAL_STATS, _inMemoryCustomAgents, loadCustomAgents() (+27 more)

### Community 43 - "data.py"
Cohesion: 0.09
Nodes (23): dataclasses, hashlib, httpx, RuntimeError, TestONEQData, AlpacaBarsAdapter, compute_dataset_sha256(), CSVBarsAdapter (+15 more)

### Community 44 - "load_and_validate_oneq_bars"
Cohesion: 0.12
Nodes (16): argparse, logging, sys, TestONEQFeatures, TestONEQLabels, TestONEQTraining, load_and_validate_oneq_bars(), Loads ONEQ 5-minute bars from CSV or Alpaca, validates them, and produces a… (+8 more)

### Community 45 - "generate_research_report"
Cohesion: 0.23
Nodes (13): compute_benchmarks(), compute_monthly_results(), compute_resampling_uncertainty(), generate_research_report(), Any, DataFrame, Path, Breaks down trading net results, trades, and win rate by calendar month. (+5 more)

### Community 46 - "ONEQPredictor"
Cohesion: 0.18
Nodes (9): TestONEQPredictorAndAgents, ONEQPredictor, Any, DataFrame, Path, Calculates features up to the latest completed bar and returns a proposal., Generates grounded agent messages and communication bubbles from structured…, Loads a saved model pipeline and settings to generate live/historical ONEQ… (+1 more)

### Community 48 - "test_oneq_research.py"
Cohesion: 0.26
Nodes (11): json, numpy, pandas, pathlib, Comprehensive tests for ONEQ learned trading strategy research modules and API…, time, Intraday feature engineering for ONEQ 5-minute bars. Invariants: - Strictly…, Future return training labels calculation for ONEQ 5-minute bars. Invariants: -… (+3 more)

### Community 49 - "services/portfolio.py"
Cohesion: 0.10
Nodes (15): datetime, PortfolioState, Position, BaseModel, Portfolio models for Trading App., A single open position in the portfolio., Current market value of the position., Total cost basis of the position. (+7 more)

### Community 50 - "✅ Automated Test Suite Verification"
Cohesion: 0.50
Nodes (4): ✅ Automated Test Suite Verification, Build & Static Analysis, Pytest Backend Tests (35 / 35 Passed), Vitest Frontend Tests (63 / 63 Passed)

### Community 51 - "router.py"
Cohesion: 0.25
Nodes (7): fastapi, trading_app_api, get_portfolio(), get, Portfolio API router., Return the current portfolio state., Main API router aggregating all sub-routers.

### Community 52 - "research.py"
Cohesion: 0.21
Nodes (12): get_research_report(), get_research_status(), predict_proposal(), PredictRequest, Any, BaseModel, get, post (+4 more)

### Community 53 - "train.py"
Cohesion: 0.18
Nodes (14): joblib, sklearn_linear_model, sklearn_pipeline, sklearn_preprocessing, FoldMetric, Any, DataFrame, Path (+6 more)

### Community 55 - "🖥 The Three Workspaces"
Cohesion: 0.50
Nodes (4): 1. ⟡ Agent Lab, 2. 🏆 Arena Mode (Competition Workspace), 3. 📈 Paper Trading (Live Prediction Markets & Crypto), 🖥 The Three Workspaces

## Knowledge Gaps
- **175 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+170 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 385 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AgentMessage` connect `useReplayRunner.ts` to `replay.ts`, `runner.ts`, `Agent Trading OS — Competitive Multi-Agent Trading Laboratory`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Agent Trading OS — Competitive Multi-Agent Trading Laboratory` connect `Agent Trading OS — Competitive Multi-Agent Trading Laboratory` to `🖥 The Three Workspaces`, `README.md`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `🌟 Key Highlights` connect `Agent Trading OS — Competitive Multi-Agent Trading Laboratory` to `useReplayRunner.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Candle` (e.g. with `candles()` and `run_backtest()`) actually correct?**
  _`Candle` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _175 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `replay.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14130434782608695 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1021021021021021 - nodes in this community are weakly interconnected._
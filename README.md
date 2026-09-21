# Agent Trading OS — Competitive Multi-Agent Trading Laboratory

An advanced operating system and visual laboratory for autonomous AI trading agents, paper-trading against live prediction markets (Kalshi) and crypto spot markets (Coinbase), supervised by a Portfolio Manager and Coach Evaluator, backed by a high-performance FastAPI engine and a **Graphify** codebase knowledge graph.

---

## 🌟 Key Highlights

- ⚔ **Competitive Multi-Agent Trading**: Three independent autonomous traders (Alpha, Beta, Gamma) compete with segregated simulated bankrolls ($10,000 each) using orthogonal trading philosophies.
- ⚖ **Portfolio Manager Supervision**: Oversees trade proposals, detects consensus vs. divergence, dynamically budgets capital within strict 15%–50% boundary rules, and manages a $50,000 ensemble portfolio.
- 🧠 **Coach & Evaluator with Human Safeguards**: Audits Brier score calibration, diagnoses overtrading or risk sizing biases, and generates controlled parameter experiments requiring **explicit human operator approval**.
- 🏆 **Arena Mode Workspace**: Multi-dimensional composite leaderboard evaluating not just profit, but simulated return, max drawdown, Brier score calibration, realized edge, win-rate, and risk rule compliance.
- ⟡ **Living AI Knowledge Graph**: Interactive organic canvas with hierarchical node morphologies, live equity badges, orbital satellite disclosure, and point-in-time replay scrubbing.
- 📈 **Real Market & Prediction Bets**: Live market feeds from CFTC-regulated Kalshi v2 binary markets and Coinbase spot crypto, with decimal-safe paper execution and reciprocal binary order-book depth.
- 🌐 **Graphify Knowledge Graph**: Fully indexed 710-node codebase graph with community detection, god-node callflow tracking, and navigable architectural reports.

---

## 🏛 Architecture Overview

```
trading-app/
├── src/                          # Agent Trading OS (React 19 + TypeScript + Vite)
│   ├── competition/              # Multi-Agent Competition Subsystem
│   │   ├── types.ts              # Core contracts (TradeProposal, NoTradeDecision, TraderPortfolio, Season)
│   │   ├── traderProfiles.ts     # Canonical profiles & philosophies for Alpha, Beta, Gamma, Manager, Coach
│   │   ├── proposalEngine.ts     # Deterministic thesis generator & structured pass recorder
│   │   ├── competitionEngine.ts  # Independent decision phase runner (zero cross-talk)
│   │   ├── portfolioManager.ts   # Capital allocation bounds, consensus/divergence, Risk Engine router
│   │   ├── portfolioStore.ts     # Segregated paper ledgers, positions, equity, and thesis tracker
│   │   ├── coachEvaluator.ts     # Calibration audits & human-confirmed parameter experiments
│   │   ├── competitionScorer.ts  # Composite scoring formula (Return, Drawdown, Brier, Edge, Win Rate)
│   │   ├── seasonStore.ts        # Tournament seasons, participant rosters, and S&P 500 benchmarks
│   │   └── eventBus.ts           # Typed pub/sub event bus driving graph animations
│   ├── components/               # Living AI System UI
│   │   ├── AgentNode.tsx         # Morphological node frame with live status aura and equity pills
│   │   ├── NodeInspector.tsx     # Specialized panels for Competitors, Manager, and Coach
│   │   ├── CompetitionWorkspace  # Arena Mode tournament view with live leaderboard & event stream
│   │   ├── PaperTradingWorkspace # Real Kalshi/Coinbase charts, orderbook depth & execution ledger
│   │   ├── Navigation.tsx        # Workspace tab switcher (Agent Lab, Arena Mode, Paper Trading)
│   │   └── BottomCommandStrip    # Cinema scrubber, step debugger, and live autonomous toggle
│   ├── agents/                   # Agent registry, modular skills, and episodic memory store
│   ├── paper/                    # Decimal-safe virtual account ($1,000 base) & Kalshi/Coinbase client
│   ├── workflow/                 # Deterministic execution pipeline & replay trace builder
│   └── __tests__/                # Vitest test suite (63 unit & integration tests passing)
├── trading_app/                  # Python FastAPI Backend
│   ├── api/                      # REST endpoints (quotes, candles, orders, portfolio, backtesting)
│   ├── services/                 # Execution engine, SMA/RSI quantitative strategies, backtesting
│   └── models/                   # Pydantic data schemas
├── tests/                        # Pytest suite for Python backend (35 tests passing)
├── graphify-out/                 # Graphify knowledge graph outputs (AST extract, callflow, HTML viewer)
└── vite.config.ts                # Vite dev server with reverse proxy for Kalshi & Coinbase
```

---

## 🤖 The Competitor Agents

| Agent | Role | Style & Philosophy | Bankroll |
| :--- | :--- | :--- | :--- |
| **Trader Alpha** | Momentum | *"The market itself contains information."* Explores bid/ask depth imbalance, volume momentum bursts, and orderbook flow. | $10,000 |
| **Trader Beta** | Fundamental Prob | *"Estimate true probability from first principles."* Derives true probabilities, requires a strict 5.0% edge hurdle, and prioritizes Brier score calibration. | $10,000 |
| **Trader Gamma** | Contrarian | *"Crowds overreact to transient sentiment."* Fades extreme consensus implied odds (>80% or <20%) with convex, asymmetric upside. | $10,000 |
| **Portfolio Manager** | Supervisor | Balances capital across active agents (enforcing 15%–50% weight boundaries), detects trade consensus vs. divergence, and manages a diversified ensemble. | $50,000 |
| **Coach & Evaluator** | Auditor | Audits category Brier scores and behavioral biases, proposing hypothesis experiments that require **explicit human operator approval**. | N/A |

---

## 🖥 The Three Workspaces

### 1. ⟡ Agent Lab
* **Hierarchical Graph**: Coach at the apex, Portfolio Manager in the center, Alpha, Beta, Gamma in the middle tier, and segregated Portfolios at the base.
* **Point-in-Time Trace Replay**: Step forward and backward through recorded decision steps with strict temporal isolation.
* **Live Autonomous Monitor (`⚡ LIVE MONITOR`)**: Evaluates real prediction bets and crypto quotes every 5 seconds through all three competitor models concurrently.

### 2. 🏆 Arena Mode (Competition Workspace)
* **Composite Leaderboard**: Ranks agents using a balanced multi-dimensional metric:
  $$\text{Composite} = 0.25 \times \text{Return} + 0.20 \times (100 - \text{MaxDD}) + 0.20 \times (1 - 2 \cdot \text{Brier}) \times 100 + 0.15 \times \text{WinRate} + 0.10 \times \text{Edge} + 0.10 \times \text{Compliance}$$
* **Trader Deep-Dive Cards**: Individual cards displaying equity, cash, realized P&L, selectivity count (no-trades), and open positions with invalidation criteria.
* **Human-in-the-Loop Coach Section**: Audit feedback and interactive **"Approve Experiment"** buttons for parameter fine-tuning.
* **Live Autonomous Event Ticker**: Real-time pub/sub trace of events emitted across the agent network.

### 3. 📈 Paper Trading (Live Prediction Markets & Crypto)
* **Real Binary Bets**: High-volume CFTC-regulated Kalshi markets (*OpenAI vs. Anthropic IPO*, *Elon Mars Mission*, *Fed Rate Decisions*).
* **Spot Crypto Feeds**: Live streaming quotes from Coinbase for `BTC-USD`, `ETH-USD`, and `SOL-USD`.
* **Decimal-Safe Execution**: Enforces official Kalshi taker fee formulas and cash checks.
* **Instant Decision Inspection**: Clicking **`🔍 Inspect Decision`** on any filled paper trade opens Agent Lab with the exact point-in-time Risk Engine validation token.

---

## ⚡ Quickstart

### Frontend (Agent Trading OS)

```powershell
# 1. Install dependencies
npm install

# 2. Run test suite (63/63 tests passing)
npm test

# 3. Production build check
npm run build

# 4. Start local development server
npm run dev
```

Visit **http://localhost:5173** to access the application.

### Backend (FastAPI Service)

```powershell
# 1. Install dependencies using uv
uv sync

# 2. Run backend test suite (35/35 tests passing)
uv run pytest tests/ -v

# 3. Start FastAPI server
uv run uvicorn trading_app.main:app --reload --port 8000
```

Interactive OpenAPI documentation is available at **http://localhost:8000/docs**.

---

## 🧠 Graphify Knowledge Graph

The codebase is indexed as a Graphify knowledge graph at `graphify-out/`.

```powershell
# Update knowledge graph after code modifications (AST-only, zero API cost)
graphify update .

# Query the codebase knowledge graph
graphify query "How does Portfolio Manager allocate capital to Trader Alpha?"

# Explore architectural god nodes
uv tool run --from graphifyy graphify god-nodes
```

Open `graphify-out/graph.html` in any browser to navigate the interactive graph visualizer.

---

## 🔒 Safety & Simulation Notice

All trading in this system is strictly **simulated paper trading**. No real capital is ever risked, and no live broker order placement APIs are connected. All orders and portfolio balances exist exclusively in local simulation memory and browser storage.

"""Cash account trading simulation for ONEQ model proposals.

Invariants:
- Explicit arithmetic:
  estimated_net_bps = predicted_gross_bps - estimated_round_trip_cost_bps
  propose BUY only when: estimated_net_bps > selected_entry_buffer_bps
  otherwise WAIT.
- Bar-based execution:
  buy_fill = next_open * (1 + execution_cost_bps_per_side / 10_000)
  sell_fill = scheduled_exit_open * (1 - execution_cost_bps_per_side / 10_000)
  net_pnl = shares * (sell_fill - buy_fill) - entry_fee - exit_fee
- Whole shares only (no fractional shares).
- One open position at a time.
- Rechecks affordability at entry; records WAIT if unaffordable.
- Reconciles completed-trade P&L with cash balance.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from typing import Any, Optional
import numpy as np
import pandas as pd


@dataclass
class SimulationConfig:
    initial_cash: float = 200.0  # Configured research budget
    cost_bps_per_side: float = 5.0  # 1, 5, or 10 bps
    entry_fee: float = 0.0  # Separately configured fees
    exit_fee: float = 0.0
    entry_buffer_bps: float = 2.0  # [0, 2, 5, 10] bps
    stay_in_cash: bool = False  # Candidate option: stay in cash (0 trades)


@dataclass
class TradeRecord:
    trade_id: str
    symbol: str
    entry_bar_start_utc: str
    exit_bar_start_utc: str
    entry_open: float
    exit_open: float
    buy_fill: float
    sell_fill: float
    shares: int
    predicted_gross_bps: float
    estimated_net_bps: float
    entry_cost: float
    exit_cost: float
    fees: float
    gross_pnl: float
    net_pnl: float
    net_return_bps: float
    cash_after_exit: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class DecisionRecord:
    bar_start_utc: str
    predicted_gross_bps: float
    estimated_net_bps: float
    action: str  # 'BUY' or 'WAIT'
    reason: str  # 'edge_above_buffer', 'net_below_buffer', 'already_in_position', 'insufficient_cash', 'stay_in_cash'
    shares: int
    cash_balance: float


@dataclass
class SimulationResult:
    initial_cash: float
    final_cash: float
    net_pnl: float
    net_return_pct: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    profit_factor: float
    total_costs_paid: float
    max_drawdown_pct: float
    sharpe_ratio: float
    cash_reconciled: bool
    trades: list[TradeRecord]
    decisions: list[DecisionRecord]
    equity_curve: list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        return {
            "initial_cash": self.initial_cash,
            "final_cash": self.final_cash,
            "net_pnl": self.net_pnl,
            "net_return_pct": self.net_return_pct,
            "total_trades": self.total_trades,
            "winning_trades": self.winning_trades,
            "losing_trades": self.losing_trades,
            "win_rate": self.win_rate,
            "profit_factor": self.profit_factor,
            "total_costs_paid": self.total_costs_paid,
            "max_drawdown_pct": self.max_drawdown_pct,
            "sharpe_ratio": self.sharpe_ratio,
            "cash_reconciled": self.cash_reconciled,
            "trades_count": len(self.trades),
        }


def simulate_predictions(
    df: pd.DataFrame,
    predictions_col: str = "pred_gross_bps",
    config: Optional[SimulationConfig] = None,
) -> SimulationResult:
    """Replays model predictions through a cash account under specified execution cost scenarios."""
    cfg = config or SimulationConfig()

    initial_cash = float(cfg.initial_cash)
    cash = initial_cash
    cost_per_side_frac = cfg.cost_bps_per_side / 10_000.0
    round_trip_cost_bps = 2.0 * cfg.cost_bps_per_side

    trades: list[TradeRecord] = []
    decisions: list[DecisionRecord] = []
    equity_curve: list[dict[str, Any]] = []

    # State tracking
    in_position = False
    position_exit_time: Optional[str] = None
    trade_counter = 0
    total_costs_paid = 0.0

    # Ensure valid evaluation rows
    eval_df = df.copy()
    if predictions_col not in eval_df.columns:
        raise ValueError(f"Predictions column '{predictions_col}' not found in dataframe.")

    eval_df.sort_values("bar_start_utc", inplace=True)
    eval_df.reset_index(drop=True, inplace=True)

    peak_equity = initial_cash
    max_drawdown_pct = 0.0

    for idx, row in eval_df.iterrows():
        bar_time = row["bar_start_utc"]
        pred_gross = float(row[predictions_col]) if pd.notna(row[predictions_col]) else 0.0
        est_net_bps = pred_gross - round_trip_cost_bps

        # Check if active position has matured and exited
        if in_position and position_exit_time is not None:
            if bar_time >= position_exit_time:
                in_position = False
                position_exit_time = None

        current_equity = cash
        if current_equity > peak_equity:
            peak_equity = current_equity
        if peak_equity > 0:
            dd = (peak_equity - current_equity) / peak_equity * 100.0
            if dd > max_drawdown_pct:
                max_drawdown_pct = dd

        equity_curve.append(
            {
                "bar_start_utc": bar_time,
                "cash": round(cash, 2),
                "in_position": in_position,
                "drawdown_pct": round(max_drawdown_pct, 4),
            }
        )

        # Candidate check: Stay in cash
        if cfg.stay_in_cash:
            decisions.append(
                DecisionRecord(
                    bar_start_utc=bar_time,
                    predicted_gross_bps=pred_gross,
                    estimated_net_bps=est_net_bps,
                    action="WAIT",
                    reason="stay_in_cash",
                    shares=0,
                    cash_balance=round(cash, 2),
                )
            )
            continue

        # Check edge hurdle
        if est_net_bps <= cfg.entry_buffer_bps:
            decisions.append(
                DecisionRecord(
                    bar_start_utc=bar_time,
                    predicted_gross_bps=pred_gross,
                    estimated_net_bps=est_net_bps,
                    action="WAIT",
                    reason="net_below_buffer",
                    shares=0,
                    cash_balance=round(cash, 2),
                )
            )
            continue

        # Propose BUY: Check if already in open position
        if in_position:
            decisions.append(
                DecisionRecord(
                    bar_start_utc=bar_time,
                    predicted_gross_bps=pred_gross,
                    estimated_net_bps=est_net_bps,
                    action="WAIT",
                    reason="already_in_position",
                    shares=0,
                    cash_balance=round(cash, 2),
                )
            )
            continue

        # Verify reference prices exist for simulation fill
        ref_entry = row.get("ref_entry_open")
        ref_exit = row.get("ref_exit_open")
        exit_time = row.get("ref_exit_time_utc")
        label_valid = row.get("label_valid", True)

        if not label_valid or pd.isna(ref_entry) or pd.isna(ref_exit) or ref_entry <= 0:
            decisions.append(
                DecisionRecord(
                    bar_start_utc=bar_time,
                    predicted_gross_bps=pred_gross,
                    estimated_net_bps=est_net_bps,
                    action="WAIT",
                    reason="session_boundary_or_missing_exit",
                    shares=0,
                    cash_balance=round(cash, 2),
                )
            )
            continue

        # Execution fills with modeled slippage and spread
        buy_fill = round(float(ref_entry) * (1.0 + cost_per_side_frac), 4)
        sell_fill = round(float(ref_exit) * (1.0 - cost_per_side_frac), 4)

        # Whole share affordability check
        affordable_shares = math.floor((cash - cfg.entry_fee) / buy_fill)
        if affordable_shares < 1:
            decisions.append(
                DecisionRecord(
                    bar_start_utc=bar_time,
                    predicted_gross_bps=pred_gross,
                    estimated_net_bps=est_net_bps,
                    action="WAIT",
                    reason="insufficient_cash",
                    shares=0,
                    cash_balance=round(cash, 2),
                )
            )
            continue

        # Position Sizing: Exactly 1 position at a time (trade affordable shares, capped at 1 for $200 capital model)
        shares_to_buy = max(1, affordable_shares)
        # Cap at what cash actually allows
        if shares_to_buy * buy_fill + cfg.entry_fee > cash:
            shares_to_buy = affordable_shares
            if shares_to_buy < 1:
                continue

        entry_capital = shares_to_buy * buy_fill + cfg.entry_fee
        exit_proceeds = shares_to_buy * sell_fill - cfg.exit_fee
        trade_net_pnl = exit_proceeds - entry_capital

        # Book trade
        trade_counter += 1
        trade_id = f"trd-oneq-{trade_counter:04d}"
        cash = cash + trade_net_pnl

        # Track costs (execution slippage + fees)
        nominal_entry = shares_to_buy * float(ref_entry)
        nominal_exit = shares_to_buy * float(ref_exit)
        entry_cost = (shares_to_buy * buy_fill) - nominal_entry
        exit_cost = nominal_exit - (shares_to_buy * sell_fill)
        fees = cfg.entry_fee + cfg.exit_fee
        total_costs_paid += (entry_cost + exit_cost + fees)

        trade_ret_bps = ((sell_fill / buy_fill) - 1.0) * 10_000.0

        t_rec = TradeRecord(
            trade_id=trade_id,
            symbol="ONEQ",
            entry_bar_start_utc=str(row["ref_entry_time_utc"]),
            exit_bar_start_utc=str(exit_time),
            entry_open=float(ref_entry),
            exit_open=float(ref_exit),
            buy_fill=buy_fill,
            sell_fill=sell_fill,
            shares=shares_to_buy,
            predicted_gross_bps=pred_gross,
            estimated_net_bps=est_net_bps,
            entry_cost=round(entry_cost, 4),
            exit_cost=round(exit_cost, 4),
            fees=round(fees, 4),
            gross_pnl=round(nominal_exit - nominal_entry, 2),
            net_pnl=round(trade_net_pnl, 2),
            net_return_bps=round(trade_ret_bps, 2),
            cash_after_exit=round(cash, 2),
        )
        trades.append(t_rec)

        in_position = True
        position_exit_time = str(exit_time)

        decisions.append(
            DecisionRecord(
                bar_start_utc=bar_time,
                predicted_gross_bps=pred_gross,
                estimated_net_bps=est_net_bps,
                action="BUY",
                reason="edge_above_buffer",
                shares=shares_to_buy,
                cash_balance=round(cash, 2),
            )
        )

    # Performance metrics
    total_trades = len(trades)
    winning = [t for t in trades if t.net_pnl > 0]
    losing = [t for t in trades if t.net_pnl < 0]
    win_rate = (len(winning) / total_trades * 100.0) if total_trades > 0 else 0.0

    gross_gains = sum(t.net_pnl for t in winning)
    gross_losses = abs(sum(t.net_pnl for t in losing))
    profit_factor = (gross_gains / gross_losses) if gross_losses > 0 else (999.0 if gross_gains > 0 else 1.0)

    net_pnl = cash - initial_cash
    net_return_pct = (net_pnl / initial_cash) * 100.0

    # Sharpe ratio of trade returns
    if total_trades >= 3:
        rets = np.array([t.net_return_bps / 10000.0 for t in trades])
        std = np.std(rets, ddof=1)
        mean_ret = np.mean(rets)
        sharpe = (mean_ret / std * np.sqrt(252 * 13)) if std > 0 else 0.0
    else:
        sharpe = 0.0

    # Cash reconciliation check: final_cash == initial_cash + sum(net_pnl)
    sum_trade_pnl = sum(t.net_pnl for t in trades)
    cash_reconciled = math.isclose(cash, initial_cash + sum_trade_pnl, abs_tol=1e-2)

    return SimulationResult(
        initial_cash=round(initial_cash, 2),
        final_cash=round(cash, 2),
        net_pnl=round(net_pnl, 2),
        net_return_pct=round(net_return_pct, 4),
        total_trades=total_trades,
        winning_trades=len(winning),
        losing_trades=len(losing),
        win_rate=round(win_rate, 2),
        profit_factor=round(profit_factor, 2),
        total_costs_paid=round(total_costs_paid, 2),
        max_drawdown_pct=round(max_drawdown_pct, 2),
        sharpe_ratio=round(sharpe, 2),
        cash_reconciled=cash_reconciled,
        trades=trades,
        decisions=decisions,
        equity_curve=equity_curve,
    )
